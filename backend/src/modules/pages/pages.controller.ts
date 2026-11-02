import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PagesService } from './pages.service.js';
import { CreatePageDto, UpdatePageDto } from './dto/page.dto.js';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@ApiTags('Pages (Trang Fanpage)')
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo trang Fanpage mới' })
  async createPage(@Request() req: AuthenticatedRequest, @Body() dto: CreatePageDto) {
    return this.pagesService.createPage(req.user.sub, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách các trang tôi quản lý' })
  async getMyPages(@Request() req: AuthenticatedRequest) {
    return this.pagesService.getMyPages(req.user.sub);
  }

  @Get('explore')
  @ApiOperation({ summary: 'Khám phá danh sách các trang' })
  async explorePages(
    @Query('q') q?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.pagesService.explorePages(q, limit ? Number(limit) : 20, offset ? Number(offset) : 0);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một trang theo slug' })
  async getPageBySlug(
    @Param('slug') slug: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    const viewerId = req?.user?.sub;
    return this.pagesService.getPageBySlug(slug, viewerId);
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Theo dõi hoặc bỏ theo dõi một trang' })
  async toggleFollowPage(
    @Param('id') pageId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.pagesService.toggleFollowPage(pageId, req.user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật thông tin trang' })
  async updatePage(
    @Param('id') pageId: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdatePageDto,
  ) {
    return this.pagesService.updatePage(pageId, req.user.sub, dto);
  }
}
