-- myCelebration — Initial Schema
-- Apply via: Supabase Dashboard SQL Editor or `supabase db push`

-- =============================================================================
-- ENUMS
-- =============================================================================

create type guest_type as enum ('main_person', 'family', 'friend', 'screen');
create type invitation_accepted_by as enum ('guest', 'admin');
create type task_participation as enum ('none', 'easy', 'all');
create type performance_type as enum ('speech', 'toast', 'music', 'dance', 'poem', 'other');
create type performance_status as enum ('pending', 'approved', 'rejected', 'scheduled');
create type program_item_type as enum ('break', 'performance', 'info', 'ceremony');
create type choice_type as enum ('binary', 'multichoice', 'text');
create type swap_status as enum ('pending', 'accepted', 'cancelled');
create type memory_type as enum ('funny', 'solemn', 'everyday', 'milestone');
create type gallery_display_type as enum ('single', 'quad', 'frames');
create type gallery_source as enum ('photos', 'memories', 'both');
create type screen_override_type as enum ('page', 'photo', 'memory', 'gallery', 'program');

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Guests / participants / screens
create table guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type guest_type not null default 'friend',
  default_page text,                         -- only for type=screen
  is_primary_screen boolean default false,  -- only for type=screen
  relation text,
  age integer,
  gender text,
  email text,
  phone text,
  invitation_accepted boolean default false,
  invitation_accepted_by invitation_accepted_by,
  task_participation task_participation default 'none',
  created_at timestamptz default now()
);

create index idx_guests_type on guests(type);

-- Party information (single row)
create table fest_info (
  id uuid primary key default gen_random_uuid(),
  description jsonb,                         -- TipTap JSON
  invitation_url text,                       -- Supabase Storage URL
  created_at timestamptz default now()
);

-- Events (church service, party, etc.)
create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  start_time timestamptz,
  address text,
  google_maps_embed text,
  map_image_url text,
  map_image_description text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Locations per event (parking, toilets, etc.)
create table event_locations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer default 0
);

create index idx_event_locations_event_id on event_locations(event_id);

-- =============================================================================
-- CHOICES & PREFERENCES
-- =============================================================================

-- Admin-defined choice options
create table choice_definitions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type choice_type not null,
  options jsonb,                             -- for multichoice: ["option1", "option2"]
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Guest answers to choices
create table guest_choices (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests(id) on delete cascade,
  choice_definition_id uuid not null references choice_definitions(id) on delete cascade,
  value text,
  unique(guest_id, choice_definition_id)
);

create index idx_guest_choices_guest_id on guest_choices(guest_id);

-- =============================================================================
-- PROGRAM
-- =============================================================================

-- Performances created by guests (indslag); admin curates status + duration
create table performances (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests(id) on delete cascade,
  type performance_type not null default 'other',
  title text not null,
  description text,
  duration_minutes integer,
  sort_order integer default 0,
  status performance_status not null default 'pending',
  created_at timestamptz default now()
);

create index idx_performances_guest_id on performances(guest_id);
create index idx_performances_status on performances(status);

-- Program items (1-level nesting via parent_id; cascade so delete-tree is atomic)
create table program_items (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references program_items(id) on delete cascade,
  performance_id uuid references performances(id) on delete set null,
  type program_item_type not null default 'info',
  title text not null,
  start_time timestamptz,
  duration_minutes integer,
  notes text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create index idx_program_items_parent_id on program_items(parent_id);
create index idx_program_items_sort_order on program_items(parent_id, sort_order);

-- =============================================================================
-- TASKS & SWAPS
-- =============================================================================

-- Tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  due_time timestamptz,
  max_persons integer,
  contact_host boolean not null default false,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create index idx_tasks_sort_order on tasks(sort_order);

-- Task assignments (is_owner marks the original assignee vs moved/swapped-in guests)
create table task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  is_owner boolean not null default false,
  unique(task_id, guest_id)
);

create index idx_task_assignments_guest_id on task_assignments(guest_id);
create index idx_task_assignments_task_id on task_assignments(task_id);

-- Swap requests
create table swap_requests (
  id uuid primary key default gen_random_uuid(),
  requester_assignment_id uuid not null references task_assignments(id) on delete cascade,
  desired_task_ids uuid[],
  status swap_status default 'pending',
  created_at timestamptz default now()
);

create index idx_swap_requests_status on swap_requests(status);
create index idx_swap_requests_requester on swap_requests(requester_assignment_id);

-- =============================================================================
-- MEDIA
-- =============================================================================

-- Memories created by guests
create table memories (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests(id) on delete cascade,
  title text not null,
  type memory_type not null,
  description text,
  when_date text,
  image_url text,                            -- Supabase Storage URL
  created_at timestamptz default now()
);

create index idx_memories_guest_id on memories(guest_id);
create index idx_memories_created_at on memories(created_at);

-- Photos taken by guests
create table photos (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests(id) on delete cascade,
  storage_url text not null,
  taken_at timestamptz default now(),
  is_active boolean default true,
  created_at timestamptz default now()
);

create index idx_photos_guest_id on photos(guest_id);
create index idx_photos_taken_at on photos(taken_at);
create index idx_photos_is_active on photos(is_active);

-- =============================================================================
-- CONTENT & CONFIGURATION
-- =============================================================================

-- Static pages created by admin
create table pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content jsonb,                             -- TipTap JSON
  is_active boolean default false,
  visible_from timestamptz,
  visible_until timestamptz,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Gallery configuration (single row)
create table gallery_config (
  id uuid primary key default gen_random_uuid(),
  filter_after timestamptz,
  filter_before timestamptz,
  source gallery_source default 'both',
  interval_seconds integer default 8,
  display_type gallery_display_type default 'single',
  show_memory_text boolean default false
);

-- Screen state — realtime override per screen guest
create table screen_state (
  guest_id uuid primary key references guests(id) on delete cascade,
  current_override screen_override_type,
  override_ref_id uuid,
  updated_at timestamptz default now()
);

-- App settings (single row — SMS template etc.)
create table app_settings (
  id uuid primary key default gen_random_uuid(),
  sms_template text default 'Hej {navn}! Her er dit link til konfirmationsfesten: {url}'
);

-- =============================================================================
-- SEED: Singleton rows
-- =============================================================================

insert into fest_info (id) values (gen_random_uuid());
insert into gallery_config (id) values (gen_random_uuid());
insert into app_settings (id) values (gen_random_uuid());
