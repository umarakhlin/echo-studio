import { AlbumScanView } from "./AlbumScanView";

interface Params {
  params: Promise<{ id: string; albumId: string }>;
}

export default async function AlbumScanPage({ params }: Params) {
  const { id, albumId } = await params;
  return <AlbumScanView projectId={id} albumId={albumId} />;
}
