"use client";

import { Box, Chip, List, ListItem, ListItemText } from "@mui/material";
import { ScrollText, ShieldCheck } from "lucide-react";
import SectionCard from "./SectionCard";
import { wafActionLabel, wafReasonLabel } from "./wafLabels";
import EmptyState from "@/components/common/EmptyState";
import type { WafEvent } from "@/services/wafApi";
import { formatRelativeTime, formatFullDateTime } from "@/utils/formatTime";
import { useTranslation } from "@/i18n/useTranslation";

const ACTION_COLOR: Record<WafEvent["action"], "error" | "warning" | "success" | "default"> = {
  block: "error",
  ban: "error",
  challenge: "warning",
  unban: "success",
};

/** 100 sự kiện WAF gần nhất (chặn, yêu cầu xác minh, cấm/gỡ cấm IP) */
export default function EventsCard({ events }: { events: WafEvent[] }) {
  const { tr } = useTranslation();

  return (
    <SectionCard
      id="waf-events"
      icon={<ScrollText size={22} />}
      title={tr("Nhật ký tường lửa", "Firewall log")}
      description={tr("100 sự kiện gần nhất.", "Latest 100 events.")}
    >
      {events.length === 0 ? (
        <EmptyState
          compact
          icon={<ShieldCheck size={28} />}
          title={tr("Chưa có sự kiện nào", "No events yet")}
          description={tr("Request bị chặn hoặc cần xác minh sẽ được ghi lại ở đây.", "Blocked or challenged requests will be logged here.")}
        />
      ) : (
        <List disablePadding sx={{ maxHeight: 480, overflowY: "auto" }} aria-label={tr("Danh sách sự kiện tường lửa", "Firewall events")}>
          {events.map((event, index) => (
            <ListItem key={`${event.at}-${event.ip}-${index}`} divider disableGutters sx={{ alignItems: "flex-start", gap: 1.5 }}>
              <Chip
                size="small"
                color={ACTION_COLOR[event.action] ?? "default"}
                label={wafActionLabel(event.action, tr)}
                sx={{ mt: 0.5, minWidth: 72 }}
              />
              <ListItemText
                primary={wafReasonLabel(event.reason, tr)}
                secondary={
                  <Box component="span" sx={{ display: "flex", flexDirection: "column", overflowWrap: "anywhere" }}>
                    <span>
                      {event.ip}
                      {event.country ? ` · ${event.country}` : ""}
                      {event.method && event.path ? ` · ${event.method} ${event.path}` : ""}
                    </span>
                    <Box component="time" dateTime={event.at} title={formatFullDateTime(event.at)}>
                      {formatRelativeTime(event.at)}
                    </Box>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </SectionCard>
  );
}

