import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../schema/order.schema';
import { Product, ProductDocument } from '../../catalog/schema/product.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class StatsService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  // Dashboard statistics for admin
  async getDashboardStats(): Promise<{
    totalUsers: number;
    totalProducts: number;
    todayDeliveredOrders: number;
    monthlyRevenue: number;
    weeklyRevenue: Array<{ date: string; revenue: number; orders: number }>;
    topProducts: Array<{ productId: string; name: string; quantity: number }>;
    lowStockProducts: Array<{
      id: string;
      name: string;
      quantity: number;
      unit: string;
    }>;
    recentOrders: Array<{
      id: string;
      customer: string;
      total: number;
      status: string;
      createdAt: Date;
    }>;
  }> {
    const now = new Date();

    // Start of today
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Start of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 7 days ago
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    console.log('123');

    // Run all queries in parallel
    const [
      totalUsers,
      totalProducts,
      todayDeliveredOrders,
      monthlyRevenueResult,
      weeklyRevenueResult,
      topProductsResult,
      lowStockProducts,
      recentOrdersResult,
    ] = await Promise.all([
      // 1. Total users (excluding admin)
      this.userModel.countDocuments({ role: { $ne: 'admin' } }),

      // 2. Total active products
      this.productModel.countDocuments({ is_deleted: false, is_active: true }),

      // 3. Today's delivered orders count
      this.orderModel.countDocuments({
        status: 'delivered',
        delivered_at: { $gte: startOfToday },
        is_deleted: false,
      }),

      // 4. Monthly revenue (sum of delivered orders this month)
      this.orderModel.aggregate([
        {
          $match: {
            status: 'delivered',
            delivered_at: { $gte: startOfMonth },
            is_deleted: false,
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
          },
        },
      ]),

      // 5. Weekly revenue (last 7 days)
      this.orderModel.aggregate([
        {
          $match: {
            status: 'delivered',
            delivered_at: { $gte: sevenDaysAgo },
            is_deleted: false,
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$delivered_at' },
            },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 6. Top 5 best-selling products
      this.orderModel.aggregate([
        {
          $match: {
            status: 'delivered',
            is_deleted: false,
          },
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product_id',
            totalQuantity: { $sum: '$items.quantity' },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: '$product' },
        {
          $project: {
            productId: '$_id',
            name: '$product.name',
            quantity: '$totalQuantity',
          },
        },
      ]),

      // 7. Low stock products (quantity <= 10)
      this.productModel
        .find({
          quantity: { $lte: 10 },
          is_deleted: false,
          is_active: true,
        })
        .select('name quantity unit')
        .limit(10)
        .lean(),

      // 8. 5 most recent orders
      this.orderModel
        .find({ is_deleted: false })
        .populate('user_id', 'name')
        .select('user_id total status created_at')
        .sort({ created_at: -1 })
        .limit(5)
        .lean(),
    ]);

    // Format weekly revenue with all 7 days
    const weeklyRevenue: Array<{
      date: string;
      revenue: number;
      orders: number;
    }> = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const found = weeklyRevenueResult.find(
        (r: { _id: string; revenue: number; orders: number }) =>
          r._id === dateStr,
      );

      weeklyRevenue.push({
        date: dateStr,
        revenue: found ? found.revenue : 0,
        orders: found ? found.orders : 0,
      });
    }

    // Format recent orders
    const recentOrders = recentOrdersResult.map((order: any) => ({
      id: order._id.toString(),
      customer: order.user_id?.name || 'Unknown',
      total: order.total,
      status: order.status,
      createdAt: order.created_at,
    }));

    // Format low stock products
    const formattedLowStock = lowStockProducts.map((p: any) => ({
      id: p._id.toString(),
      name: p.name,
      quantity: p.quantity,
      unit: p.unit || 'cái',
    }));

    // Format top products
    const topProducts = topProductsResult.map((p: any) => ({
      productId: p.productId.toString(),
      name: p.name,
      quantity: p.quantity,
    }));

    return {
      totalUsers,
      totalProducts,
      todayDeliveredOrders,
      monthlyRevenue: monthlyRevenueResult[0]?.totalRevenue || 0,
      weeklyRevenue,
      topProducts,
      lowStockProducts: formattedLowStock,
      recentOrders,
    };
  }
}
