"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Home, Star } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { useBlobUrl } from "@/lib/blob-url";
import { cn } from "@/lib/cn";
import {
  getProjectByCode,
  listAlbumsByProject,
  listPhotosByProject,
  type Album,
  type Photo,
  type Project,
} from "@/lib/db";

type Stage = "loading" | "not-found" | "view";

/**
 * כניסת לקוח: הקישור כולל את קוד הפרויקט — אין שער סיסמה.
 */
export function ClientAlbumView({ code }: { code: string }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [project, setProject] = useState<Project | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "starred">("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await getProjectByCode(code);
      if (cancelled) return;

      if (!p) {
        setStage("not-found");
        return;
      }

      setProject(p);
      const [a, ph] = await Promise.all([
        listAlbumsByProject(p.id),
        listPhotosByProject(p.id),
      ]);
      if (cancelled) return;
      setAlbums(a);
      setPhotos(ph);
      setActiveAlbumId(a[0]?.id ?? null);
      setStage("view");
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const visiblePhotos = useMemo(() => {
    let list = activeAlbumId
      ? photos.filter((p) => p.albumId === activeAlbumId)
      : photos;
    if (filter === "starred") list = list.filter((p) => p.starred);
    return list;
  }, [photos, activeAlbumId, filter]);

  const starredCount = useMemo(
    () =>
      photos.filter(
        (p) => (!activeAlbumId || p.albumId === activeAlbumId) && p.starred
      ).length,
    [photos, activeAlbumId]
  );

  if (stage === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="card h-32 w-72 animate-pulse" />
      </div>
    );
  }

  if (stage === "not-found") {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-5 py-12 text-center">
        <h1 className="font-display text-3xl font-semibold text-eggplant">
          האלבום לא נמצא
        </h1>
        <p className="mt-3 max-w-md text-ink-soft">
          הקוד <span dir="ltr" className="font-mono">{code}</span> אינו תואם
          לאלבום פעיל. בדקו את הקישור שקיבלתם מ-Echo.
        </p>
        <Link
          href="/login"
          className="mt-8 text-sm text-eggplant underline-offset-4 hover:underline"
        >
          כניסה עם קוד אחר
        </Link>
      </main>
    );
  }

  if (!project) return null;

  return (
    <main className="relative min-h-screen">
      <BackdropArt />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" aria-label="לדף הבית" className="text-ink-muted hover:text-eggplant text-sm">
          <span className="inline-flex items-center gap-1">
            <Home className="h-4 w-4" />
            דף הבית
          </span>
        </Link>
        <div className="text-sm text-ink-muted">
          <span className="hidden sm:inline">{photos.length} תמונות · </span>
          <span dir="ltr" className="font-mono">
            {project.code}
          </span>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-5 pb-16">
        <div className="mb-7 text-center sm:text-right">
          <p className="text-xs uppercase tracking-[0.22em] text-gold-600">
            ברוכים הבאים
          </p>
          <h1 className="mt-1 font-display text-4xl font-semibold text-eggplant">
            {project.title}
          </h1>
          <p className="mt-2 text-sm text-ink-soft italic font-display">
            הזיכרונות ממשיכים להדהד
          </p>
        </div>

        {albums.length > 1 && (
          <div className="mb-5 flex flex-wrap gap-1 rounded-xl bg-cream-200 p-1 border border-eggplant/10 w-fit">
            {albums.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setActiveAlbumId(a.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium",
                  activeAlbumId === a.id
                    ? "bg-white text-eggplant shadow-soft"
                    : "text-ink-soft hover:text-eggplant"
                )}
              >
                {a.title}
              </button>
            ))}
          </div>
        )}

        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-display text-xl font-semibold text-eggplant">
            {albums.find((a) => a.id === activeAlbumId)?.title ?? "האלבום שלי"}
          </h2>
          {photos.length > 0 && (
            <div className="flex gap-1 rounded-xl bg-cream-200 p-1 border border-eggplant/10">
              <FilterTab
                active={filter === "all"}
                onClick={() => setFilter("all")}
              >
                הכל
              </FilterTab>
              <FilterTab
                active={filter === "starred"}
                onClick={() => setFilter("starred")}
              >
                <Star className="inline-block h-3 w-3 -mt-0.5" /> ({starredCount})
              </FilterTab>
            </div>
          )}
        </div>

        {visiblePhotos.length === 0 ? (
          <EmptyState
            title="עדיין אין תמונות באלבום"
            description="הסטודיו עובד על הסריקה. ברגע שייכנסו תמונות, הן יופיעו כאן."
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visiblePhotos.map((photo) => (
              <li key={photo.id}>
                <ClientPhotoTile photo={photo} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="border-t border-eggplant/10 bg-cream-200/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 px-5 py-6 text-xs text-ink-muted">
          <p>© Echo Studio</p>
        </div>
      </footer>
    </main>
  );
}

function ClientPhotoTile({ photo }: { photo: Photo }) {
  const url = useBlobUrl(photo.thumbnailBlob ?? photo.blob);
  return (
    <figure className="overflow-hidden rounded-xl bg-cream-300 shadow-soft border border-eggplant/10">
      <div className="relative aspect-[4/5]">
        {url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={url}
            alt={photo.fileName}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
        {photo.starred && (
          <span className="absolute top-2 left-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold-400 text-white">
            <Star className="h-3.5 w-3.5 fill-current" />
          </span>
        )}
        <span
          className="absolute top-2 right-2 rounded-full bg-white/90 px-2 py-0.5 font-mono text-xs text-eggplant shadow-soft"
          dir="ltr"
        >
          #{String(photo.serialNumber).padStart(3, "0")}
        </span>
      </div>
      {photo.estimatedDate && (
        <figcaption className="px-2.5 py-1.5 text-center text-[11px] text-ink-muted">
          {photo.estimatedDate}
        </figcaption>
      )}
    </figure>
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
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-medium",
        active
          ? "bg-white text-eggplant shadow-soft"
          : "text-ink-soft hover:text-eggplant"
      )}
    >
      {children}
    </button>
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
