-- Supabase SQL: Taverna "Pônei Saltitante"
-- Cria tabelas de chat, mural e eventos, com RLS seguro.

-- Extensão necessária para gen_random_uuid()
create extension if not exists "pgcrypto";

-- Enum de escopo do chat
do $$ begin
  if not exists (select 1 from pg_type where typname = 'tavern_scope') then
    create type tavern_scope as enum ('global', 'local');
  end if;
end $$;

-- Tabela de mensagens da taverna
create table if not exists public.tavern_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  author text not null check (char_length(author) between 1 and 60),
  content text not null check (char_length(content) between 1 and 500),
  scope tavern_scope not null default 'global',
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

-- Índices
create index if not exists tavern_messages_scope_created_idx on public.tavern_messages (scope, created_at desc);
create index if not exists tavern_messages_user_idx on public.tavern_messages (user_id);

-- Trigger: preencher user_id com auth.uid() quando não fornecido
create or replace function public.set_tavern_message_user()
returns trigger as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists set_tavern_message_user_before_insert on public.tavern_messages;
create trigger set_tavern_message_user_before_insert
before insert on public.tavern_messages
for each row execute function public.set_tavern_message_user();

-- RLS
alter table public.tavern_messages enable row level security;

-- Leitura: qualquer pessoa pode ver mensagens aprovadas
drop policy if exists "Anyone can read approved messages" on public.tavern_messages;
create policy "Anyone can read approved messages" on public.tavern_messages
for select using (approved = true);

-- Escrita: usuários autenticados podem inserir suas próprias mensagens
drop policy if exists "Authenticated can insert messages" on public.tavern_messages;
create policy "Authenticated can insert messages" on public.tavern_messages
for insert to authenticated
with check (auth.uid() = user_id);

-- Atualização: autores podem atualizar suas próprias mensagens (ex.: correções)
drop policy if exists "Authors can update own messages" on public.tavern_messages;
create policy "Authors can update own messages" on public.tavern_messages
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Tabela de mural (mensagens fixadas/rumores persistentes)
create table if not exists public.tavern_mural (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.tavern_messages(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  tags text[] default array[]::text[],
  pinned_by uuid references auth.users(id) on delete set null,
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists tavern_mural_created_idx on public.tavern_mural (created_at desc);

-- Trigger: preencher pinned_by com auth.uid() quando não fornecido
create or replace function public.set_tavern_mural_user()
returns trigger as $$
begin
  if new.pinned_by is null then
    new.pinned_by := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists set_tavern_mural_user_before_insert on public.tavern_mural;
create trigger set_tavern_mural_user_before_insert
before insert on public.tavern_mural
for each row execute function public.set_tavern_mural_user();

alter table public.tavern_mural enable row level security;

-- Leitura: qualquer pessoa pode ver itens aprovados
drop policy if exists "Anyone can read approved mural" on public.tavern_mural;
create policy "Anyone can read approved mural" on public.tavern_mural
for select using (approved = true);

-- Escrita: usuários autenticados podem fixar itens no mural
drop policy if exists "Authenticated can pin to mural" on public.tavern_mural;
create policy "Authenticated can pin to mural" on public.tavern_mural
for insert to authenticated
with check (auth.uid() = pinned_by);

-- Atualização: quem fixou pode editar seu item
drop policy if exists "Pinners can update own mural" on public.tavern_mural;
create policy "Pinners can update own mural" on public.tavern_mural
for update to authenticated
using (auth.uid() = pinned_by)
with check (auth.uid() = pinned_by);

-- Eventos da Taverna (gerados por job/API server-side)
create table if not exists public.tavern_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 2000),
  starts_at timestamptz not null default now(),
  approved boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists tavern_events_starts_idx on public.tavern_events (starts_at desc);

alter table public.tavern_events enable row level security;

-- Leitura: qualquer pessoa pode ver eventos aprovados
drop policy if exists "Anyone can read approved events" on public.tavern_events;
create policy "Anyone can read approved events" on public.tavern_events
for select using (approved = true);

-- Observação: não concedemos insert/update a "authenticated" aqui.
-- Use a Service Key (service_role) para gerenciar eventos via função/cron/API server-side,
-- pois ela contorna RLS por design.

-- Sugestão: se precisar de administradores no cliente, adicione uma claim JWT 'is_admin'
-- e crie políticas específicas, por exemplo:
-- create policy "Admins manage events" on public.tavern_events
-- for all to authenticated
-- using (((auth.jwt() ->> 'is_admin')::boolean) = true)
-- with check (((auth.jwt() ->> 'is_admin')::boolean) = true);

-- Vistas úteis (opcional)
create or replace view public.tavern_feed as
select id, author, content, scope, created_at
from public.tavern_messages
where approved = true
order by created_at desc;

create or replace view public.tavern_mural_feed as
select id, content, tags, created_at
from public.tavern_mural
where approved = true
order by created_at desc;

-- Relatos/Denúncias de mensagens (para moderação)
create table if not exists public.tavern_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.tavern_messages(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  reported_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists tavern_reports_message_idx on public.tavern_reports (message_id);
create index if not exists tavern_reports_created_idx on public.tavern_reports (created_at desc);

create or replace function public.set_tavern_report_user()
returns trigger as $$
begin
  if new.reported_by is null then
    new.reported_by := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists set_tavern_report_user_before_insert on public.tavern_reports;
create trigger set_tavern_report_user_before_insert
before insert on public.tavern_reports
for each row execute function public.set_tavern_report_user();

alter table public.tavern_reports enable row level security;

drop policy if exists "Anyone cannot read reports" on public.tavern_reports;
create policy "Anyone cannot read reports" on public.tavern_reports
for select using (false);

drop policy if exists "Authenticated can file reports" on public.tavern_reports;
create policy "Authenticated can file reports" on public.tavern_reports
for insert to authenticated
with check (auth.uid() = reported_by);

-- Admins via claim opcional
-- create policy "Admins read reports" on public.tavern_reports
-- for select to authenticated
-- using (((auth.jwt() ->> 'is_admin')::boolean) = true);

-- Fim do script
