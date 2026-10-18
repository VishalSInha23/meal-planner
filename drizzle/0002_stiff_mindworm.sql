ALTER TABLE "user_preference" DROP CONSTRAINT "user_preference_theme_check";--> statement-breakpoint
ALTER TABLE "user_preference" ALTER COLUMN "theme" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_preference" ALTER COLUMN "theme" DROP NOT NULL;--> statement-breakpoint
UPDATE "user_preference" SET "theme" = NULL WHERE "theme" = 'system';--> statement-breakpoint
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_theme_check" CHECK ("user_preference"."theme" in ('light', 'dark'));