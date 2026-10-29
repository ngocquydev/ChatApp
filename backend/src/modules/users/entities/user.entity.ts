// src/modules/users/entities/user.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserRepository = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: false,
    },
  })
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };

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

  @Prop({ required: false })
  cover?: string; // Ảnh bìa hồ sơ cá nhân

  @Prop({ type: [String], default: [] })
  photos?: string[]; // Kho lưu trữ toàn bộ ảnh cá nhân (avatar, cover, ảnh bài viết)

  @Prop({ required: false })
  bio?: string; // Giới thiệu bản thân

  @Prop({ required: false, type: Date })
  dateOfBirth?: Date; // Ngày sinh người dùng

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
UserSchema.index({ name: 1 });
UserSchema.index({ location: '2dsphere' });
UserSchema.index({ isDeleted: 1, isBan: 1, name: 1 });
