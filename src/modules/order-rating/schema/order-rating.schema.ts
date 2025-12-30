import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

@Schema({ timestamps: true })
export class OrderRating {  
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  order_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ min: 1, max: 5, required: true })
  rating_overall: number;

  @Prop({ min: 1, max: 5 })
  rating_product_quality?: number;

  @Prop({ min: 1, max: 5 })
  rating_packaging?: number;

  @Prop({ min: 1, max: 5 })
  rating_delivery_time?: number;

  @Prop({ min: 1, max: 5 })
  rating_shipper?: number;

  @Prop()
  addmin_respone?: string;
    
  @Prop({type: Date, default: null})
  addmin_respone_time?: Date;

  @Prop()
  comment?: string;

  @Prop([String])
  images?: string[];
}


export const OrderRatingSchema = SchemaFactory.createForClass(OrderRating);
