"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import ResponsiveAppBar from "@/components/layout/AppBar";

interface ClientShellProps {
  children: ReactNode;
}

export default function ClientShell({ children }: ClientShellProps) {
  const pathname = usePathname();
  const hideAppBarRoutes = ["/login", "/register"];
  const shouldHideAppBar = hideAppBarRoutes.includes(pathname);

  return (
    <>
      {!shouldHideAppBar && <ResponsiveAppBar />}
      {children}
    </>
  );
}
