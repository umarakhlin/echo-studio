"use client";

import dynamic from "next/dynamic";

/** רק בצד הלקוח — `ssr: false` מותר רק מתוך Client Component (Next 16). */
const ProjectsListClientLazy = dynamic(
  () =>
    import("./ProjectsListClient").then((mod) => ({
      default: mod.ProjectsListClient,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-6xl">
        <header className="mb-7">
          <div className="h-9 w-48 animate-pulse rounded-lg bg-cream-200/80" />
          <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded bg-cream-200/60" />
        </header>
        <ul className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              className="card h-[72px] animate-pulse bg-cream-200/60"
            />
          ))}
        </ul>
      </div>
    ),
  }
);

export function ProjectsPageClient() {
  return <ProjectsListClientLazy />;
}
