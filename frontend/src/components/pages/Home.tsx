"use client";

import { Box } from "@mui/material";
import Feed from "../section/Feed";
import PersonCall from "../section/PersonCall";
import LeftSidebar from "../layout/LeftSidebar";

export default function Home() {
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100dvh",
        width: "100%",
        bgcolor: "var(--mui-palette-neutral-100)",
        pt: { xs: "78px", sm: "84px", md: "88px" },
      }}
    >
      <LeftSidebar />
      <Box
        sx={{
          flex: 1,
          ml: { md: "280px", lg: "320px", xl: "350px" },
          mr: { md: "340px", lg: "360px", xl: "380px" },
          display: "flex",
          justifyContent: "center",
          minWidth: 0,
        }}
      >
        <Feed />
      </Box>
      <PersonCall />
    </Box>
  );
}
