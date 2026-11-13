import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PageDocument = Page & Document;

@Schema({ timestamps: true })
export class Page {
  @Prop({ required: true, trim: true, minlength: 2, maxlength: 100 })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ default: '', maxlength: 500 })
  bio: string;

  @Prop({ default: 'Cộng đồng' })
  category: string;

  @Prop({ type: String, default: null })
  avatar?: string | null;

  @Prop({ type: String, default: null })
  coverImage?: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  creatorId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  adminIds: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  moderatorIds: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  followers: Types.ObjectId[];

  @Prop({ type: Number, default: 0 })
  followerCount: number;

  @Prop({ type: Boolean, default: false })
  isVerified: boolean;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PageSchema = SchemaFactory.createForClass(Page);
PageSchema.set('toJSON', {
  transform: (_document, result) => {
    const publicPage = result as unknown as Record<string, unknown>;
    delete publicPage.followers;
    delete publicPage.adminIds;
    delete publicPage.moderatorIds;
    return result;
  },
});
PageSchema.index({ name: 'text', bio: 'text' });
PageSchema.index({ creatorId: 1, _id: -1 });
PageSchema.index({ adminIds: 1 });
PageSchema.index({ followers: 1, isDeleted: 1, updatedAt: -1 });
