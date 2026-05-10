"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Home, Images, Info, Star } from "lucide-react";

import { ClientPhotoLightbox } from "@/components/album/ClientPhotoLightbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { useBlobUrl } from "@/lib/blob-url";
import { cn } from "@/lib/cn";
import { getDataBackendMode } from "@/lib/data-backend";
import {
  fetchPublicAlbumPage,
  getProjectByCode,
  listAlbumsByProject,
  listPhotosByProject,
  type Album,
  type Photo,
  type Project,
} from "@/lib/db";

type Stage = "loading" | "not-found" | "view";

type ClientMainTab = "gallery" | "about";

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
  const [mainTab, setMainTab] = useState<ClientMainTab>("gallery");
  /** פתיחה לפי מזהה — עמיד יותר מאינדקס (מסנן/רענון רשימה). */
  const [lightboxPhotoId, setLightboxPhotoId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (getDataBackendMode() === "cloud") {
        const page = await fetchPublicAlbumPage(code);
        if (cancelled) return;
        if (!page) {
          setStage("not-found");
          return;
        }
        setProject(page.project);
        setAlbums(page.albums);
        setPhotos(page.photos);
        setActiveAlbumId(page.albums[0]?.id ?? null);
        setStage("view");
        return;
      }

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

  useEffect(() => {
    setLightboxPhotoId(null);
  }, [activeAlbumId, filter, mainTab]);

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
        <p className="mt-3 max-w-md text-ink-soft text-sm leading-relaxed">
          הקוד <span dir="ltr" className="font-mono">{code}</span> אינו תואם לאלבום
          פעיל.
          {getDataBackendMode() === "cloud" ? (
            <>
              {" "}
              במצב ענן הנתונים משותפים — ייתכן שהקוד שגוי או שהפרויקט הוסר.
            </>
          ) : (
            <>
              {" "}
              <strong className="text-ink-soft">בדפדפן ובמכשיר הזה</strong> הנתונים
              נשמרים מקומית — אם יצרת את הפרויקט במחשב אחר או בלי שחזור גיבוי,
              הכניסה כאן לא תמצא אותו.
            </>
          )}
        </p>
        <p className="mt-3 max-w-md text-xs text-ink-muted leading-relaxed">
          {getDataBackendMode() === "cloud" ? (
            <>ללקוח: וודאו שהקישור והקוד מהודעת Echo מדויקים.</>
          ) : (
            <>
              פתרון לצוות: להיכנס לסטודיו ממכשיר עם הנתונים → גיבוי — או לשחזר ZIP
              בדפדפן הזה. ללקוח: וודאו שהקישור והקוד מהודעת Echo מדויקים.
            </>
          )}
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

        <div
          role="tablist"
          aria-label="תצוגת אלבום"
          className="mb-6 flex flex-wrap justify-center gap-1.5 rounded-2xl border border-eggplant/10 bg-white/70 p-1.5 shadow-sm sm:justify-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === "gallery"}
            onClick={() => setMainTab("gallery")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
              mainTab === "gallery"
                ? "bg-eggplant text-cream shadow-soft"
                : "text-ink-soft hover:bg-cream-200"
            )}
          >
            <Images className="h-4 w-4 shrink-0" />
            גלריה
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === "about"}
            onClick={() => setMainTab("about")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
              mainTab === "about"
                ? "bg-eggplant text-cream shadow-soft"
                : "text-ink-soft hover:bg-cream-200"
            )}
          >
            <Info className="h-4 w-4 shrink-0" />
            פרטים
          </button>
        </div>

        {mainTab === "about" ? (
          <AboutTabContent project={project} albums={albums} />
        ) : (
          <>
            {albums.length > 0 && (
              <div className="mb-5 flex flex-wrap gap-1 rounded-xl border border-eggplant/10 bg-cream-200 p-1 w-fit max-w-full overflow-x-auto">
                {albums.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setActiveAlbumId(a.id)}
                    className={cn(
                      "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
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

            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="font-display text-xl font-semibold text-eggplant">
                {albums.find((a) => a.id === activeAlbumId)?.title ??
                  "האלבום שלי"}
              </h2>
              {photos.length > 0 && (
                <div
                  role="tablist"
                  aria-label="סינון תמונות"
                  className="flex w-fit gap-1 rounded-xl border border-eggplant/10 bg-cream-200 p-1"
                >
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
                    <Star className="inline-block h-3 w-3 -mt-0.5" /> (
                    {starredCount})
                  </FilterTab>
                </div>
              )}
            </div>

            <p className="mb-4 text-xs text-ink-muted">
              יש ללחוץ על תמונה לפתיחה גדולה. בתחתית המסך יופיע פס כלים: מעבר
              בין תמונות, זום (+ / − או גלגלת), איפוס לגודל מקור, וסגירה.
            </p>

            {visiblePhotos.length === 0 ? (
              <EmptyState
                title="עדיין אין תמונות באלבום"
                description="הסטודיו עובד על הסריקה. ברגע שייכנסו תמונות, הן יופיעו כאן."
              />
            ) : (
              <ul className="relative z-[1] isolate grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {visiblePhotos.map((photo) => (
                  <li key={photo.id} className="relative z-0 min-w-0">
                    <ClientPhotoTile
                      photo={photo}
                      onOpen={() => setLightboxPhotoId(String(photo.id))}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <ClientPhotoLightbox
        photos={visiblePhotos}
        activePhotoId={lightboxPhotoId}
        onClose={() => setLightboxPhotoId(null)}
        onActivePhotoIdChange={setLightboxPhotoId}
      />

      <footer className="border-t border-eggplant/10 bg-cream-200/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 px-5 py-6 text-xs text-ink-muted">
          <p>© Echo Studio</p>
        </div>
      </footer>
    </main>
  );
}

function AboutTabContent({
  project,
  albums,
}: {
  project: Project;
  albums: Album[];
}) {
  const hasNotes = Boolean(project.notes?.trim());
  const albumWithDesc = albums.filter((a) => a.description?.trim());
  const empty = !hasNotes && albumWithDesc.length === 0;

  return (
    <div className="max-w-2xl space-y-8 rounded-2xl border border-eggplant/10 bg-white/65 p-6 sm:p-8 shadow-soft">
      {hasNotes ? (
        <section className="space-y-2">
          <h3 className="font-display text-lg font-semibold text-eggplant">
            מהסטודיו
          </h3>
          <p className="text-sm leading-relaxed text-ink-soft whitespace-pre-line">
            {project.notes}
          </p>
        </section>
      ) : null}

      {albumWithDesc.length > 0 ? (
        <section className="space-y-4">
          <h3 className="font-display text-lg font-semibold text-eggplant">
            על האלבומים
          </h3>
          <ul className="space-y-4">
            {albumWithDesc.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-eggplant/10 bg-cream-100/50 px-4 py-3"
              >
                <p className="font-medium text-eggplant">{a.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  {a.description}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {empty ? (
        <p className="py-6 text-center text-sm text-ink-muted leading-relaxed">
          כאן יופיעו מידע והקשר שיוסיף הסטודיו — הערות על הפרויקט והסברים ליד
          כל אלבום.
        </p>
      ) : null}
    </div>
  );
}

function tileBlobForHook(photo: Photo): Blob | null {
  const t = photo.thumbnailBlob;
  if (t instanceof Blob && t.size > 0) return t;
  const b = photo.blob;
  if (b instanceof Blob && b.size > 0) return b;
  return null;
}

function ClientPhotoTile({
  photo,
  onOpen,
}: {
  photo: Photo;
  onOpen: () => void;
}) {
  const blobUrl = useBlobUrl(tileBlobForHook(photo));
  const url = photo.thumbnailDisplayUrl ?? photo.displayUrl ?? blobUrl ?? null;
  return (
    <button
      type="button"
      className="group block w-full cursor-zoom-in touch-manipulation text-right transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eggplant rounded-xl [-webkit-tap-highlight-color:transparent]"
      aria-label={`פתיחת תמונה מספר ${photo.serialNumber} בגודל מלא`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpen();
      }}
    >
      <figure className="pointer-events-none overflow-hidden rounded-xl border border-eggplant/10 bg-cream-300 shadow-soft transition group-hover:border-gold-400/45 group-hover:shadow-md">
        <div className="relative aspect-[4/5]">
          {url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={url}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              className="h-full w-full object-cover select-none"
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
    </button>
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
