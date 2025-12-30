import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { Product, ProductDocument } from '../catalog/schema/product.schema';
import {
  InventoryTransaction,
  InventoryTransactionDocument,
} from './schema/inventory-transaction.schema';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    @InjectModel(InventoryTransaction.name)
    private inventoryTransactionModel: Model<InventoryTransactionDocument>,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  private ensureObjectId(id: string, label = 'id'): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }
    return new Types.ObjectId(id);
  }

  private async updateStockStatus(
    productId: Types.ObjectId,
    session?: ClientSession,
  ): Promise<void> {
    const product = await this.productModel
      .findById(productId)
      .session(session || null);
    if (!product) return;

    let newStatus: 'in_stock' | 'out_of_stock' | 'preorder' = 'in_stock';

    if (product.quantity === 0) {
      newStatus = 'out_of_stock';
    } else if (product.stock_status === 'preorder' && product.quantity > 0) {
      newStatus = 'preorder';
    }

    if (product.stock_status !== newStatus) {
      await this.productModel.findByIdAndUpdate(
        productId,
        {
          stock_status: newStatus,
        },
        { session: session || undefined },
      );
    }
  }

  async importInventory(
    productId: string,
    quantity: number,
    userId?: string,
    note?: string,
  ): Promise<InventoryTransaction> {
    const productObjectId = this.ensureObjectId(productId, 'product id');

    const product = await this.productModel.findOne({
      _id: productObjectId,
      is_deleted: false,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const quantityBefore = product.quantity || 0;
    const quantityAfter = quantityBefore + quantity;

    await this.productModel.findByIdAndUpdate(productObjectId, {
      quantity: quantityAfter,
    });

    await this.updateStockStatus(productObjectId);

    const transaction = new this.inventoryTransactionModel({
      product_id: productObjectId,
      type: 'import',
      quantity,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      created_by: userId ? this.ensureObjectId(userId, 'user id') : undefined,
      note,
    });

    const result = await transaction.save();

    // Emit realtime update
    this.realtimeGateway.emitToAllAdmins('inventory:updated', {
      productId: productId,
      action: 'import',
      quantity: quantity,
      remaining: quantityAfter,
    });

    return result;
  }

  async exportInventory(
    productId: string,
    quantity: number,
    orderId?: string,
    userId?: string,
    note?: string,
  ): Promise<InventoryTransaction> {
    const productObjectId = this.ensureObjectId(productId, 'product id');

    const product = await this.productModel.findOne({
      _id: productObjectId,
      is_deleted: false,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const quantityBefore = product.quantity || 0;

    if (quantityBefore < quantity) {
      throw new BadRequestException(
        `Số lượng tồn kho không đủ. Có sẵn: ${quantityBefore}, Yêu cầu: ${quantity}`,
      );
    }

    const quantityAfter = quantityBefore - quantity;

    await this.productModel.findByIdAndUpdate(productObjectId, {
      quantity: quantityAfter,
    });

    await this.updateStockStatus(productObjectId);

    const transaction = new this.inventoryTransactionModel({
      product_id: productObjectId,
      type: 'export',
      quantity,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      order_id: orderId ? this.ensureObjectId(orderId, 'order id') : undefined,
      created_by: userId ? this.ensureObjectId(userId, 'user id') : undefined,
      note,
    });

    const result = await transaction.save();

    // Emit realtime update
    this.realtimeGateway.emitToAllAdmins('inventory:updated', {
      productId: productId,
      action: 'export',
      quantity: quantity,
      remaining: quantityAfter,
    });

    return result;
  }

  async adjustInventory(
    productId: string,
    newQuantity: number,
    userId?: string,
    note?: string,
  ): Promise<InventoryTransaction> {
    const productObjectId = this.ensureObjectId(productId, 'product id');

    if (newQuantity < 0) {
      throw new BadRequestException('Quantity cannot be negative');
    }

    const product = await this.productModel.findOne({
      _id: productObjectId,
      is_deleted: false,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const quantityBefore = product.quantity || 0;
    const quantityAfter = newQuantity;
    const quantityChange = quantityAfter - quantityBefore;

    await this.productModel.findByIdAndUpdate(productObjectId, {
      quantity: quantityAfter,
    });

    await this.updateStockStatus(productObjectId);

    const transaction = new this.inventoryTransactionModel({
      product_id: productObjectId,
      type: 'adjustment',
      quantity: Math.abs(quantityChange),
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      created_by: userId ? this.ensureObjectId(userId, 'user id') : undefined,
      note,
    });

    const result = await transaction.save();

    // Emit realtime update
    this.realtimeGateway.emitToAllAdmins('inventory:updated', {
      productId: productId,
      action: 'adjustment',
      quantity: Math.abs(quantityChange),
      remaining: quantityAfter,
    });

    return result;
  }

  async exportInventoryForOrder(
    items: Array<{ product_id: string; quantity: number }>,
    orderId: string,
    session?: ClientSession,
  ): Promise<InventoryTransaction[]> {
    const transactions: InventoryTransaction[] = [];

    for (const item of items) {
      const productObjectId = this.ensureObjectId(
        item.product_id,
        'product id',
      );

      const product = await this.productModel.findOneAndUpdate(
        {
          _id: productObjectId,
          is_deleted: false,
          quantity: { $gte: item.quantity },
        },
        {
          $inc: { quantity: -item.quantity },
        },
        {
          new: true,
          session: session || undefined,
        },
      );

      if (!product) {
        const productInfo = await this.productModel
          .findById(productObjectId)
          .session(session || null);

        if (!productInfo) {
          throw new NotFoundException(`Product ${item.product_id} not found`);
        }

        throw new BadRequestException(
          `Số lượng tồn kho không đủ cho sản phẩm ${productInfo.name}. Có sẵn: ${productInfo.quantity || 0}, Yêu cầu: ${item.quantity}`,
        );
      }

      const quantityBefore = product.quantity + item.quantity;
      const quantityAfter = product.quantity;

      await this.updateStockStatus(productObjectId, session);

      const transaction = new this.inventoryTransactionModel({
        product_id: productObjectId,
        type: 'export',
        quantity: item.quantity,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        order_id: this.ensureObjectId(orderId, 'order id'),
        note: 'Order export',
      });

      if (session) {
        transaction.$session(session);
      }

      const savedTransaction = await transaction.save();
      transactions.push(savedTransaction);

      // Emit realtime update
      this.realtimeGateway.emitToAllAdmins('inventory:updated', {
        productId: item.product_id,
        action: 'order_export',
        quantity: item.quantity,
        remaining: quantityAfter,
      });
    }

    return transactions;
  }

  async getInventoryHistory(
    productId: string,
  ): Promise<InventoryTransaction[]> {
    const productObjectId = this.ensureObjectId(productId, 'product id');

    return await this.inventoryTransactionModel
      .find({ product_id: productObjectId })
      .populate('order_id', 'status total')
      .populate('created_by', 'name email')
      .sort({ created_at: -1 });
  }

  async getProductInventory(productId: string): Promise<Product> {
    const productObjectId = this.ensureObjectId(productId, 'product id');

    const product = await this.productModel
      .findOne({
        _id: productObjectId,
        is_deleted: false,
      })
      .select('name quantity stock_status');

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async returnInventoryForOrder(
    items: Array<{ product_id: string; quantity: number }>,
    orderId: string,
    session?: ClientSession,
  ): Promise<InventoryTransaction[]> {
    const transactions: InventoryTransaction[] = [];

    for (const item of items) {
      const productObjectId = this.ensureObjectId(
        item.product_id,
        'product id',
      );

      const product = await this.productModel.findOneAndUpdate(
        {
          _id: productObjectId,
          is_deleted: false,
        },
        {
          $inc: { quantity: item.quantity },
        },
        {
          new: true,
          session: session || undefined,
        },
      );

      if (!product) {
        throw new NotFoundException(`Product ${item.product_id} not found`);
      }

      const quantityBefore = product.quantity - item.quantity;
      const quantityAfter = product.quantity;

      await this.updateStockStatus(productObjectId, session);

      const transaction = new this.inventoryTransactionModel({
        product_id: productObjectId,
        type: 'import',
        quantity: item.quantity,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        order_id: this.ensureObjectId(orderId, 'order id'),
        note: 'Order cancelled - inventory returned',
      });

      if (session) {
        transaction.$session(session);
      }

      const savedTransaction = await transaction.save();
      transactions.push(savedTransaction);

      // Emit realtime update
      this.realtimeGateway.emitToAllAdmins('inventory:updated', {
        productId: item.product_id,
        action: 'order_return',
        quantity: item.quantity,
        remaining: quantityAfter,
      });
    }

    return transactions;
  }
}
