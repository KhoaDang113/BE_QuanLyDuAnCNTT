import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from '../schema/cart.schema';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name)
    private cartModel: Model<CartDocument>,
  ) {}

  private ensureObjectId(id: string, label = 'id'): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }
    return new Types.ObjectId(id);
  }

  async addItem(userId: string, productId: string): Promise<Cart> {
    const userObjectId = this.ensureObjectId(userId, 'user id');
    const productObjectId = this.ensureObjectId(productId, 'product id');
    const inc = await this.cartModel
      .findOneAndUpdate(
        { user_id: userObjectId, 'items.product_id': productObjectId },
        { $inc: { 'items.$.quantity': 1 } },
        { new: true },
      )
      .select('items user_id');

    if (inc) return inc as Cart;

    const created = await this.cartModel
      .findOneAndUpdate(
        { user_id: userObjectId, 'items.product_id': { $ne: productObjectId } },
        { $push: { items: { product_id: productObjectId, quantity: 1 } } },
        { upsert: true, new: true },
      )
      .select('items user_id');

    return created as Cart;
  }

  async removeItem(userId: string, productId: string): Promise<Cart> {
    const userObjectId = this.ensureObjectId(userId, 'user id');
    const productObjectId = this.ensureObjectId(productId, 'product id');

    const updated = await this.cartModel
      .findOneAndUpdate(
        { user_id: userObjectId },
        { $pull: { items: { product_id: productObjectId } } },
        { new: true },
      )
      .select('items user_id ');

    if (!updated) {
      throw new NotFoundException('Cart not found');
    }

    return updated;
  }

  async getCarts(userId: string): Promise<Cart[]> {
    const userObjectId = this.ensureObjectId(userId, 'user id');
    const carts = await this.cartModel
      .find({ user_id: userObjectId })
      .select('items user_id')
      .populate(
        'items.product_id',
        'name slug unit_price image_primary discount_percent final_price stock_status',
      );
    return carts as Cart[];
  }
}
