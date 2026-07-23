"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user && pathname !== "/login") {
        router.push("/login");
      } else if (user && pathname === "/login") {
        router.push("/dashboard");
      } else if (user && pathname.startsWith("/admin") && role !== "admin") {
        router.push("/dashboard");
      }
    }
  }, [user, loading, role, pathname, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-slate-400 animate-pulse">Memuat data...</p>
        </div>
      </div>
    );
  }

  // Prevent flash of content for protected routes
  const isLoginPage = pathname === "/login";
  const isAdminRoute = pathname.startsWith("/admin");

  if (!user && !isLoginPage) {
    return null;
  }

  if (user && isLoginPage) {
    return null;
  }

  if (user && isAdminRoute && role !== "admin") {
    return null;
  }

  return <>{children}</>;
}
