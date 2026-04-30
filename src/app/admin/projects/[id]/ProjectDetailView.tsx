"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Album as AlbumIcon,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import {
  createAlbum,
  deleteProject,
  getClient,
  getProject,
  listAlbumsByProject,
  listPhotosByProject,
  projectStatusLabels,
  projectStatusOrder,
  setProjectStatus,
  updateProject,
  type Album,
  type Client,
  type Photo,
  type Project,
  type ProjectStatus,
} from "@/lib/db";
import {
  formatISODateHe,
  isProjectTargetOverdue,
  todayLocalISODate,
} from "@/lib/calendar";

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const toast = useToast();

  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [client, setClient] = useState<Client | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editTargetEndDate, setEditTargetEndDate] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);

  async function refresh() {
    const p = await getProject(projectId);
    setProject(p ?? null);
    if (p) {
      const [c, a, ph] = await Promise.all([
        getClient(p.clientId),
        listAlbumsByProject(p.id),
        listPhotosByProject(p.id),
      ]);
      setClient(c ?? null);
      setAlbums(a);
      setPhotos(ph);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await getProject(projectId);
      if (cancelled) return;
      setProject(p ?? null);
      if (p) {
        const [c, a, ph] = await Promise.all([
          getClient(p.clientId),
          listAlbumsByProject(p.id),
          listPhotosByProject(p.id),
        ]);
        if (cancelled) return;
        setClient(c ?? null);
        setAlbums(a);
        setPhotos(ph);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!project) return;
    setEditStartDate(project.startDate ?? "");
    setEditTargetEndDate(project.targetEndDate ?? "");
  }, [project?.id, project?.startDate, project?.targetEndDate]);

  if (project === undefined) {
    return <div className="mx-auto max-w-4xl card h-32 animate-pulse" />;
  }

  if (project === null) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          title="הפרויקט לא נמצא"
          description="ייתכן שנמחק או שהקישור לא תקין."
          action={
            <ButtonLink href="/admin/projects">חזרה לרשימה</ButtonLink>
          }
        />
      </div>
    );
  }

  async function handleStatus(status: ProjectStatus) {
    if (!project) return;
    await setProjectStatus(project.id, status);
    toast.success(`הסטטוס עודכן ל"${projectStatusLabels[status]}".`);
    await refresh();
  }

  async function handleCreateAlbum() {
    if (!project) return;
    const title = newAlbumTitle.trim() || "אלבום חדש";
    await createAlbum({ projectId: project.id, title });
    setNewAlbumTitle("");
    setCreatingAlbum(false);
    toast.success("האלבום נוצר.");
    await refresh();
  }

  async function handleSaveSchedule() {
    if (!project) return;
    if (editTargetEndDate && editStartDate && editTargetEndDate < editStartDate) {
      toast.error("תאריך סיום משוער לא יכול להיות לפני תאריך ההתחלה.");
      return;
    }
    try {
      setSavingSchedule(true);
      await updateProject(project.id, {
        startDate: editStartDate || undefined,
        targetEndDate: editTargetEndDate || undefined,
      });
      toast.success("לוח הזמנים נשמר.");
      await refresh();
    } catch (err) {
      toast.error((err as Error).message ?? "שמירה נכשלה.");
    } finally {
      setSavingSchedule(false);
    }
  }

  async function handleDelete() {
    if (!project) return;
    try {
      setDeleting(true);
      await deleteProject(project.id);
      toast.success("הפרויקט נמחק.");
      router.push("/admin/projects");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message ?? "מחיקה נכשלה.");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const photosByAlbum = photos.reduce<Record<string, number>>((acc, p) => {
    acc[p.albumId] = (acc[p.albumId] ?? 0) + 1;
    return acc;
  }, {});

  const clientLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/album/${project.code}`
      : `/album/${project.code}`;

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs title={project.title} />

      <header className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-eggplant">
            {project.title}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {client ? (
              <Link
                href={`/admin/clients/${client.id}`}
                className="hover:text-eggplant"
              >
                {client.name}
              </Link>
            ) : (
              "לקוח לא ידוע"
            )}{" "}
            ·{" "}
            <span dir="ltr" className="font-mono">
              {project.code}
            </span>
          </p>
          {(formatISODateHe(project.startDate) ||
            formatISODateHe(project.targetEndDate)) && (
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft">
              {formatISODateHe(project.startDate) && (
                <span>תחילה: {formatISODateHe(project.startDate)}</span>
              )}
              {formatISODateHe(project.targetEndDate) && (
                <span
                  className={
                    isProjectTargetOverdue(
                      project.targetEndDate,
                      project.status
                    )
                      ? "font-medium text-amber-800"
                      : ""
                  }
                >
                  יעד סיום: {formatISODateHe(project.targetEndDate)}
                  {isProjectTargetOverdue(
                    project.targetEndDate,
                    project.status
                  ) &&
                    ` · חלף (${todayLocalISODate()} היום)`}
                </span>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={project.status} />
          <Button
            variant="ghost"
            size="sm"
            startIcon={<Trash2 className="h-4 w-4" />}
            className="text-red-600 hover:bg-red-50"
            onClick={() => setConfirmDelete(true)}
          >
            מחיקה
          </Button>
        </div>
      </header>

      {/* בקרת סטטוס */}
      <section className="mt-6">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-gold-600">
          שלב נוכחי
        </p>
        <div className="flex flex-wrap gap-1.5 rounded-xl bg-cream-200 p-1 border border-eggplant/10 w-fit">
          {projectStatusOrder.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleStatus(s)}
              className={
                project.status === s
                  ? "rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-eggplant shadow-soft inline-flex items-center gap-1.5"
                  : "rounded-lg px-3 py-1.5 text-xs font-medium text-ink-soft hover:text-eggplant"
              }
            >
              {project.status === s && <Check className="h-3 w-3" />}
              {projectStatusLabels[s]}
            </button>
          ))}
        </div>
      </section>

      {/* לוח זמנים */}
      <section className="card mt-6 p-5">
        <h2 className="font-display text-lg font-semibold text-eggplant">
          לוח זמנים לצוות
        </h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          תאריך התחלה ותאריך סיום משוער — כדי שכולם יראו את אותו יעד.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">תאריך תחילת פרויקט</label>
            <input
              type="date"
              value={editStartDate}
              onChange={(e) => setEditStartDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">תאריך סיום משוער (יעד)</label>
            <input
              type="date"
              value={editTargetEndDate}
              onChange={(e) => setEditTargetEndDate(e.target.value)}
              className="input"
            />
          </div>
        </div>
        <div className="mt-4">
          <Button
            type="button"
            size="sm"
            loading={savingSchedule}
            onClick={handleSaveSchedule}
          >
            שמירת לוח זמנים
          </Button>
        </div>
      </section>

      {/* גישת לקוח */}
      <section className="card mt-6 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-eggplant">
              גישת לקוח
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              שלחי ללקוח את הקישור (או רק את הקוד) — הכניסה לא דורשת סיסמה.
            </p>
          </div>
          <Link
            href={`/album/${project.code}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-sm text-eggplant hover:underline underline-offset-4"
          >
            פתחו תצוגת לקוח
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 max-w-md">
          <CredentialField
            label="קוד הפרויקט (מזהה כניסה)"
            value={project.code}
            onCopy={() => {
              navigator.clipboard.writeText(project.code);
              toast.success("הקוד הועתק.");
            }}
          />
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p
            className="truncate text-xs text-ink-muted font-mono"
            dir="ltr"
            title={clientLink}
          >
            {clientLink}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const text = `הלקוח/ה היקר/ה,
האלבום שלכם ב-Echo:
${clientLink}

קוד הפרויקט: ${project.code}
(אפשר גם לפתוח ישירות מהקישור — אין צורך בסיסמה.)`;
              navigator.clipboard.writeText(text);
              toast.success("הודעה ללקוח הועתקה.");
            }}
          >
            העתקת הודעה ללקוח
          </Button>
        </div>
      </section>

      {/* אלבומים */}
      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-xl font-semibold text-eggplant">
            אלבומים
          </h2>
          {!creatingAlbum && (
            <button
              type="button"
              onClick={() => setCreatingAlbum(true)}
              className="inline-flex items-center gap-1 text-sm text-eggplant hover:underline underline-offset-4"
            >
              <Plus className="h-4 w-4" />
              אלבום חדש
            </button>
          )}
        </div>

        {creatingAlbum && (
          <div className="card mb-3 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="שם האלבום"
                placeholder='למשל "חתונת ההורים, 1962"'
                value={newAlbumTitle}
                onChange={(e) => setNewAlbumTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateAlbum}>צור</Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setCreatingAlbum(false);
                  setNewAlbumTitle("");
                }}
              >
                ביטול
              </Button>
            </div>
          </div>
        )}

        {albums.length === 0 ? (
          <EmptyState
            icon={AlbumIcon}
            title="אין עדיין אלבומים"
            description="כל פרויקט מתחיל באלבום ראשי - אבל תוכלו ליצור אלבומים נוספים לפי תקופות או אירועים."
            action={
              <Button onClick={() => setCreatingAlbum(true)}>
                צור אלבום
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {albums.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/admin/projects/${project.id}/albums/${a.id}#edit-album`}
                  className="card group block px-5 py-4 hover:shadow-md hover:border-eggplant/25 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-eggplant">
                        {a.title}
                      </p>
                      {a.description && (
                        <p className="truncate text-xs text-ink-muted">
                          {a.description}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-cream-200 px-2.5 py-0.5 text-xs text-ink-soft border border-eggplant/10">
                      {photosByAlbum[a.id] ?? 0} תמונות
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {project.notes && (
        <section className="mt-8 card p-5">
          <h2 className="font-display text-lg font-semibold text-eggplant">
            הערות
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm text-ink-soft leading-relaxed">
            {project.notes}
          </p>
        </section>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={`למחוק את "${project.title}"?`}
        description={
          <>
            כל האלבומים והתמונות של הפרויקט יימחקו לצמיתות. פעולה זו לא ניתנת
            לשחזור.
          </>
        }
        confirmLabel="כן, מחקו את הכל"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function CredentialField({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div>
      <p className="text-xs text-ink-muted mb-1.5">{label}</p>
      <div className="flex items-center gap-2 rounded-xl bg-cream-200 px-3 py-2 border border-eggplant/10">
        <span className="flex-1 font-mono text-sm" dir="ltr">
          {value}
        </span>
        <button
          type="button"
          onClick={onCopy}
          aria-label="העתקה"
          className="rounded-md p-1.5 text-ink-muted hover:bg-white hover:text-eggplant"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Breadcrumbs({ title }: { title: string }) {
  return (
    <nav aria-label="ניווט" className="text-xs text-ink-muted">
      <ol className="flex items-center gap-1.5">
        <li>
          <Link href="/admin/projects" className="hover:text-eggplant">
            פרויקטים
          </Link>
        </li>
        <ChevronRight className="h-3 w-3 -scale-x-100" />
        <li className="text-ink-soft truncate max-w-[16rem]">{title}</li>
      </ol>
    </nav>
  );
}
