import { Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./components/auth/AdminLogin";
import AdminLayout from "./components/layout/AdminLayout";
import DashboardView from "./components/dashboard/DashboardView";
import UsersManagementView from "./components/users/UsersManagementView";
import PostsModerationView from "./components/posts/PostsModerationView";
import ModerationView from "./components/moderation/ModerationView";
import SecurityCenter from "./components/security/SecurityCenter";
import SystemHealthView from "./components/system/SystemHealthView";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<DashboardView />} />
        <Route path="users" element={<UsersManagementView />} />
        <Route path="posts" element={<PostsModerationView />} />
        <Route path="moderation" element={<ModerationView />} />
        <Route path="security" element={<SecurityCenter />} />
        <Route path="system" element={<SystemHealthView />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

