# Echo / אקו · Photo Studio

> *"הזיכרונות ממשיכים להדהד."*

סטודיו פרטי לשימור זיכרונות משפחתיים — דיגיטציה, שחזור וסיפור.
מבוסס Next.js 15 · TypeScript · Tailwind CSS · עברית RTL.

ראו את [`PLAN.md`](./PLAN.md) למסמך התכנון המלא של המוצר והעסק.

---

## אבן דרך 1 — מצב נוכחי

✅ הקמת תשתית הפרויקט (Next.js 15 + TS + Tailwind)
✅ עיצוב UI בעברית RTL עם פלטת המותג (חצילי / קרם / זהב + פונטים Heebo & Playfair)
✅ מסך התחברות (לקוח + סטודיו) - בדיקת סיסמה אמיתית
✅ דף נחיתה במותג קלאסי-וינטג'
✅ ניהול לקוחות - יצירה, עריכה, מחיקה, חיפוש
✅ ניהול פרויקטים - סטטוסים, קוד+סיסמה אוטומטיים, הודעת WhatsApp ללקוח
✅ אלבומים - יצירת אלבום, מחיקה, רב-אלבומיות בפרויקט
✅ העלאת תמונות (בודדת + מרובה + drag&drop) עם תמונות ממוזערות
✅ תצוגת אלבום עם מספרים עוקבים, סימון בכוכבית, סינון
✅ גלריה כללית עם סינון לפי פרויקט וכוכב
✅ תצוגת לקוח (`/album/[code]`) - שער סיסמה + גלריה ממותגת

🟡 הנתונים נשמרים מקומית ב-IndexedDB (ראו "מסד נתונים" למטה).
   מעבר ל-Supabase + Cloudflare R2 ייעשה באבן דרך הבאה ללא שינוי בקריאות.

---

## הפעלה מקומית

```bash
npm install
npm run dev
```

ואז גלשו ל-<http://localhost:3000>.

### פקודות שימושיות

| פקודה | פעולה |
|-------|-------|
| `npm run dev` | שרת פיתוח (Hot reload) |
| `npm run build` | בנייה לפרודקשן |
| `npm run start` | הרצת build מקומי |
| `npm run lint` | בדיקת lint |

---

## מבנה ספריות

```
src/
├── app/                                        # App Router של Next.js 15
│   ├── layout.tsx                              # שורש - RTL, פונטים, מטא
│   ├── globals.css                             # שכבת בסיס + טוקני קומפוננטות
│   ├── page.tsx                                # דף נחיתה
│   ├── login/page.tsx                          # מסך התחברות
│   ├── not-found.tsx                           # 404 ממותג
│   ├── icon.svg                                # favicon
│   │
│   ├── admin/                                  # לוח ניהול (האדמין)
│   │   ├── layout.tsx                          # AdminShell + ToastProvider
│   │   ├── page.tsx + DashboardClient.tsx      # דשבורד
│   │   ├── clients/                            # ניהול לקוחות
│   │   │   ├── page.tsx + ClientsListClient.tsx
│   │   │   ├── new/page.tsx
│   │   │   ├── [id]/page.tsx + ClientDetailView.tsx
│   │   │   └── ClientForm.tsx                  # טופס משותף ליצירה/עריכה
│   │   ├── projects/                           # ניהול פרויקטים
│   │   │   ├── page.tsx + ProjectsListClient.tsx
│   │   │   ├── new/page.tsx + NewProjectForm.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx + ProjectDetailView.tsx
│   │   │       └── albums/[albumId]/
│   │   │           └── page.tsx + AlbumDetailView.tsx
│   │   └── gallery/                            # גלריה כללית
│   │
│   └── album/[code]/                           # תצוגת לקוח
│       └── page.tsx + ClientAlbumView.tsx
│
├── components/
│   ├── auth/LoginCard.tsx                      # כרטיסיות התחברות
│   ├── admin/                                  # AdminShell, PhotoUploader, PhotoTile
│   └── ui/                                     # Button, Input, Card, Logo, Toast,
│                                               #   ConfirmDialog, EmptyState, StatusBadge,
│                                               #   VintageDivider
│
└── lib/
    ├── cn.ts                                   # מיזוג מחלקות Tailwind
    ├── blob-url.ts                             # hook להמרת Blob ל-object URL
    └── db/                                     # שכבת נתונים (IndexedDB דרך idb)
        ├── index.ts                            # ייצוא משולב
        ├── types.ts                            # טיפוסים (Client, Project, Album, Photo)
        ├── schema.ts                           # סכמת IndexedDB ואינדקסים
        ├── clients.ts                          # CRUD לקוחות
        ├── projects.ts                         # CRUD + יצירת קוד וסיסמה
        ├── albums.ts                           # CRUD אלבומים + ensureDefaultAlbum
        ├── photos.ts                           # CRUD + thumbnail + מספור עוקב
        └── stats.ts                            # נתוני דשבורד
```

