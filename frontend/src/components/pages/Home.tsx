"use client";

import { Box } from "@mui/material";
import Feed from "../section/Feed";
import PersonCall from "../section/PersonCall";

export default function Home() {
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        width: { xs: "100%", md: "75%", lg: "80%" },
        bgcolor: "#f1f5f9",
        pt: "64px",
      }}
    >
      <Feed />
      <PersonCall />
    </Box>
  );
}
