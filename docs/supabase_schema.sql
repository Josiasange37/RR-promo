-- candidates table
create table if not exists candidates (
  id          text primary key,
  name        text not null,
  class       text not null,
  category    text not null check (category in ('Roi', 'Reine')),
  votes       integer not null default 0,
  image_url   text not null,
  created_at  timestamptz default now()
);

-- transactions table
create table if not exists transactions (
  id              text primary key,
  candidate_id    text not null references candidates(id) on delete cascade,
  votes           integer not null,
  amount          integer not null,
  phone_number    text not null,
  operator        text not null check (operator in ('MTN', 'ORANGE')),
  status          text not null default 'PENDING' check (status in ('PENDING', 'SUCCESS', 'FAILED')),
  created_at      timestamptz default now()
);

-- Enable Row-Level Security (RLS)
alter table candidates enable row level security;
alter table transactions enable row level security;

-- RLS Policies
drop policy if exists "Anyone can read candidates" on candidates;
create policy "Anyone can read candidates" on candidates for select using (true);
-- transactions has RLS enabled but no public policies, meaning only service role can read/write

-- RPC function to increment votes atomically
create or replace function increment_votes(p_candidate_id text, p_votes integer)
returns void
language sql
security definer
begin atomic
  update candidates
  set votes = votes + p_votes
  where id = p_candidate_id;
end;

-- Seed initial candidates
insert into candidates (id, name, class, category, votes, image_url) values
('aaron-m', 'Aaron M.', 'Terminale A', 'Roi', 0, 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=640&h=640&fit=crop&q=70&auto=format'),
('bryan-t', 'Bryan T.', 'Terminale C', 'Roi', 0, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=640&h=640&fit=crop&q=70&auto=format'),
('eric-b', 'Éric B.', 'Terminale E', 'Roi', 0, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=640&h=640&fit=crop&q=70&auto=format'),
('christelle-n', 'Christelle N.', 'Terminale D', 'Reine', 0, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=640&h=640&fit=crop&q=70&auto=format'),
('diane-k', 'Diane K.', 'Terminale A', 'Reine', 0, 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=640&h=640&fit=crop&q=70&auto=format'),
('faustine-l', 'Faustine L.', 'Terminale C', 'Reine', 0, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=640&h=640&fit=crop&q=70&auto=format')
on conflict (id) do nothing;

-- ══════════════════════════════════════════════════════════════════
--  ADMIN PANEL TABLES (secret / admin side only)
--  No public RLS policies => only the service role can read/write.
--  All lookups go through the Supabase client with bound parameters,
--  so raw SQL injection is impossible at the application layer.
-- ══════════════════════════════════════════════════════════════════

-- Admin accounts — store ONLY bcrypt hashes (cost 12+). Never store plaintext.
create table if not exists admins (
  id             uuid primary key default gen_random_uuid(),
  username       text not null unique check (username ~ '^[a-zA-Z0-9_]+$'),
  password_hash  text not null,
  label          text,
  created_at     timestamptz default now()
);

-- Valid sessions (HttpOnly cookie token)
create table if not exists admin_sessions (
  token        text primary key,
  admin_id     uuid not null references admins(id) on delete cascade,
  expires_at   timestamptz not null,
  created_at   timestamptz default now()
);

-- Login rate limiting / lockout (brute-force protection)
create table if not exists login_attempts (
  identifier     text primary key,
  attempts       integer not null default 0,
  locked_until   timestamptz,
  updated_at     timestamptz default now()
);

-- Admin payout / withdrawal journal (retraits Mobile Money)
create table if not exists withdrawals (
  id             text primary key,
  amount         integer not null,
  phone_number   text not null,
  operator       text not null check (operator in ('MTN', 'ORANGE')),
  reference      text not null,
  status         text not null default 'SUCCESS' check (status in ('PENDING', 'SUCCESS', 'FAILED')),
  created_at     timestamptz default now()
);

alter table admins enable row level security;
alter table admin_sessions enable row level security;
alter table login_attempts enable row level security;
alter table withdrawals enable row level security;

-- No SELECT/INSERT/UPDATE policies for public role:
-- only the service-role client (server side) can touch these tables.
