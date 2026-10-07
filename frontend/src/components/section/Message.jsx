import { useState, useRef, useEffect } from "react";
import { Paper, Badge, Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import TextField from "@mui/material/TextField";
import {
  Send,
  Image as ImageIcon,
  Paperclip,
  FileText,
  X,
  Minus,
  Minimize2,
  PhoneCall,
  Video,
} from "lucide-react";
const OnlineBadge = styled(Badge)(({ theme, isonline }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: isonline === "true" ? "#22c55e" : "#94a3b8",
    color: isonline === "true" ? "#22c55e" : "#94a3b8",
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
  },
}));
function Message({ friend, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "other",
      text: `Chào bạn, mình là ${friend.name}.`,
      time: "10:30",
    },
    {
      id: 2,
      sender: "me",
      text: "Chào bạn, file báo cáo tuần này xong chưa gửi mình xem với!",
      time: "10:32",
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!isMinimized) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isMinimized]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedImage(URL.createObjectURL(file));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      });
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() && !selectedImage && !selectedFile) return;

    const currentTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newMsgs = [];
    if (inputMessage.trim()) {
      newMsgs.push({
        id: Date.now(),
        sender: "me",
        text: inputMessage,
        time: currentTime,
      });
    }
    if (selectedImage) {
      newMsgs.push({
        id: Date.now() + 1,
        sender: "me",
        image: selectedImage,
        time: currentTime,
      });
    }
    if (selectedFile) {
      newMsgs.push({
        id: Date.now() + 2,
        sender: "me",
        file: selectedFile,
        time: currentTime,
      });
    }

    setMessages((prev) => [...prev, ...newMsgs]);
    setInputMessage("");
    setSelectedImage(null);
    setSelectedFile(null);
  };

  return (
    <Paper
      elevation={8}
      sx={{
        width: 320,
        height: isMinimized ? 48 : 400,
        display: "flex",
        flexDirection: "column",
        borderRadius: "12px 12px 0 0",
        overflow: "hidden",
        border: "1px solid #e2e8f0",
        transition: "height 0.2s ease-in-out",
        bgcolor: "#ffffff",
      }}
    >
      {/* Header Hộp Chat */}
      <Box
        sx={{
          p: 1.2,
          px: 1.8,
          bgcolor: "#1e293b",
          color: "white",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
          <OnlineBadge
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            variant="dot"
            isonline={friend.unread ? "true" : "false"}
          >
            <Avatar src={friend.avatar} sx={{ width: 32, height: 32 }} />
          </OnlineBadge>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            sx={{ lineHeight: 1.2 }}
          >
            {friend.name}
          </Typography>
        </Box>

        <Box
          sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton
            size="small"
            sx={{ color: "white" }}
            onClick={() => console.log("Call voice")}
          >
            <PhoneCall size={16} />
          </IconButton>

          <IconButton
            size="small"
            sx={{ color: "white" }}
            onClick={() => console.log("Call video")}
          >
            <Video size={16} />
          </IconButton>

          <IconButton
            size="small"
            sx={{ color: "white" }}
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Minimize2 size={16} /> : <Minus size={16} />}
          </IconButton>

          <IconButton size="small" sx={{ color: "white" }} onClick={onClose}>
            <X size={16} />
          </IconButton>
        </Box>
      </Box>

      {!isMinimized && (
        <>
          <Box sx={{ flex: 1, overflowY: "auto", p: 1.5, bgcolor: "#f8fafc" }}>
            {messages.map((msg) => {
              const isMe = msg.sender === "me";
              return (
                <Box
                  key={msg.id}
                  sx={{
                    display: "flex",
                    justifyContent: isMe ? "flex-end" : "flex-start",
                    mb: 1.5,
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1,
                      px: 1.5,
                      maxWidth: "80%",
                      borderRadius: isMe
                        ? "14px 14px 2px 14px"
                        : "14px 14px 14px 2px",
                      bgcolor: isMe ? "#2563eb" : "#ffffff",
                      color: isMe ? "#ffffff" : "#0f172a",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    }}
                  >
                    {msg.text && (
                      <Typography variant="body2">{msg.text}</Typography>
                    )}
                    {msg.image && (
                      <Box
                        component="img"
                        src={msg.image}
                        sx={{
                          maxWidth: "100%",
                          maxHeight: 150,
                          borderRadius: 1,
                          mt: msg.text ? 0.5 : 0,
                        }}
                      />
                    )}
                    {msg.file && (
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <FileText size={18} />
                        <Typography variant="caption">
                          {msg.file.name}
                        </Typography>
                      </Box>
                    )}
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        textAlign: "right",
                        mt: 0.3,
                        opacity: 0.7,
                        fontSize: "0.6rem",
                      }}
                    >
                      {msg.time}
                    </Typography>
                  </Paper>
                </Box>
              );
            })}
            <div ref={chatEndRef} />
          </Box>

          {(selectedImage || selectedFile) && (
            <Box
              sx={{
                p: 1,
                px: 1.5,
                bgcolor: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              {selectedImage && (
                <Box sx={{ position: "relative" }}>
                  <Box
                    component="img"
                    src={selectedImage}
                    sx={{ width: 40, height: 40, borderRadius: 1 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => setSelectedImage(null)}
                    sx={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      bgcolor: "#ef4444",
                      color: "white",
                      p: 0.2,
                    }}
                  >
                    <X size={10} />
                  </IconButton>
                </Box>
              )}
              {selectedFile && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <FileText size={16} />
                  <Typography variant="caption" noWrap sx={{ maxWidth: 120 }}>
                    {selectedFile.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X size={12} />
                  </IconButton>
                </Box>
              )}
            </Box>
          )}

          <Box
            sx={{
              p: 1,
              px: 1.5,
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            <input
              type="file"
              accept="image/*"
              hidden
              ref={imageInputRef}
              onChange={handleImageChange}
            />
            <input
              type="file"
              hidden
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            <Tooltip title="Ảnh">
              <IconButton
                size="small"
                onClick={() => imageInputRef.current?.click()}
              >
                <ImageIcon size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="File">
              <IconButton
                size="small"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={18} />
              </IconButton>
            </Tooltip>

            <TextField
              fullWidth
              size="small"
              placeholder="Nhập tin nhắn..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "18px",
                  bgcolor: "#f8fafc",
                },
              }}
            />

            <IconButton
              color="primary"
              size="small"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() && !selectedImage && !selectedFile}
            >
              <Send size={18} />
            </IconButton>
          </Box>
        </>
      )}
    </Paper>
  );
}
export default Message;
