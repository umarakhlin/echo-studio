/** קוד וסיסמה אקראיים — ללא תלות ב-IndexedDB (גם לענן). */

export function generateProjectCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "0123456789";
  const pick = (src: string, n: number) =>
    Array.from(
      { length: n },
      () => src[Math.floor(Math.random() * src.length)]
    ).join("");
  return `${pick(letters, 4)}-${pick(digits, 4)}`;
}

export function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(
    { length: 8 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");
}
