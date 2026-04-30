import { ProjectDetailView } from "./ProjectDetailView";

interface Params {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Params) {
  const { id } = await params;
  return <ProjectDetailView projectId={id} />;
}
