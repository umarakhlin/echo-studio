"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  FolderHeart,
  Images,
  Star,
  Users,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { VintageDivider } from "@/components/ui/VintageDivider";
import {
  getDashboardStats,
  listClients,
  listProjects,
  projectStatusLabels,
  type Client,
  type DashboardStats,
  type Project,
} from "@/lib/db";
import { formatISODateHe, isProjectTargetOverdue } from "@/lib/calendar";

export function DashboardClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<Project[]>([]);
  const [clientsById, setClientsById] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, projects, clients] = await Promise.all([
          getDashboardStats(),
          listProjects(),
          listClients(),
        ]);
        if (cancelled) return;
        const pr = Array.isArray(projects) ? projects : [];
        const cl = Array.isArray(clients) ? clients : [];
        setStats(s);
        setRecent(pr.slice(0, 5));
        setClientsById(
          cl.reduce<Record<string, Client>>((acc, c) => {
            if (c?.id) acc[c.id] = c;
            return acc;
          }, {})
        );
        setLoadError(null);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setLoadError(
            e instanceof Error
              ? e.message
              : "לא ניתן לטעון את נתוני הלוח. נסי לרענן או לפתוח בדפדפן רגיל."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      {loadError && (
        <p
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {loadError}
        </p>
      )}
      <header className="mb-7 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-gold-600">
            ברוכה השבה
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-eggplant">
            הסטודיו שלך
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            מבט מהיר על הפרויקטים, הלקוחות והתמונות שמטופלים כעת.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/admin/clients/new" variant="secondary" size="sm">
            לקוח חדש
          </ButtonLink>
          <ButtonLink
            href="/admin/projects/new"
            size="sm"
            endIcon={<ArrowLeft className="h-4 w-4" />}
          >
            פרויקט חדש
          </ButtonLink>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="לקוחות"
          value={stats?.clientsCount ?? 0}
          loading={loading}
        />
        <StatCard
          icon={FolderHeart}
          label="פרויקטים פעילים"
          value={stats?.activeProjects ?? 0}
          subtext={`${stats?.projectsCount ?? 0} בסך הכל`}
          loading={loading}
        />
        <StatCard
          icon={Images}
          label="תמונות במערכת"
          value={stats?.photosCount ?? 0}
          loading={loading}
        />
        <StatCard
          icon={Star}
          label="מסומן בכוכבית"
          value={stats?.starredCount ?? 0}
          loading={loading}
          accent
        />
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-xl font-semibold text-eggplant">
            פרויקטים אחרונים
          </h2>
          <Link
            href="/admin/projects"
            className="text-sm text-ink-muted hover:text-eggplant"
          >
            כל הפרויקטים ←
          </Link>
        </div>

        {loading ? (
          <SkeletonList />
        ) : recent.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="עדיין אין פרויקטים"
            description="כל לקוח חדש יקבל פרויקט עם קוד וסיסמה ייחודיים."
            action={
              <ButtonLink href="/admin/projects/new">צור פרויקט ראשון</ButtonLink>
            }
          />
        ) : (
          <ul className="grid gap-3">
            {recent.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/projects/${p.id}`}
                  className="card group block px-5 py-4 hover:shadow-md hover:border-eggplant/25 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-eggplant">
                        {p.title}
                      </p>
                      <p className="truncate text-xs text-ink-muted">
                        {clientsById[p.clientId]?.name ?? "לקוח לא ידוע"} ·{" "}
                        <span dir="ltr" className="font-mono">
                          {p.code}
                        </span>
                        {formatISODateHe(p.targetEndDate) && (
                          <>
                            {" · יעד "}
                            <span
                              className={
                                isProjectTargetOverdue(
                                  p.targetEndDate,
                                  p.status
                                )
                                  ? "text-amber-800 font-medium"
                                  : ""
                              }
                            >
                              {formatISODateHe(p.targetEndDate)}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {stats &&
        stats.projectsCount > 0 &&
        stats.byStatus &&
        typeof stats.byStatus === "object" &&
        !Array.isArray(stats.byStatus) && (
        <section className="mt-10">
          <VintageDivider label="התפלגות לפי סטטוס" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(Object.keys(stats.byStatus) as Array<keyof typeof stats.byStatus>).map(
              (status) => (
                <div
                  key={status}
                  className="card flex items-center justify-between px-4 py-3"
                >
                  <span className="text-sm text-ink-soft">
                    {projectStatusLabels[status]}
                  </span>
                  <span className="font-display text-2xl font-semibold text-eggplant">
                    {stats.byStatus[status]}
                  </span>
                </div>
              )
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  loading,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  subtext?: string;
  loading?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="card px-5 py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-muted">{label}</span>
        <span
          className={
            accent
              ? "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gold-100 text-gold-600"
              : "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-eggplant/10 text-eggplant"
          }
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold text-eggplant">
        {loading ? "—" : value.toLocaleString("he-IL")}
      </p>
      {subtext && <p className="mt-1 text-xs text-ink-muted">{subtext}</p>}
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="grid gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <li
          key={i}
          className="card h-[68px] animate-pulse bg-gradient-to-l from-cream-200 via-cream-300 to-cream-200 bg-[length:200%_100%]"
          style={{ animation: "shimmer 2.4s linear infinite" }}
        />
      ))}
    </ul>
  );
}
