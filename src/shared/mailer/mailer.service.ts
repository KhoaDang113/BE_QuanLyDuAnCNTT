import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SendEmailDto } from './dto/send-email.dto';
import { Order, OrderItem } from 'src/modules/order/schema/order.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Product,
  ProductDocument,
} from 'src/modules/catalog/schema/product.schema';

@Injectable()
export class MailerService {
  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async sendEmail(sendEmailDto: SendEmailDto): Promise<{ success: boolean }> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"No-Reply" <no-reply@example.com>',
        to: sendEmailDto.to,
        subject: sendEmailDto.subject,
        html: sendEmailDto.html,
      });
      return { success: true };
    } catch (error) {
      console.log('error', error);
      throw new Error('Failed to send email');
    }
  }

  async sendCompanyInvoice(order: Order, invoiceImageUrl?: string) {
    if (!order.is_company_invoice || !order.invoice_info?.email) return;

    const to = order.invoice_info.email;
    const subject = `Hóa đơn công ty cho đơn hàng #${order._id.toString()}`;

    const resolvedNames = await Promise.all(
      (order.items || []).map(async (item: OrderItem) => {
        const pid = item.product_id;
        if (pid && typeof pid === 'object' && 'name' in pid) {
          return pid.name as string;
        }

        try {
          const prod = await this.productModel
            .findById(pid)
            .select('name')
            .lean();
          return prod?.name || String(pid);
        } catch {
          return String(pid);
        }
      }),
    );

    const itemsHtml = (order.items || [])
      .map((item: OrderItem, idx: number) => {
        const prodName = resolvedNames[idx] || String(item.product_id);
        return `
          <tr>
            <td style="padding:4px 8px;border:1px solid #ddd;">${idx + 1}</td>
            <td style="padding:4px 8px;border:1px solid #ddd;">
              ${prodName}
            </td>
            <td style="padding:4px 8px;border:1px solid #ddd;text-align:right;">
              ${item.quantity}
            </td>
            <td style="padding:4px 8px;border:1px solid #ddd;text-align:right;">
              ${item.total_price.toLocaleString('vi-VN')} ₫
            </td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .invoice-container { max-width: 600px; margin: 0 auto; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e5e5e5; }
          .header { background: linear-gradient(135deg, #007E42 0%, #00a855 100%); padding: 30px 20px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
          .content { padding: 30px; }
          .info-group { margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px dashed #e0e0e0; }
          .info-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
          .info-value { font-size: 15px; color: #333; font-weight: 500; }
          .highlight { color: #007E42; font-weight: 700; }
          .table-container { margin-top: 10px; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          th { background: #f8f9fa; color: #444; font-weight: 600; text-align: left; padding: 12px 15px; border-bottom: 2px solid #eee; }
          td { padding: 12px 15px; border-bottom: 1px solid #f0f0f0; color: #555; }
          tr:last-child td { border-bottom: none; }
          .total-row td { background: #fcfcfc; font-weight: 700; color: #007E42; font-size: 16px; border-top: 2px solid #eee; }
          .footer { background: #f8fbf9; padding: 20px; text-align: center; font-size: 13px; color: #666; border-top: 1px solid #eee; }
          .img-preview { margin-top: 25px; text-align: center; background: #f5f5f5; padding: 15px; border-radius: 8px; }
          .img-preview img { max-width: 100%; height: auto; border-radius: 4px; border: 1px solid #ddd; }
          .btn-view { display: inline-block; margin-top: 10px; font-size: 13px; color: #007E42; text-decoration: none; font-weight: 500; }
        </style>
      </head>
      <body style="margin: 0; padding: 20px; background-color: #f4f4f4;">
        <div class="invoice-container">
          <!-- Header -->
          <div class="header">
            <h1>Hóa Đơn Điện Tử</h1>
            <div style="font-size: 13px; opacity: 0.9; margin-top: 5px;">Web Siêu Thi - Fresh & Quality</div>
          </div>

          <!-- Content -->
          <div class="content">
            <!-- Company Info & Order Info Grid -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
              <tr>
                <td width="50%" valign="top" style="padding-right: 15px; border: none;">
                  <div class="info-label">Thông tin xuất hóa đơn</div>
                  <div class="info-value" style="margin-bottom: 5px;">${order.invoice_info.company_name}</div>
                  <div style="font-size: 13px; color: #666; margin-bottom: 3px;">MST: ${order.invoice_info.tax_code}</div>
                  <div style="font-size: 13px; color: #666;">${order.invoice_info.company_address}</div>
                </td>
                <td width="50%" valign="top" style="padding-left: 15px; border: none;">
                  <div class="info-label">Thông tin đơn hàng</div>
                  <div class="info-value" style="margin-bottom: 5px;">#${order._id.toString().slice(-8).toUpperCase()}</div>
                  <div style="font-size: 13px; color: #666;">Ngày tạo: ${new Date((order as any).created_at || (order as any).createdAt || Date.now()).toLocaleDateString('vi-VN')}</div>
                  <div style="font-size: 13px; color: #666;">Trạng thái: <span style="color: #007E42;">Đã xác nhận</span></div>
                </td>
              </tr>
            </table>

            <!-- Product Table -->
            <div class="info-label">Chi tiết sản phẩm</div>
            <div class="table-container">
              <table width="100%">
                <thead>
                  <tr>
                    <th width="5%">#</th>
                    <th width="55%">Sản phẩm</th>
                    <th width="15%" style="text-align: center;">SL</th>
                    <th width="25%" style="text-align: right;">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                <tr style="border-top: 2px solid #eee;">
                  <td colspan="3" style="text-align: right; padding-right: 20px; padding-top: 15px; color: #666;">Phí vận chuyển:</td>
                  <td style="text-align: right; padding-top: 15px; color: #666;">${(order.shipping_fee || 0).toLocaleString('vi-VN')} ₫</td>
                </tr>
                <tr class="total-row">
                  <td colspan="3" style="text-align: right; padding-right: 20px;">Tổng cộng:</td>
                  <td style="text-align: right;">${order.total.toLocaleString('vi-VN')} ₫</td>
                </tr>
              </tbody>
              </table>
            </div>

            <!-- Invoice Image Preview -->
            ${
              invoiceImageUrl
                ? `
            <div class="img-preview">
              <div class="info-label" style="text-align: center; margin-bottom: 10px;">Ảnh chụp hóa đơn</div>
              <img src="${invoiceImageUrl}" alt="Invoice Image" />
              <br/>
              <a href="${invoiceImageUrl}" target="_blank" class="btn-view">Xem kích thước đầy đủ ↗</a>
            </div>
            `
                : ''
            }
          </div>

          <!-- Footer -->
          <div class="footer">
            <p style="margin: 0 0 5px;">Cảm ơn Quý khách đã tin tưởng và mua sắm tại <b>Web Siêu Thị</b>.</p>
            <p style="margin: 0; font-size: 12px; color: #999;">Đây là email tự động, vui lòng không trả lời email này.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to, subject, html });
  }
}
