"use client";

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
import { Search, Circle } from "lucide-react";

export interface FriendContact {
  id: number;
  name: string;
  avatar: string;
  role: string;
  online: boolean;
}

export const INITIAL_FRIENDS: FriendContact[] = [
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

const OnlineBadge = styled(Badge)<{ isonline?: string }>(({ theme, isonline }) => ({
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

export interface PersonCallProps {
  onSelectFriend?: (friend: FriendContact) => void;
}

function PersonCall({ onSelectFriend }: PersonCallProps) {
  const [friends] = useState<FriendContact[]>(INITIAL_FRIENDS);
  const [searchFriend, setSearchFriend] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<FriendContact>(INITIAL_FRIENDS[0]);
  const onlineCount = friends.filter((f) => f.online).length;
  const filteredFriends = friends.filter((f) =>
    f.name.toLowerCase().includes(searchFriend.toLowerCase())
  );

  const handleFriendClick = (friend: FriendContact) => {
    setSelectedFriend(friend);
    if (onSelectFriend) {
      onSelectFriend(friend);
    }
  };

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
        width: { md: "25%", lg: "20%" },
        borderLeft: "1px solid #e2e8f0",
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
          sx={{ fontWeight: 800, color: "#0f172a" }}
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
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} color="#94a3b8" />
              </InputAdornment>
            ),
          },
        }}
      />

      <Divider sx={{ mb: 1.5 }} />

      <Box sx={{ flex: 1, overflowY: "auto", pr: 0.5 }}>
        {filteredFriends.map((friend) => {
          const isSelected = selectedFriend.id === friend.id;
          return (
            <Box
              key={friend.id}
              onClick={() => handleFriendClick(friend)}
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
                  noWrap
                  sx={{ fontWeight: isSelected ? 700 : 600, color: isSelected ? "#1e40af" : "#1e293b" }}
                >
                  {friend.name}
                </Typography>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ color: "#94a3b8", display: "block" }}
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
