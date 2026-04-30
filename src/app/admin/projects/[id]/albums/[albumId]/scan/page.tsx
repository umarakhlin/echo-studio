import { Suspense } from "react";
import { AlbumScanView } from "./AlbumScanView";

interface Params {
  params: Promise<{ id: string; albumId: string }>;
}

export default async function AlbumScanPage({ params }: Params) {
  const { id, albumId } = await params;
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl card h-32 animate-pulse" />
      }
    >
      <AlbumScanView projectId={id} albumId={albumId} />
    </Suspense>
  );
}
