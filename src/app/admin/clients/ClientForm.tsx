"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AtSign, MapPin, Phone, StickyNote, User } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createClient, updateClient, type Client } from "@/lib/db";

type Mode =
  | { mode: "create"; client?: undefined }
  | { mode: "edit"; client: Client };

export function ClientForm(props: Mode) {
  const router = useRouter();
  const toast = useToast();

  const initial = props.mode === "edit" ? props.client : undefined;

  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("השם חייב להיות באורך 2 תווים לפחות.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("כתובת האימייל לא תקינה.");
      return;
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      setSubmitting(true);
      if (props.mode === "create") {
        const created = await createClient(payload);
        toast.success(`הלקוח ${created.name} נוסף בהצלחה.`);
        router.push(`/admin/clients/${created.id}`);
      } else {
        const updated = await updateClient(props.client.id, payload);
        toast.success(`הפרטים של ${updated.name} עודכנו.`);
        router.push(`/admin/clients/${updated.id}`);
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message ?? "אירעה שגיאה.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 sm:p-7" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="שם מלא"
          placeholder="ישראל ישראלי"
          value={name}
          onChange={(e) => setName(e.target.value)}
          startIcon={<User className="h-4 w-4" />}
          required
        />
        <Input
          label="טלפון"
          placeholder="050-0000000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          startIcon={<Phone className="h-4 w-4" />}
          dir="ltr"
        />
        <Input
          label="אימייל"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          startIcon={<AtSign className="h-4 w-4" />}
          dir="ltr"
        />
        <Input
          label="כתובת לאיסוף"
          placeholder="חיפה, שדרות הנשיא 12"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          startIcon={<MapPin className="h-4 w-4" />}
        />
      </div>

      <div className="mt-4">
        <label className="label">
          <span className="inline-flex items-center gap-1.5">
            <StickyNote className="h-4 w-4 text-ink-muted" />
            הערות
          </span>
        </label>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="פרטים נוספים שכדאי לזכור..."
          className="input resize-y"
        />
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-start gap-2">
        <Button type="submit" loading={submitting}>
          {props.mode === "create" ? "שמור לקוח" : "עדכן פרטים"}
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
