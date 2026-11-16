"use client";

import { useState } from "react";
import { Alert, Box, Button, Card, Typography } from "@mui/material";
import { Trash2 } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import ConfirmDialog from "@/components/common/ConfirmDialog";

interface ManageDangerZoneProps {
  onDeleteGroup: () => Promise<void>;
  isDeleting: boolean;
  error: string | null;
}

export default function ManageDangerZone({
  onDeleteGroup,
  isDeleting,
  error,
}: ManageDangerZoneProps) {
  const { t } = useTranslation();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <Card
      variant="outlined"
      sx={{
        p: 3,
        borderRadius: "16px",
        borderColor: "error.main",
        bgcolor: "background.paper",
      }}
    >
      <Typography variant="h6" color="error.main" sx={{ fontWeight: 800, mb: 1 }}>
        {t("groups.dangerZone")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        {t("groups.deleteGroupDesc")}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: "10px" }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
        <Button
          variant="contained"
          color="error"
          startIcon={<Trash2 size={18} />}
          onClick={() => setShowConfirm(true)}
          disabled={isDeleting}
          sx={{ borderRadius: "10px", fontWeight: 700 }}
        >
          {t("groups.deleteGroup")}
        </Button>
      </Box>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={async () => {
          await onDeleteGroup();
          setShowConfirm(false);
        }}
        pending={isDeleting}
        title={t("groups.deleteGroupConfirmTitle")}
        description={t("groups.deleteGroupConfirmDesc")}
        confirmLabel={t("groups.deleteGroup")}
      />
    </Card>
  );
}
