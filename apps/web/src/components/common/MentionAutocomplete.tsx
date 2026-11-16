"use client";

import { useEffect, useState, useMemo, forwardRef, useImperativeHandle } from "react";
import {
  Avatar,
  Box,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Popper,
  Typography,
} from "@mui/material";
import { Bot, Sparkles, User as UserIcon } from "lucide-react";
import { useFriendStore } from "@/store/useFriendStore";

export interface MentionCandidate {
  id: string;
  name: string;
  tag: string;
  avatar?: string;
  isBot?: boolean;
  subtitle?: string;
}

const AURA_BOT_CANDIDATE: MentionCandidate = {
  id: "666666666666666666666666",
  name: "Aura AI",
  tag: "aura",
  isBot: true,
  subtitle: "Trợ lý ảo Llama 3.3 (Groq) (Hỏi đáp, tóm tắt)",
};

export interface MentionAutocompleteHandle {
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
}

interface MentionAutocompleteProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  query: string;
  onSelect: (candidate: MentionCandidate) => void;
  onClose: () => void;
}

export const MentionAutocomplete = forwardRef<MentionAutocompleteHandle, MentionAutocompleteProps>(
  function MentionAutocomplete({ open, anchorEl, query, onSelect, onClose }, ref) {
    const friends = useFriendStore((state) => state.friends);
    const fetchFriends = useFriendStore((state) => state.fetchFriends);
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      if (friends.length === 0) {
        void fetchFriends();
      }
    }, [friends.length, fetchFriends]);

    const candidates = useMemo(() => {
      const q = query.toLowerCase().trim();
      const list: MentionCandidate[] = [];

      // Luôn kiểm tra Aura AI
      if (!q || "aura".includes(q) || "ai".includes(q) || "bot".includes(q) || "trợ lý".includes(q)) {
        list.push(AURA_BOT_CANDIDATE);
      }

      // Bạn bè
      for (const item of friends) {
        const u = item.friend;
        if (!u) continue;
        const nameMatch = u.name?.toLowerCase().includes(q);
        const emailMatch = u.email?.toLowerCase().includes(q);
        if (!q || nameMatch || emailMatch) {
          list.push({
            id: u._id,
            name: u.name || "Bạn bè",
            tag: u.name || "ban",
            avatar: u.avatar,
            subtitle: u.email,
          });
        }
      }

      return list.slice(0, 7);
    }, [query, friends]);

    useEffect(() => {
      setSelectedIndex(0);
    }, [query, candidates.length]);

    useImperativeHandle(ref, () => ({
      handleKeyDown: (e: React.KeyboardEvent) => {
        if (!open || candidates.length === 0) return false;

        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % candidates.length);
          return true;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + candidates.length) % candidates.length);
          return true;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          if (candidates[selectedIndex]) {
            onSelect(candidates[selectedIndex]);
          }
          return true;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
          return true;
        }

        return false;
      },
    }));

    if (!open || candidates.length === 0 || !anchorEl) {
      return null;
    }

    return (
      <Popper
        open={open}
        anchorEl={anchorEl}
        placement="top-start"
        modifiers={[
          { name: "offset", options: { offset: [0, 8] } },
          { name: "preventOverflow", options: { padding: 8 } },
        ]}
        sx={{ zIndex: 1400 }}
      >
        <Paper
          elevation={6}
          sx={{
            width: 290,
            maxHeight: 260,
            overflowY: "auto",
            borderRadius: "14px",
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            py: 0.5,
          }}
        >
          <Box sx={{ px: 1.5, py: 0.5, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              GỢI Ý NHẮC ĐẾN (@)
            </Typography>
          </Box>
          <List dense disablePadding>
            {candidates.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <ListItemButton
                  key={item.id}
                  selected={isSelected}
                  onClick={() => onSelect(item)}
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    gap: 1,
                    bgcolor: isSelected ? "action.selected" : "transparent",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: "auto" }}>
                    {item.isBot ? (
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                        }}
                      >
                        <Bot size={18} />
                      </Avatar>
                    ) : (
                      <Avatar src={item.avatar} sx={{ width: 32, height: 32 }}>
                        <UserIcon size={16} />
                      </Avatar>
                    )}
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {item.name}
                        </Typography>
                        {item.isBot && (
                          <Box
                            component="span"
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.25,
                              px: 0.6,
                              py: 0.1,
                              borderRadius: "4px",
                              bgcolor: "primary.main",
                              color: "primary.contrastText",
                              fontSize: "0.68rem",
                              fontWeight: 700,
                            }}
                          >
                            <Sparkles size={9} /> AI
                          </Box>
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="caption"
                        color={item.isBot ? "primary.main" : "text.secondary"}
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {item.subtitle || `@${item.tag}`}
                      </Typography>
                    }
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Paper>
      </Popper>
    );
  }
);

export default MentionAutocomplete;

