"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import ResponsiveAppBar from "@/components/layout/AppBar";

interface ClientShellProps {
  children: ReactNode;
}

export default function ClientShell({ children }: ClientShellProps) {
  const pathname = usePathname();
  const hideAppBarRoutes = ["/login", "/register", "/forgot-password"];
  const shouldHideAppBar = hideAppBarRoutes.some((route) => pathname === route || pathname?.startsWith(`${route}/`));

  return (
    <>
      {!shouldHideAppBar && <ResponsiveAppBar />}
      {children}
    </>
  );
}
