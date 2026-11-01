"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Card,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Tooltip,
  Pagination,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Trash2,
  Users as UsersIcon,
} from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import EmptyState from "@/components/common/EmptyState";
import { adminApi, AdminUser } from "@/services/adminApi";
import UsersFilterBar from "./UsersFilterBar";
import UserActionDialog, { UserActionType } from "./UserActionDialog";
import { useTranslation } from "@/i18n/useTranslation";

export default function UsersManagementView() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  // Modal action
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionType, setActionType] = useState<UserActionType>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { isEnglish: isEn } = useTranslation();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getUsers({
        search: search.trim() || undefined,
        role: role !== "all" ? role : undefined,
        status: status !== "all" ? status : undefined,
        page,
        limit: 15,
      });
      setUsers(res.users);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      // Failed to load
    } finally {
      setLoading(false);
    }
  }, [search, role, status, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAction = (user: AdminUser, type: UserActionType) => {
    setSelectedUser(user);
    setActionType(type);
  };

  const handleConfirmAction = async (
    targetUser: AdminUser,
    action: UserActionType,
    reason?: string,
  ) => {
    if (action === "ban") {
      await adminApi.toggleUserBan(targetUser._id, true, reason);
      setFeedback(isEn ? "User has been banned" : "Đã khóa tài khoản thành công");
    } else if (action === "unban") {
      await adminApi.toggleUserBan(targetUser._id, false);
      setFeedback(isEn ? "User has been unbanned" : "Đã mở khóa tài khoản thành công");
    } else if (action === "role") {
      const nextRole = targetUser.role === "admin" ? "user" : "admin";
      await adminApi.updateUserRole(targetUser._id, nextRole);
      setFeedback(isEn ? `Role updated to ${nextRole}` : `Đã chuyển vai trò sang ${nextRole}`);
    } else if (action === "delete") {
      await adminApi.deleteUser(targetUser._id);
      setFeedback(isEn ? "User deleted" : "Đã xóa người dùng thành công");
    }
    fetchUsers();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Box>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
          {isEn ? "User Management" : "Quản lý Người dùng"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isEn
            ? `Total ${total.toLocaleString()} registered members in the system`
            : `Tổng cộng ${total.toLocaleString()} tài khoản người dùng trong hệ thống`}
        </Typography>
      </Box>

      <UsersFilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        role={role}
        onRoleChange={(v) => { setRole(v); setPage(1); }}
        status={status}
        onStatusChange={(v) => { setStatus(v); setPage(1); }}
        onRefresh={fetchUsers}
        loading={loading}
      />

      <Card sx={{ borderRadius: "16px", border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: "action.hover" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>{isEn ? "Member" : "Thành viên"}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{isEn ? "Contact / Phone" : "Liên hệ / SĐT"}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{isEn ? "Role" : "Vai trò"}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{isEn ? "Status" : "Trạng thái"}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{isEn ? "Joined Date" : "Ngày tham gia"}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{isEn ? "Actions" : "Thao tác"}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <EmptyState
                      icon={<UsersIcon size={32} />}
                      title={isEn ? "No users found" : "Không tìm thấy người dùng"}
                      description={isEn ? "Try adjusting your search or filters" : "Hãy thử thay đổi từ khóa hoặc bộ lọc"}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u._id} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <PresenceAvatar src={u.avatar} name={u.name} size={38} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{u.name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{u.email}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{u.phone || "—"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={u.role === "admin" ? "Admin" : "User"}
                        size="small"
                        color={u.role === "admin" ? "primary" : "default"}
                        variant={u.role === "admin" ? "filled" : "outlined"}
                        sx={{ fontWeight: 600, height: 22 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={u.isBan ? (isEn ? "Banned" : "Bị khóa") : (isEn ? "Active" : "Hoạt động")}
                        size="small"
                        color={u.isBan ? "error" : "success"}
                        sx={{ fontWeight: 600, height: 22 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                        {/* Nút Khóa / Mở khóa */}
                        <Tooltip title={u.isBan ? (isEn ? "Unban user" : "Mở khóa tài khoản") : (isEn ? "Ban user" : "Khóa tài khoản")}>
                          <IconButton
                            size="small"
                            color={u.isBan ? "success" : "warning"}
                            onClick={() => handleAction(u, u.isBan ? "unban" : "ban")}
                            aria-label={u.isBan ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                          >
                            {u.isBan ? <UserCheck size={18} /> : <UserX size={18} />}
                          </IconButton>
                        </Tooltip>

                        {/* Nút Đổi Role */}
                        <Tooltip title={u.role === "admin" ? (isEn ? "Demote to User" : "Hạ quyền User") : (isEn ? "Promote to Admin" : "Thăng cấp Admin")}>
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => handleAction(u, "role")}
                            aria-label="Đổi vai trò"
                          >
                            {u.role === "admin" ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
                          </IconButton>
                        </Tooltip>

                        {/* Nút Xóa */}
                        <Tooltip title={isEn ? "Delete user" : "Xóa tài khoản"}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleAction(u, "delete")}
                            aria-label="Xóa tài khoản"
                          >
                            <Trash2 size={18} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box sx={{ p: 2, display: "flex", justifyContent: "center", borderTop: "1px solid", borderColor: "divider" }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => setPage(p)}
              color="primary"
              size="medium"
            />
          </Box>
        )}
      </Card>

      <UserActionDialog
        user={selectedUser}
        action={actionType}
        open={Boolean(actionType)}
        onClose={() => setActionType(null)}
        onConfirm={handleConfirmAction}
      />

      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={3500}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="success" onClose={() => setFeedback(null)} sx={{ borderRadius: "10px" }}>
          {feedback}
        </Alert>
      </Snackbar>
    </Box>
  );
}
