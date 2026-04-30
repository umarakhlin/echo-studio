import { AlbumDetailView } from "./AlbumDetailView";

interface Params {
  params: Promise<{ id: string; albumId: string }>;
}

export default async function AlbumDetailPage({ params }: Params) {
  const { id, albumId } = await params;
  return <AlbumDetailView projectId={id} albumId={albumId} />;
}
