// src/modules/users/users.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserRepository } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserRepository>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { name, phone, email, password, role } = createUserDto;

    // 1. Kiểm tra xem email đã tồn tại trong hệ thống hay chưa
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new BadRequestException(
        'Email này đã được sử dụng bởi tài khoản khác!',
      );
    }

    // 2. Kiểm tra xem số điện thoại đã tồn tại chưa (nếu có nhập)
    if (phone) {
      const existingPhone = await this.userModel.findOne({ phone });
      if (existingPhone) {
        throw new BadRequestException('Số điện thoại này đã được đăng ký!');
      }
    }

    // 3. Mã hóa mật khẩu bằng bcrypt (saltRounds = 10)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. Tạo bản ghi người dùng mới và lưu vào MongoDB
    const newUser = new this.userModel({
      name,
      phone,
      email,
      password: hashedPassword,
      role: role || 'user', // Mặc định là 'user' nếu không truyền
      isDeleted: false,
      isBan: false,
    });

    await newUser.save();

    // 5. Trả về kết quả thành công (ẩn mật khẩu)
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

  findOne(id: string) {
    return this.userModel.findById(id).exec();
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: string) {
    return `This action removes a #${id} user`;
  }
}
