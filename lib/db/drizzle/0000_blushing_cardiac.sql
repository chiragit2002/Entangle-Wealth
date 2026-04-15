CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"photo_url" text,
	"headline" text,
	"occupation_id" text,
	"bio" text,
	"phone" text,
	"location" text,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"subscription_tier" text DEFAULT 'free',
	"kyc_status" text DEFAULT 'not_started',
	"kyc_submitted_at" timestamp with time zone,
	"kyc_verified_at" timestamp with time zone,
	"is_public_profile" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"wallet_address" text,
	"token_balance" real DEFAULT 0,
	"referral_code" text,
	"referred_by" text,
	"referral_coupon_applied" boolean DEFAULT false,
	"alert_email_digest" text DEFAULT 'off',
	"referral_extra_signals_until" timestamp with time zone,
	"referral_tax_gpt_until" timestamp with time zone,
	"referral_ambassador" boolean DEFAULT false,
	"referral_milestones_seen" jsonb DEFAULT '[]'::jsonb,
	"onboarding_completed" boolean DEFAULT false,
	"onboarding_interests" jsonb,
	"onboarding_checklist" jsonb,
	"checklist_completed_at" timestamp with time zone,
	"kyc_id_photo_path" text,
	"kyc_selfie_path" text,
	"kyc_full_legal_name" text,
	"kyc_date_of_birth" text,
	"kyc_address" text,
	"kyc_id_type" text,
	"kyc_id_number" text,
	"is_early_adopter" boolean DEFAULT false,
	"updated_at" timestamp with time zone DEFAULT now(),
	"is_business_owner" boolean DEFAULT false,
	"business_doc_paths" jsonb DEFAULT '[]'::jsonb,
	"business_doc_status" text DEFAULT 'not_started',
	"business_doc_rejection_reason" text,
	"business_doc_submitted_at" timestamp with time zone,
	"business_doc_verified_at" timestamp with time zone,
	"dashboard_modules" jsonb DEFAULT '[]'::jsonb,
	"dashboard_modules_assigned_at" timestamp with time zone,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "resume_education" (
	"id" serial PRIMARY KEY NOT NULL,
	"resume_id" integer NOT NULL,
	"school" text NOT NULL,
	"degree" text,
	"field" text,
	"start_date" text,
	"end_date" text,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "resume_experiences" (
	"id" serial PRIMARY KEY NOT NULL,
	"resume_id" integer NOT NULL,
	"company" text NOT NULL,
	"title" text NOT NULL,
	"location" text,
	"start_date" text,
	"end_date" text,
	"is_current" text DEFAULT 'false',
	"description" text,
	"is_gig_work" text DEFAULT 'false',
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text DEFAULT 'My Résumé',
	"template" text DEFAULT 'professional',
	"summary" text,
	"skills" jsonb DEFAULT '[]'::jsonb,
	"certifications" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_title" text NOT NULL,
	"company" text NOT NULL,
	"location" text,
	"salary" text,
	"job_type" text,
	"source_url" text,
	"source" text,
	"external_id" text,
	"saved_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gigs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"price" text NOT NULL,
	"category" text NOT NULL,
	"contact_name" text,
	"rating" text,
	"completed_jobs" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"category" text NOT NULL,
	"xp_reward" integer DEFAULT 0 NOT NULL,
	"requirement" text NOT NULL,
	"threshold" integer DEFAULT 1 NOT NULL,
	"is_secret" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "badges_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"xp_reward" integer NOT NULL,
	"target" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_spins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"spin_date" text DEFAULT '' NOT NULL,
	"prize_amount" real DEFAULT 0 NOT NULL,
	"reward_type" text DEFAULT 'cash' NOT NULL,
	"reward_label" text DEFAULT '' NOT NULL,
	"reward" text DEFAULT '',
	"reward_value" integer DEFAULT 0 NOT NULL,
	"spun_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "daily_spins_user_spin_date_uniq" UNIQUE("user_id","spin_date")
);
--> statement-breakpoint
CREATE TABLE "founder_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"xp_multiplier" real DEFAULT 1.5 NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "founder_status_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "giveaway_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"total_entries" integer DEFAULT 0 NOT NULL,
	"trade_entries" integer DEFAULT 0 NOT NULL,
	"streak_entries" integer DEFAULT 0 NOT NULL,
	"login_entries" integer DEFAULT 0 NOT NULL,
	"xp_milestone_entries" integer DEFAULT 0 NOT NULL,
	"referral_entries" integer DEFAULT 0 NOT NULL,
	"referral_bonus_share" real DEFAULT 0 NOT NULL,
	"converted_referrals" integer DEFAULT 0 NOT NULL,
	"drawing_won" boolean DEFAULT false,
	"drawn_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "giveaway_entries_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "leaderboard_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"period" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"rank" integer NOT NULL,
	"gain_percent" real DEFAULT 0 NOT NULL,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"tier" text DEFAULT 'Bronze' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "streaks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_activity_date" timestamp with time zone,
	"multiplier" real DEFAULT 1 NOT NULL,
	"streak_protection_active" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "streaks_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"badge_id" integer NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_badges_user_badge_unique" UNIQUE("user_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "user_challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"challenge_id" integer NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_challenges_user_challenge_unique" UNIQUE("user_id","challenge_id")
);
--> statement-breakpoint
CREATE TABLE "user_xp" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"tier" text DEFAULT 'Bronze' NOT NULL,
	"monthly_xp" integer DEFAULT 0 NOT NULL,
	"weekly_xp" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_xp_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "xp_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reward_distributions" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	"user_id" text NOT NULL,
	"rank" integer NOT NULL,
	"tokens_awarded" real NOT NULL,
	"portfolio_gain" real DEFAULT 0 NOT NULL,
	"tx_hash" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "reward_dist_month_user" UNIQUE("month","user_id")
);
--> statement-breakpoint
CREATE TABLE "token_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "token_config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "token_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" real NOT NULL,
	"description" text NOT NULL,
	"tx_hash" text,
	"from_address" text,
	"to_address" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "travel_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"destination" text,
	"check_in" text,
	"check_out" text,
	"token_amount" real NOT NULL,
	"tx_hash" text,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_id" text NOT NULL,
	"referred_user_id" text NOT NULL,
	"converted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"converted_at" timestamp with time zone,
	CONSTRAINT "referrals_referred_user_id_unique" UNIQUE("referred_user_id")
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"message" text NOT NULL,
	"rating" integer NOT NULL,
	"approved" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "alert_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"alert_id" integer,
	"symbol" text NOT NULL,
	"alert_type" text NOT NULL,
	"triggered_value" real,
	"message" text,
	"read" boolean DEFAULT false,
	"triggered_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"symbol" text NOT NULL,
	"alert_type" text NOT NULL,
	"threshold" real,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"event" text NOT NULL,
	"properties" jsonb,
	"session_id" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"category" text DEFAULT 'general' NOT NULL,
	"admin_response" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "paper_options_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"symbol" text NOT NULL,
	"option_type" text NOT NULL,
	"strike" real NOT NULL,
	"expiration" text NOT NULL,
	"contracts" integer DEFAULT 0 NOT NULL,
	"avg_premium" real DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "paper_options_trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"symbol" text NOT NULL,
	"option_type" text NOT NULL,
	"strike" real NOT NULL,
	"expiration" text NOT NULL,
	"side" text NOT NULL,
	"contracts" integer NOT NULL,
	"premium" real NOT NULL,
	"total_cost" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "paper_portfolios" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"cash_balance" real DEFAULT 100000 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "paper_portfolios_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "paper_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"symbol" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"avg_cost" real DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "paper_trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"quantity" integer NOT NULL,
	"price" real NOT NULL,
	"total_cost" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "virtual_cash_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"stripe_session_id" text NOT NULL,
	"amount_paid_cents" integer NOT NULL,
	"virtual_amount_credited" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "virtual_cash_purchases_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
