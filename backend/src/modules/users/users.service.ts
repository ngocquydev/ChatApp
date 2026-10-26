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
import { Neo4jService } from '../neo4j/neo4j.service.js';

/** Trần thời gian cho truy vấn tìm kiếm regex (ms) — tránh một lần tìm làm nghẽn MongoDB */
const SEARCH_MAX_TIME_MS = 8000;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserRepository>,
    @Optional() private readonly neo4jService?: Neo4jService,
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
  ) {
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
    if (keyword && keyword.trim()) {
      const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.name = { $regex: escaped, $options: 'i' };
    }
    try {
      const docs = await this.userModel
        .find(query)
        .select('name avatar phone bio')
        .sort({ _id: 1 })
        .limit(limit + 1)
        .maxTimeMS(SEARCH_MAX_TIME_MS)
        .exec();
      const hasMore = docs.length > limit;
      return { users: hasMore ? docs.slice(0, limit) : docs, hasMore };
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
}
