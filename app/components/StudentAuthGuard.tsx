"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppSplash } from "./Loaders";

export function StudentAuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user || session.user.role !== "STUDENT") {
      router.replace("/login");
    }
  }, [session, status, router]);

  if (status === "loading") return <AppSplash message="Opening your student portal…" />;
  // Not allowed: keep the loader up while redirecting instead of flashing the page.
  if (!session?.user || session.user.role !== "STUDENT") return <AppSplash message="Redirecting to sign in…" />;

  return <>{children}</>;
}