--> statement-breakpoint
CREATE TABLE "email_subscribers" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"preference" text DEFAULT 'tips' NOT NULL,
	"drip_stage" integer DEFAULT 0 NOT NULL,
	"subscribed" boolean DEFAULT true NOT NULL,
	"unsubscribe_token" text NOT NULL,
	"converted" boolean DEFAULT false NOT NULL,
	"next_send_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "email_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "simulation_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"is_first_run" boolean DEFAULT false NOT NULL,
	"xp_awarded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wealth_milestone_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"milestone_threshold" integer NOT NULL,
	"milestone_key" text NOT NULL,
	"projected_year" integer,
	"celebrated" boolean DEFAULT false NOT NULL,
	"achieved_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "wealth_milestone_user_key_unique" UNIQUE("user_id","milestone_key")
);
--> statement-breakpoint
CREATE TABLE "wealth_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"annual_income" real DEFAULT 60000 NOT NULL,
	"monthly_expenses" real DEFAULT 3000 NOT NULL,
	"savings_rate" real DEFAULT 10 NOT NULL,
	"current_savings" real DEFAULT 0 NOT NULL,
	"monthly_investment" real DEFAULT 500 NOT NULL,
	"expected_return_rate" real DEFAULT 7 NOT NULL,
	"inflation_rate" real DEFAULT 3 NOT NULL,
	"time_horizon_years" integer DEFAULT 30 NOT NULL,
	"risk_tolerance" text DEFAULT 'moderate' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "wealth_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "wealth_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"snapshot_label" text DEFAULT 'Default' NOT NULL,
	"savings_rate" real NOT NULL,
	"monthly_investment" real NOT NULL,
	"expected_return_rate" real NOT NULL,
	"time_horizon_years" integer NOT NULL,
	"projected_net_worth" real NOT NULL,
	"projection_data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "timeline_comparisons" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"timeline_a_id" integer NOT NULL,
	"timeline_b_id" integer NOT NULL,
	"delta_net_worth_5yr" real,
	"delta_net_worth_10yr" real,
	"delta_net_worth_20yr" real,
	"delta_stress" real,
	"delta_opportunity" real,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "timeline_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"timeline_id" integer NOT NULL,
	"horizon" text NOT NULL,
	"projected_net_worth" real NOT NULL,
	"savings_accumulated" real NOT NULL,
	"debt_remaining" real NOT NULL,
	"investment_value" real NOT NULL,
	"stability_score" real NOT NULL,
	"stress_index" real NOT NULL,
	"opportunity_score" real NOT NULL,
	"milestones" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "timelines" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text DEFAULT 'My Timeline' NOT NULL,
	"annotation" text,
	"monthly_income" real DEFAULT 5000 NOT NULL,
	"savings_rate" real DEFAULT 0.15 NOT NULL,
	"monthly_debt" real DEFAULT 500 NOT NULL,
	"investment_rate" real DEFAULT 0.07 NOT NULL,
	"current_net_worth" real DEFAULT 0 NOT NULL,
	"emergency_fund_months" real DEFAULT 0 NOT NULL,
	"is_baseline" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_identity_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"stage" text DEFAULT 'Aware' NOT NULL,
	"simulations_run" integer DEFAULT 0 NOT NULL,
	"snapshots_saved" integer DEFAULT 0 NOT NULL,
	"scenarios_explored" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_identity_stages_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "coaching_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_type" text DEFAULT 'nudge' NOT NULL,
	"user_message" text,
	"coach_response" text NOT NULL,
	"context_snapshot" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_action_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"habit_id" integer NOT NULL,
	"xp_awarded" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "habit_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"xp_reward" integer DEFAULT 25 NOT NULL,
	"icon" text DEFAULT 'Target' NOT NULL,
	"difficulty" text DEFAULT 'easy' NOT NULL,
	"linked_habit" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "habit_definitions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_habits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"habit_id" integer NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"total_completions" integer DEFAULT 0 NOT NULL,
	"last_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_habits_user_habit_unique" UNIQUE("user_id","habit_id")
);
--> statement-breakpoint
CREATE TABLE "weekly_coaching_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"week_start" timestamp with time zone NOT NULL,
	"summary" text NOT NULL,
	"top_wins" jsonb DEFAULT '[]'::jsonb,
	"suggested_actions" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "micro_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"context" text NOT NULL,
	"helpful" boolean NOT NULL,
	"comment" text,
	"session_id" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connected_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text,
	"provider_email" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"scopes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"last_sync_at" timestamp with time zone,
	"connected_at" timestamp with time zone DEFAULT now(),
	"disconnected_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "api_health_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"endpoint" text NOT NULL,
	"response_time_ms" integer,
	"status_code" integer,
	"timestamp" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_url" text NOT NULL,
	"issue_type" text NOT NULL,
	"severity" text DEFAULT 'LOW' NOT NULL,
	"screenshot_url" text,
	"component_name" text,
	"error_message" text,
	"session_id" text,
	"timestamp" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crawl_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone,
	"total_pages" integer DEFAULT 0,
	"total_issues" integer DEFAULT 0,
	"total_regressions" integer DEFAULT 0,
	"triggered_by" text DEFAULT 'api',
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "dashboard_module_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_id" text NOT NULL,
	"occupation_id" text NOT NULL,
	"is_business_owner" boolean DEFAULT false NOT NULL,
	"module_ids" jsonb NOT NULL,
	"previous_module_ids" jsonb,
	"changed" boolean DEFAULT false NOT NULL,
	"trigger" text DEFAULT 'auto' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ux_signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_url" text NOT NULL,
	"signal_type" text NOT NULL,
	"element_selector" text,
	"metadata" jsonb,
	"session_id" text,
	"timestamp" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "visual_baselines" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_url" text NOT NULL,
	"viewport" text DEFAULT 'desktop' NOT NULL,
	"screenshot_path" text NOT NULL,
	"baseline_path" text,
	"diff_path" text,
	"diff_percent" real DEFAULT 0,
	"is_regression" boolean DEFAULT false,
	"approved_at" timestamp with time zone,
	"is_current" boolean DEFAULT true,
	"crawl_run_id" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"stripe_customer_id" text,
	"user_id" text,
	"tier_before" text,
	"tier_after" text,
	"status" text DEFAULT 'success' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "webhook_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "balance_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"transaction_type" text NOT NULL,
	"amount" real NOT NULL,
	"balance_before" real NOT NULL,
	"balance_after" real NOT NULL,
	"source" text NOT NULL,
	"reference_id" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"subscription_json" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_content_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_date" date NOT NULL,
	"platform" text NOT NULL,
	"content" text NOT NULL,
	"theme" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "resume_education" ADD CONSTRAINT "resume_education_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_experiences" ADD CONSTRAINT "resume_experiences_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gigs" ADD CONSTRAINT "gigs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_spins" ADD CONSTRAINT "daily_spins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "founder_status" ADD CONSTRAINT "founder_status_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaway_entries" ADD CONSTRAINT "giveaway_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_snapshots" ADD CONSTRAINT "leaderboard_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_challenges" ADD CONSTRAINT "user_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_challenges" ADD CONSTRAINT "user_challenges_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_xp" ADD CONSTRAINT "user_xp_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_distributions" ADD CONSTRAINT "reward_distributions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_transactions" ADD CONSTRAINT "token_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_bookings" ADD CONSTRAINT "travel_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_options_positions" ADD CONSTRAINT "paper_options_positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_options_trades" ADD CONSTRAINT "paper_options_trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_portfolios" ADD CONSTRAINT "paper_portfolios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_positions" ADD CONSTRAINT "paper_positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_trades" ADD CONSTRAINT "paper_trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_cash_purchases" ADD CONSTRAINT "virtual_cash_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_runs" ADD CONSTRAINT "simulation_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wealth_milestone_achievements" ADD CONSTRAINT "wealth_milestone_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wealth_profiles" ADD CONSTRAINT "wealth_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wealth_snapshots" ADD CONSTRAINT "wealth_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_comparisons" ADD CONSTRAINT "timeline_comparisons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_comparisons" ADD CONSTRAINT "timeline_comparisons_timeline_a_id_timelines_id_fk" FOREIGN KEY ("timeline_a_id") REFERENCES "public"."timelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_comparisons" ADD CONSTRAINT "timeline_comparisons_timeline_b_id_timelines_id_fk" FOREIGN KEY ("timeline_b_id") REFERENCES "public"."timelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_results" ADD CONSTRAINT "timeline_results_timeline_id_timelines_id_fk" FOREIGN KEY ("timeline_id") REFERENCES "public"."timelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_identity_stages" ADD CONSTRAINT "user_identity_stages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_action_completions" ADD CONSTRAINT "daily_action_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_action_completions" ADD CONSTRAINT "daily_action_completions_habit_id_habit_definitions_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habit_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_habits" ADD CONSTRAINT "user_habits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_habits" ADD CONSTRAINT "user_habits_habit_id_habit_definitions_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habit_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_coaching_summaries" ADD CONSTRAINT "weekly_coaching_summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_transactions" ADD CONSTRAINT "balance_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_gigs_user_id" ON "gigs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_daily_spins_user_id" ON "daily_spins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_referrals_referrer_id" ON "referrals" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX "idx_testimonials_user_id" ON "testimonials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_alert_history_user_id" ON "alert_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_alerts_user_id" ON "alerts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_analytics_event" ON "analytics_events" USING btree ("event");--> statement-breakpoint
