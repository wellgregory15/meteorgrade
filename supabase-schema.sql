-- Paste this into your Supabase SQL Editor

-- 1. Create a users table
CREATE TABLE public.users (
  id uuid primary key,
  email text,
  display_name text,
  role text default 'user',
  tier text default 'Novice',
  onboarded boolean default false,
  total_forecasts integer default 0,
  average_accuracy numeric default 0,
  precision_index numeric default 0,
  streak integer default 0,
  avatar_url text,
  membership text default 'basic',
  upgraded_at timestamp with time zone,
  notifications_enabled boolean default false,
  syndicate_id uuid,
  fcm_tokens jsonb default '[]'::jsonb,
  push_subscriptions jsonb default '[]'::jsonb,
  achievements jsonb default '[]'::jsonb,
  timezone text default 'UTC',
  last_daily_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.users FOR UPDATE USING (auth.uid() = id);

-- 2. Flashpoints
CREATE TABLE public.flashpoints (
  id uuid default gen_random_uuid() primary key,
  nws_id text unique,
  event text,
  location text,
  area_desc text,
  severity text,
  urgency text,
  certainty text,
  description text,
  instruction text,
  headline text,
  location_coord jsonb,
  expires timestamp with time zone,
  effective timestamp with time zone,
  is_active boolean default true,
  deactivated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.flashpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read flashpoints" ON public.flashpoints FOR SELECT USING (true);
CREATE POLICY "Anyone can insert flashpoints" ON public.flashpoints FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update flashpoints" ON public.flashpoints FOR UPDATE USING (true);

-- 3. Forecasts
CREATE TABLE public.forecasts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id),
  flashpoint_id uuid references public.flashpoints(id),
  user_name text,
  user_tier text,
  user_score integer,
  event_name text,
  location text,
  lat numeric,
  lon numeric,
  target_date text,
  forecast_date text,
  unit_system text,
  predicted_condition text,
  humidity numeric,
  wind_speed numeric,
  wind_gusts numeric,
  uv_index numeric,
  precip numeric,
  pressure numeric,
  cape numeric,
  shear numeric,
  location_coord jsonb,
  model_grade jsonb,
  severity_level integer,
  high_temp numeric,
  low_temp numeric,
  predicted_temp numeric,
  status text default 'pending',
  actual_grade jsonb,
  flash_data jsonb,
  lock_in_bonus numeric default 0,
  sector_id text default 'baseline',
  difficulty_multiplier numeric default 1.0,
  consensus_delta numeric,
  is_probabilistic boolean default false,
  risk_profile jsonb,
  forecast_mode text default 'standard',
  logic_notes text,
  syndicate_id uuid,
  mission_id uuid references public.missions(id) on delete set null,
  upvotes integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint forecasts_syndicate_id_fkey foreign key (syndicate_id) references public.syndicates(id) on delete set null
);

-- Add foreign key for syndicate_id if needed separately but we can just use uuid for now
-- or define it below.

CREATE TABLE public.syndicates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  tag text not null unique,
  creator_id uuid references auth.users(id),
  description text,
  logo_url text,
  is_classroom boolean default false,
  organization_name text,
  learning_objectives text,
  join_code text unique,
  total_pi numeric default 0,
  member_count integer default 1,
  is_invite_only boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE public.syndicate_broadcasts (
  id uuid default gen_random_uuid() primary key,
  syndicate_id uuid references public.syndicates(id) on delete cascade,
  title text,
  message text,
  author_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE public.syndicate_vaults (
  id uuid default gen_random_uuid() primary key,
  syndicate_id uuid references public.syndicates(id) on delete cascade,
  credits integer default 0,
  hardware jsonb default '[]'::jsonb,
  last_updated timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (syndicate_id)
);

CREATE TABLE public.syndicate_requests (
  id uuid default gen_random_uuid() primary key,
  syndicate_id uuid references public.syndicates(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (syndicate_id, user_id)
);

CREATE TABLE public.syndicate_members (
  id uuid default gen_random_uuid() primary key,
  syndicate_id uuid references public.syndicates(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'analyst',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (syndicate_id, user_id)
);

CREATE TABLE public.syndicate_messages (
  id uuid default gen_random_uuid() primary key,
  syndicate_id uuid references public.syndicates(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  user_name text,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE public.chat_reports (
  id uuid default gen_random_uuid() primary key,
  message_id uuid references public.syndicate_messages(id) on delete cascade,
  syndicate_id uuid references public.syndicates(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete cascade,
  reason text not null,
  status text default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE public.logic_upvotes (
  id uuid default gen_random_uuid() primary key,
  forecast_id uuid references public.forecasts(id) on delete cascade,
  voter_id uuid references auth.users(id) on delete cascade,
  syndicate_id uuid references public.syndicates(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (forecast_id, voter_id)
);

ALTER TABLE public.syndicates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view syndicates" ON public.syndicates FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create syndicates" ON public.syndicates FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creators can update syndicates" ON public.syndicates FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete syndicates" ON public.syndicates FOR DELETE USING (auth.uid() = creator_id);

ALTER TABLE public.syndicate_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone in syndicate can view broadcasts" ON public.syndicate_broadcasts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.syndicate_members
    WHERE syndicate_members.syndicate_id = syndicate_broadcasts.syndicate_id
    AND syndicate_members.user_id = auth.uid()
  )
);
CREATE POLICY "Commanders can post broadcasts" ON public.syndicate_broadcasts FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.syndicate_members
    WHERE syndicate_members.syndicate_id = syndicate_id
    AND syndicate_members.user_id = auth.uid()
    AND syndicate_members.role IN ('commander', 'officer')
  )
);
CREATE POLICY "Commanders can delete broadcasts" ON public.syndicate_broadcasts FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.syndicate_members
    WHERE syndicate_members.syndicate_id = syndicate_broadcasts.syndicate_id
    AND syndicate_members.user_id = auth.uid()
    AND syndicate_members.role IN ('commander', 'officer')
  )
);

ALTER TABLE public.syndicate_vaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view vault" ON public.syndicate_vaults FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.syndicate_members
    WHERE syndicate_members.syndicate_id = syndicate_vaults.syndicate_id
    AND syndicate_members.user_id = auth.uid()
  )
);

