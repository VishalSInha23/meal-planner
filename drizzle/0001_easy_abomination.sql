CREATE TABLE "user_preference" (
	"user_id" text PRIMARY KEY NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"font_style" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preference_theme_check" CHECK ("user_preference"."theme" in ('system', 'light', 'dark')),
	CONSTRAINT "user_preference_font_style_check" CHECK ("user_preference"."font_style" in ('serif', 'sans'))
);
--> statement-breakpoint
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;