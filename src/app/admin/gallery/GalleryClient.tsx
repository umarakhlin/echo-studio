"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Images, Star } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { useBlobUrl } from "@/lib/blob-url";
import { cn } from "@/lib/cn";
import { getDB } from "@/lib/db/schema";
import type { Photo, Project } from "@/lib/db";

export function GalleryClient() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<"all" | "starred">("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = await getDB();
      const [ph, pr] = await Promise.all([
        db.getAll("photos"),
        db.getAll("projects"),
      ]);
      if (cancelled) return;
      setPhotos(
        ph.sort((a, b) => b.createdAt - a.createdAt) // החדשות קודם
      );
      setProjects(pr.sort((a, b) => b.updatedAt - a.updatedAt));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const projectsById = useMemo(() => {
    const map = new Map<string, Project>();
    for (const p of projects) map.set(p.id, p);
    return map;
  }, [projects]);

  const filtered = useMemo(() => {
    let list = photos;
    if (filter === "starred") list = list.filter((p) => p.starred);
    if (projectFilter !== "all")
      list = list.filter((p) => p.projectId === projectFilter);
    return list;
  }, [photos, filter, projectFilter]);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-7">
        <h1 className="font-display text-3xl font-semibold text-eggplant">
          גלריה כללית
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          כל התמונות מכל הפרויקטים, עם סינון לפי לקוח וכוכב.
        </p>
      </header>

      {!loading && photos.length > 0 && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="tablist"
            aria-label="סינון"
            className="flex gap-1 rounded-xl bg-cream-200 p-1 border border-eggplant/10"
          >
            <FilterTab
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              הכל ({photos.length})
            </FilterTab>
            <FilterTab
              active={filter === "starred"}
              onClick={() => setFilter("starred")}
            >
              <Star className="inline-block h-3 w-3 -mt-0.5" /> מסומנות (
              {photos.filter((p) => p.starred).length})
            </FilterTab>
          </div>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="input max-w-xs"
          >
            <option value="all">כל הפרויקטים</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/5] animate-pulse rounded-xl bg-cream-200/70"
            />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <EmptyState
          icon={Images}
          title="הגלריה ריקה"
          description="כשתעלי תמונות לפרויקט כלשהו, הן יופיעו כאן."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Star}
          title="אין תמונות בסינון הזה"
          description="נסי לשנות את סוג הסינון או את הפרויקט."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.map((photo) => (
            <li key={photo.id}>
              <GalleryThumb
                photo={photo}
                project={projectsById.get(photo.projectId)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GalleryThumb({
  photo,
  project,
}: {
  photo: Photo;
  project?: Project;
}) {
  const blobUrl = useBlobUrl(photo.thumbnailBlob ?? photo.blob);
  const url = photo.thumbnailDisplayUrl ?? photo.displayUrl ?? blobUrl ?? null;

  return (
    <Link
      href={
        project
          ? `/admin/projects/${project.id}/albums/${photo.albumId}`
          : "#"
      }
      className="group block overflow-hidden rounded-xl bg-cream-300 shadow-soft border border-eggplant/10"
    >
      <div className="relative aspect-[4/5]">
        {url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={url}
            alt={photo.fileName}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        )}
        {photo.starred && (
          <span className="absolute top-2 left-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold-400 text-white">
            <Star className="h-3.5 w-3.5 fill-current" />
          </span>
        )}
        <span
          className="absolute top-2 right-2 rounded-full bg-white/90 px-2 py-0.5 font-mono text-xs text-eggplant"
          dir="ltr"
        >
          #{String(photo.serialNumber).padStart(3, "0")}
        </span>
      </div>
      <div className="px-2.5 py-1.5">
        <p className="truncate text-[11px] text-ink-muted">
          {project?.title ?? "—"}
        </p>
      </div>
    </Link>
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
