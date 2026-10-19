ALTER TABLE "user_preference" ADD COLUMN "weight_unit" text DEFAULT 'kg' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preference" ADD COLUMN "height_unit" text DEFAULT 'cm' NOT NULL;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "height_cm" numeric(4, 1);--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "weight_kg" numeric(4, 1);--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "activity_level" text;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "goal" text;--> statement-breakpoint
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_weight_unit_check" CHECK ("user_preference"."weight_unit" in ('kg', 'lb'));--> statement-breakpoint
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_height_unit_check" CHECK ("user_preference"."height_unit" in ('cm', 'ft_in'));--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_activity_level_check" CHECK ("member"."activity_level" in ('sedentary', 'light', 'moderate', 'active', 'very_active'));--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_goal_check" CHECK ("member"."goal" in ('lose', 'maintain', 'gain'));