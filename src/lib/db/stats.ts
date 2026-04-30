import { getDB } from "./schema";
import {
  projectStatusOrder,
  type DashboardStats,
  type ProjectStatus,
} from "./types";

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await getDB();
  const [clientsCount, projects, photos] = await Promise.all([
    db.count("clients"),
    db.getAll("projects"),
    db.getAll("photos"),
  ]);

  const byStatus = projectStatusOrder.reduce<Record<ProjectStatus, number>>(
    (acc, s) => {
      acc[s] = 0;
      return acc;
    },
    {} as Record<ProjectStatus, number>
  );

  for (const p of projects) {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
  }

  return {
    clientsCount,
    projectsCount: projects.length,
    activeProjects: projects.filter((p) => p.status !== "delivered").length,
    photosCount: photos.length,
    starredCount: photos.filter((p) => p.starred).length,
    byStatus,
  };
}
