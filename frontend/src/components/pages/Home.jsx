import React, { useState, useRef, useEffect } from "react";
import { Box } from "@mui/material";

import Feed from "../section/Feed";
import PersonCall from "../section/PersonCall";

export default function Home() {
  return (
    <Box
      sx={{
        display: "flex",
        height: "100%",
        width: { xs: "100%", md: "80%" },
        bgcolor: "#f1f5f9",
        overflow: "hidden",
      }}
    >
      <Feed />
      <PersonCall />
    </Box>
  );
}
