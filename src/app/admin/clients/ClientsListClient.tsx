"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, Users } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import {
  listClients,
  listProjects,
  type Client,
  type Project,
} from "@/lib/db";

export function ClientsListClient() {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, p] = await Promise.all([listClients(), listProjects()]);
        if (cancelled) return;
        setClients(Array.isArray(c) ? c : []);
        setProjects(Array.isArray(p) ? p : []);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setClients([]);
          setProjects([]);
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
    if (!query.trim()) return clients;
    const q = query.trim().toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [clients, query]);

  const projectCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of projects) {
      map.set(p.clientId, (map.get(p.clientId) ?? 0) + 1);
    }
    return map;
  }, [projects]);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-eggplant">
            לקוחות
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            ניהול אנשי הקשר של כל הפרויקטים שלך.
          </p>
        </div>

        <ButtonLink
          href="/admin/clients/new"
          startIcon={<UserPlus className="h-4 w-4" />}
        >
          לקוח חדש
        </ButtonLink>
      </header>

      {!loading && clients.length > 0 && (
        <div className="mb-5 max-w-sm">
          <Input
            placeholder="חיפוש לפי שם, טלפון או אימייל"
            startIcon={<Search className="h-4 w-4" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {loading ? (
        <SkeletonRows />
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="עוד אין לקוחות"
          description="הוסיפו את הלקוח הראשון - אחר כך תוכלו לפתוח לו פרויקט."
          action={
            <ButtonLink href="/admin/clients/new">הוספת לקוח</ButtonLink>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="לא נמצאו תוצאות"
          description="נסו לחפש משהו אחר או לנקות את שדה החיפוש."
        />
      ) : (
        <ul className="grid gap-3">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/clients/${c.id}`}
                className="card group block px-5 py-4 hover:shadow-md hover:border-eggplant/25 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-eggplant">{c.name}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {[c.phone, c.email].filter(Boolean).join(" · ") ||
                        "ללא פרטי קשר"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-cream-200 px-2.5 py-0.5 text-xs text-ink-soft border border-eggplant/10">
                    {projectCount.get(c.id) ?? 0} פרויקטים
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SkeletonRows() {
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
