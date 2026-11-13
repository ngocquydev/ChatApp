import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  HttpCode,
  HttpStatus,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard.js';
import { PagesService } from './pages.service.js';
import { CreatePageDto, UpdatePageDto } from './dto/page.dto.js';
import { ExplorePagesDto } from './dto/explore-pages.dto.js';

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

  @Get('following')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy các Trang tôi theo dõi nhưng không quản lý' })
  async getFollowedPages(@Request() req: AuthenticatedRequest) {
    return this.pagesService.getFollowedPages(req.user.sub);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Lấy danh mục của các trang đang hoạt động' })
  async getExploreCategories() {
    return this.pagesService.getExploreCategories();
  }

  @Get('explore')
  @ApiOperation({ summary: 'Khám phá danh sách các trang' })
  async explorePages(
    @Query() query: ExplorePagesDto,
  ) {
    return this.pagesService.explorePages(query.q, query.category, query.limit, query.offset);
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một trang theo slug' })
  async getPageBySlug(
    @Param('slug') slug: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    const viewerId = req?.user?.sub;
    return this.pagesService.getPageBySlug(slug, viewerId);
  }

  @Post(':id/follow')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Theo dõi hoặc bỏ theo dõi một trang' })
  async toggleFollowPage(
    @Param('id') pageId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.pagesService.toggleFollowPage(pageId, req.user.sub);
  }

  @Put(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Theo dõi Trang; gửi lại yêu cầu không đảo trạng thái' })
  async followPage(@Param('id') pageId: string, @Request() req: AuthenticatedRequest) {
    return this.pagesService.setFollowPage(pageId, req.user.sub, true);
  }

  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bỏ theo dõi Trang; gửi lại yêu cầu không đảo trạng thái' })
  async unfollowPage(@Param('id') pageId: string, @Request() req: AuthenticatedRequest) {
    return this.pagesService.setFollowPage(pageId, req.user.sub, false);
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
