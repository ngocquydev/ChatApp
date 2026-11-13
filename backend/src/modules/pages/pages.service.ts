import {
  Injectable,
  OnModuleInit,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Page, PageDocument } from './schemas/page.schema.js';
import { CreatePageDto, UpdatePageDto } from './dto/page.dto.js';

@Injectable()
export class PagesService implements OnModuleInit {
  constructor(
    @InjectModel(Page.name)
    private readonly pageModel: Model<PageDocument>,
  ) {}

  async onModuleInit() {
    try {
      const systemId = new Types.ObjectId('000000000000000000000001');
      await this.pageModel.deleteMany({ creatorId: systemId }).exec();
    } catch {
      // Bỏ qua lỗi nếu MongoDB chưa sẵn sàng khi khởi động
    }
  }

  async createPage(creatorId: string, dto: CreatePageDto): Promise<PageDocument> {
    const slug = dto.slug.trim().toLowerCase();
    const existing = await this.pageModel.findOne({ slug }).exec();
    if (existing) {
      throw new ConflictException('Đường dẫn (slug) của trang đã tồn tại, vui lòng chọn tên khác');
    }

    const objCreatorId = new Types.ObjectId(creatorId);

    const page = await this.pageModel.create({
      name: dto.name.trim(),
      slug,
      bio: dto.bio?.trim() || '',
      category: dto.category?.trim() || 'Cộng đồng',
      avatar: dto.avatar || null,
      coverImage: dto.coverImage || null,
      creatorId: objCreatorId,
      adminIds: [objCreatorId],
      moderatorIds: [],
      followers: [objCreatorId],
      followerCount: 1,
      isVerified: false,
      isDeleted: false,
    });

    return page;
  }

 
  async getPageBySlug(slug: string, viewerId?: string): Promise<{
    page: PageDocument;
    isFollowing: boolean;
    isAdmin: boolean;
  }> {
    const page = await this.pageModel
      .findOne({ slug: slug.toLowerCase(), isDeleted: false })
      .populate('creatorId', 'name avatar')
      .populate('adminIds', 'name avatar')
      .exec();

    if (!page) {
      throw new NotFoundException('Không tìm thấy trang');
    }

    const viewerObjId = viewerId ? new Types.ObjectId(viewerId) : null;
    const isFollowing = viewerObjId
      ? page.followers.some((f) => f.toString() === viewerId)
      : false;
    const referenceId = (value: Types.ObjectId): string =>
      String((value as Types.ObjectId & { _id?: Types.ObjectId })._id ?? value);
    const isAdmin = viewerObjId
      ? page.adminIds.some((a) => referenceId(a) === viewerId) || referenceId(page.creatorId) === viewerId
      : false;

    return { page, isFollowing, isAdmin };
  }

  async toggleFollowPage(pageId: string, userId: string): Promise<{
    isFollowing: boolean;
    followerCount: number;
  }> {
    if (!Types.ObjectId.isValid(pageId)) {
      throw new BadRequestException('Mã trang không hợp lệ');
    }

    const page = await this.pageModel.findById(pageId).exec();
    if (!page || page.isDeleted) {
      throw new NotFoundException('Trang không tồn tại');
    }

    const objUserId = new Types.ObjectId(userId);
    const isFollowing = page.followers.some((f) => f.toString() === userId);

    if (isFollowing) {
      page.followers = page.followers.filter((f) => f.toString() !== userId);
    } else {
      page.followers.push(objUserId);
    }

    page.followerCount = page.followers.length;
    await page.save();

    return {
      isFollowing: !isFollowing,
      followerCount: page.followerCount,
    };
  }

  async setFollowPage(pageId: string, userId: string, shouldFollow: boolean): Promise<{
    isFollowing: boolean;
    followerCount: number;
  }> {
    if (!Types.ObjectId.isValid(pageId)) {
      throw new BadRequestException('Mã trang không hợp lệ');
    }
    const pageObjectId = new Types.ObjectId(pageId);
    const userObjectId = new Types.ObjectId(userId);
    const page = await this.pageModel.findOneAndUpdate(
      {
        _id: pageObjectId,
        isDeleted: false,
        followers: shouldFollow ? { $ne: userObjectId } : userObjectId,
      },
      shouldFollow
        ? { $addToSet: { followers: userObjectId }, $inc: { followerCount: 1 } }
        : { $pull: { followers: userObjectId }, $inc: { followerCount: -1 } },
      { new: true },
    ).exec() ?? await this.pageModel.findById(pageId).exec();
    if (!page || page.isDeleted) {
      throw new NotFoundException('Trang không tồn tại');
    }
    return { isFollowing: shouldFollow, followerCount: page.followerCount };
  }

  async getMyPages(userId: string): Promise<PageDocument[]> {
    const objUserId = new Types.ObjectId(userId);
    return this.pageModel
      .find({
        $or: [{ creatorId: objUserId }, { adminIds: objUserId }],
        isDeleted: false,
      })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getFollowedPages(userId: string): Promise<PageDocument[]> {
    const objUserId = new Types.ObjectId(userId);
    return this.pageModel
      .find({
        followers: objUserId,
        creatorId: { $ne: objUserId },
        adminIds: { $ne: objUserId },
        isDeleted: false,
      })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getExploreCategories(): Promise<string[]> {
    return this.pageModel.distinct('category', { isDeleted: false }).exec();
  }

  async explorePages(keyword?: string, category?: string, limit = 20, offset = 0): Promise<PageDocument[]> {
    const query: Record<string, unknown> = { isDeleted: false };
    if (category?.trim()) query.category = category.trim();
    if (keyword?.trim()) {
      const escapedKeyword = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escapedKeyword, $options: 'i' } },
        { bio: { $regex: escapedKeyword, $options: 'i' } },
      ];
      if (!category?.trim()) {
        (query.$or as object[]).push({ category: { $regex: escapedKeyword, $options: 'i' } });
      }
    }

    return this.pageModel
      .find(query)
      .sort({ followerCount: -1, createdAt: -1, _id: -1 })
      .skip(offset)
      .limit(limit)
      .exec();
  }

  async updatePage(pageId: string, userId: string, dto: UpdatePageDto): Promise<PageDocument> {
    if (!Types.ObjectId.isValid(pageId)) {
      throw new BadRequestException('Mã trang không hợp lệ');
    }

    const page = await this.pageModel.findById(pageId).exec();
    if (!page || page.isDeleted) {
      throw new NotFoundException('Trang không tồn tại');
    }

    const isAdmin =
      page.creatorId.toString() === userId ||
      page.adminIds.some((a) => a.toString() === userId);

    if (!isAdmin) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa trang này');
    }

    if (dto.name) page.name = dto.name.trim();
    if (dto.bio !== undefined) page.bio = dto.bio.trim();
    if (dto.category) page.category = dto.category.trim();
    if (dto.avatar !== undefined) page.avatar = dto.avatar;
    if (dto.coverImage !== undefined) page.coverImage = dto.coverImage;

    page.updatedAt = new Date();
    await page.save();

    return page;
  }
}

