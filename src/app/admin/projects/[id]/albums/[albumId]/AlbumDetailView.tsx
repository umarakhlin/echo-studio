"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Images, PencilLine, ScanLine, Star, StickyNote, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { PhotoTile } from "@/components/admin/PhotoTile";
import { PhotoEditDialog } from "@/components/admin/PhotoEditDialog";
import { PhotoUploader } from "@/components/admin/PhotoUploader";
import { Input } from "@/components/ui/Input";
import {
  deleteAlbum,
  deletePhoto,
  getAlbum,
  getProject,
  listPhotosByAlbum,
  toggleStarPhoto,
  updateAlbum,
  type Album,
  type Photo,
  type Project,
} from "@/lib/db";

export function AlbumDetailView({
  projectId,
  albumId,
}: {
  projectId: string;
  albumId: string;
}) {
  const router = useRouter();
  const toast = useToast();

  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [album, setAlbum] = useState<Album | null | undefined>(undefined);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filter, setFilter] = useState<"all" | "starred">("all");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);

  async function refresh() {
    const [p, a, ph] = await Promise.all([
      getProject(projectId),
      getAlbum(albumId),
      listPhotosByAlbum(albumId),
    ]);
    setProject(p ?? null);
    setAlbum(a ?? null);
    setPhotos(ph);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, a, ph] = await Promise.all([
        getProject(projectId),
        getAlbum(albumId),
        listPhotosByAlbum(albumId),
      ]);
      if (cancelled) return;
      setProject(p ?? null);
      setAlbum(a ?? null);
      setPhotos(ph);
      if (a) {
        setEditTitle(a.title);
        setEditDescription(a.description ?? "");
      } else {
        setEditTitle("");
        setEditDescription("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, albumId]);

  const visible = useMemo(() => {
    if (filter === "starred") return photos.filter((p) => p.starred);
    return photos;
  }, [photos, filter]);

  const starredCount = photos.filter((p) => p.starred).length;

  async function onToggleStar(photo: Photo) {
    const updated = await toggleStarPhoto(photo.id);
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? updated : p)));
  }

  async function onDeletePhoto(photo: Photo) {
    await deletePhoto(photo.id);
    toast.success(`תמונה #${photo.serialNumber} נמחקה.`);
    await refresh();
  }

  async function onDeleteAlbum() {
    if (!album) return;
    try {
      setDeleting(true);
      await deleteAlbum(album.id);
      toast.success("האלבום נמחק.");
      router.push(`/admin/projects/${projectId}`);
      router.refresh();
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleSaveAlbumDetails() {
    if (!album) return;
    const title = editTitle.trim();
    if (!title) {
      toast.error("שם האלבום נדרש.");
      return;
    }
    try {
      setSavingDetails(true);
      const updated = await updateAlbum(album.id, {
        title,
        description: editDescription.trim() || undefined,
      });
      setAlbum(updated);
      toast.success("פרטי האלבום עודכנו.");
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("שמירה נכשלה — נסי שוב.");
    } finally {
      setSavingDetails(false);
    }
  }

  if (album === undefined || project === undefined) {
    return <div className="mx-auto max-w-6xl card h-32 animate-pulse" />;
  }

  if (album === null || project === null) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          title="האלבום לא נמצא"
          description="ייתכן שנמחק או שהקישור לא תקין."
          action={
            <ButtonLink href={`/admin/projects/${projectId}`}>
              חזרה לפרויקט
            </ButtonLink>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs project={project} albumTitle={album.title} />

      <header className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-eggplant">
            {album.title}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {photos.length} תמונות באלבום · {starredCount} מסומנות בכוכב
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink
            href={`/admin/projects/${project.id}/albums/${album.id}/scan`}
            variant="secondary"
            size="sm"
            startIcon={<ScanLine className="h-4 w-4" />}
          >
            סורק מסמכים
          </ButtonLink>
          <Button
            variant="ghost"
            size="sm"
            startIcon={<Trash2 className="h-4 w-4" />}
            className="text-red-600 hover:bg-red-50"
            onClick={() => setConfirmDelete(true)}
          >
            מחיקת אלבום
          </Button>
        </div>
      </header>

      <section
        id="edit-album"
        className="card mt-6 scroll-mt-28 border-2 border-gold-500/35 bg-cream-100/40 p-5 shadow-soft"
      >
        <div className="flex items-center gap-2 text-eggplant">
          <PencilLine className="h-5 w-5 shrink-0 text-gold-700" />
          <h2 className="font-display text-lg font-semibold">
            עריכת שם והערות לאלבום
          </h2>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          שם האלבום משמש גם בתצוגת הלקוח כשיש כמה אלבומים; שדה ההערות לשימוש
          פנימי בלבד.
        </p>
        <div className="mt-4 max-w-xl space-y-4">
          <Input
            label="שם האלבום"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder='למשל "חתונת ההורים, 1962"'
          />
          <div>
            <label className="label">
              <span className="inline-flex items-center gap-1.5">
                <StickyNote className="h-4 w-4 text-ink-muted" />
                הערות
              </span>
            </label>
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="הקשר לאלבום, משימות, תזכורות לצוות…"
              className="input resize-y"
            />
          </div>
          <Button
            type="button"
            size="sm"
            loading={savingDetails}
            onClick={handleSaveAlbumDetails}
          >
            שמירת פרטי אלבום
          </Button>
        </div>
      </section>

      <section className="mt-6">
        <PhotoUploader
          albumId={album.id}
          projectId={project.id}
          onUploaded={refresh}
        />
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-xl font-semibold text-eggplant">
            תמונות
          </h2>

          {photos.length > 0 && (
            <div
              role="tablist"
              aria-label="סינון"
              className="flex gap-1 rounded-xl bg-cream-200 p-1 border border-eggplant/10"
            >
              <FilterTab
                active={filter === "all"}
                onClick={() => setFilter("all")}
              >
                כל התמונות ({photos.length})
              </FilterTab>
              <FilterTab
                active={filter === "starred"}
                onClick={() => setFilter("starred")}
              >
                <Star className="inline-block h-3 w-3 -mt-0.5" /> מסומנות (
                {starredCount})
              </FilterTab>
            </div>
          )}
        </div>

        {photos.length === 0 ? (
          <EmptyState
            icon={Images}
            title="עדיין אין תמונות"
            description="גררו או בחרו תמונות מהמחשב כדי להתחיל. הן יקבלו אוטומטית מספור עוקב."
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Star}
            title="אין תמונות מסומנות"
            description="סמנו תמונות בכוכב כדי שיופיעו כאן."
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((photo) => (
              <li key={photo.id}>
                <PhotoTile
                  photo={photo}
                  onToggleStar={onToggleStar}
                  onDelete={onDeletePhoto}
                  onEdit={(p) => setEditingPhoto(p)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <PhotoEditDialog
        photo={editingPhoto}
        open={editingPhoto !== null}
        onClose={() => setEditingPhoto(null)}
        onSaved={(updated) =>
          setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
        }
      />

      <ConfirmDialog
        open={confirmDelete}
        title={`למחוק את האלבום "${album.title}"?`}
        description={
          <>
            כל {photos.length} התמונות באלבום יימחקו לצמיתות. פעולה זו לא ניתנת
            לשחזור.
          </>
        }
        confirmLabel="כן, מחקו"
        destructive
        loading={deleting}
        onConfirm={onDeleteAlbum}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function FilterTab({
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

function Breadcrumbs({
  project,
  albumTitle,
}: {
  project: Project;
  albumTitle: string;
}) {
  return (
    <nav aria-label="ניווט" className="text-xs text-ink-muted">
      <ol className="flex items-center gap-1.5">
        <li>
          <Link href="/admin/projects" className="hover:text-eggplant">
            פרויקטים
          </Link>
        </li>
        <ChevronRight className="h-3 w-3 -scale-x-100" />
        <li>
          <Link
            href={`/admin/projects/${project.id}`}
            className="hover:text-eggplant"
          >
            {project.title}
          </Link>
        </li>
        <ChevronRight className="h-3 w-3 -scale-x-100" />
        <li className="text-ink-soft truncate max-w-[12rem]">{albumTitle}</li>
      </ol>
    </nav>
  );
}