CREATE INDEX "idx_analytics_created_at" ON "analytics_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_analytics_user_id" ON "analytics_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_feedback_user_id" ON "user_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_feedback_created_at" ON "user_feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_paper_options_positions_user_id" ON "paper_options_positions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_paper_options_trades_user_id" ON "paper_options_trades" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_paper_positions_user_id" ON "paper_positions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_paper_trades_user_id" ON "paper_trades" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_virtual_cash_purchases_user_id" ON "virtual_cash_purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_micro_feedback_context" ON "micro_feedback" USING btree ("context");--> statement-breakpoint
CREATE INDEX "idx_micro_feedback_user_id" ON "micro_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_micro_feedback_created_at" ON "micro_feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_api_health_endpoint" ON "api_health_checks" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "idx_api_health_timestamp" ON "api_health_checks" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_audit_log_issue_type" ON "audit_log" USING btree ("issue_type");--> statement-breakpoint
CREATE INDEX "idx_audit_log_severity" ON "audit_log" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_audit_log_timestamp" ON "audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_audit_log_page_url" ON "audit_log" USING btree ("page_url");--> statement-breakpoint
CREATE INDEX "idx_crawl_runs_status" ON "crawl_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_crawl_runs_started_at" ON "crawl_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_dashboard_module_events_clerk_id" ON "dashboard_module_events" USING btree ("clerk_id");--> statement-breakpoint
CREATE INDEX "idx_dashboard_module_events_created_at" ON "dashboard_module_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ux_signals_signal_type" ON "ux_signals" USING btree ("signal_type");--> statement-breakpoint
CREATE INDEX "idx_ux_signals_page_url" ON "ux_signals" USING btree ("page_url");--> statement-breakpoint
CREATE INDEX "idx_ux_signals_timestamp" ON "ux_signals" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_visual_baselines_page_url" ON "visual_baselines" USING btree ("page_url");--> statement-breakpoint
CREATE INDEX "idx_visual_baselines_is_current" ON "visual_baselines" USING btree ("is_current");--> statement-breakpoint
CREATE INDEX "idx_visual_baselines_is_regression" ON "visual_baselines" USING btree ("is_regression");--> statement-breakpoint
CREATE INDEX "idx_balance_transactions_user_id" ON "balance_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_balance_transactions_created_at" ON "balance_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_user_id_endpoint_key" ON "push_subscriptions" USING btree ("user_id","endpoint");--> statement-breakpoint
CREATE INDEX "idx_push_subscriptions_user_id" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_daily_content_batch_date" ON "daily_content_posts" USING btree ("batch_date");--> statement-breakpoint
CREATE INDEX "idx_daily_content_status" ON "daily_content_posts" USING btree ("status");