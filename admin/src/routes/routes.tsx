import type { ReactNode } from "react";
import AdminLogin from "../components/auth/AdminLogin";
import AdminLayout from "../components/layout/AdminLayout";
import DashboardView from "../components/dashboard/DashboardView";
import UsersManagementView from "../components/users/UsersManagementView";
import PostsModerationView from "../components/posts/PostsModerationView";
import ModerationView from "../components/moderation/ModerationView";
import SecurityCenter from "../components/security/SecurityCenter";
import SystemHealthView from "../components/system/SystemHealthView";

export interface RouteItem {
  path?: string;
  index?: boolean;
  element: ReactNode;
  children?: RouteItem[];
}

export const childRoutes: RouteItem[] = [
  { index: true, element: <DashboardView /> },
  { path: "users", element: <UsersManagementView /> },
  { path: "posts", element: <PostsModerationView /> },
  { path: "moderation", element: <ModerationView /> },
  { path: "security", element: <SecurityCenter /> },
  { path: "system", element: <SystemHealthView /> },
];

export const routes: RouteItem[] = [
  {
    path: "/login",
    element: <AdminLogin />,
  },
  {
    path: "/",
    element: <AdminLayout />,
    children: childRoutes,
  },
];

export default routes;

