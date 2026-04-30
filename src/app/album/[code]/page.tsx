import type { Metadata } from "next";
import { ClientAlbumView } from "./ClientAlbumView";

interface AlbumPageProps {
  params: Promise<{ code: string }>;
}

export const metadata: Metadata = {
  title: "האלבום שלי",
};

export default async function AlbumLanding({ params }: AlbumPageProps) {
  const { code } = await params;
  return <ClientAlbumView code={code.toUpperCase()} />;
}
