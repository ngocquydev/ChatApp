import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Avatar,
  Badge,
  InputAdornment,
  Divider,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Search, Image as ImageIcon, Circle } from "lucide-react";
const INITIAL_FRIENDS = [
  {
    id: 1,
    name: "Nguyễn Mai Anh",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
    role: "UI/UX Designer",
    online: true,
  },
  {
    id: 2,
    name: "Trần Hoàng Long",
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
    role: "Frontend Lead",
    online: true,
  },
  {
    id: 3,
    name: "Phạm Hồng Nhung",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",
    role: "Product Manager",
    online: false,
  },
  {
    id: 4,
    name: "Lê Minh Tuấn",
    avatar:
      "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100",
    role: "DevOps Engineer",
    online: true,
  },
  {
    id: 5,
    name: "Đỗ Khánh Linh",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
    role: "QA Specialist",
    online: false,
  },
];
const OnlineBadge = styled(Badge)(({ theme, isonline }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: isonline === "true" ? "#22c55e" : "#94a3b8",
    color: isonline === "true" ? "#22c55e" : "#94a3b8",
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    "&::after": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      animation:
        isonline === "true" ? "ripple 1.4s infinite ease-in-out" : "none",
      border: "1px solid currentColor",
      content: '""',
    },
  },
  "@keyframes ripple": {
    "0%": { transform: "scale(.8)", opacity: 1 },
    "100%": { transform: "scale(2.2)", opacity: 0 },
  },
}));
function PersonCall() {
  const [friends] = useState(INITIAL_FRIENDS);
  const [searchFriend, setSearchFriend] = useState("");
  const [selectedFriend, setSelectedFriend] = useState(INITIAL_FRIENDS[0]);
  const onlineCount = friends.filter((f) => f.online).length;
  const filteredFriends = friends.filter((f) =>
    f.name.toLowerCase().includes(searchFriend.toLowerCase()),
  );
  return (
    <Box
      sx={{
        flex: { xs: 0, md: 3, lg: 3 },
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        height: "100%",
        bgcolor: "#ffffff",
        p: 2.5,
        position: "fixed",
        right: "0",
        top: "75px",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography
          variant="subtitle1"
          fontWeight={800}
          sx={{ color: "#0f172a" }}
        >
          Người liên hệ
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.6,
            bgcolor: "#f0fdf4",
            color: "#166534",
            px: 1.2,
            py: 0.3,
            borderRadius: "20px",
            fontSize: "0.75rem",
            fontWeight: 700,
          }}
        >
          <Circle size={8} fill="#22c55e" color="#22c55e" />
          {onlineCount} Online
        </Box>
      </Box>

      <TextField
        fullWidth
        size="small"
        placeholder="Tìm bạn bè..."
        value={searchFriend}
        onChange={(e) => setSearchFriend(e.target.value)}
        sx={{
          mb: 2,
          "& .MuiOutlinedInput-root": {
            borderRadius: "10px",
            bgcolor: "#f8fafc",
          },
        }}
        slotProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search size={16} color="#94a3b8" />
            </InputAdornment>
          ),
        }}
      />

      <Divider sx={{ mb: 1.5 }} />

      <Box sx={{ flex: 1, overflowY: "auto", pr: 0.5 }}>
        {filteredFriends.map((friend) => {
          const isSelected = selectedFriend.id === friend.id;
          return (
            <Box
              key={friend.id}
              onClick={() => setSelectedFriend(friend)}
              sx={{
                display: "flex",
                alignItems: "center",
                p: 1.2,
                borderRadius: "12px",
                cursor: "pointer",
                bgcolor: isSelected ? "#eff6ff" : "transparent",
                transition: "all 0.15s ease",
                mb: 0.5,
                "&:hover": {
                  bgcolor: isSelected ? "#eff6ff" : "#f8fafc",
                },
              }}
            >
              <OnlineBadge
                overlap="circular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                variant="dot"
                isonline={friend.online ? "true" : "false"}
              >
                <Avatar src={friend.avatar} sx={{ width: 40, height: 40 }} />
              </OnlineBadge>

              <Box sx={{ ml: 1.5, flex: 1, minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  fontWeight={isSelected ? 700 : 600}
                  sx={{ color: isSelected ? "#1e40af" : "#1e293b" }}
                  noWrap
                >
                  {friend.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "#94a3b8" }}
                  noWrap
                  display="block"
                >
                  {friend.online ? "Đang hoạt động" : "Offline"}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default PersonCall;