ALTER TABLE public.syndicate_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view requests" ON public.syndicate_requests FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create requests" ON public.syndicate_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Commanders can update requests" ON public.syndicate_requests FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.syndicate_members
    WHERE syndicate_members.syndicate_id = syndicate_requests.syndicate_id
    AND syndicate_members.user_id = auth.uid()
    AND syndicate_members.role IN ('commander', 'officer')
  )
);

ALTER TABLE public.syndicate_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view syndicate members" ON public.syndicate_members FOR SELECT USING (true);
CREATE POLICY "Users can join syndicates" ON public.syndicate_members FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);
CREATE POLICY "Members can leave syndicates" ON public.syndicate_members FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Commanders can remove members" ON public.syndicate_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.syndicates
    WHERE syndicates.id = syndicate_members.syndicate_id
    AND syndicates.creator_id = auth.uid()
  )
);

ALTER TABLE public.syndicate_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view syndicate messages" ON public.syndicate_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.syndicate_members
    WHERE syndicate_members.syndicate_id = syndicate_messages.syndicate_id
    AND syndicate_members.user_id = auth.uid()
  )
);
CREATE POLICY "Members can post syndicate messages" ON public.syndicate_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.syndicate_members
    WHERE syndicate_members.syndicate_id = syndicate_id
    AND syndicate_members.user_id = auth.uid()
  )
);

ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can report messages" ON public.chat_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can view reports" ON public.chat_reports FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND (users.role = 'admin' OR users.role = 'commander')
  )
);
CREATE POLICY "Admins can update reports" ON public.chat_reports FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

ALTER TABLE public.logic_upvotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Syndicate members can view logic upvotes" ON public.logic_upvotes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.syndicate_members
    WHERE syndicate_members.syndicate_id = logic_upvotes.syndicate_id
    AND syndicate_members.user_id = auth.uid()
  )
);
CREATE POLICY "Syndicate members can upvote logic" ON public.logic_upvotes FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.syndicate_members
    WHERE syndicate_members.syndicate_id = syndicate_id
    AND syndicate_members.user_id = auth.uid()
  )
);

ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view forecasts" ON public.forecasts FOR SELECT USING (true);
CREATE POLICY "Users can insert own forecasts" ON public.forecasts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own forecasts" ON public.forecasts FOR UPDATE USING (
  auth.uid() = user_id OR 
  lower(auth.jwt() ->> 'email') = 'tylerleedixon@gmail.com' OR 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- 4. Support Tickets
CREATE TABLE public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id),
  subject text,
  category text,
  description text,
  status text default 'open',
  priority text default 'normal',
  admin_reply text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access to support_tickets" ON public.support_tickets FOR ALL USING (
  lower(auth.jwt() ->> 'email') = 'tylerleedixon@gmail.com' OR 
  auth.jwt() ->> 'email' = 'Tylerleedixon@gmail.com' OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);
CREATE POLICY "Users view own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own tickets" ON public.support_tickets FOR UPDATE USING (auth.uid() = user_id);

