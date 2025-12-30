import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import bcrypt from 'bcrypt';
import { IUser } from '../../../types/user.type';
export type UserDocument = User & Document & IUser;

@Schema({ timestamps: true })
export class User {
  _id?: Types.ObjectId;
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ unique: true, lowercase: true, sparse: true })
  email?: string;

  @Prop()
  phone?: string;

  @Prop({ select: false })
  password?: string;

  @Prop({ enum: ['user', 'staff', 'admin', 'shipper'], default: 'user' })
  role: string;

  @Prop({ type: Date, default: null })
  emailVerifiedAt?: Date;

  @Prop({ default: false })
  isPhoneVerified: boolean;

  @Prop()
  phoneVerificationCode?: number;

  @Prop()
  phoneVerificationExpires?: Date;

  @Prop()
  loginSmsCode?: number;

  @Prop()
  loginSmsExpires?: Date;

  @Prop({ enum: ['local', 'google', 'facebook'], default: 'local' })
  authProvider: string;

  @Prop()
  providerId?: string;

  @Prop()
  avatar?: string;

  @Prop({ enum: ['male', 'female', 'other'], default: null })
  gender?: string;

  @Prop()
  resetPasswordToken?: string;

  @Prop()
  resetPasswordExpires?: Date;

  @Prop({ default: false })
  isLocked: boolean;

  generateVerificationCode(): number {
    const code = Math.floor(100000 + Math.random() * 900000);
    this.phoneVerificationCode = code;
    this.phoneVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);
    return code;
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

UserSchema.methods.generateVerificationCode = function (this: User): number {
  const code = Math.floor(100000 + Math.random() * 900000);
  this.phoneVerificationCode = code;
  this.phoneVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);
  return code;
};

UserSchema.index(
  { name: 'text', email: 'text', phone: 'text' },
  {
    weights: {
      name: 5,
      email: 3,
      phone: 2,
    },
  },
);
