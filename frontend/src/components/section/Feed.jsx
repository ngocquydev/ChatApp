import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardMedia,
  Divider,
  IconButton,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import {
  Heart,
  ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Smile,
} from "lucide-react";
import PostComments from "./PostComments";

const INITIAL_POSTS = [
  {
    id: 1,
    author: "Trần Hoàng Long",
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
    time: "2 giờ trước",
    content:
      "Vừa hoàn thiện xong giao diện hệ thống mạng xã hội 3 cột! Đầy đủ chat, đính kèm file và gửi ảnh 🚀",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=700",
    likes: 24,
    comments: 2,
    isLiked: false,
    commentList: [
      {
        id: 101,
        author: "Lê Minh Tuấn",
        avatar:
          "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100",
        time: "1 giờ trước",
        content: "Giao diện nhìn mượt quá bác ơi, dùng Tailwind hay MUI thế ạ?",
      },
      {
        id: 102,
        author: "Phạm Thảo Nhi",
        avatar:
          "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100",
        time: "30 phút trước",
        content: "Hóng repo chia sẻ code mẫu nhé bạn!",
      },
    ],
  },
  {
    id: 2,
    author: "Nguyễn Mai Anh",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
    time: "4 giờ trước",
    content:
      "Cuối tuần có ai rảnh cà phê thảo luận dự án mới không nhỉ? Khu vực trung tâm nhé ☕✨",
    image: null,
    likes: 15,
    comments: 1,
    isLiked: true,
    commentList: [
      {
        id: 201,
        author: "Đỗ Quốc Bảo",
        avatar:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
        time: "3 giờ trước",
        content: "Kèo thơm, cho mình xin 1 slot giao lưu học hỏi với nha!",
      },
    ],
  },
];

function Feed() {
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [open, setOpen] = useState(false);
  const [activePostId, setActivePostId] = useState(null);
  const [newPostText, setNewPostText] = useState("");

  const activePost = posts.find((p) => p.id === activePostId);

  const handleOpenComment = (postId) => {
    setActivePostId(postId);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setActivePostId(null);
  };

  const handleCreatePost = () => {
    if (!newPostText.trim()) return;
    const newPost = {
      id: Date.now(),
      author: "Bạn (Tôi)",
      avatar:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
      time: "Vừa xong",
      content: newPostText,
      image: null,
      likes: 0,
      comments: 0,
      isLiked: false,
      commentList: [],
    };
    setPosts([newPost, ...posts]);
    setNewPostText("");
  };

  const handleToggleLike = (id) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === id
          ? {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            }
          : post,
      ),
    );
  };

  const handleAddComment = (postId, content) => {
    const newComment = {
      id: Date.now(),
      author: "Bạn (Tôi)",
      avatar:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
      time: "Vừa xong",
      content,
    };

    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: post.comments + 1,
              commentList: [...(post.commentList || []), newComment],
            }
          : post,
      ),
    );
  };

  return (
    <Box
      sx={{
        flex: { xs: 1, md: 5, lg: 5 },
        height: "100%",
        overflowY: "auto",
        p: { xs: 2, sm: 3 },
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
        borderRight: "1px solid #e2e8f0",
      }}
    >
      <Typography variant="h6" fontWeight={800} sx={{ color: "#0f172a" }}>
        Bảng tin
      </Typography>

      {/* Tạo bài viết */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
        }}
      >
        <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
          <Avatar src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" />
          <TextField
            fullWidth
            multiline
            rows={2}
            placeholder="Bạn đang nghĩ gì thế? Chia sẻ câu chuyện của bạn..."
            value={newPostText}
            onChange={(e) => setNewPostText(e.target.value)}
            variant="standard"
            slotProps={{
              disableUnderline: true,
              sx: { fontSize: "0.95rem" },
            }}
          />
        </Box>
        <Divider sx={{ mb: 1.5 }} />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              startIcon={<ImageIcon size={18} color="#22c55e" />}
              sx={{
                textTransform: "none",
                color: "#64748b",
                fontWeight: 600,
              }}
            >
              Ảnh/Video
            </Button>
            <Button
              size="small"
              startIcon={<Smile size={18} color="#eab308" />}
              sx={{
                textTransform: "none",
                color: "#64748b",
                fontWeight: 600,
              }}
            >
              Cảm xúc
            </Button>
          </Box>
          <Button
            variant="contained"
            disabled={!newPostText.trim()}
            onClick={handleCreatePost}
            sx={{
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 600,
              px: 2.5,
              bgcolor: "#2563eb",
            }}
          >
            Đăng tin
          </Button>
        </Box>
      </Paper>

      {/* Danh sách bài đăng */}
      {posts.map((post) => (
        <Card
          key={post.id}
          elevation={0}
          sx={{
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            bgcolor: "#ffffff",
          }}
        >
          <CardHeader
            avatar={<Avatar src={post.avatar} />}
            action={
              <IconButton size="small">
                <MoreHorizontal size={18} color="#94a3b8" />
              </IconButton>
            }
            title={
              <Typography variant="subtitle2" fontWeight={700}>
                {post.author}
              </Typography>
            }
            subheader={
              <Typography variant="caption" color="text.secondary">
                {post.time}
              </Typography>
            }
          />
          <CardContent sx={{ pt: 0, pb: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Typography
              variant="body2"
              sx={{ color: "#334155", fontSize: "0.95rem", lineHeight: 1.6 }}
            >
              {post.content}
            </Typography>
          </CardContent>

          {post.image && (
            <CardMedia
              component="img"
              image={post.image}
              alt="Post media"
              sx={{ maxHeight: 380, objectFit: "cover" }}
            />
          )}

          <CardActions sx={{ px: 2, py: 1.2, justifyContent: "space-between" }}>
            <Button
              size="small"
              onClick={() => handleToggleLike(post.id)}
              startIcon={
                <Heart
                  size={18}
                  color={post.isLiked ? "#ef4444" : "#64748b"}
                  fill={post.isLiked ? "#ef4444" : "none"}
                />
              }
              sx={{
                color: post.isLiked ? "#ef4444" : "#64748b",
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              {post.likes} Thích
            </Button>

            <Button
              size="small"
              startIcon={<MessageCircle size={18} color="#64748b" />}
              sx={{
                color: "#64748b",
                textTransform: "none",
                fontWeight: 600,
              }}
              onClick={() => handleOpenComment(post.id)}
            >
              {post.comments} Bình luận
            </Button>

            <Button
              size="small"
              startIcon={<Share2 size={18} color="#64748b" />}
              sx={{
                color: "#64748b",
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Chia sẻ
            </Button>
          </CardActions>
        </Card>
      ))}

      {/* Modal bình luận */}
      <PostComments
        post={activePost}
        open={open}
        onClose={handleClose}
        onAddComment={handleAddComment}
      />
    </Box>
  );
}

export default Feed;
