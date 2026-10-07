import React, { useState } from "react";
import {
  Avatar,
  Box,
  IconButton,
  Modal,
  TextField,
  Typography,
} from "@mui/material";
import { Send, X } from "lucide-react";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: { xs: "90%", sm: 500 },
  maxHeight: "85vh",
  bgcolor: "#ffffff",
  borderRadius: "16px",
  boxShadow: 24,
  p: 2.5,
  display: "flex",
  flexDirection: "column",
  outline: "none",
};

function PostComments({ open, onClose, post, onAddComment }) {
  const [commentText, setCommentText] = useState("");

  const handleSendComment = () => {
    if (!commentText.trim() || !post) return;
    if (onAddComment) {
      onAddComment(post.id, commentText.trim());
    }
    setCommentText("");
  };

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="comment-modal-title">
      <Box sx={modalStyle}>
        {/* Header Modal */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1.5,
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <Typography id="comment-modal-title" variant="h6" fontWeight={700}>
            Bình luận ({post?.comments || 0})
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: "#94a3b8" }}>
            <X size={20} />
          </IconButton>
        </Box>

        {/* Danh sách bình luận cuộn */}
        <Box
          sx={{
            py: 2,
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {post?.commentList?.length > 0 ? (
            post.commentList.map((c) => (
              <Box
                key={c.id}
                sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}
              >
                <Avatar src={c.avatar} sx={{ width: 34, height: 34 }} />
                <Box
                  sx={{
                    bgcolor: "#f8fafc",
                    p: 1.5,
                    borderRadius: "14px",
                    flex: 1,
                    border: "1px solid #f1f5f9",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.5,
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      fontWeight={700}
                      sx={{ fontSize: "0.85rem" }}
                    >
                      {c.author}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.time}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "#334155", fontSize: "0.875rem" }}
                  >
                    {c.content}
                  </Typography>
                </Box>
              </Box>
            ))
          ) : (
            <Typography
              variant="body2"
              sx={{ textAlign: "center", color: "#94a3b8", py: 4 }}
            >
              Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
            </Typography>
          )}
        </Box>

        {/* Ô nhập bình luận */}
        <Box
          sx={{
            pt: 1.5,
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            gap: 1,
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Viết bình luận..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendComment();
              }
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "20px",
                bgcolor: "#f8fafc",
              },
            }}
          />
          <IconButton
            color="primary"
            disabled={!commentText.trim()}
            onClick={handleSendComment}
            sx={{
              bgcolor: commentText.trim() ? "#2563eb" : "transparent",
              color: commentText.trim() ? "#ffffff" : "#94a3b8",
              "&:hover": {
                bgcolor: commentText.trim() ? "#1d4ed8" : "transparent",
              },
            }}
          >
            <Send size={18} />
          </IconButton>
        </Box>
      </Box>
    </Modal>
  );
}

export default PostComments;
