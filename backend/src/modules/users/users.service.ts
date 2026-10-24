// src/modules/users/users.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserRepository } from './entities/user.entity.js';
import { CreateUserData } from './types/user.types.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserRepository>,
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

  async searchUsers(keyword?: string, excludeUserId?: string) {
    const query: Record<string, any> = {
      isDeleted: { $ne: true },
      isBan: { $ne: true },
    };
    if (excludeUserId) {
      query._id = Types.ObjectId.isValid(excludeUserId)
        ? { $ne: new Types.ObjectId(excludeUserId) }
        : { $ne: excludeUserId };
    }
    if (keyword && keyword.trim()) {
      const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }
    return this.userModel
      .find(query)
      .select('name email avatar phone bio')
      .limit(20)
      .exec();
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
    return this.userModel
      .findByIdAndUpdate(userId, updateData, { new: true })
      .exec();
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
