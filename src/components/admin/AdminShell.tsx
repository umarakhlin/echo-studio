"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  FolderHeart,
  Images,
  Menu,
  LogOut,
  HardDriveDownload,
} from "lucide-react";

import { Logo } from "@/components/ui/Logo";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { AdminRejectionGuard } from "@/components/admin/AdminRejectionGuard";
import { getDataBackendMode } from "@/lib/data-backend";

const NAV_ITEMS = [
  { href: "/admin", label: "דשבורד", icon: LayoutDashboard, exact: true },
  { href: "/admin/clients", label: "לקוחות", icon: Users },
  { href: "/admin/projects", label: "פרויקטים", icon: FolderHeart },
  { href: "/admin/gallery", label: "גלריה כללית", icon: Images },
  { href: "/admin/backup", label: "גיבוי", icon: HardDriveDownload },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AdminRejectionGuard />
      <div className="min-h-screen bg-cream">
        <BackdropArt />
        <ShellLayout>{children}</ShellLayout>
      </div>
    </ToastProvider>
  );
}

function ShellLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative mx-auto flex min-h-screen max-w-[100rem]">
      <Sidebar pathname={pathname} className="hidden lg:flex" />

      {/* Drawer לנייד */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <Sidebar
            pathname={pathname}
            onNavigate={() => setOpen(false)}
            className="relative z-10 h-full"
          />
        </div>
      )}

      <main className="relative flex min-h-screen flex-1 flex-col">
        <TopBar onOpenSidebar={() => setOpen(true)} />
        <StudioStabilityBanner />
        <div className="flex-1 px-5 py-6 sm:px-8 sm:py-8">{children}</div>
      </main>
    </div>
  );
}

function Sidebar({
  pathname,
  className,
  onNavigate,
}: {
  pathname: string;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <aside
      className={cn(
        "w-64 shrink-0 border-l border-eggplant/10 bg-white/70 backdrop-blur-sm",
        "flex flex-col px-4 py-6",
        className
      )}
    >
      <Link
        href="/admin"
        className="px-2"
        onClick={onNavigate}
        aria-label="לוח ניהול"
      >
        <Logo size="md" />
      </Link>

      <nav className="mt-8 flex-1 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-eggplant text-cream shadow-soft"
                  : "text-ink-soft hover:bg-cream-200 hover:text-eggplant"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <a
        href="/api/studio-logout"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-muted hover:bg-cream-200 hover:text-eggplant transition-colors"
      >
        <LogOut className="h-4 w-4" />
        התנתקות
      </a>
    </aside>
  );
}

function StudioStabilityBanner() {
  if (getDataBackendMode() === "cloud") {
    return <CloudStorageBanner />;
  }

  return (
    <div className="border-b border-eggplant/10 bg-cream-200/90 px-5 py-2.5 text-center text-[13px] leading-snug text-ink-soft sm:px-8">
      <span className="font-medium text-eggplant">אחסון מקומי:</span> הנתונים
      נשמרים רק במחשב ובדפדפן הזה —<strong className="text-ink"> לא </strong>
      יופיעו בטלפון או במחשב אחר. למעבר לענן: הגדרי ב-Vercel{" "}
      <span dir="ltr" className="font-mono text-xs">
        NEXT_PUBLIC_DATA_BACKEND=cloud
      </span>{" "}
      + Supabase, ופרסי מחדש. לפני עדכוני מערכת —{" "}
      <Link
        href="/admin/backup"
        className="font-medium text-eggplant underline-offset-2 hover:underline"
      >
        גיבוי
      </Link>
      .
    </div>
  );
}

function CloudStorageBanner() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function runTest() {
    setBusy(true);
    try {
      const res = await fetch("/api/studio-connection-test", {
        credentials: "include",
      });
      const j = (await res.json()) as {
        error?: string;
        database?: {
          skipped?: boolean;
          reason?: string;
          ok?: boolean;
          clientCount?: number;
          error?: string;
          hint?: string;
        };
      };
      if (!res.ok) {
        toast.error(j.error ?? "בדיקה נכשלה.");
        return;
      }
      const db = j.database;
      if (db?.skipped) {
        toast.info(db.reason ?? "");
        return;
      }
      if (db?.ok) {
        toast.success(`חיבור לענן תקין. נמצאו ${db.clientCount ?? 0} לקוחות.`);
        return;
      }
      const err = db?.error ?? "שגיאת מסד.";
      const hint = db?.hint ? ` ${db.hint}` : "";
      toast.error(`${err}${hint}`);
    } catch {
      toast.error("לא ניתן להריץ בדיקה — רענני את הדף.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-emerald-200/80 bg-emerald-50/95 px-5 py-2.5 sm:px-8">
      <div className="mx-auto max-w-3xl text-center text-[13px] leading-snug text-emerald-950">
        <span className="font-medium">אחסון ענן (Supabase):</span> אותם לקוחות
        ופרויקטים בכל מכשיר — רק אם נכנסת ל־
        <strong className="font-semibold"> אותה כתובת אתר</strong> (לא localhost
        במחשב ו-Vercel בטלפון). לבדיקה — לחצי כפתור (תוצאה בפינה).
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={runTest}
            className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-900 disabled:opacity-55"
          >
            {busy ? "בודק…" : "בדיקת חיבור לענן"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TopBar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const router = useRouter();
  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-eggplant/10 bg-white/70 px-5 py-3 backdrop-blur-sm sm:px-8">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="פתיחת תפריט"
        className="rounded-md p-2 text-ink-soft hover:bg-cream-200 hover:text-eggplant lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="lg:hidden">
        <Logo size="sm" showHebrew={false} />
      </div>

      <div className="hidden lg:block text-sm text-ink-muted">
        Echo Studio · לוח ניהול
      </div>

      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm text-ink-muted hover:text-eggplant transition-colors"
      >
        ← לעמוד הקודם
      </button>
    </div>
  );
}

function BackdropArt() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 right-0 h-[36rem] w-[36rem] rounded-full bg-gold-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed top-[40rem] -left-40 h-[40rem] w-[40rem] rounded-full bg-eggplant/10 blur-3xl"
      />
    </>
  );
}
