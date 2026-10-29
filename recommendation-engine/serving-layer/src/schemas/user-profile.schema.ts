import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserProfileDocument = UserProfile & Document;

@Schema({ _id: false })
export class GeoLocation {
  @Prop({ type: String, enum: ['Point'], default: 'Point' })
  type: string;

  @Prop({ type: [Number], required: true }) // [longitude, latitude]
  coordinates: number[];
}
export const GeoLocationSchema = SchemaFactory.createForClass(GeoLocation);

@Schema({ timestamps: true, collection: 'users' })
export class UserProfile {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: false })
  avatar?: string;

  @Prop({ required: false })
  bio?: string;

  @Prop({ type: [String], default: [] })
  interests: string[]; // Sở thích: ['Công nghệ', 'AI', 'Du lịch', 'Bóng đá', 'Âm nhạc']

  @Prop({ type: GeoLocationSchema, required: false })
  location?: GeoLocation;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const UserProfileSchema = SchemaFactory.createForClass(UserProfile);

// Đánh chỉ mục 2dsphere bắt buộc cho truy vấn vị trí địa lý bán kính 10km (Geo-Proximity)
UserProfileSchema.index({ location: '2dsphere' });
UserProfileSchema.index({ interests: 1 });
