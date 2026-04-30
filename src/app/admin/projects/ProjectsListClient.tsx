"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FolderHeart, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  listClients,
  listProjects,
} from "@/lib/db/store";
import {
  projectStatusLabels,
  projectStatusOrder,
  type Client,
  type Project,
  type ProjectStatus,
} from "@/lib/db/types";
import { formatISODateHe, isProjectTargetOverdue } from "@/lib/calendar";

export function ProjectsListClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clientsById, setClientsById] = useState<Record<string, Client>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, c] = await Promise.all([listProjects(), listClients()]);
        if (cancelled) return;
        const plist = Array.isArray(p) ? p : [];
        const clist = Array.isArray(c) ? c : [];
        setProjects(plist);
        setClientsById(
          clist.reduce<Record<string, Client>>((acc, item) => {
            if (item?.id) acc[item.id] = item;
            return acc;
          }, {})
        );
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setProjects([]);
          setClientsById({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = projects;
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => {
        const title = String(p.title ?? "");
        const code = String(p.code ?? "");
        const clientName = String(clientsById[p.clientId]?.name ?? "");
        return (
          title.toLowerCase().includes(q) ||
          code.toLowerCase().includes(q) ||
          clientName.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [projects, query, statusFilter, clientsById]);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-eggplant">
            פרויקטים
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            כל אחד = לקוח אחד עם החומרים שלו.
          </p>
        </div>

        <ButtonLink
          href="/admin/projects/new"
          startIcon={<Plus className="h-4 w-4" />}
        >
          פרויקט חדש
        </ButtonLink>
      </header>

      {!loading && projects.length > 0 && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-sm flex-1">
            <Input
              placeholder="חיפוש לפי כותרת, קוד או לקוח"
              startIcon={<Search className="h-4 w-4" />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div
            role="tablist"
            aria-label="סינון לפי סטטוס"
            className="flex flex-wrap gap-1 rounded-xl bg-cream-200 p-1 border border-eggplant/10"
          >
            <FilterButton
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            >
              הכל
            </FilterButton>
            {projectStatusOrder.map((s) => (
              <FilterButton
                key={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
              >
                {projectStatusLabels[s] ?? s}
              </FilterButton>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonList />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderHeart}
          title="עוד אין פרויקטים"
          description="פרויקט הוא ההקשר של הלקוח: הוא קושר חומרים, אלבומים, סטטוס וסיסמת גישה."
          action={
            <ButtonLink href="/admin/projects/new">צור פרויקט ראשון</ButtonLink>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="לא נמצאו תוצאות"
          description="נסו לשנות את החיפוש או את סינון הסטטוס."
        />
      ) : (
        <ul className="grid gap-3">
          {filtered.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/projects/${p.id}`}
                className="card group block px-5 py-4 hover:shadow-md hover:border-eggplant/25 transition-all"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
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
                          {" · "}
                          <span
                            className={
                              isProjectTargetOverdue(
                                p.targetEndDate,
                                p.status
                              )
                                ? "font-medium text-amber-800"
                                : ""
                            }
                          >
                            יעד{" "}
                            {formatISODateHe(p.targetEndDate)}
                            {isProjectTargetOverdue(p.targetEndDate, p.status)
                              ? " (חלף)"
                              : ""}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ink-muted">
                      עודכן{" "}
                      {(() => {
                        const t = Number(p.updatedAt);
                        return Number.isFinite(t)
                          ? new Date(t).toLocaleDateString("he-IL")
                          : "—";
                      })()}
                    </span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        active
          ? "rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-eggplant shadow-soft"
          : "rounded-lg px-3 py-1.5 text-xs font-medium text-ink-soft hover:text-eggplant"
      }
    >
      {children}
    </button>
  );
}

function SkeletonList() {
  return (
    <ul className="grid gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="card h-[68px] animate-pulse bg-cream-200/60"
        />
      ))}
    </ul>
  );
}
