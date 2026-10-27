import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB (video/ảnh)

function isAllowedMediaType(mimetype?: string, originalname?: string): boolean {
  if (mimetype) {
    if (mimetype.startsWith('image/')) return true;
    if (mimetype.startsWith('video/')) return true;
  }
  if (originalname) {
    const ext = originalname.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
      return true;
    }
  }
  return false;
}

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post()
  @ApiOperation({ summary: 'Tải lên hình ảnh hoặc video lên Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  async uploadMedia(
    @UploadedFile()
    file?: {
      buffer: Buffer;
      mimetype?: string;
      originalname?: string;
      size?: number;
    },
  ) {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Vui lòng chọn tệp ảnh hoặc video để tải lên');
    }

    if (!isAllowedMediaType(file.mimetype, file.originalname)) {
      throw new BadRequestException('Chỉ hỗ trợ tệp hình ảnh (JPG, PNG, WEBP, GIF) hoặc video (MP4, WEBM, MOV)');
    }

    const isVideo = file.mimetype?.startsWith('video/') || false;
    const result = await this.cloudinaryService.uploadBuffer(file.buffer, {
      folder: 'chatapp/media',
      resource_type: isVideo ? 'video' : 'auto',
      filename: file.originalname,
    });

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format,
      bytes: result.bytes,
    };
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tải ảnh đại diện lên Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  async uploadAvatar(
    @UploadedFile()
    file?: {
      buffer: Buffer;
      mimetype?: string;
      originalname?: string;
    },
  ) {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Vui lòng chọn ảnh đại diện để tải lên');
    }

    if (file.mimetype && !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Ảnh đại diện phải là tệp hình ảnh (JPG, PNG, WEBP, GIF)');
    }

    const result = await this.cloudinaryService.uploadBuffer(file.buffer, {
      folder: 'chatapp/avatars',
      resource_type: 'image',
    });

    return {
      success: true,
      url: result.secure_url,
      avatar: result.secure_url,
      public_id: result.public_id,
    };
  }

  @Post('cover')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tải ảnh bìa hồ sơ lên Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    }),
  )
  async uploadCover(
    @UploadedFile()
    file?: {
      buffer: Buffer;
      mimetype?: string;
      originalname?: string;
    },
  ) {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Vui lòng chọn ảnh bìa để tải lên');
    }

    if (file.mimetype && !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Ảnh bìa phải là tệp hình ảnh (JPG, PNG, WEBP, GIF)');
    }

    const result = await this.cloudinaryService.uploadBuffer(file.buffer, {
      folder: 'chatapp/covers',
      resource_type: 'image',
    });

    return {
      success: true,
      url: result.secure_url,
      cover: result.secure_url,
      public_id: result.public_id,
    };
  }
}
