"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
  TextField,
  Typography,
  Chip,
  MenuItem,
  Alert,
} from "@mui/material";
import {
  Bot,
  MessageSquareWarning,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Brain,
} from "lucide-react";
import {
  adminApi,
  ModerationTextResult,
  ModerationBehaviorResult,
} from "@/services/adminApi";
import { useTranslation } from "@/i18n/useTranslation";

export default function ModerationView() {
  // NLP Text testing
  const [textInput, setTextInput] = useState("");
  const [lang, setLang] = useState<"vi" | "en" | "auto">("vi");
  const [textResult, setTextResult] = useState<ModerationTextResult | null>(null);
  const [textLoading, setTextLoading] = useState(false);

  // Bot Behavior testing
  const [behaviorSample, setBehaviorSample] = useState({
    friendRequestsPerHour: 2,
    acceptanceRate: 0.6,
    actionIntervalVariance: 35,
    actionRepetitionRatio: 0.1,
    interactionVelocity: 4,
    distinctTargetRatio: 0.8,
  });
  const [behaviorResult, setBehaviorResult] = useState<ModerationBehaviorResult | null>(null);
  const [behaviorLoading, setBehaviorLoading] = useState(false);

  const { isEnglish: isEn } = useTranslation();

  const handleTestText = async () => {
    if (!textInput.trim()) return;
    try {
      setTextLoading(true);
      const res = await adminApi.testModerationText(textInput.trim(), lang);
      setTextResult(res);
    } catch {
      // test failed
    } finally {
      setTextLoading(false);
    }
  };

  const handleTestBehavior = async () => {
    try {
      setBehaviorLoading(true);
      const res = await adminApi.testModerationBehavior(behaviorSample);
      setBehaviorResult(res);
    } catch {
      // test failed
    } finally {
      setBehaviorLoading(false);
    }
  };

  const applyPreset = (preset: "human" | "spam_bot" | "speed_clicker") => {
    if (preset === "human") {
      setBehaviorSample({
        friendRequestsPerHour: 2,
        acceptanceRate: 0.75,
        actionIntervalVariance: 45,
        actionRepetitionRatio: 0.05,
        interactionVelocity: 3,
        distinctTargetRatio: 0.85,
      });
    } else if (preset === "spam_bot") {
      setBehaviorSample({
        friendRequestsPerHour: 80,
        acceptanceRate: 0.02,
        actionIntervalVariance: 1.5,
        actionRepetitionRatio: 0.88,
        interactionVelocity: 45,
        distinctTargetRatio: 0.1,
      });
    } else {
      setBehaviorSample({
        friendRequestsPerHour: 15,
        acceptanceRate: 0.3,
        actionIntervalVariance: 0.4,
        actionRepetitionRatio: 0.95,
        interactionVelocity: 120,
        distinctTargetRatio: 0.25,
      });
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
          {isEn ? "AI & Trust Engine Playground" : "Thử nghiệm Kiểm duyệt AI & Phát hiện Bot"}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          {isEn
            ? "Inspect NLP text toxicity analysis and anomaly behavior detection models"
            : "Thử nghiệm trực tiếp mô hình phân loại độc hại NLP và thuật toán phát hiện dị biệt Bot"}
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3 }}>
        {/* Module 1: NLP Text Moderator */}
        <Card sx={{ borderRadius: "16px", border: "1px solid", borderColor: "divider", height: "100%" }}>
          <CardContent sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
              <MessageSquareWarning size={20} color="var(--mui-palette-primary-main)" />
              {isEn ? "NLP Text Toxicity Classifier" : "Mô hình Phân loại Văn bản (NLP)"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isEn
                ? "Bilingual transformer classifier for hate speech, harassment, spam, and profanity."
                : "Mô hình Transformer song ngữ VI/EN phát hiện ngôn từ thù ghét, quấy rối, thư rác và tục tĩu."}
            </Typography>

            <TextField
              multiline
              rows={3}
              placeholder={isEn ? "Type or paste text to test..." : "Nhập hoặc dán nội dung văn bản để thử nghiệm..."}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              sx={{ width: "100%" }}
            />

            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", justifyContent: "space-between" }}>
              <TextField
                select
                size="small"
                label={isEn ? "Language" : "Ngôn ngữ"}
                value={lang}
                onChange={(e) => setLang(e.target.value as "vi" | "en" | "auto")}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="vi">Tiếng Việt</MenuItem>
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="auto">Auto detect</MenuItem>
              </TextField>

              <Button
                variant="contained"
                onClick={handleTestText}
                disabled={textLoading || !textInput.trim()}
                startIcon={textLoading ? <CircularProgress size={16} color="inherit" /> : <Sparkles size={16} />}
                sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 700 }}
              >
                {isEn ? "Run Analysis" : "Phân tích NLP"}
              </Button>
            </Box>

            {textResult && (
              <Box
                sx={{
                  mt: 1,
                  p: 2,
                  borderRadius: "12px",
                  bgcolor: "action.hover",
                  border: "1px solid",
                  borderColor: textResult.action === "block" ? "error.main" : textResult.action === "flag" ? "warning.main" : "success.main",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {isEn ? "Result" : "Kết luận"}: {textResult.action.toUpperCase()}
                  </Typography>
                  <Chip
                    label={textResult.isClean ? (isEn ? "CLEAN" : "HỢP LỆ") : (isEn ? "VIOLATION" : "VI PHẠM")}
                    size="small"
                    color={textResult.isClean ? "success" : "error"}
                    sx={{ fontWeight: 700 }}
                  />
                </Box>

                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">{isEn ? "Toxicity Score" : "Độ độc hại"}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {Math.round(textResult.toxicityScore * 100)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.round(textResult.toxicityScore * 100)}
                    color={textResult.toxicityScore > 0.6 ? "error" : textResult.toxicityScore > 0.3 ? "warning" : "success"}
                    sx={{ height: 8, borderRadius: "4px" }}
                  />
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
                  <Chip label={`Hate speech: ${textResult.categories.hateSpeech ? "YES" : "NO"}`} size="small" color={textResult.categories.hateSpeech ? "error" : "default"} />
                  <Chip label={`Harassment: ${textResult.categories.harassment ? "YES" : "NO"}`} size="small" color={textResult.categories.harassment ? "error" : "default"} />
                  <Chip label={`Spam: ${textResult.categories.spam ? "YES" : "NO"}`} size="small" color={textResult.categories.spam ? "error" : "default"} />
                  <Chip label={`Profanity: ${textResult.categories.profanity ? "YES" : "NO"}`} size="small" color={textResult.categories.profanity ? "error" : "default"} />
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Module 2: Bot Anomaly Detection */}
        <Card sx={{ borderRadius: "16px", border: "1px solid", borderColor: "divider", height: "100%" }}>
          <CardContent sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
              <Bot size={20} color="var(--mui-palette-secondary-main)" />
              {isEn ? "Bot Anomaly Detector" : "Phát hiện Bot & Tài khoản ảo (ML)"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isEn
                ? "Isolation Forest & Autoencoder neural network inspecting behavioral anomalies."
                : "Mô hình Isolation Forest kết hợp Mạng nơ-ron Autoencoder cô lập hành vi máy móc."}
            </Typography>

            {/* Preset buttons */}
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="caption" sx={{ alignSelf: "center", fontWeight: 600 }}>
                {isEn ? "Presets" : "Mẫu sẵn"}:
              </Typography>
              <Button size="small" variant="outlined" onClick={() => applyPreset("human")} sx={{ borderRadius: "6px" }}>
                {isEn ? "Normal User" : "Người thật"}
              </Button>
              <Button size="small" variant="outlined" color="warning" onClick={() => applyPreset("spam_bot")} sx={{ borderRadius: "6px" }}>
                {isEn ? "Spam Bot" : "Bot kết bạn"}
              </Button>
              <Button size="small" variant="outlined" color="error" onClick={() => applyPreset("speed_clicker")} sx={{ borderRadius: "6px" }}>
                {isEn ? "Speed Clicker" : "Bot cày like"}
              </Button>
            </Box>

            {/* Behavior parameters */}
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <TextField
                size="small"
                label={isEn ? "Friend requests/hr" : "Lời mời kết bạn/giờ"}
                type="number"
                value={behaviorSample.friendRequestsPerHour}
                onChange={(e) => setBehaviorSample({ ...behaviorSample, friendRequestsPerHour: Number(e.target.value) })}
              />
              <TextField
                size="small"
                label={isEn ? "Acceptance rate (0-1)" : "Tỷ lệ đồng ý (0-1)"}
                type="number"
                value={behaviorSample.acceptanceRate}
                onChange={(e) => setBehaviorSample({ ...behaviorSample, acceptanceRate: Number(e.target.value) })}
              />
              <TextField
                size="small"
                label={isEn ? "Action interval variance" : "Phương sai chu kỳ (s)"}
                type="number"
                value={behaviorSample.actionIntervalVariance}
                onChange={(e) => setBehaviorSample({ ...behaviorSample, actionIntervalVariance: Number(e.target.value) })}
              />
              <TextField
                size="small"
                label={isEn ? "Repetition ratio (0-1)" : "Tỷ lệ lặp lại (0-1)"}
                type="number"
                value={behaviorSample.actionRepetitionRatio}
                onChange={(e) => setBehaviorSample({ ...behaviorSample, actionRepetitionRatio: Number(e.target.value) })}
              />
              <TextField
                size="small"
                label={isEn ? "Interaction velocity (/min)" : "Tốc độ tương tác/phút"}
                type="number"
                value={behaviorSample.interactionVelocity}
                onChange={(e) => setBehaviorSample({ ...behaviorSample, interactionVelocity: Number(e.target.value) })}
              />
              <TextField
                size="small"
                label={isEn ? "Target diversity (0-1)" : "Độ đa dạng đối tượng (0-1)"}
                type="number"
                value={behaviorSample.distinctTargetRatio}
                onChange={(e) => setBehaviorSample({ ...behaviorSample, distinctTargetRatio: Number(e.target.value) })}
              />
            </Box>

            <Button
              variant="contained"
              color="secondary"
              onClick={handleTestBehavior}
              disabled={behaviorLoading}
              startIcon={behaviorLoading ? <CircularProgress size={16} color="inherit" /> : <Brain size={16} />}
              sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 700 }}
            >
              {isEn ? "Inspect Behavior" : "Kiểm tra hành vi"}
            </Button>

            {behaviorResult && (
              <Alert
                severity={behaviorResult.isAnomaly ? "error" : "success"}
                icon={behaviorResult.isAnomaly ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
                sx={{ borderRadius: "10px" }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {behaviorResult.assessment}
                </Typography>
                <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                  Anomaly score: <strong>{behaviorResult.anomalyScore.toFixed(3)}</strong> • Risk Level: <strong>{behaviorResult.riskLevel}</strong>
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
