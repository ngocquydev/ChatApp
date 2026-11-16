"use client";

import { Box, ButtonBase, Typography } from "@mui/material";
import {
  Download,
  File,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Music,
} from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { formatFileSize, getFileNameFromUrl } from "@/services/postsApi";

interface FileAttachmentItemProps {
  url: string;
  isMe?: boolean;
  filename?: string;
  bytes?: number;
}

function getFileCategory(filename: string): {
  icon: typeof File;
  badgeBg: string;
  badgeColor: string;
  label: string;
} {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  if (ext === "pdf") {
    return {
      icon: FileText,
      badgeBg: "rgba(239, 68, 68, 0.14)",
      badgeColor: "var(--mui-palette-error-main)",
      label: "PDF",
    };
  }

  if (["doc", "docx", "txt", "rtf", "odt"].includes(ext)) {
    return {
      icon: FileText,
      badgeBg: "rgba(59, 130, 246, 0.14)",
      badgeColor: "var(--mui-palette-primary-main)",
      label: "DOC",
    };
  }

  if (["xls", "xlsx", "csv"].includes(ext)) {
    return {
      icon: FileSpreadsheet,
      badgeBg: "rgba(34, 197, 94, 0.14)",
      badgeColor: "var(--mui-palette-success-main)",
      label: "SHEET",
    };
  }

  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return {
      icon: FileArchive,
      badgeBg: "rgba(245, 158, 11, 0.14)",
      badgeColor: "var(--mui-palette-warning-main)",
      label: "ZIP",
    };
  }

  if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(ext)) {
    return {
      icon: Music,
      badgeBg: "rgba(168, 85, 247, 0.14)",
      badgeColor: "var(--mui-palette-secondary-main)",
      label: "AUDIO",
    };
  }

  return {
    icon: File,
    badgeBg: "var(--mui-palette-action-hover)",
    badgeColor: "var(--mui-palette-text-secondary)",
    label: ext.toUpperCase() || "FILE",
  };
}

export default function FileAttachmentItem({
  url,
  isMe = false,
  filename,
  bytes,
}: FileAttachmentItemProps) {
  const { tr } = useTranslation();
  const displayName = filename || getFileNameFromUrl(url);
  const category = getFileCategory(displayName);
  const IconComponent = category.icon;
  const sizeText = formatFileSize(bytes);

  const handleDownload = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <ButtonBase
      onClick={handleDownload}
      aria-label={tr(`Tải xuống tệp ${displayName}`, `Download file ${displayName}`)}
      sx={{
        width: "100%",
        maxWidth: { xs: 260, sm: 310 },
        textAlign: "left",
        borderRadius: "14px",
        p: 1.25,
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        bgcolor: isMe ? "rgba(255, 255, 255, 0.12)" : "var(--mui-palette-background-paper)",
        color: isMe ? "var(--mui-palette-common-white)" : "var(--mui-palette-text-primary)",
        border: "1px solid",
        borderColor: isMe ? "rgba(255, 255, 255, 0.25)" : "var(--mui-palette-divider)",
        boxShadow: 1,
        transition: "transform 140ms ease, box-shadow 140ms ease, background-color 140ms ease",
        "&:hover": {
          bgcolor: isMe ? "rgba(255, 255, 255, 0.2)" : "var(--mui-palette-action-hover)",
          transform: "translateY(-1px)",
          boxShadow: 2,
        },
      }}
    >
      <Box
        sx={{
          width: 42,
          height: 42,
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          bgcolor: isMe ? "rgba(255, 255, 255, 0.2)" : category.badgeBg,
          color: isMe ? "var(--mui-palette-common-white)" : category.badgeColor,
        }}
      >
        <IconComponent size={22} />
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            fontSize: "0.875rem",
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: isMe ? "var(--mui-palette-common-white)" : "var(--mui-palette-text-primary)",
          }}
        >
          {displayName}
        </Typography>

        <Typography
          variant="caption"
          sx={{
            fontSize: "0.75rem",
            color: isMe ? "rgba(255, 255, 255, 0.8)" : "var(--mui-palette-text-secondary)",
            mt: 0.2,
            display: "block",
          }}
        >
          {sizeText ? `${category.label} • ${sizeText}` : category.label}
        </Typography>
      </Box>

      <Box
        sx={{
          p: 0.75,
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          bgcolor: isMe ? "rgba(255, 255, 255, 0.2)" : "var(--mui-palette-action-hover)",
          color: isMe ? "var(--mui-palette-common-white)" : "var(--mui-palette-primary-main)",
        }}
      >
        <Download size={16} />
      </Box>
    </ButtonBase>
  );
}

