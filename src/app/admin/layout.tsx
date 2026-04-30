import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  STUDIO_SESSION_COOKIE,
  verifyStudioSessionToken,
} from "@/lib/studio-auth";

export const metadata: Metadata = {
  title: "לוח ניהול",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const jar = await cookies();
  const token = jar.get(STUDIO_SESSION_COOKIE)?.value;
  if (!verifyStudioSessionToken(token)) {
    redirect("/login?studio=1");
  }

  return <AdminShell>{children}</AdminShell>;
}
