// src/modules/users/entities/user.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserRepository = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  phone: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: false })
  password?: string; // Không bắt buộc cho tài khoản Google/Facebook

  @Prop({ required: false })
  firebaseUid?: string; // Liên kết Firebase

  @Prop({ required: false })
  avatar?: string; // Ảnh đại diện Google/Facebook

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: false })
  isBan: boolean;

  @Prop({ default: 'user' })
  role: string;

  @Prop({ required: false, type: String })
  refreshToken?: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ name: 'text' });
