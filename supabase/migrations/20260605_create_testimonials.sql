create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text not null,
  text text not null,
  image_url text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for ordering
create index if not exists idx_testimonials_sort on testimonials (sort_order);

-- RLS: allow anon read, admin full access
alter table testimonials enable row level security;

create policy "testimonials_select_anon"
  on testimonials for select
  using (active = true);

create policy "testimonials_all_admin"
  on testimonials for all
  using (true)
  with check (true);

-- Updated_at trigger
create or replace function update_testimonials_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger testimonials_updated_at
  before update on testimonials
  for each row
  execute function update_testimonials_updated_at();
