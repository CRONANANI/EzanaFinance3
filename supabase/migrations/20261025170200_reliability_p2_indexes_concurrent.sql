-- Reliability audit P2-15: indexes for big, live tables, built WITHOUT
-- locking writes.
--
-- HOW TO APPLY: CREATE INDEX CONCURRENTLY cannot run inside a transaction,
-- and the Supabase SQL editor sends a multi-statement script as one
-- transaction. Run this file with psql (`psql "$DB_URL" -f <this file>`,
-- which runs each statement on its own), or paste the statements into the
-- SQL editor ONE AT A TIME. Every statement is idempotent; a statement that
-- fails part-way leaves an INVALID index: drop it and re-run that line.
-- Skipped by the local SQL test harness (name contains "concurrent").

-- 13F: security lookups by CUSIP (the X-ray and cross-signal reads).
create index concurrently if not exists idx_13f_holdings_cusip
  on public.sec_13f_holdings (cusip);

-- 13F positions: the natural key titans_13f_materialise() already groups by
-- (verified: no duplicates live on 2026-10-25). CUSIP can be null, so NULLs
-- count as equal. sec_13f_holdings deliberately gets NO such key: one
-- filing legitimately repeats a CUSIP on several lines (31,123 such groups
-- live), so its writes are made atomic per filing instead
-- (replace_13f_holdings, 20261025170100).
create unique index concurrently if not exists titans_13f_positions_natural_uq
  on public.titans_13f_positions (period, cik, cusip, put_call) nulls not distinct;

-- Substring search (ilike '%x%') on lobbying and USAspending names.
create extension if not exists pg_trgm;
create index concurrently if not exists idx_lobbying_registrant_trgm
  on public.lobbying_filings using gin (registrant_name gin_trgm_ops);
create index concurrently if not exists idx_lobbying_client_trgm
  on public.lobbying_filings using gin (client_name gin_trgm_ops);
create index concurrently if not exists idx_usaspending_recipient_trgm
  on public.usaspending_contract_awards using gin (recipient_name gin_trgm_ops);
create index concurrently if not exists idx_usaspending_agency_trgm
  on public.usaspending_contract_awards using gin (awarding_agency gin_trgm_ops);

