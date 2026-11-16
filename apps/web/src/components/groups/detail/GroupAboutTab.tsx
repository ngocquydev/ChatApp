"use client";

import { Box, Card, CardContent, Divider, Typography } from "@mui/material";
import { Eye, Globe, Lock, ShieldCheck, Users } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { CommunityGroupItem } from "@/services/communityGroupsApi";

interface GroupAboutTabProps {
  group: CommunityGroupItem;
}

export default function GroupAboutTab({ group }: GroupAboutTabProps) {
  const { t } = useTranslation();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: "800px", mx: "auto" }}>
      {/* Giới thiệu tổng quan */}
      <Card sx={{ borderRadius: "16px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            {t("groups.aboutGroup")}
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, mb: 3 }}>
            {group.description || "Chưa có mô tả chi tiết cho hội nhóm này."}
          </Typography>

          <Divider sx={{ my: 2.5 }} />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Box sx={{ color: "primary.main", mt: 0.25 }}>
                {group.privacy === "public" ? <Globe size={22} /> : <Lock size={22} />}
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {group.privacy === "public" ? t("groups.publicGroup") : t("groups.privateGroup")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {group.privacy === "public"
                    ? t("groups.privacyPublicDesc")
                    : t("groups.privacyPrivateDesc")}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Box sx={{ color: "primary.main", mt: 0.25 }}>
                <Eye size={22} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Hiển thị công khai
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Bất kỳ ai trên ChatApp cũng có thể tìm thấy và xem thông tin cơ bản của nhóm này.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Box sx={{ color: "primary.main", mt: 0.25 }}>
                <Users size={22} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Thành viên
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("groups.membersCount", { count: group.memberCount })}
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Quy tắc của nhóm */}
      {group.rules && group.rules.length > 0 && (
        <Card sx={{ borderRadius: "16px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
              <ShieldCheck size={22} color="var(--mui-palette-primary-main)" />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {t("groups.groupRules")}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {group.rules.map((rule, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: "flex",
                    gap: 2,
                    p: 2,
                    borderRadius: "12px",
                    bgcolor: "action.hover",
                    alignItems: "flex-start",
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.85rem",
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, pt: 0.25 }}>
                    {rule}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

