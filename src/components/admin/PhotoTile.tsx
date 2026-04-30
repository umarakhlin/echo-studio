"use client";

import { useEffect, useState } from "react";
import { Star, Trash2 } from "lucide-react";

import { useBlobUrl } from "@/lib/blob-url";
import { cn } from "@/lib/cn";
import type { Photo } from "@/lib/db";

interface Props {
  photo: Photo;
  starredFilter?: boolean;
  onToggleStar: (photo: Photo) => Promise<void> | void;
  onDelete: (photo: Photo) => Promise<void> | void;
}

export function PhotoTile({ photo, onToggleStar, onDelete }: Props) {
  const url = useBlobUrl(photo.thumbnailBlob ?? photo.blob);
  const [busy, setBusy] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => setImgLoaded(false), [url]);

  return (
    <figure className="group relative overflow-hidden rounded-xl bg-cream-300 shadow-soft border border-eggplant/10">
      {/* תמונה */}
      <div className="relative aspect-[4/5] w-full bg-cream-300">
        {url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={url}
            alt={photo.fileName}
            loading="lazy"
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-300",
              imgLoaded ? "opacity-100" : "opacity-0"
            )}
          />
        ) : null}

        {/* גרדיאנט תחתי */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink/55 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* מספר עוקב */}
        <span
          className="absolute top-2 right-2 rounded-full bg-white/90 px-2 py-0.5 font-mono text-xs text-eggplant shadow-soft"
          dir="ltr"
        >
          #{String(photo.serialNumber).padStart(3, "0")}
        </span>

        {/* כוכב */}
        <button
          type="button"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (busy) return;
            setBusy(true);
            await onToggleStar(photo);
            setBusy(false);
          }}
          aria-label={photo.starred ? "הסרת כוכב" : "סימון בכוכב"}
          aria-pressed={photo.starred}
          className={cn(
            "absolute top-2 left-2 inline-flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition-all",
            photo.starred
              ? "bg-gold-400 text-white"
              : "bg-white/85 text-ink-muted hover:bg-white opacity-0 group-hover:opacity-100"
          )}
        >
          <Star
            className={cn("h-3.5 w-3.5", photo.starred && "fill-current")}
          />
        </button>

        {/* מחיקה */}
        <button
          type="button"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (busy) return;
            const ok = window.confirm(
              `למחוק את תמונה #${photo.serialNumber}?`
            );
            if (!ok) return;
            setBusy(true);
            await onDelete(photo);
            setBusy(false);
          }}
          aria-label="מחיקה"
          className="absolute bottom-2 left-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/85 text-red-600 hover:bg-white opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <figcaption className="px-2.5 py-1.5 text-[11px] text-ink-muted truncate">
        {photo.fileName}
      </figcaption>
    </figure>
  );
}
