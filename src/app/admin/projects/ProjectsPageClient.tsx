"use client";

import { ProjectsListClient } from "./ProjectsListClient";

/** רכיב לקוח בלבד — טעינת הרשימה רק אחרי mount (`useEffect`), בלי dynamic chunk נפרד */
export function ProjectsPageClient() {
  return <ProjectsListClient />;
}