---

## מערכת העיצוב

### צבעים (PLAN §מסלול קלאסי-וינטג')

| תפקיד | קוד | מחלקת Tailwind |
|--------|------|----------------|
| חצילי עמוק | `#4A2545` | `bg-eggplant` / `text-eggplant` |
| קרם חמים | `#FAF7F2` | `bg-cream` |
| חום-שחור רך | `#2A1F2D` | `text-ink` |
| זהב עתיק | `#C9A961` | `text-gold` / `bg-gold` |

### פונטים

- **עברית/רוסית/לטיני:** [Heebo](https://fonts.google.com/specimen/Heebo) — מטופל ב-`next/font/google`, חשוף כ-`var(--font-heebo)` והמחלקה `font-sans`.
- **כותרות בלטינית / לוגו:** [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) — `var(--font-playfair)` והמחלקה `font-display`.

### קומפוננטות בסיס

- `<Logo size="sm|md|lg|xl" showHebrew>` — סמליל גלי הד + שם המותג.
- `<Button variant="primary|secondary|ghost|gold" size="sm|md|lg" loading fullWidth>`.
- `<Input label hint error startIcon endAdornment>` — עם `aria-invalid` ותיאור שגיאה.
- `<Card>` עם `<CardHeader>`, `<CardTitle>`, `<CardSubtitle>`.
- `<VintageDivider label>` — קו זהוב מנוקד מסביב לתווית.

---

## מסד נתונים (מקומי, אבן דרך 1)

הכל נשמר ב-**IndexedDB** של הדפדפן באמצעות [`idb`](https://github.com/jakearchibald/idb):

- **clients** — לקוחות (שם, טלפון, אימייל, כתובת, הערות).
- **projects** — פרויקטים (קוד גישה, סיסמה, סטטוס, כותרת, אומדן תמונות).
- **albums** — אלבומים בתוך פרויקט (תמיכה בהיררכיה דרך `parentAlbumId`).
- **photos** — תמונות (Blob מקורי, תמונה ממוזערת, מספור עוקב, כוכב, סיפור).

ההמרה ל-Supabase נעשית ב-`src/lib/db/*` בלבד; הקריאות מהקומפוננטות נשארות זהות (`createClient`, `listProjects`, `addPhotoToAlbum` וכו').

כדי לאפס את הנתונים: בדפדפן → DevTools → Application → IndexedDB → מחיקת `echo-studio`.

---

## הצעדים הבאים

1. **חיבור Supabase (Auth + Postgres)** — החלפה שקופה של שכבת `src/lib/db`.
2. **Cloudflare R2** לאחסון ה-Blobs (תמונה + תמונה ממוזערת).
3. **סורק חכם** (אבן דרך 2) - חיתוך 4 פינות, יישור פרספקטיבה.
4. **מצב פלשקרדס** (אבן דרך 3) - צד אחד תמונה, צד שני סיפור.
5. **AI לעריכה ושחזור** (אבן דרך 4) דרך Replicate API.

---

## רישיון

פרטי. כל הזכויות שמורות לבעלי Echo Studio, חיפה.