-- 5. Missions (Global Campaigns)
CREATE TABLE public.missions (
  id uuid default gen_random_uuid() primary key,
  title text,
  description text,
  category text,
  severity text,
  is_active boolean default true,
  global_id text unique,
  start_date text,
  end_date text,
  status text default 'active',
  is_global boolean default false,
  user_id uuid,
  is_reviewed boolean default false,
  syndicate_id uuid references public.syndicates(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access to missions" ON public.missions FOR ALL USING (
  lower(auth.jwt() ->> 'email') = 'tylerleedixon@gmail.com' OR 
  auth.jwt() ->> 'email' = 'Tylerleedixon@gmail.com' OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
) WITH CHECK (true);
CREATE POLICY "Anyone can read missions" ON public.missions FOR SELECT USING (true);
CREATE POLICY "Users can delete own missions" ON public.missions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own missions" ON public.missions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own missions" ON public.missions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Announcements
CREATE TABLE public.announcements (
  id uuid default gen_random_uuid() primary key,
  title text,
  description text,
  content text,
  type text default 'info',
  is_active boolean default true,
  priority integer default 2,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access to announcements" ON public.announcements FOR ALL USING (
  lower(auth.jwt() ->> 'email') = 'tylerleedixon@gmail.com' OR 
  auth.jwt() ->> 'email' = 'Tylerleedixon@gmail.com' OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);
CREATE POLICY "Anyone can read announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Anyone can insert announcements" ON public.announcements FOR INSERT WITH CHECK (true);

-- 7. Weekly Debriefs
CREATE TABLE public.weekly_debriefs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id),
  insight text,
  precision_delta numeric,
  pros jsonb default '[]'::jsonb,
  cons jsonb default '[]'::jsonb,
  week_start_date text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.weekly_debriefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own debriefs" ON public.weekly_debriefs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own debriefs" ON public.weekly_debriefs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. Beta Feedback
CREATE TABLE public.beta_feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id),
  user_email text,
  type text,
  description text,
  path text,
  user_agent text,
  status text default 'new',
  admin_notes text,
  updated_at timestamp with time zone,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Beta Feedback Notes (History)
CREATE TABLE public.beta_feedback_notes (
  id uuid default gen_random_uuid() primary key,
  feedback_id uuid references public.beta_feedback(id) on delete cascade,
  admin_id uuid references public.users(id),
  admin_email text,
  content text not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.beta_feedback_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access to feedback notes" ON public.beta_feedback_notes FOR ALL USING (
  lower(auth.jwt() ->> 'email') = 'tylerleedixon@gmail.com' OR 
  auth.jwt() ->> 'email' = 'Tylerleedixon@gmail.com' OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);
CREATE POLICY "Users can view notes on own feedback" ON public.beta_feedback_notes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.beta_feedback
    WHERE beta_feedback.id = feedback_id
    AND beta_feedback.user_id = auth.uid()
  )
);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access to beta_feedback" ON public.beta_feedback FOR ALL USING (
  lower(auth.jwt() ->> 'email') = 'tylerleedixon@gmail.com' OR 
  auth.jwt() ->> 'email' = 'Tylerleedixon@gmail.com' OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);
CREATE POLICY "Users can insert own feedback" ON public.beta_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own feedback" ON public.beta_feedback FOR SELECT USING (auth.uid() = user_id);

-- Enable Realtime for key tables idempotently
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'announcements') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'support_tickets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'missions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.missions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'flashpoints') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.flashpoints;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'users') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'forecasts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.forecasts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'beta_feedback') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.beta_feedback;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'beta_feedback_notes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.beta_feedback_notes;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'syndicates') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.syndicates;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'syndicate_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.syndicate_members;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'syndicate_broadcasts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.syndicate_broadcasts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'syndicate_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.syndicate_requests;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'syndicate_vaults') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.syndicate_vaults;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'syndicate_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.syndicate_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_reports') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reports;
  END IF;
END $$;

-- Indices for performance
CREATE INDEX idx_flashpoints_is_active ON public.flashpoints(is_active);
CREATE INDEX idx_flashpoints_nws_id ON public.flashpoints(nws_id);
CREATE INDEX idx_forecasts_user_id ON public.forecasts(user_id);
CREATE INDEX idx_forecasts_status ON public.forecasts(status);
CREATE INDEX idx_forecasts_created_at ON public.forecasts(created_at DESC);
CREATE INDEX idx_forecasts_target_date ON public.forecasts(target_date DESC);
CREATE INDEX idx_users_precision_index ON public.users(precision_index DESC);
CREATE INDEX idx_missions_status ON public.missions(status);
CREATE INDEX idx_announcements_created_at ON public.announcements(created_at DESC);

