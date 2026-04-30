"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, ScanLine } from "lucide-react";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScannerWorkspace } from "@/components/admin/ScannerWorkspace";
import { getAlbum, getProject, type Album, type Project } from "@/lib/db";
import { useRouter } from "next/navigation";

export function AlbumScanView({
  projectId,
  albumId,
}: {
  projectId: string;
  albumId: string;
}) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [album, setAlbum] = useState<Album | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, a] = await Promise.all([
        getProject(projectId),
        getAlbum(albumId),
      ]);
      if (cancelled) return;
      setProject(p ?? null);
      setAlbum(a ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, albumId]);

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
      <nav aria-label="ניווט" className="text-xs text-ink-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/admin/projects" className="hover:text-eggplant">
              פרויקטים
            </Link>
          </li>
          <ChevronRight className="h-3 w-3 -scale-x-100 shrink-0" />
          <li>
            <Link
              href={`/admin/projects/${project.id}`}
              className="hover:text-eggplant"
            >
              {project.title}
            </Link>
          </li>
          <ChevronRight className="h-3 w-3 -scale-x-100 shrink-0" />
          <li>
            <Link
              href={`/admin/projects/${project.id}/albums/${album.id}`}
              className="hover:text-eggplant truncate max-w-[10rem]"
            >
              {album.title}
            </Link>
          </li>
          <ChevronRight className="h-3 w-3 -scale-x-100 shrink-0" />
          <li className="text-ink-soft">סורק</li>
        </ol>
      </nav>

      <header className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-eggplant">
            סורק מסמכים
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            דיוק חיתוך ויישור: פינות, הזזה או כפתורי &quot;שוליים&quot; לפני
            שמירה — המצלמה בטלפון לעיתים חותכת לבד; כאן מתקנים.
          </p>
        </div>
        <ButtonLink
          href={`/admin/projects/${project.id}/albums/${album.id}`}
          variant="ghost"
          size="sm"
        >
          חזרה לאלבום
        </ButtonLink>
      </header>

      <section className="mt-8 rounded-2xl border border-eggplant/10 bg-white/50 p-4 sm:p-6">
        <div className="mb-6 flex items-center gap-2 text-eggplant">
          <ScanLine className="h-5 w-5" />
          <h2 className="font-display text-lg font-semibold">
            {album.title}
          </h2>
        </div>
        <ScannerWorkspace
          albumId={album.id}
          projectId={project.id}
          onSaved={() => {
            router.refresh();
          }}
        />
      </section>
    </div>
  );
}
