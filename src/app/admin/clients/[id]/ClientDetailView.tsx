"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AtSign,
  ChevronRight,
  FolderHeart,
  MapPin,
  Phone,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import {
  deleteClient,
  getClient,
  listProjectsByClient,
  type Client,
  type Project,
} from "@/lib/db";

import { ClientForm } from "../ClientForm";
import { formatISODateHe, isProjectTargetOverdue } from "@/lib/calendar";

export function ClientDetailView({ clientId }: { clientId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [client, setClient] = useState<Client | null | undefined>(undefined);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [c, ps] = await Promise.all([
        getClient(clientId),
        listProjectsByClient(clientId),
      ]);
      if (cancelled) return;
      setClient(c ?? null);
      setProjects(ps);
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (client === undefined) {
    return <div className="mx-auto max-w-3xl card h-32 animate-pulse" />;
  }

  if (client === null) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          title="הלקוח לא נמצא"
          description="ייתכן שנמחק או שהקישור לא תקין."
          action={
            <ButtonLink href="/admin/clients">חזרה לרשימה</ButtonLink>
          }
        />
      </div>
    );
  }

  async function onConfirmDelete() {
    if (!client) return;
    try {
      setDeleting(true);
      await deleteClient(client.id);
      toast.success(`הלקוח ${client.name} נמחק.`);
      router.push("/admin/clients");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message ?? "מחיקה נכשלה.");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs name={client.name} />

      {editing ? (
        <>
          <h1 className="mt-2 mb-7 font-display text-3xl font-semibold text-eggplant">
            עריכת {client.name}
          </h1>
          <ClientForm mode="edit" client={client} />
          <div className="mt-3">
            <button
              type="button"
              className="text-sm text-ink-muted hover:text-eggplant"
              onClick={() => setEditing(false)}
            >
              חזרה לתצוגה
            </button>
          </div>
        </>
      ) : (
        <>
          <header className="mt-2 flex items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-semibold text-eggplant">
                {client.name}
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                לקוח מאז {new Date(client.createdAt).toLocaleDateString("he-IL")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                עריכה
              </Button>
              <Button
                variant="ghost"
                size="sm"
                startIcon={<Trash2 className="h-4 w-4" />}
                onClick={() => setConfirmDelete(true)}
                className="text-red-600 hover:bg-red-50"
              >
                מחיקה
              </Button>
            </div>
          </header>

          <section className="card mt-6 grid gap-3 px-5 py-4 sm:grid-cols-2">
            <Detail icon={Phone} label="טלפון" value={client.phone} dir="ltr" />
            <Detail icon={AtSign} label="אימייל" value={client.email} dir="ltr" />
            <Detail icon={MapPin} label="כתובת" value={client.address} />
            <Detail label="הערות" value={client.notes} />
          </section>

          <section className="mt-8">
            <div className="mb-3 flex items-end justify-between">
              <h2 className="font-display text-xl font-semibold text-eggplant">
                פרויקטים
              </h2>
              <Link
                href={`/admin/projects/new?clientId=${client.id}`}
                className="text-sm text-eggplant hover:underline underline-offset-4"
              >
                + פרויקט חדש
              </Link>
            </div>

            {projects.length === 0 ? (
              <EmptyState
                icon={FolderHeart}
                title="אין פרויקטים ללקוח הזה"
                description="פתחו פרויקט חדש כדי להתחיל לסרוק ולהעלות תמונות."
                action={
                  <ButtonLink
                    href={`/admin/projects/new?clientId=${client.id}`}
                  >
                    פרויקט חדש
                  </ButtonLink>
                }
              />
            ) : (
              <ul className="grid gap-3">
                {projects.map((p) => (
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
                          <p
                            className="truncate text-xs text-ink-muted"
                            dir="ltr"
                          >
                            <span className="font-mono">{p.code}</span>
                            {formatISODateHe(p.startDate) && (
                              <span className="text-ink-muted" dir="rtl">
                                {" "}
                                · התחלה {formatISODateHe(p.startDate)}
                              </span>
                            )}
                            {formatISODateHe(p.targetEndDate) && (
                              <span
                                className={
                                  isProjectTargetOverdue(
                                    p.targetEndDate,
                                    p.status
                                  )
                                    ? " font-medium text-amber-800"
                                    : ""
                                }
                                dir="rtl"
                              >
                                {" "}
                                · יעד {formatISODateHe(p.targetEndDate)}
                                {isProjectTargetOverdue(
                                  p.targetEndDate,
                                  p.status
                                )
                                  ? " (חלף)"
                                  : ""}
                              </span>
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
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={`למחוק את ${client.name}?`}
        description={
          <>
            פעולה זו לא ניתנת לשחזור. אם יש ללקוח פרויקטים פעילים - תצטרכו למחוק
            אותם קודם.
          </>
        }
        confirmLabel="כן, מחקו"
        destructive
        loading={deleting}
        onConfirm={onConfirmDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
  dir,
}: {
  icon?: typeof Phone;
  label: string;
  value?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />}
      <div>
        <p className="text-xs text-ink-muted">{label}</p>
        <p className="text-sm text-ink" dir={dir}>
          {value || <span className="text-ink-muted">—</span>}
        </p>
      </div>
    </div>
  );
}

function Breadcrumbs({ name }: { name: string }) {
  return (
    <nav aria-label="ניווט" className="text-xs text-ink-muted">
      <ol className="flex items-center gap-1.5">
        <li>
          <Link href="/admin/clients" className="hover:text-eggplant">
            לקוחות
          </Link>
        </li>
        <ChevronRight className="h-3 w-3 -scale-x-100" />
        <li className="text-ink-soft truncate max-w-[14rem]">{name}</li>
      </ol>
    </nav>
  );
}
