import { ClientDetailView } from "./ClientDetailView";

interface Params {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: Params) {
  const { id } = await params;
  return <ClientDetailView clientId={id} />;
}
