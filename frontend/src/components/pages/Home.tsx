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
        width: "100%",
        bgcolor: "#f1f5f9",
        pt: "64px",
      }}
    >
      <Box
        sx={{
          flex: 1,
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
