"use client";

import { Box, Button, Card, CardContent, Divider, Typography } from "@mui/material";
import { Eye, FileCheck, Globe, Image as ImageIcon, Lock, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { CommunityGroupItem } from "@/services/communityGroupsApi";

interface GroupSidebarProps {
  group: CommunityGroupItem;
  onViewAllRules?: () => void;
  onViewAllMedia?: () => void;
}

export default function GroupSidebar({ group, onViewAllRules, onViewAllMedia }: GroupSidebarProps) {
  const { t } = useTranslation();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* About this group card */}
      <Card
        sx={{
          borderRadius: "16px",
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
            {t("groups.aboutGroup")}
          </Typography>

          {group.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>
              {group.description}
            </Typography>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Box sx={{ color: "text.secondary", mt: 0.25 }}>
                {group.privacy === "public" ? <Globe size={20} /> : <Lock size={20} />}
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {group.privacy === "public" ? t("groups.publicGroup") : t("groups.privateGroup")}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.4 }}>
                  {group.privacy === "public"
                    ? t("groups.privacyPublicDesc")
                    : t("groups.privacyPrivateDesc")}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Box sx={{ color: "text.secondary", mt: 0.25 }}>
                <Eye size={20} />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Hiển thị công khai
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.4 }}>
                  Bất kỳ ai cũng có thể tìm thấy hội nhóm này trên ChatApp.
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Rules card (if any) */}
      {group.rules && group.rules.length > 0 && (
        <Card
          sx={{
            borderRadius: "16px",
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {t("groups.groupRules")}
              </Typography>
              {onViewAllRules && (
                <Button size="small" onClick={onViewAllRules} sx={{ fontWeight: 700, p: 0 }}>
                  Xem tất cả
                </Button>
              )}
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {group.rules.slice(0, 3).map((rule, idx) => (
                <Box key={idx} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      bgcolor: "action.hover",
                      color: "text.secondary",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </Box>
                  <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500, pt: 0.2 }}>
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

