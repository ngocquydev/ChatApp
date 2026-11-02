"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { Flag } from "lucide-react";
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
  const { tr } = useTranslation();
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
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}>
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
            }}
          >
            <Flag size={20} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {tr("Tạo Trang mới", "Create New Page")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {tr(
                "Kết nối với người theo dõi và chia sẻ nội dung dưới tư cách Trang",
                "Connect with followers and share content as a Page"
              )}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1.5 }}>
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
            label={tr("Tên Trang", "Page Name")}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            fullWidth
            size="small"
            placeholder={tr("Ví dụ: Hội yêu Lập trình", "E.g. Developers Club")}
          />

          <TextField
            label={tr("Đường dẫn (slug)", "URL Slug")}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            fullWidth
            size="small"
            helperText={slug ? `/pages/${slug}` : undefined}
          />

          <TextField
            select
            label={tr("Danh mục", "Category")}
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
            label={tr("Tiểu sử / Giới thiệu", "Bio / Description")}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            multiline
            rows={3}
            fullWidth
            size="small"
            placeholder={tr(
              "Giới thiệu ngắn gọn về Trang của bạn...",
              "Brief introduction about your Page..."
            )}
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
            {tr("Hủy", "Cancel")}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!name.trim() || !slug.trim() || isSubmitting}
            sx={{ borderRadius: "10px", px: 3, fontWeight: 700 }}
          >
            {isSubmitting
              ? tr("Đang tạo...", "Creating...")
              : tr("Tạo Trang", "Create Page")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

