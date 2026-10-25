import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/types/auth.types.js';
import { PostsService } from './posts.service.js';
import {
  CreateCommentDto,
  CreatePostDto,
  PageQueryDto,
  PhotosQueryDto,
  SharePostDto,
} from './dto/posts.dto.js';
import { POST_IMAGE_MAX_BYTES, savePostImage } from './post-image.util.js';

@ApiTags('Posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  private extractUserId(req: AuthenticatedRequest): string {
    const userId =
      req.user?._id?.toString() ||
      req.user?.id?.toString() ||
      (req.user as { sub?: string } | undefined)?.sub;
    if (!userId) {
      throw new UnauthorizedException('Không thể xác thực danh tính người dùng');
    }
    return userId;
  }

  @Post('images')
  @ApiOperation({ summary: 'Tải một ảnh lên cho bài viết (JPG/PNG/WEBP/GIF, tối đa 5MB)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    // Không đặt dest/storage → multer giữ file trong RAM (tối đa 5MB), sau đó tự kiểm tra magic bytes rồi mới ghi đĩa
    FileInterceptor('file', {
      limits: { fileSize: POST_IMAGE_MAX_BYTES, files: 1 },
    }),
  )
  async uploadImage(@UploadedFile() file?: { buffer: Buffer }) {
    const url = await savePostImage(file?.buffer);
    return { success: true, url };
  }

  @Get('feed')
  @ApiOperation({ summary: 'Bảng tin: bài của mình và của bạn bè (cuộn vô hạn theo con trỏ)' })
  async feed(@Req() req: AuthenticatedRequest, @Query() query: PageQueryDto) {
    const page = await this.postsService.getFeed(this.extractUserId(req), query);
    return { success: true, ...page };
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Dòng thời gian của một người dùng (tôn trọng quyền riêng tư)' })
  async userPosts(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Query() query: PageQueryDto,
  ) {
    const page = await this.postsService.getUserPosts(this.extractUserId(req), userId, query);
    return { success: true, ...page };
  }

  @Get('user/:userId/photos')
  @ApiOperation({ summary: 'Ảnh gần đây của một người dùng' })
  async userPhotos(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Query() query: PhotosQueryDto,
  ) {
    const photos = await this.postsService.getUserPhotos(
      this.extractUserId(req),
      userId,
      query.limit,
    );
    return { success: true, photos };
  }

  @Get(':postId')
  @ApiOperation({ summary: 'Xem một bài viết' })
  async getOne(@Req() req: AuthenticatedRequest, @Param('postId') postId: string) {
    const post = await this.postsService.getPost(this.extractUserId(req), postId);
    return { success: true, post };
  }

  @Post()
  @ApiOperation({ summary: 'Đăng bài viết mới' })
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreatePostDto) {
    const post = await this.postsService.createPost(this.extractUserId(req), dto);
    return { success: true, post };
  }

  @Delete(':postId')
  @ApiOperation({ summary: 'Xóa bài viết của mình' })
  deletePost(@Req() req: AuthenticatedRequest, @Param('postId') postId: string) {
    return this.postsService.deletePost(this.extractUserId(req), postId);
  }

  @Post(':postId/share')
  @ApiOperation({ summary: 'Chia sẻ lại bài viết lên dòng thời gian của mình' })
  async share(
    @Req() req: AuthenticatedRequest,
    @Param('postId') postId: string,
    @Body() dto: SharePostDto,
  ) {
    const post = await this.postsService.sharePost(this.extractUserId(req), postId, dto);
    return { success: true, post };
  }

  @Post(':postId/like')
  @ApiOperation({ summary: 'Thích / bỏ thích bài viết' })
  like(@Req() req: AuthenticatedRequest, @Param('postId') postId: string) {
    return this.postsService.toggleLike(this.extractUserId(req), postId);
  }

  @Get(':postId/comments')
  @ApiOperation({ summary: 'Danh sách bình luận (cũ → mới, phân trang theo con trỏ)' })
  async comments(
    @Req() req: AuthenticatedRequest,
    @Param('postId') postId: string,
    @Query() query: PageQueryDto,
  ) {
    const page = await this.postsService.listComments(this.extractUserId(req), postId, query);
    return { success: true, ...page };
  }

  @Post(':postId/comments')
  @ApiOperation({ summary: 'Bình luận vào bài viết' })
  async addComment(
    @Req() req: AuthenticatedRequest,
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    const comment = await this.postsService.addComment(
      this.extractUserId(req),
      postId,
      dto.content,
    );
    return { success: true, comment };
  }

  @Delete(':postId/comments/:commentId')
  @ApiOperation({ summary: 'Xóa bình luận (của mình hoặc trên bài của mình)' })
  deleteComment(
    @Req() req: AuthenticatedRequest,
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.postsService.deleteComment(this.extractUserId(req), postId, commentId);
  }
}
