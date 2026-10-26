"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  LinearProgress,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Check, Clock, MessageSquare, Search, UserPlus, X } from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import EmptyState from "@/components/common/EmptyState";
import { ChatUser } from "@/store/useChatStore";
import { UserRelationResult } from "@/store/useFriendStore";
import { NotifyFn } from "./types";

type ActionResult = { success: boolean; message: string };

interface AddFriendDialogProps {
  open: boolean;
  onClose: () => void;
  results: UserRelationResult[];
  isSearching: boolean;
  onSearch: (query: string) => void;
  onClearResults: () => void;
  onMessage: (user: ChatUser) => void;
  onSendRequest: (userId: string) => Promise<ActionResult>;
  onCancelRequest: (requestId: string) => Promise<ActionResult>;
  onRespond: (requestId: string, action: "accept" | "reject") => Promise<ActionResult>;
  notify: NotifyFn;
}

export default function AddFriendDialog({
  open,
  onClose,
  results,
  isSearching,
  onSearch,
  onClearResults,
  onMessage,
  onSendRequest,
  onCancelRequest,
  onRespond,
  notify,
}: AddFriendDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [query, setQuery] = useState("");

  // Reset khi mở lại hộp thoại
  useEffect(() => {
    if (open) {
      setQuery("");
      onClearResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Debounce tìm kiếm 300ms
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) return;
    const timer = setTimeout(() => onSearch(trimmed), 300);
    return () => clearTimeout(timer);
  }, [query, open, onSearch]);

  const hasQuery = Boolean(query.trim());

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      aria-labelledby="add-friend-title"
    >
      <DialogTitle
        id="add-friend-title"
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        Tìm kiếm &amp; kết bạn mới
        <IconButton size="small" onClick={onClose} aria-label="Đóng hộp thoại">
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ minHeight: { sm: 320 } }}>
        <TextField
          fullWidth
          type="search"
          placeholder="Nhập tên người dùng cần tìm…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            htmlInput: { "aria-label": "Tìm người dùng" },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} aria-hidden />
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 2, mt: 0.5, "& .MuiOutlinedInput-root": { bgcolor: "background.default" } }}
        />

        <Box aria-live="polite">
          {!hasQuery ? (
            <EmptyState
              compact
              icon={<Search size={26} />}
              title="Tìm kiếm người dùng trên ChatApp"
              description="Nhập tên, email hoặc số điện thoại để tìm và gửi lời mời kết bạn."
            />
          ) : results.length === 0 ? (
            isSearching ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 5, gap: 1.5 }}>
                <CircularProgress size={22} />
                <Typography variant="body2" color="text.secondary">
                  Đang tìm kiếm…
                </Typography>
              </Box>
            ) : (
              <EmptyState
                compact
                icon={<Search size={26} />}
                title="Không tìm thấy người dùng"
                description="Thử lại bằng tên đầy đủ hoặc địa chỉ email chính xác."
              />
            )
          ) : (
            <Box>
              {isSearching && <LinearProgress sx={{ mb: 1.5, height: 2 }} />}
              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
                {results.map((u) => (
                  <Box
                    component="li"
                    key={u._id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      p: 1.25,
                      mb: 0.5,
                      borderRadius: 3,
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <PresenceAvatar name={u.name} src={u.avatar} size={44} hidePresence />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap>
                        {u.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                        {u.bio || "Thành viên"}
                      </Typography>
                    </Box>

                    {u.relationStatus === "friends" && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<MessageSquare size={14} />}
                        onClick={() => onMessage(u)}
                      >
                        Nhắn tin
                      </Button>
                    )}
                    {u.relationStatus === "pending_sent" && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<Clock size={14} />}
                        onClick={async () => {
                          if (!u.requestId) return;
                          const res = await onCancelRequest(u.requestId);
                          notify(res.message, "info");
                        }}
                      >
                        Đã gửi · Hủy
                      </Button>
                    )}
                    {u.relationStatus === "pending_received" && (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<Check size={14} />}
                        onClick={async () => {
                          if (!u.requestId) return;
                          const res = await onRespond(u.requestId, "accept");
                          notify(res.message, "success");
                        }}
                      >
                        Chấp nhận
                      </Button>
                    )}
                    {u.relationStatus === "none" && (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<UserPlus size={14} />}
                        onClick={async () => {
                          const res = await onSendRequest(u._id);
                          notify(res.message, res.success ? "success" : "error");
                        }}
                      >
                        Kết bạn
                      </Button>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
