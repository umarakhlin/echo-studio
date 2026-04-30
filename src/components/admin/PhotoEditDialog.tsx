"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { updatePhoto } from "@/lib/db/store";
import type { Photo } from "@/lib/db/types";
import { cn } from "@/lib/cn";

function peopleToInput(people?: string[]): string {
  if (!people?.length) return "";
  return people.join(", ");
}

function inputToPeople(s: string): string[] | undefined {
  const parts = s
    .split(/[,،]/)
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

interface Props {
  photo: Photo | null;
  open: boolean;
  onClose: () => void;
  onSaved: (photo: Photo) => void;
}

export function PhotoEditDialog({ photo, open, onClose, onSaved }: Props) {
  const toast = useToast();
  const [fileName, setFileName] = useState("");
  const [estimatedDate, setEstimatedDate] = useState("");
  const [story, setStory] = useState("");
  const [peopleInput, setPeopleInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!photo || !open) return;
    setFileName(photo.fileName);
    setEstimatedDate(photo.estimatedDate ?? "");
    setStory(photo.story ?? "");
    setPeopleInput(peopleToInput(photo.people));
  }, [photo?.id, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleSave() {
    if (!photo) return;
    const name = fileName.trim();
    if (!name) {
      toast.error("שם הקובץ נדרש.");
      return;
    }
    try {
      setSaving(true);
      const updated = await updatePhoto(photo.id, {
        fileName: name,
        estimatedDate: estimatedDate.trim() || undefined,
        story: story.trim() || undefined,
        people: inputToPeople(peopleInput),
      });
      toast.success("פרטי התמונה נשמרו.");
      onSaved(updated);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שמירה נכשלה.");
    } finally {
      setSaving(false);
    }
  }

  if (!open || !photo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-edit-title"
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8"
    >
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-fade-up"
        onClick={onClose}
        aria-hidden
      />

      <div
        className={cn(
          "relative w-full max-w-lg max-h-[min(90vh,40rem)] overflow-y-auto rounded-2xl bg-white p-6 shadow-soft border border-eggplant/10 animate-fade-up"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="photo-edit-title"
            className="font-display text-xl font-semibold text-eggplant"
          >
            עריכת תמונה #
            {String(photo.serialNumber).padStart(3, "0")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-md p-1.5 text-ink-muted hover:bg-cream-200 hover:text-eggplant"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-muted leading-relaxed">
          אפשר לעדכן פרטים בכל עת אחרי ההעלאה. התאריך והסיפור מוצגים ללקוח
          בתצוגה הציבורית כשממלאים אותם.
        </p>

        <div className="mt-5 space-y-4">
          <Input
            label="שם הקובץ"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            dir="ltr"
            className="font-mono text-sm"
          />
          <Input
            label="תאריך משוער"
            hint='טקסט חופשי — למשל "1962", 12.3.1990 או "קיץ 1985"'
            value={estimatedDate}
            onChange={(e) => setEstimatedDate(e.target.value)}
          />
          <div>
            <label className="label">סיפור / כיתוב</label>
            <textarea
              rows={4}
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="מה רואים בתמונה, הקשר משפחתי…"
              className="input resize-y w-full min-h-[5rem]"
            />
          </div>
          <Input
            label="אנשים בתמונה"
            hint="מופרדים בפסיק (אפשר גם פסיק עברי)"
            value={peopleInput}
            onChange={(e) => setPeopleInput(e.target.value)}
            placeholder="סבא יוסף, דודה רות"
          />
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            ביטול
          </Button>
          <Button type="button" loading={saving} onClick={handleSave}>
            שמירה
          </Button>
        </div>
      </div>
    </div>
  );
}
