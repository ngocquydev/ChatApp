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

  @Prop({ required: true })
  password: string;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: false })
  isBan: boolean;

  @Prop({ default: 'user' })
  role: string; // 'user', 'admin'
  @Prop({ required: false })
  refreshToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Đánh Text Index cho name để hỗ trợ tìm kiếm
UserSchema.index({ name: 'text' });
