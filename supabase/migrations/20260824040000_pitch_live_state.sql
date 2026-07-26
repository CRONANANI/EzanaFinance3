-- Phase 5: live day-of run-of-show state. Lightweight status on rooms and the
-- team-in-room so a host can drive the event and everyone sees where things stand.
-- running_offset_min lets a late room cascade adjusted times to its downstream
-- teams. Read via the existing Phase 1 room/team RLS (host + participants).

alter table public.pitch_rooms
  add column if not exists live_status text not null default 'scheduled'
    check (live_status in ('scheduled', 'in_progress', 'running_late', 'done')),
  add column if not exists running_offset_min int not null default 0;

alter table public.pitch_teams
  add column if not exists presentation_status text not null default 'upcoming'
    check (presentation_status in ('upcoming', 'on_deck', 'presenting', 'complete'));
