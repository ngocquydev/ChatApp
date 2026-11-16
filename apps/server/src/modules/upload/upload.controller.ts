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
import { savePostImage } from '../posts/post-image.util.js';

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100MB (tệp đa phương tiện & tài liệu)

// Danh sách các định dạng nguy hiểm bị cấm tuyệt đối để đảm bảo an toàn hệ thống (OWASP A03 / RCE Prevention)
const BLOCKED_FILE_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'vbs', 'msi', 'dll', 'com', 'scr',
  'ps1', 'php', 'phtml', 'jar', 'jsp', 'asp', 'aspx', 'cgi',
]);

function isAllowedMediaType(mimetype?: string, originalname?: string): boolean {
  if (originalname) {
    const ext = originalname.split('.').pop()?.toLowerCase();
    if (ext && BLOCKED_FILE_EXTENSIONS.has(ext)) {
      return false;
    }
  }
  return true;
}

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tải lên hình ảnh, video, âm thanh hoặc tệp tài liệu lên đến 100MB' })
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
      throw new BadRequestException('Vui lòng chọn tệp để tải lên (tối đa 100MB)');
    }

    if (!isAllowedMediaType(file.mimetype, file.originalname)) {
      throw new BadRequestException('Định dạng tệp không được phép tải lên vì lý do an toàn');
    }

    const isVideo = file.mimetype?.startsWith('video/') || false;
    const isAudio = file.mimetype?.startsWith('audio/') || false;
    const isImage = file.mimetype?.startsWith('image/') || false;

    let resourceType: 'image' | 'video' | 'raw' = 'raw';
    if (isVideo || isAudio) {
      resourceType = 'video';
    } else if (isImage) {
      resourceType = 'image';
    } else if (file.originalname) {
      const ext = file.originalname.split('.').pop()?.toLowerCase();
      if (ext && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'ico', 'heic', 'tiff'].includes(ext)) {
        resourceType = 'image';
      } else if (ext && ['mp4', 'webm', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) {
        resourceType = 'video';
      } else {
        resourceType = 'raw';
      }
    }

    const isCloudinaryReady = typeof this.cloudinaryService?.isConfigured === 'function'
      ? this.cloudinaryService.isConfigured()
      : Boolean(this.cloudinaryService);

    if (isCloudinaryReady) {
      try {
        const result = await this.cloudinaryService.uploadBuffer(file.buffer, {
          folder: 'chatapp/media',
          resource_type: resourceType,
          filename: file.originalname,
          use_filename: true,
          unique_filename: true,
        });

        return {
          success: true,
          url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
          format: result.format,
          bytes: result.bytes,
          original_filename: file.originalname,
        };
      } catch {
        // Fallback lưu cục bộ nếu Cloudinary gặp sự cố
      }
    }

    const localUrl = await savePostImage(file.buffer);
    return {
      success: true,
      url: localUrl,
      public_id: 'local',
      resource_type: resourceType,
      format: file.originalname?.split('.').pop() || 'bin',
      bytes: file.buffer.length,
      original_filename: file.originalname,
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

    const isCloudinaryReady = typeof this.cloudinaryService?.isConfigured === 'function'
      ? this.cloudinaryService.isConfigured()
      : Boolean(this.cloudinaryService);

    if (isCloudinaryReady) {
      try {
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
      } catch {
        // Fallback lưu cục bộ nếu Cloudinary gặp sự cố
      }
    }

    const localUrl = await savePostImage(file.buffer);
    return {
      success: true,
      url: localUrl,
      avatar: localUrl,
      public_id: 'local',
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

    const isCloudinaryReady = typeof this.cloudinaryService?.isConfigured === 'function'
      ? this.cloudinaryService.isConfigured()
      : Boolean(this.cloudinaryService);

    if (isCloudinaryReady) {
      try {
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
      } catch {
        // Fallback lưu cục bộ nếu Cloudinary gặp sự cố
      }
    }

    const localUrl = await savePostImage(file.buffer);
    return {
      success: true,
      url: localUrl,
      cover: localUrl,
      public_id: 'local',
    };
  }
}