-- Foreign keys with no covering index (Supabase performance advisor,
-- unindexed_foreign_keys, 2026-10-25; generated from the live catalog).
create index concurrently if not exists ix_fk_active_copies_request_id on public.active_copies (request_id);
create index concurrently if not exists ix_fk_active_copies_stopped_by on public.active_copies (stopped_by);
create index concurrently if not exists ix_fk_analysis_sessions_board_id on public.analysis_sessions (board_id);
create index concurrently if not exists ix_fk_api_access_requests_api_key_id on public.api_access_requests (api_key_id);
create index concurrently if not exists ix_fk_api_keys_request_id on public.api_keys (request_id);
create index concurrently if not exists ix_fk_auto_invest_rules_user_id on public.auto_invest_rules (user_id);
create index concurrently if not exists ix_fk_bank_connections_user_id on public.bank_connections (user_id);
create index concurrently if not exists ix_fk_competition_org_entries_entered_by on public.competition_org_entries (entered_by);
create index concurrently if not exists ix_fk_competition_org_entries_org_id on public.competition_org_entries (org_id);
create index concurrently if not exists ix_fk_competition_org_entries_team_id on public.competition_org_entries (team_id);
create index concurrently if not exists ix_fk_competitions_created_by on public.competitions (created_by);
create index concurrently if not exists ix_fk_content_reports_reported_user_id on public.content_reports (reported_user_id);
create index concurrently if not exists ix_fk_creator_call_votes_user_id on public.creator_call_votes (user_id);
create index concurrently if not exists ix_fk_debrief_items_user_id on public.debrief_items (user_id);
create index concurrently if not exists ix_fk_echo_article_status_archived_by_user_id on public.echo_article_status (archived_by_user_id);
create index concurrently if not exists ix_fk_echo_article_status_republished_by_user_id on public.echo_article_status (republished_by_user_id);
create index concurrently if not exists ix_fk_help_article_feedback_user_id on public.help_article_feedback (user_id);
create index concurrently if not exists ix_fk_kairos_geopolitical_events_created_by on public.kairos_geopolitical_events (created_by);
create index concurrently if not exists ix_fk_mock_trades_user_id on public.mock_trades (user_id);
create index concurrently if not exists ix_fk_org_advisor_oversight_advisor_member_id on public.org_advisor_oversight (advisor_member_id);
create index concurrently if not exists ix_fk_org_advisor_oversight_supervised_member_id on public.org_advisor_oversight (supervised_member_id);
create index concurrently if not exists ix_fk_org_advisor_oversight_supervised_team_id on public.org_advisor_oversight (supervised_team_id);
create index concurrently if not exists ix_fk_org_alumni_records_cohort_id on public.org_alumni_records (cohort_id);
create index concurrently if not exists ix_fk_org_applicant_scores_org_id on public.org_applicant_scores (org_id);
create index concurrently if not exists ix_fk_org_applicants_org_id on public.org_applicants (org_id);
create index concurrently if not exists ix_fk_org_application_forms_cohort_id on public.org_application_forms (cohort_id);
create index concurrently if not exists ix_fk_org_application_forms_org_id on public.org_application_forms (org_id);
create index concurrently if not exists ix_fk_org_assignment_attachments_org_id on public.org_assignment_attachments (org_id);
create index concurrently if not exists ix_fk_org_assignment_attachments_submission_id on public.org_assignment_attachments (submission_id);
create index concurrently if not exists ix_fk_org_assignment_attachments_uploaded_by on public.org_assignment_attachments (uploaded_by);
create index concurrently if not exists ix_fk_org_assignment_comments_author_id on public.org_assignment_comments (author_id);
create index concurrently if not exists ix_fk_org_assignment_comments_org_id on public.org_assignment_comments (org_id);
create index concurrently if not exists ix_fk_org_assignment_submissions_org_id on public.org_assignment_submissions (org_id);
create index concurrently if not exists ix_fk_org_assignment_submissions_submitted_by on public.org_assignment_submissions (submitted_by);
create index concurrently if not exists ix_fk_org_assignment_templates_created_by on public.org_assignment_templates (created_by);
create index concurrently if not exists ix_fk_org_assignments_assigned_by on public.org_assignments (assigned_by);
create index concurrently if not exists ix_fk_org_assignments_cohort_id on public.org_assignments (cohort_id);
create index concurrently if not exists ix_fk_org_assignments_org_id on public.org_assignments (org_id);
create index concurrently if not exists ix_fk_org_assignments_template_id on public.org_assignments (template_id);
create index concurrently if not exists ix_fk_org_audit_log_actor_id on public.org_audit_log (actor_id);
create index concurrently if not exists ix_fk_org_competition_badges_competition_id on public.org_competition_badges (competition_id);
create index concurrently if not exists ix_fk_org_competition_badges_team_id on public.org_competition_badges (team_id);
create index concurrently if not exists ix_fk_org_coverage_lineage_handoff_note_id on public.org_coverage_lineage (handoff_note_id);
create index concurrently if not exists ix_fk_org_cross_desk_approval_org_id on public.org_cross_desk_approval (org_id);
create index concurrently if not exists ix_fk_org_cross_desk_approval_reviewer_member_id on public.org_cross_desk_approval (reviewer_member_id);
create index concurrently if not exists ix_fk_org_cross_desk_approval_reviewer_team_id on public.org_cross_desk_approval (reviewer_team_id);
create index concurrently if not exists ix_fk_org_desk_meeting_logged_by on public.org_desk_meeting (logged_by);
create index concurrently if not exists ix_fk_org_desk_meeting_org_id on public.org_desk_meeting (org_id);
create index concurrently if not exists ix_fk_org_desk_meeting_recorded_by on public.org_desk_meeting (recorded_by);
create index concurrently if not exists ix_fk_org_event_deliverables_assigned_to on public.org_event_deliverables (assigned_to);
create index concurrently if not exists ix_fk_org_event_deliverables_event_id on public.org_event_deliverables (event_id);
create index concurrently if not exists ix_fk_org_event_deliverables_uploaded_by on public.org_event_deliverables (uploaded_by);
create index concurrently if not exists ix_fk_org_events_created_by on public.org_events (created_by);
create index concurrently if not exists ix_fk_org_events_org_id on public.org_events (org_id);
create index concurrently if not exists ix_fk_org_events_team_id on public.org_events (team_id);
create index concurrently if not exists ix_fk_org_flag_evidence_created_by on public.org_flag_evidence (created_by);
create index concurrently if not exists ix_fk_org_flag_evidence_org_id on public.org_flag_evidence (org_id);
create index concurrently if not exists ix_fk_org_flag_messages_author_member_id on public.org_flag_messages (author_member_id);
create index concurrently if not exists ix_fk_org_flag_response_org_id on public.org_flag_response (org_id);
create index concurrently if not exists ix_fk_org_flag_response_responder_member_id on public.org_flag_response (responder_member_id);
create index concurrently if not exists ix_fk_org_fund_snapshots_cohort_id on public.org_fund_snapshots (cohort_id);
create index concurrently if not exists ix_fk_org_grades_cohort_id on public.org_grades (cohort_id);
create index concurrently if not exists ix_fk_org_grades_graded_by on public.org_grades (graded_by);
create index concurrently if not exists ix_fk_org_ic_meetings_created_by on public.org_ic_meetings (created_by);
create index concurrently if not exists ix_fk_org_invites_accepted_by on public.org_invites (accepted_by);
create index concurrently if not exists ix_fk_org_invites_cohort_id on public.org_invites (cohort_id);
create index concurrently if not exists ix_fk_org_invites_invited_by on public.org_invites (invited_by);
create index concurrently if not exists ix_fk_org_invites_team_id on public.org_invites (team_id);
create index concurrently if not exists ix_fk_org_ips_rules_created_by on public.org_ips_rules (created_by);
create index concurrently if not exists ix_fk_org_ips_violations_rule_id on public.org_ips_violations (rule_id);
create index concurrently if not exists ix_fk_org_learning_assignments_assigned_by on public.org_learning_assignments (assigned_by);
create index concurrently if not exists ix_fk_org_learning_assignments_content_id on public.org_learning_assignments (content_id);
create index concurrently if not exists ix_fk_org_learning_content_org_id on public.org_learning_content (org_id);
create index concurrently if not exists ix_fk_org_learning_content_team_id on public.org_learning_content (team_id);
create index concurrently if not exists ix_fk_org_learning_content_uploaded_by on public.org_learning_content (uploaded_by);
create index concurrently if not exists ix_fk_org_meeting_attendees_org_id on public.org_meeting_attendees (org_id);
create index concurrently if not exists ix_fk_org_meeting_deliverables_org_id on public.org_meeting_deliverables (org_id);
create index concurrently if not exists ix_fk_org_meeting_sentiment_org_id on public.org_meeting_sentiment (org_id);
create index concurrently if not exists ix_fk_org_meeting_votes_org_id on public.org_meeting_votes (org_id);
create index concurrently if not exists ix_fk_org_meetings_started_by on public.org_meetings (started_by);
create index concurrently if not exists ix_fk_org_member_permissions_granted_by on public.org_member_permissions (granted_by);
create index concurrently if not exists ix_fk_org_members_cohort_id on public.org_members (cohort_id);
create index concurrently if not exists ix_fk_org_mentions_author_id on public.org_mentions (author_id);
create index concurrently if not exists ix_fk_org_mentions_org_id on public.org_mentions (org_id);
create index concurrently if not exists ix_fk_org_notification_preferences_managed_by on public.org_notification_preferences (managed_by);
create index concurrently if not exists ix_fk_org_onboarding_tasks_org_id on public.org_onboarding_tasks (org_id);
create index concurrently if not exists ix_fk_org_pitch_deliverables_uploaded_by_member_id on public.org_pitch_deliverables (uploaded_by_member_id);
create index concurrently if not exists ix_fk_org_pitch_discussion_messages_author_member_id on public.org_pitch_discussion_messages (author_member_id);
create index concurrently if not exists ix_fk_org_pitch_discussion_messages_parent_id on public.org_pitch_discussion_messages (parent_id);
create index concurrently if not exists ix_fk_org_pitch_discussion_messages_parent_message_id on public.org_pitch_discussion_messages (parent_message_id);
create index concurrently if not exists ix_fk_org_pitch_model_org_id on public.org_pitch_model (org_id);
create index concurrently if not exists ix_fk_org_pitch_model_reviewed_by on public.org_pitch_model (reviewed_by);
create index concurrently if not exists ix_fk_org_pitch_model_uploaded_by on public.org_pitch_model (uploaded_by);
create index concurrently if not exists ix_fk_org_pitch_signoff_member_id on public.org_pitch_signoff (member_id);
create index concurrently if not exists ix_fk_org_pitch_signoff_org_id on public.org_pitch_signoff (org_id);
create index concurrently if not exists ix_fk_org_pitch_stage_history_actor_member_id on public.org_pitch_stage_history (actor_member_id);
create index concurrently if not exists ix_fk_org_pitch_stage_transition_actor_member_id on public.org_pitch_stage_transition (actor_member_id);
create index concurrently if not exists ix_fk_org_pitch_stage_transition_org_id on public.org_pitch_stage_transition (org_id);
create index concurrently if not exists ix_fk_org_pitch_templates_created_by on public.org_pitch_templates (created_by);
create index concurrently if not exists ix_fk_org_pitch_votes_voter_member_id on public.org_pitch_votes (voter_member_id);
create index concurrently if not exists ix_fk_org_pitches_approving_pm_member_id on public.org_pitches (approving_pm_member_id);
create index concurrently if not exists ix_fk_org_pitches_ic_meeting_id on public.org_pitches (ic_meeting_id);
create index concurrently if not exists ix_fk_org_pitches_monitor_member_id on public.org_pitches (monitor_member_id);
create index concurrently if not exists ix_fk_org_position_flags_resolved_by on public.org_position_flags (resolved_by);
create index concurrently if not exists ix_fk_org_position_flags_sector_head_member_id on public.org_position_flags (sector_head_member_id);
create index concurrently if not exists ix_fk_org_position_threads_author_id on public.org_position_threads (author_id);
create index concurrently if not exists ix_fk_org_position_threads_team_id on public.org_position_threads (team_id);
create index concurrently if not exists ix_fk_org_positions_added_by_user_id on public.org_positions (added_by_user_id);
create index concurrently if not exists ix_fk_org_positions_team_id on public.org_positions (team_id);
create index concurrently if not exists ix_fk_org_positions_unified_account_id on public.org_positions (unified_account_id);
create index concurrently if not exists ix_fk_org_posts_author_id on public.org_posts (author_id);
create index concurrently if not exists ix_fk_org_posts_org_id on public.org_posts (org_id);
create index concurrently if not exists ix_fk_org_posts_team_id on public.org_posts (team_id);
create index concurrently if not exists ix_fk_org_reactions_org_id on public.org_reactions (org_id);
create index concurrently if not exists ix_fk_org_recognition_awarded_by on public.org_recognition (awarded_by);
create index concurrently if not exists ix_fk_org_reports_cohort_id on public.org_reports (cohort_id);
create index concurrently if not exists ix_fk_org_reports_generated_by on public.org_reports (generated_by);
create index concurrently if not exists ix_fk_org_research_attachments_org_id on public.org_research_attachments (org_id);
create index concurrently if not exists ix_fk_org_research_attachments_uploaded_by on public.org_research_attachments (uploaded_by);
create index concurrently if not exists ix_fk_org_research_collections_org_id on public.org_research_collections (org_id);
create index concurrently if not exists ix_fk_org_research_comments_author_id on public.org_research_comments (author_id);
create index concurrently if not exists ix_fk_org_research_comments_org_id on public.org_research_comments (org_id);
create index concurrently if not exists ix_fk_org_research_notes_author_id on public.org_research_notes (author_id);
create index concurrently if not exists ix_fk_org_research_notes_superseded_by on public.org_research_notes (superseded_by);
create index concurrently if not exists ix_fk_org_research_notes_team_id on public.org_research_notes (team_id);
create index concurrently if not exists ix_fk_org_research_templates_created_by on public.org_research_templates (created_by);
create index concurrently if not exists ix_fk_org_research_versions_edited_by on public.org_research_versions (edited_by);
create index concurrently if not exists ix_fk_org_research_versions_org_id on public.org_research_versions (org_id);
create index concurrently if not exists ix_fk_org_role_changes_changed_by_member_id on public.org_role_changes (changed_by_member_id);
create index concurrently if not exists ix_fk_org_role_changes_target_member_id on public.org_role_changes (target_member_id);
create index concurrently if not exists ix_fk_org_sector_coverage_assigned_by on public.org_sector_coverage (assigned_by);
create index concurrently if not exists ix_fk_org_tasks_assigned_by on public.org_tasks (assigned_by);
create index concurrently if not exists ix_fk_org_tasks_org_id on public.org_tasks (org_id);
create index concurrently if not exists ix_fk_org_team_portfolios_added_by on public.org_team_portfolios (added_by);
create index concurrently if not exists ix_fk_partner_badges_badge_id on public.partner_badges (badge_id);
create index concurrently if not exists ix_fk_partner_payouts_payout_account_id on public.partner_payouts (payout_account_id);
create index concurrently if not exists ix_fk_persona_responses_persona_id on public.persona_responses (persona_id);
create index concurrently if not exists ix_fk_pitch_announcements_posted_by on public.pitch_announcements (posted_by);
create index concurrently if not exists ix_fk_pitch_competition_config_updated_by on public.pitch_competition_config (updated_by);
create index concurrently if not exists ix_fk_pitch_competitions_created_by on public.pitch_competitions (created_by);
create index concurrently if not exists ix_fk_pitch_consent_audit_actor_org_member_id on public.pitch_consent_audit (actor_org_member_id);
create index concurrently if not exists ix_fk_pitch_deliverables_uploaded_by on public.pitch_deliverables (uploaded_by);
create index concurrently if not exists ix_fk_pitch_join_requests_decided_by on public.pitch_join_requests (decided_by);
create index concurrently if not exists ix_fk_pitch_join_requests_requested_by on public.pitch_join_requests (requested_by);
create index concurrently if not exists ix_fk_pitch_results_team_id on public.pitch_results (team_id);
create index concurrently if not exists ix_fk_pitch_room_judges_judge_id on public.pitch_room_judges (judge_id);
create index concurrently if not exists ix_fk_pitch_score_summaries_team_id on public.pitch_score_summaries (team_id);
create index concurrently if not exists ix_fk_pitch_scores_criterion_id on public.pitch_scores (criterion_id);
create index concurrently if not exists ix_fk_pitch_talent_flags_pitch_team_member_id on public.pitch_talent_flags (pitch_team_member_id);
create index concurrently if not exists ix_fk_pitch_team_members_org_member_id on public.pitch_team_members (org_member_id);
create index concurrently if not exists ix_fk_pitch_teams_room_id on public.pitch_teams (room_id);
create index concurrently if not exists ix_fk_platform_feedback_user_id on public.platform_feedback (user_id);
create index concurrently if not exists ix_fk_poll_votes_user_id on public.poll_votes (user_id);
create index concurrently if not exists ix_fk_portfolio_holdings_connection_id on public.portfolio_holdings (connection_id);
create index concurrently if not exists ix_fk_security_audit_log_target_id on public.security_audit_log (target_id);
create index concurrently if not exists ix_fk_sentinel_reports_user_id on public.sentinel_reports (user_id);
create index concurrently if not exists ix_fk_strategy_leaderboard_strategy_id on public.strategy_leaderboard (strategy_id);
create index concurrently if not exists ix_fk_strategy_leaderboard_user_id on public.strategy_leaderboard (user_id);
create index concurrently if not exists ix_fk_trade_history_user_id on public.trade_history (user_id);
create index concurrently if not exists ix_fk_unified_accounts_institution_id on public.unified_accounts (institution_id);
create index concurrently if not exists ix_fk_user_event_watches_event_id on public.user_event_watches (event_id);
create index concurrently if not exists ix_fk_user_similarity_cache_similar_user_id on public.user_similarity_cache (similar_user_id);
create index concurrently if not exists ix_fk_waitlist_joined_user_id on public.waitlist (joined_user_id);
create index concurrently if not exists ix_fk_xp_transactions_user_id on public.xp_transactions (user_id);
