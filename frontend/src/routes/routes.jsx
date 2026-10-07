import { createBrowserRouter, Navigate } from "react-router-dom";
import { Layout } from "../App";
import ProtectedRoute from "./ProtectedRoute";
import { Home } from "lucide-react";
import Login from "../components/pages/Login";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/login", element: <Login /> },
      // { path: "/register", element: <Register /> },
      {
        element: <ProtectedRoute />,
        children: [{ path: "/", element: <Home /> }],
      },

      // 3. Fallback khi gõ sai URL
      { path: "*", element: <Navigate to="/login" replace /> },
    ],
  },
]);

export default router;
