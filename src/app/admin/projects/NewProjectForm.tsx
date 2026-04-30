"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { RefreshCw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  createProject,
  ensureDefaultAlbum,
  generateProjectCode,
  listClients,
  projectStatusLabels,
  projectStatusOrder,
  type Client,
  type ProjectStatus,
} from "@/lib/db";
import { todayLocalISODate } from "@/lib/calendar";

interface Props {
  initialClientId?: string;
}

export function NewProjectForm({ initialClientId }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  const [clientId, setClientId] = useState(initialClientId ?? "");
  const [title, setTitle] = useState("");
  const [code, setCode] = useState(() => generateProjectCode());
  const [status, setStatus] = useState<ProjectStatus>("intake");
  const [estimatedPhotos, setEstimatedPhotos] = useState("");
  const [startDate, setStartDate] = useState(() => todayLocalISODate());
  const [targetEndDate, setTargetEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await listClients();
      if (cancelled) return;
      setClients(c);
      if (!initialClientId && c.length === 1) {
        setClientId(c[0].id);
      }
      setLoadingClients(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialClientId]);

  // הצעה אוטומטית לכותרת בהתאם לבחירת לקוח
  useEffect(() => {
    if (!title && clientId) {
      const c = clients.find((x) => x.id === clientId);
      if (c) setTitle(`האלבום של משפחת ${c.name.split(" ").slice(-1)[0]}`);
    }
  }, [clientId, clients, title]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!clientId) return setError("בחרו לקוח לפרויקט.");
    if (title.trim().length < 2) return setError("כותרת קצרה מדי.");
    if (code.trim().length < 4) return setError("קוד הפרויקט קצר מדי.");
    if (targetEndDate && startDate && targetEndDate < startDate) {
      return setError("תאריך סיום משוער לא יכול להיות לפני תאריך התחלה.");
    }

    try {
      setSubmitting(true);
      const created = await createProject({
        clientId,
        title: title.trim(),
        code: code.trim().toUpperCase(),
        status,
        estimatedPhotos: estimatedPhotos
          ? Math.max(0, parseInt(estimatedPhotos, 10))
          : undefined,
        startDate: startDate || undefined,
        targetEndDate: targetEndDate || undefined,
        notes: notes.trim() || undefined,
      });
      // יוצרים אלבום ברירת מחדל - מאפשר העלאה מיידית של תמונות
      await ensureDefaultAlbum(created.id);
      toast.success(`הפרויקט "${created.title}" נוצר.`);
      router.push(`/admin/projects/${created.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message ?? "שגיאה ביצירת פרויקט.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!loadingClients && clients.length === 0) {
    return (
      <div className="card p-6 text-center">
        <Sparkles className="mx-auto h-6 w-6 text-gold-500" />
        <h2 className="mt-3 font-display text-lg font-semibold text-eggplant">
          צריך קודם להוסיף לקוח
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          כל פרויקט שייך ללקוח. הוסיפו לקוח ראשון כדי להמשיך.
        </p>
        <div className="mt-5">
          <ButtonLink href="/admin/clients/new">הוספת לקוח</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 sm:p-7" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">לקוח</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="input"
            required
          >
            <option value="">בחרו לקוח...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <Input
            label="כותרת"
            placeholder='למשל "האלבום של משפחת כהן"'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <Input
          label="קוד גישה ללקוח"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          dir="ltr"
          className="font-mono tracking-wider"
          endAdornment={
            <button
              type="button"
              onClick={() => setCode(generateProjectCode())}
              aria-label="קוד חדש"
              className="rounded-md p-1.5 text-ink-muted hover:text-eggplant hover:bg-cream-200"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          }
          hint="הלקוח נכנס עם הקוד בלבד (באתר או בקישור הישיר)."
        />

        <div>
          <label className="label">סטטוס התחלתי</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            className="input"
          >
            {projectStatusOrder.map((s) => (
              <option key={s} value={s}>
                {projectStatusLabels[s]}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="כמות תמונות מוערכת"
          placeholder="למשל 240"
          type="number"
          min={0}
          value={estimatedPhotos}
          onChange={(e) => setEstimatedPhotos(e.target.value)}
        />

        <div>
          <label className="label">תאריך תחילת פרויקט</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input"
          />
          <p className="mt-1 text-xs text-ink-muted">
            מתי מתחילים לעבוד בפועל על הפרויקט.
          </p>
        </div>

        <div>
          <label className="label">תאריך סיום משוער (יעד)</label>
          <input
            type="date"
            value={targetEndDate}
            onChange={(e) => setTargetEndDate(e.target.value)}
            className="input"
          />
          <p className="mt-1 text-xs text-ink-muted">
            כדי שכל מי שעובד יידע עד מתי לסיים.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className="label">הערות</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="פרטים על האיסוף, החומרים, או דרישות מיוחדות..."
            className="input resize-y"
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-start gap-2">
        <Button type="submit" loading={submitting}>
          צור פרויקט
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={submitting}
        >
          ביטול
        </Button>
      </div>
    </form>
  );
}
