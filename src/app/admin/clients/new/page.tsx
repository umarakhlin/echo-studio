import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ClientForm } from "../ClientForm";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Breadcrumbs />
      <h1 className="mt-2 font-display text-3xl font-semibold text-eggplant">
        לקוח חדש
      </h1>
      <p className="mt-1 mb-7 text-sm text-ink-muted">
        ההפרטים האלה ילוו אותך בכל הפרויקטים העתידיים של הלקוח.
      </p>

      <ClientForm mode="create" />
    </div>
  );
}

function Breadcrumbs() {
  return (
    <nav aria-label="ניווט" className="text-xs text-ink-muted">
      <ol className="flex items-center gap-1.5">
        <li>
          <Link href="/admin/clients" className="hover:text-eggplant">
            לקוחות
          </Link>
        </li>
        <ChevronRight className="h-3 w-3 -scale-x-100" />
        <li className="text-ink-soft">חדש</li>
      </ol>
    </nav>
  );
}
