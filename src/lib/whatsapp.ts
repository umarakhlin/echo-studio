/**
 * קישור WhatsApp לשליחת הודעה לסטודיו.
 *
 * הוסיפי בקובץ `.env.local` (בשורש הפרויקט):
 *   NEXT_PUBLIC_WHATSAPP_PHONE=972501234567
 *
 * פורמט: מספר בינלאומי בלי + (לישראל מתחיל ב-972).
 */
export function getWhatsAppChatUrl(): string | null {
  const raw =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? ""
      : "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9) return null;
  return `https://wa.me/${digits}`;
}
