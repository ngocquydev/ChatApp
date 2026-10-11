import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/main.css";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ClerkProvider } from "@clerk/react";
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter />
    <App />
  </StrictMode>,
);
