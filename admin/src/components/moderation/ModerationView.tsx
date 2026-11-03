"use client";

import { useState } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
} from "@mui/material";
import {
  ShieldAlert,
  Brain,
  Flag,
} from "lucide-react";
import ModerationQueueTab from "./ModerationQueueTab";
import ModerationPlaygroundTab from "./ModerationPlaygroundTab";
import ReportedCommentsTab from "./ReportedCommentsTab";
import { useTranslation } from "@/i18n/useTranslation";

export default function ModerationView() {
  const [currentTab, setCurrentTab] = useState(0);
  const { isEnglish: isEn } = useTranslation();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Tiêu đề & Giới thiệu */}
      <Box>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
          {isEn ? "AI Moderation & Trust Engine" : "Hệ thống Kiểm duyệt AI & An toàn"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isEn
            ? "Automated content moderation queue, NLP toxicity detection, and behavioral anomaly recognition."
            : "Hàng đợi kiểm duyệt bài viết tự động, bộ phân loại độc hại NLP và thuật toán phát hiện bot hành vi."}
        </Typography>
      </Box>

      {/* Tabs chuyển đổi */}
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={currentTab}
          onChange={(_, newVal) => setCurrentTab(newVal)}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab
            icon={<ShieldAlert size={18} />}
            iconPosition="start"
            label={isEn ? "Moderation Queue" : "Hàng đợi kiểm duyệt"}
            sx={{ fontWeight: 700, textTransform: "none", minHeight: 48 }}
          />
          <Tab
            icon={<Brain size={18} />}
            iconPosition="start"
            label={isEn ? "AI Playground & Models" : "Thử nghiệm mô hình AI"}
            sx={{ fontWeight: 700, textTransform: "none", minHeight: 48 }}
          />
          <Tab
            icon={<Flag size={18} />}
            iconPosition="start"
            label={isEn ? "Reported Comments" : "Báo cáo bình luận"}
            sx={{ fontWeight: 700, textTransform: "none", minHeight: 48 }}
          />
        </Tabs>
      </Box>

      {/* Nội dung Tab */}
      {currentTab === 0 && <ModerationQueueTab />}
      {currentTab === 1 && <ModerationPlaygroundTab />}
      {currentTab === 2 && <ReportedCommentsTab />}
    </Box>
  );
}
