import { Avatar, Box, Card, Grid, Typography } from "@mui/material";
import Link from "next/link";
import { useTranslation } from "@/i18n/useTranslation";
import VerifiedBadge from "@/components/common/VerifiedBadge";
import type { PageItem } from "@/services/pagesApi";

interface PageMiniSectionProps {
  title: string;
  pages: PageItem[];
}

export default function PageMiniSection({ title, pages }: PageMiniSectionProps) {
  const { t } = useTranslation();
  if (pages.length === 0) return null;

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>{title}</Typography>
      <Grid container spacing={2}>
        {pages.map((page) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={page._id}>
            <Card
              component={Link}
              href={`/pages/${page.slug}`}
              sx={{
                display: "flex", alignItems: "center", gap: 1.5, p: 1.5,
                borderRadius: "16px", textDecoration: "none", color: "inherit",
                border: "1px solid", borderColor: "divider",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                "&:hover": { transform: "translateY(-2px)", boxShadow: 2 },
              }}
            >
              <Avatar src={page.avatar} sx={{ width: 48, height: 48, bgcolor: "primary.main", fontWeight: 700 }}>
                {page.name.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>{page.name}</Typography>
                  {page.isVerified && <VerifiedBadge size={14} />}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {t("pages.followersCount", { count: page.followerCount })}
                </Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
