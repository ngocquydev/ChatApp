// src/modules/users/users.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserRepository } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserRepository>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { name, phone, email, password, role } = createUserDto;

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new BadRequestException('Email đã được sử dụng!');
    }

    if (phone) {
      const existingPhone = await this.userModel.findOne({ phone });
      if (existingPhone) {
        throw new BadRequestException('Số điện thoại này đã được sử dụng!');
      }
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = new this.userModel({
      name,
      phone,
      email,
      password: hashedPassword,
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
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    };
  }

  findAll() {
    return this.userModel.find({ isDeleted: false }).exec();
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
}
