"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CircularProgress,
  Typography,
} from "@mui/material";
import { Check, Clock, UserCheck, X } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import {
  communityGroupsApi,
  PendingMemberRequest,
} from "@/services/communityGroupsApi";
import EmptyState from "@/components/common/EmptyState";
import { formatRelativeTime } from "@/utils/formatTime";

interface GroupRequestsTabProps {
  groupId: string;
  onMemberCountChange?: (count: number) => void;
  onRequestCountChange?: (count: number) => void;
}

export default function GroupRequestsTab({
  groupId,
  onMemberCountChange,
  onRequestCountChange,
}: GroupRequestsTabProps) {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<PendingMemberRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await communityGroupsApi.getPendingRequests(groupId);
      setRequests(res.requests || []);
      if (onRequestCountChange) {
        onRequestCountChange(res.requests?.length || 0);
      }
    } catch (e) {
      console.error("Lỗi lấy danh sách yêu cầu chờ duyệt:", e);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, onRequestCountChange]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (userId: string) => {
    try {
      setProcessingId(userId);
      const res = await communityGroupsApi.approveMember(groupId, userId);
      const updated = requests.filter((r) => r.userId._id !== userId);
      setRequests(updated);
      if (onMemberCountChange) {
        onMemberCountChange(res.memberCount);
      }
      if (onRequestCountChange) {
        onRequestCountChange(updated.length);
      }
    } catch (e) {
      console.error("Lỗi duyệt thành viên:", e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      setProcessingId(userId);
      await communityGroupsApi.rejectMember(groupId, userId);
      const updated = requests.filter((r) => r.userId._id !== userId);
      setRequests(updated);
      if (onRequestCountChange) {
        onRequestCountChange(updated.length);
      }
    } catch (e) {
      console.error("Lỗi từ chối thành viên:", e);
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={<UserCheck size={48} />}
        title={t("groups.noRequestsYet")}
        description={t("groups.noRequestsYetDesc")}
      />
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {requests.map((req) => {
        const user = req.userId;
        const isProcessing = processingId === user._id;

        return (
          <Card
            key={user._id}
            sx={{
              p: 2.5,
              borderRadius: "18px",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "none",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar
                  src={user.avatar || undefined}
                  sx={{
                    width: 52,
                    height: 52,
                    bgcolor: "primary.main",
                    fontWeight: 700,
                  }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {user.name}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.5 }}>
                    <Clock size={13} color="var(--mui-palette-text-secondary)" />
                    <Typography variant="caption" color="text.secondary">
                      {formatRelativeTime(req.requestedAt)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: 1, width: { xs: "100%", sm: "auto" } }}>
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<X size={16} />}
                  onClick={() => void handleReject(user._id)}
                  disabled={isProcessing}
                  sx={{
                    borderRadius: "12px",
                    px: 2,
                    fontWeight: 600,
                    flex: { xs: 1, sm: "initial" },
                  }}
                >
                  {t("groups.rejectRequest")}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Check size={16} />}
                  onClick={() => void handleApprove(user._id)}
                  disabled={isProcessing}
                  sx={{
                    borderRadius: "12px",
                    px: 2.5,
                    fontWeight: 700,
                    flex: { xs: 1, sm: "initial" },
                  }}
                >
                  {t("groups.approveRequest")}
                </Button>
              </Box>
            </Box>

            {/* Answer to Join Question */}
            {req.reason && (
              <Box
                sx={{
                  mt: 2,
                  p: 1.75,
                  borderRadius: "12px",
                  bgcolor: "var(--mui-palette-neutral-100)",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase" }}>
                  {t("groups.requestAnswerLabel")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5, color: "text.primary" }}>
                  {req.reason}
                </Typography>
              </Box>
            )}
          </Card>
        );
      })}
    </Box>
  );
}
