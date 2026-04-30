import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { NewProjectForm } from "../NewProjectForm";

interface SearchParams {
  searchParams: Promise<{ clientId?: string }>;
}

export default async function NewProjectPage({ searchParams }: SearchParams) {
  const { clientId } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl">
      <Breadcrumbs />
      <h1 className="mt-2 font-display text-3xl font-semibold text-eggplant">
        פרויקט חדש
      </h1>
      <p className="mt-1 mb-7 text-sm text-ink-muted">
        בעת היצירה ייוצרו אוטומטית קוד גישה וסיסמה ללקוח. אפשר לערוך אותם.
      </p>

      <NewProjectForm initialClientId={clientId} />
    </div>
  );
}

function Breadcrumbs() {
  return (
    <nav aria-label="ניווט" className="text-xs text-ink-muted">
      <ol className="flex items-center gap-1.5">
        <li>
          <Link href="/admin/projects" className="hover:text-eggplant">
            פרויקטים
          </Link>
        </li>
        <ChevronRight className="h-3 w-3 -scale-x-100" />
        <li className="text-ink-soft">חדש</li>
      </ol>
    </nav>
  );
}
