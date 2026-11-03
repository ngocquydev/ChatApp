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
  Optional,
  BadRequestException,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/types/auth.types.js';
import { PostsService } from './posts.service.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';
import type { ReactionType } from './schemas/post-like.schema.js';
import {
  CreateCommentDto,
  CreatePostDto,
  PageQueryDto,
  PhotosQueryDto,
  SharePostDto,
  UpdatePostDto,
} from './dto/posts.dto.js';
import { CreateCommentReportDto } from './dto/report-comment.dto.js';
import { savePostImage } from './post-image.util.js';

const POST_MEDIA_MAX_BYTES = 100 * 1024 * 1024;

@ApiTags('Posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    @Optional() private readonly cloudinaryService?: CloudinaryService,
  ) {}

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
  @ApiOperation({ summary: 'Tải một ảnh hoặc video lên cho bài viết (tối đa 100MB)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: POST_MEDIA_MAX_BYTES, files: 1 },
    }),
  )
  async uploadImage(
    @UploadedFile()
    file?: {
      buffer: Buffer;
      mimetype?: string;
      originalname?: string;
    },
  ) {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Chưa chọn ảnh hoặc video để tải lên');
    }

    if (this.cloudinaryService?.isConfigured()) {
      const isVideo = file.mimetype?.startsWith('video/') || false;
      const res = await this.cloudinaryService.uploadBuffer(file.buffer, {
        folder: 'chatapp/posts',
        resource_type: isVideo ? 'video' : 'auto',
        filename: file.originalname,
      });
      return {
        success: true,
        url: res.secure_url,
        resource_type: res.resource_type,
      };
    }

    const url = await savePostImage(file.buffer);
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

  @Get('page/:pageId')
  @ApiOperation({ summary: 'Bài viết trên một Trang Fanpage' })
  async pagePosts(
    @Req() req: AuthenticatedRequest,
    @Param('pageId') pageId: string,
    @Query() query: PageQueryDto,
  ) {
    const page = await this.postsService.getPagePosts(this.extractUserId(req), pageId, query);
    return { success: true, ...page };
  }

  @Get('group/:groupId')
  @ApiOperation({ summary: 'Bài viết trong một Hội nhóm cộng đồng' })
  async groupPosts(
    @Req() req: AuthenticatedRequest,
    @Param('groupId') groupId: string,
    @Query() query: PageQueryDto,
  ) {
    const page = await this.postsService.getGroupPosts(this.extractUserId(req), groupId, query);
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

  @Patch(':postId')
  @ApiOperation({ summary: 'Chỉnh sửa bài viết của mình' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('postId') postId: string,
    @Body() dto: UpdatePostDto,
  ) {
    const post = await this.postsService.updatePost(this.extractUserId(req), postId, dto);
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
  @ApiOperation({ summary: 'Thích / bỏ thích / thả cảm xúc bài viết' })
  like(
    @Req() req: AuthenticatedRequest,
    @Param('postId') postId: string,
    @Body('type') type?: ReactionType,
  ) {
    return this.postsService.toggleLike(this.extractUserId(req), postId, type || 'like');
  }

  @Post(':postId/comments/:commentId/reaction')
  @ApiOperation({ summary: 'Thích / bỏ thích / thả cảm xúc bình luận' })
  commentReaction(
    @Req() req: AuthenticatedRequest,
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
    @Body('type') type?: ReactionType,
  ) {
    return this.postsService.toggleCommentReaction(
      this.extractUserId(req),
      postId,
      commentId,
      type || 'like',
    );
  }

  @Get(':postId/likes')
  @ApiOperation({ summary: 'Danh sách người dùng đã thích bài viết' })
  async getLikes(@Req() req: AuthenticatedRequest, @Param('postId') postId: string) {
    const users = await this.postsService.getPostLikes(this.extractUserId(req), postId);
    return { success: true, users };
  }

  @Get(':postId/commenters')
  @ApiOperation({ summary: 'Danh sách người dùng duy nhất đã bình luận bài viết' })
  async getCommenters(@Req() req: AuthenticatedRequest, @Param('postId') postId: string) {
    const users = await this.postsService.getPostCommenters(this.extractUserId(req), postId);
    return { success: true, users };
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
      dto.mediaUrl,
      dto.mediaType,
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

  @Post('comments/:commentId/report')
  @ApiOperation({ summary: 'Báo cáo bình luận vi phạm tới BQT nhóm hoặc Admin Web' })
  reportComment(
    @Req() req: AuthenticatedRequest,
    @Param('commentId') commentId: string,
    @Body() dto: CreateCommentReportDto,
  ) {
    return this.postsService.reportComment(this.extractUserId(req), commentId, dto);
  }
}
