import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, useLocation, Outlet } from "react-router-dom";
import router from "./routes/routes";
import ResponsiveAppBar from "./components/layout/AppBar";
import { useAuthStore } from "./store/useAuthStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function Layout() {
  const location = useLocation();
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const hideAppBarRoutes = ["/login", "/register"];
  const shouldHideAppBar = hideAppBarRoutes.includes(location.pathname);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <>
      {!shouldHideAppBar && <ResponsiveAppBar />}
      <Outlet />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
