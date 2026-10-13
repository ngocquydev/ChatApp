import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  palette: {
    primary: {
      main: "#2563eb",
      light: "#3b82f6",
      dark: "#1d4ed8",
    },
    secondary: {
      main: "#7c3aed",
    },
    background: {
      default: "#f8fafc",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: "10px",
          fontWeight: 600,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: "12px",
          "&:not(.MuiInputBase-multiline)": {
            height: "54px",
          },
        },
        input: {
          height: "100%",
          boxSizing: "border-box",
          padding: "0 14px",
          fontSize: "1rem",
        },
      },
    },
  },
});

export default theme;
