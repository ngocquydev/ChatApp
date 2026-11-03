"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { Flag, X } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { pagesApi, PageItem } from "@/services/pagesApi";

interface CreatePageDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (page: PageItem) => void;
}

const CATEGORIES = [
  "Cộng đồng",
  "Công nghệ",
  "Doanh nghiệp",
  "Giải trí",
  "Ẩm thực",
  "Giáo dục",
  "Nghệ thuật & Sáng tạo",
  "Khác",
];

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CreatePageDialog({
  open,
  onClose,
  onCreated,
}: CreatePageDialogProps) {
  const { tr, t } = useTranslation();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("Cộng đồng");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(generateSlug(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const page = await pagesApi.createPage({
        name: name.trim(),
        slug: slug.trim(),
        category,
        bio: bio.trim(),
        avatar: avatar.trim() || undefined,
      });
      onCreated(page);
      onClose();
      setName("");
      setSlug("");
      setBio("");
      setAvatar("");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Tạo trang thất bại, vui lòng thử lại!";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      disableScrollLock
      autoFocus={false}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "20px",
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
          },
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 2.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, pr: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "12px",
                bgcolor: "primary.main",
                color: "primary.contrastText",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Flag size={20} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {t("pages.createModalTitle")}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {t("pages.createModalDesc")}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" aria-label={t("common.close")} sx={{ flexShrink: 0 }}>
            <X size={18} />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
            pt: "24px !important",
            px: 3,
            pb: 2,
          }}
        >
          {error && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: "10px",
                bgcolor: "error.main",
                color: "error.contrastText",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              {error}
            </Box>
          )}

          <TextField
            label={t("pages.pageName")}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            fullWidth
            size="small"
            sx={{ mt: 0.5 }}
            placeholder={t("pages.pageNamePlaceholder")}
          />

          <TextField
            label={t("pages.slugLabel")}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            fullWidth
            size="small"
            helperText={slug ? `/pages/${slug}` : undefined}
          />

          <TextField
            select
            label={t("pages.categoryLabel")}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            fullWidth
            size="small"
          >
            {CATEGORIES.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label={t("pages.descLabel")}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            multiline
            rows={3}
            fullWidth
            size="small"
            placeholder={t("pages.descPlaceholder")}
          />

          <TextField
            label={tr("Link ảnh đại diện (URL)", "Avatar Image URL")}
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            fullWidth
            size="small"
            placeholder="https://..."
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button onClick={onClose} color="inherit" sx={{ borderRadius: "10px" }}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!name.trim() || !slug.trim() || isSubmitting}
            sx={{ borderRadius: "10px", px: 3, fontWeight: 700 }}
          >
            {isSubmitting
              ? t("pages.creating")
              : t("pages.submitCreate")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

