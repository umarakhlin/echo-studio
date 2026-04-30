-- Echo Studio — שלב 3 (ענן). הריצי ב-Supabase → SQL Editor.
-- לאחר מכן Storage: ודאי ש-bucket echo-photos קיים כ-public (השורה למטה).

create table if not exists public.echo_clients (
  id uuid primary key,
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_at bigint not null,
  updated_at bigint not null
);

create table if not exists public.echo_projects (
  id uuid primary key,
  client_id uuid not null references public.echo_clients (id) on delete restrict,
  code text not null unique,
  password text not null default '',
  title text not null,
  status text not null,
  start_date text,
  target_end_date text,
  estimated_photos int,
  notes text,
  created_at bigint not null,
  updated_at bigint not null
);
create index if not exists echo_projects_client_id_idx on public.echo_projects (client_id);

create table if not exists public.echo_albums (
  id uuid primary key,
  project_id uuid not null references public.echo_projects (id) on delete cascade,
  parent_album_id uuid references public.echo_albums (id) on delete set null,
  title text not null,
  description text,
  cover_photo_id uuid,
  sort_order int not null default 0,
  created_at bigint not null,
  updated_at bigint not null
);
create index if not exists echo_albums_project_id_idx on public.echo_albums (project_id);

-- Bucket ציבורי לתמונות (קישור ישיר; שרת Echo משתמש ב-service role להעלאה)
insert into storage.buckets (id, name, public, file_size_limit)
  values ('echo-photos', 'echo-photos', true, 52428800)
on conflict (id) do update set public = excluded.public;

-- אם Storage דורש מדיניות ידנית — ב-Supabase: Storage → echo-photos → Public

create table if not exists public.echo_photos (
  id uuid primary key,
  album_id uuid not null references public.echo_albums (id) on delete cascade,
  project_id uuid not null references public.echo_projects (id) on delete cascade,
  serial_number int not null,
  file_name text not null,
  mime_type text not null,
  storage_path text not null,
  thumb_path text not null,
  width int,
  height int,
  starred boolean not null default false,
  estimated_date text,
  story text,
  people jsonb,
  created_at bigint not null,
  updated_at bigint not null,
  unique (album_id, serial_number)
);
create index if not exists echo_photos_project_id_idx on public.echo_photos (project_id);
create index if not exists echo_photos_album_id_idx on public.echo_photos (album_id);
