import "server-only";

import { upscaleWithHuggingFace } from "@/lib/ai/huggingfaceUpscale";
import { upscaleWithRealEsrgan } from "@/lib/ai/replicateRealEsrgan";

/**
 * שיפור תמונה לאלבום לקוח: Hugging Face קודם (אם יש טוקן), אחרת או גיבוי — Replicate.
 * Replicate נשאר בקוד; HF הוא המסלול הראשי כשמוגדר.
 */
export async function upscaleAlbumPhoto(imageUrl: string): Promise<string> {
  const hf = process.env.HUGGINGFACE_API_TOKEN?.trim();
  const rep = process.env.REPLICATE_API_TOKEN?.trim();

  if (hf) {
    try {
      return await upscaleWithHuggingFace(imageUrl);
    } catch (hfErr) {
      if (rep) {
        console.warn(
          "[upscaleAlbumPhoto] Hugging Face נכשל, מנסים Replicate:",
          hfErr
        );
        return await upscaleWithRealEsrgan(imageUrl);
      }
      throw hfErr;
    }
  }

  if (rep) {
    return await upscaleWithRealEsrgan(imageUrl);
  }

  throw new Error(
    "שירות שיפור AI לא מוגדר: הוסיפי HUGGINGFACE_API_TOKEN או REPLICATE_API_TOKEN בהגדרות הפריסה."
  );
}
