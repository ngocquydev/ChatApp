// src/modules/users/users.service.ts
import {
  Injectable,
  BadRequestException,
  RequestTimeoutException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserRepository } from './entities/user.entity.js';
import { CreateUserData } from './types/user.types.js';


export interface SearchUserItem {
  _id: Types.ObjectId | string;
  name: string;
  avatar?: string;
  phone?: string;
  bio?: string;
}
import { Neo4jService } from '../neo4j/neo4j.service.js';
import { RedisService } from '../redis/redis/redis.service.js';

/** Trần thời gian cho truy vấn tìm kiếm regex (ms) — tránh một lần tìm làm nghẽn MongoDB */
const SEARCH_MAX_TIME_MS = 8000;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserRepository>,
    @Optional() private readonly neo4jService?: Neo4jService,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  async create(createUserDto: CreateUserData) {
    const { name, phone, email, password, role, firebaseUid, avatar, dateOfBirth } =
      createUserDto;

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await this.userModel.findOne({ email: cleanEmail });
    if (existingUser) {
      throw new BadRequestException('Email đã được sử dụng!');
    }

    const cleanPhone = phone && typeof phone === 'string' && phone.trim() ? phone.trim() : null;
    if (cleanPhone) {
      const existingPhone = await this.userModel.findOne({ phone: cleanPhone });
      if (existingPhone) {
        throw new BadRequestException('Số điện thoại này đã được sử dụng!');
      }
    }

    let parsedDob: Date | null = null;
    if (dateOfBirth) {
      const d = new Date(dateOfBirth);
      if (!isNaN(d.getTime())) {
        parsedDob = d;
      }
    }

    let hashedPassword = null;
    if (password) {
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(password, saltRounds);
    }

    const newUser = new this.userModel({
      name: (name || 'Người dùng mới').trim(),
      phone: cleanPhone,
      email: cleanEmail,
      password: hashedPassword,
      firebaseUid: firebaseUid || null,
      avatar: avatar || null,
      dateOfBirth: parsedDob,
      role: role || 'user',
      isDeleted: false,
      isBan: false,
    });

    await newUser.save();
    this.neo4jService
      ?.syncUser({
        id: newUser._id.toString(),
        name: newUser.name,
        avatar: newUser.avatar || undefined,
      })
      .catch(() => {});

    return {
      success: true,
      message: 'Tạo người dùng thành công!',
      data: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        dateOfBirth: newUser.dateOfBirth,
        avatar: newUser.avatar,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    };
  }

  findAll() {
    return this.userModel.find({ isDeleted: false, isBan: false }).select('-password').exec();
  }

  /**
   * Tìm kiếm theo trang với con trỏ `_id` (cursor). Lấy dư 1 bản ghi để biết còn trang sau hay không.
   * Dùng cursor thay vì skip: trang kế tiếp bắt đầu quét từ `after`, không quét lại phần đã trả.
   */
  async searchUsersPage(
    keyword?: string,
    excludeUserId?: string,
    options: { limit?: number; after?: string } = {},
  ): Promise<{ users: SearchUserItem[]; hasMore: boolean }> {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
    const query: Record<string, unknown> = {
      isDeleted: { $ne: true },
      isBan: { $ne: true },
    };
    const idFilter: Record<string, unknown> = {};
    if (excludeUserId) {
      idFilter.$ne = Types.ObjectId.isValid(excludeUserId)
        ? new Types.ObjectId(excludeUserId)
        : excludeUserId;
    }
    if (options.after && Types.ObjectId.isValid(options.after)) {
      idFilter.$gt = new Types.ObjectId(options.after);
    }
    if (Object.keys(idFilter).length > 0) {
      query._id = idFilter;
    }

    const trimmed = keyword?.trim() ?? '';
    const cacheKey = trimmed
      ? `cache:search:user:${trimmed.toLowerCase()}:${excludeUserId ?? 'all'}:${options.after ?? 'start'}:${limit}`
      : null;

    // 1. Kiểm tra bộ nhớ đệm Redis (tốc độ < 1ms)
    if (cacheKey && this.redisService) {
      try {
        const cached = await this.redisService.client.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as { users: UserRepository[]; hasMore: boolean };
        }
      } catch {
        // Bỏ qua lỗi cache, tiếp tục truy vấn DB
      }
    }

    // 2. Xây dựng điều kiện tìm kiếm tối ưu
    const hasRegexChars = /[.*+?^${}()|[\]\\]/.test(trimmed);
    if (trimmed) {
      if (hasRegexChars) {
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.name = { $regex: escaped, $options: 'i' };
      } else {
        // Dùng Inverted Text Index ($text) của MongoDB: tốc độ 1ms - 5ms trên 1 triệu người dùng!
        query.$text = { $search: trimmed };
      }
    }

    try {
      const docsQuery = this.userModel
        .find(query as never)
        .select('name avatar phone bio')
        .sort({ _id: 1 })
        .limit(limit + 1)
        .maxTimeMS(SEARCH_MAX_TIME_MS);

      let docs = (await docsQuery.exec()) as unknown as SearchUserItem[];

      // Nếu từ khóa ngắn (1 - 4 ký tự) chưa tìm thấy trong $text -> dùng B-Tree range query trên index { name: 1 } (4ms - 6ms)
      if (docs.length === 0 && trimmed && !hasRegexChars && trimmed.length <= 4) {
        const upperFirst = trimmed[0].toUpperCase() + trimmed.slice(1);
        const lowerFirst = trimmed.toLowerCase();
        const makeRange = (prefix: string) => {
          const lastChar = prefix.slice(-1);
          const nextChar = String.fromCharCode(lastChar.charCodeAt(0) + 1);
          const upperLimit = prefix.slice(0, -1) + nextChar;
          return { $gte: prefix, $lt: upperLimit };
        };

        const rangeQuery: Record<string, unknown> = {
          isDeleted: query.isDeleted,
          isBan: query.isBan,
          $or: [{ name: makeRange(upperFirst) }, { name: makeRange(lowerFirst) }],
        };
        if (query._id) rangeQuery._id = query._id;

        try {
          const rangeDocs = (await this.userModel
            .find(rangeQuery as never)
            .select('name avatar phone bio')
            .limit(limit + 1)
            .maxTimeMS(SEARCH_MAX_TIME_MS)
            .exec()) as unknown as SearchUserItem[];

          if (rangeDocs && rangeDocs.length > 0) {
            docs = rangeDocs;
          }
        } catch {
          // Bỏ qua lỗi fallback
        }
      }

      const hasMore = docs.length > limit;
      const sliced = (hasMore ? docs.slice(0, limit) : docs) as SearchUserItem[];
      const res = { users: sliced, hasMore };

      if (cacheKey && this.redisService) {
        this.redisService.client.set(cacheKey, JSON.stringify(res), 'EX', 120).catch(() => {});
      }
      return res;
    } catch (err: unknown) {
      // Mã 50 = MaxTimeMSExpired: truy vấn regex phải quét quá nhiều bản ghi
      const error = err as { code?: number; codeName?: string } | null;
      if (error?.code === 50 || error?.codeName === 'MaxTimeMSExpired') {
        throw new RequestTimeoutException(
          'Tìm kiếm mất quá nhiều thời gian. Hãy nhập từ khóa cụ thể hơn.',
        );
      }
      throw err;
    }
  }

  async searchUsers(keyword?: string, excludeUserId?: string) {
    const { users } = await this.searchUsersPage(keyword, excludeUserId);
    return users;
  }
  async getStoredRefreshToken(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('refreshToken email')
      .exec();
    if (!user) {
      return null;
    }
    return {
      refreshToken: user.refreshToken,
    };
  }
  async findByIdAndUpdate(userId: string, updateData: Partial<User>) {
    const updated = await this.userModel
      .findByIdAndUpdate(userId, updateData, { new: true })
      .exec();
    if (updated?.name) {
      this.neo4jService
        ?.syncUser({
          id: userId,
          name: updated.name,
          avatar: updated.avatar || undefined,
        })
        .catch(() => {});
    }
    return updated;
  }
  async findOne(email: string) {
    const user = await this.userModel.findOne({ email }).exec();
    return user;
  }
  async findById(id: string) {
    return this.userModel.findById(id).select('-password').exec();
  }
  async findByUid(firebaseUid: string) {
    return await this.userModel.findOne({ firebaseUid }).select('-password');
  }
  async findOrCreateFirebase(firebaseData: {
    firebaseUid: string;
    email: string;
    name?: string;
    avatar?: string;
  }) {
    // 1. Tìm theo firebaseUid trước
    let user = await this.userModel.findOne({
      firebaseUid: firebaseData.firebaseUid,
    });

    if (!user) {
      // 2. Nếu chưa có uid, tìm theo email (phòng trường hợp họ đã đăng ký tài khoản thường trước đó rồi dùng Google cùng email)
      user = await this.userModel.findOne({ email: firebaseData.email });

      if (user) {
        // Nếu đã có email, cập nhật thêm firebaseUid và avatar vào tài khoản cũ
        user.firebaseUid = firebaseData.firebaseUid;
        if (!user.avatar && firebaseData.avatar) {
          user.avatar = firebaseData.avatar;
        }
        await user.save();
      } else {
        // 3. Nếu hoàn toàn chưa tồn tại, tạo mới hoàn toàn
        user = new this.userModel({
          name: firebaseData.name,
          email: firebaseData.email,
          firebaseUid: firebaseData.firebaseUid,
          avatar: firebaseData.avatar || null,
          role: 'user',
          isDeleted: false,
          isBan: false,
        });
        await user.save();
      }
    }
  }

  async findByIds(ids: (string | Types.ObjectId)[]) {
    const objectIds = ids
      .filter((id) => Types.ObjectId.isValid(id.toString()))
      .map((id) => new Types.ObjectId(id.toString()));
    return this.userModel
      .find({
        _id: { $in: objectIds },
        isDeleted: { $ne: true },
        isBan: { $ne: true },
      })
      .select('name email avatar phone bio createdAt')
      .exec();
  }

  async findActiveUsersExcluding(excludeIds: (string | Types.ObjectId)[], limit = 30) {
    const objectIds = excludeIds
      .filter((id) => Types.ObjectId.isValid(id.toString()))
      .map((id) => new Types.ObjectId(id.toString()));
    return this.userModel
      .find({
        _id: { $nin: objectIds },
        isDeleted: { $ne: true },
        isBan: { $ne: true },
      })
      .select('name email avatar phone bio createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async findNearbyUsersExcluding(
    longitude: number,
    latitude: number,
    radiusKm = 25,
    excludeIds: (string | Types.ObjectId)[] = [],
    limit = 30,
  ) {
    const objectIds = excludeIds
      .filter((id) => Types.ObjectId.isValid(id.toString()))
      .map((id) => new Types.ObjectId(id.toString()));

    return this.userModel
      .find({
        _id: { $nin: objectIds },
        isDeleted: { $ne: true },
        isBan: { $ne: true },
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: radiusKm * 1000,
          },
        },
      })
      .select('name email avatar phone bio createdAt location')
      .limit(limit)
      .exec();
  }
}
