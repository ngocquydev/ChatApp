"use client";

import { Card, CardContent } from "@mui/material";
import { Image as ImageIcon } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import EmptyState from "@/components/common/EmptyState";

interface GroupMediaTabProps {
  groupId: string;
}

export default function GroupMediaTab({ groupId }: GroupMediaTabProps) {
  const { t } = useTranslation();

  return (
    <Card
      sx={{
        borderRadius: "16px",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        p: { xs: 2, sm: 4 },
      }}
    >
      <CardContent sx={{ p: 0 }}>
        <EmptyState
          icon={<ImageIcon size={48} />}
          title={t("groups.noMediaTitle")}
          description={t("groups.noMediaDesc")}
        />
      </CardContent>
    </Card>
  );
}

