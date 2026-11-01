import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import * as fs from 'node:fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/roles.guard.js';
import { Roles } from '../../common/auth/roles.decorator.js';
import { BackupService } from './backup.service.js';

interface AuthenticatedRequest {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

@ApiTags('Admin Backup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách các bản sao lưu và thời gian tự động sao lưu kế tiếp' })
  async getBackups() {
    return this.backupService.listBackups();
  }

  @Post()
  @ApiOperation({ summary: 'Tạo bản sao lưu cơ sở dữ liệu thủ công ngay lập tức' })
  async createBackup(@Req() req: AuthenticatedRequest) {
    const requestedBy = req.user?.email || 'admin';
    return this.backupService.createBackup('manual', requestedBy);
  }

  @Get('download/:filename')
  @ApiOperation({ summary: 'Tải file sao lưu nén (.archive.gz) về máy tính' })
  downloadBackup(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ): StreamableFile {
    const filePath = this.backupService.getBackupFilePath(filename);
    const fileStream = fs.createReadStream(filePath);

    res.set({
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    return new StreamableFile(fileStream);
  }

  @Post('restore/:filename')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Khôi phục cơ sở dữ liệu từ bản sao lưu đã chọn' })
  async restoreBackup(@Param('filename') filename: string) {
    return this.backupService.restoreBackup(filename);
  }

  @Delete(':filename')
  @ApiOperation({ summary: 'Xóa bản sao lưu khỏi hệ thống' })
  async deleteBackup(@Param('filename') filename: string) {
    const success = await this.backupService.deleteBackup(filename);
    return { success, message: `Đã xóa bản sao lưu ${filename} thành công!` };
  }
}
