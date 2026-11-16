"use client";

import { useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography, useMediaQuery, useTheme } from "@mui/material";
import { z } from "zod";
import { useTranslation } from "@/i18n/useTranslation";
import { uploadAvatar, uploadCover } from "@/services/postsApi";
import { pagesApi, type PageItem } from "@/services/pagesApi";

const imageLimit = 10 * 1024 * 1024;
const pageContactSchema = z.object({
  bio: z.string().trim().max(500),
  phone: z.string().trim().regex(/^(?:|\+?[0-9().\s-]{7,20})$/),
  email: z.union([z.literal(""), z.email().max(254)]),
});

interface EditPageDialogProps {
  page: PageItem;
  onClose: () => void;
  onSaved: (page: PageItem) => void;
}

export default function EditPageDialog({ page, onClose, onSaved }: EditPageDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [bio, setBio] = useState(page.bio || "");
  const [phone, setPhone] = useState(page.phone || "");
  const [email, setEmail] = useState(page.email || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const chooseImage = (file: File | undefined, kind: "avatar" | "cover") => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > imageLimit) {
      setError(t("pages.invalidImage"));
      return;
    }
    setError("");
    if (kind === "avatar") setAvatarFile(file);
    else setCoverFile(file);
  };

  const save = async () => {
    const parsed = pageContactSchema.safeParse({ bio, phone, email: email.trim().toLowerCase() });
    if (!parsed.success) {
      setError(t("pages.invalidContact"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const [avatar, coverImage] = await Promise.all([
        avatarFile ? uploadAvatar(avatarFile) : Promise.resolve(undefined),
        coverFile ? uploadCover(coverFile) : Promise.resolve(undefined),
      ]);
      const updated = await pagesApi.updatePage(page._id, {
        ...parsed.data,
        ...(avatar ? { avatar } : {}),
        ...(coverImage ? { coverImage } : {}),
      });
      onSaved(updated);
    } catch {
      setError(t("pages.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <DialogTitle>{t("pages.editPage")}</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, pt: 2 }}>
        {error && <Alert severity="error" role="alert">{error}</Alert>}
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Button component="label" variant="outlined" disabled={saving}>
            {t("pages.changeAvatar")}
            <input hidden type="file" accept="image/*" onChange={(event) => chooseImage(event.target.files?.[0], "avatar")} />
          </Button>
          <Button component="label" variant="outlined" disabled={saving}>
            {t("pages.changeCover")}
            <input hidden type="file" accept="image/*" onChange={(event) => chooseImage(event.target.files?.[0], "cover")} />
          </Button>
        </Box>
        {(avatarFile || coverFile) && <Typography variant="caption" color="text.secondary">{[avatarFile?.name, coverFile?.name].filter(Boolean).join(" · ")}</Typography>}
        <TextField label={t("pages.descLabel")} value={bio} onChange={(event) => setBio(event.target.value)} multiline minRows={3} slotProps={{ htmlInput: { maxLength: 500 } }} />
        <TextField label={t("pages.phoneLabel")} value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" />
        <TextField label={t("pages.emailLabel")} value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>{t("pages.cancelEdit")}</Button>
        <Button onClick={() => void save()} disabled={saving} variant="contained">{saving ? t("pages.saving") : t("pages.savePage")}</Button>
      </DialogActions>
    </Dialog>
  );
}
