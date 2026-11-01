"use client";

import { Box, TextField, MenuItem, InputAdornment, Button } from "@mui/material";
import { Search, RefreshCw } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface UsersFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  role: string;
  onRoleChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export default function UsersFilterBar({
  search,
  onSearchChange,
  role,
  onRoleChange,
  status,
  onStatusChange,
  onRefresh,
  loading,
}: UsersFilterBarProps) {
  const { isEnglish: isEn } = useTranslation();

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1.5,
        alignItems: "center",
        justifyContent: "space-between",
        bgcolor: "background.paper",
        p: 2,
        borderRadius: "14px",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, flexGrow: 1, minWidth: 260 }}>
        <TextField
          size="small"
          placeholder={isEn ? "Search by name, email, phone..." : "Tìm theo tên, email, sđt..."}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color="var(--mui-palette-text-secondary)" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 220, flexGrow: 1 }}
        />

        <TextField
          select
          size="small"
          label={isEn ? "Role" : "Vai trò"}
          value={role}
          onChange={(e) => onRoleChange(e.target.value)}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="all">{isEn ? "All roles" : "Tất cả vai trò"}</MenuItem>
          <MenuItem value="admin">Admin</MenuItem>
          <MenuItem value="user">User</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          label={isEn ? "Status" : "Trạng thái"}
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="all">{isEn ? "All status" : "Tất cả trạng thái"}</MenuItem>
          <MenuItem value="active">{isEn ? "Active" : "Đang hoạt động"}</MenuItem>
          <MenuItem value="banned">{isEn ? "Banned" : "Bị khóa"}</MenuItem>
        </TextField>
      </Box>

      <Button
        variant="outlined"
        size="medium"
        onClick={onRefresh}
        disabled={loading}
        startIcon={<RefreshCw size={16} />}
        sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 600, minHeight: 40 }}
      >
        {isEn ? "Refresh" : "Tải lại"}
      </Button>
    </Box>
  );
}
