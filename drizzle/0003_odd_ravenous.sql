CREATE TABLE "household" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"timezone" text NOT NULL,
	"week_start_day" integer NOT NULL,
	"planning_reminder_time" time NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "household_week_start_day_check" CHECK ("household"."week_start_day" between 0 and 6)
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"sex" text NOT NULL,
	"age_band" text,
	"date_of_birth" date,
	"kcal_target" integer,
	"protein_target_g" numeric(4, 1),
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "member_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "member_sex_check" CHECK ("member"."sex" in ('male', 'female')),
	CONSTRAINT "member_age_check" CHECK ("member"."age_band" is not null or "member"."date_of_birth" is not null)
);
--> statement-breakpoint
CREATE TABLE "meal_slot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"time" time NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_meal_slot" (
	"member_id" uuid NOT NULL,
	"meal_slot_id" uuid NOT NULL,
	CONSTRAINT "member_meal_slot_member_id_meal_slot_id_pk" PRIMARY KEY("member_id","meal_slot_id")
);
--> statement-breakpoint
CREATE TABLE "shopping_trip" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"time" time NOT NULL,
	CONSTRAINT "shopping_trip_day_of_week_check" CHECK ("shopping_trip"."day_of_week" between 0 and 6)
);
--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_slot" ADD CONSTRAINT "meal_slot_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_meal_slot" ADD CONSTRAINT "member_meal_slot_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_meal_slot" ADD CONSTRAINT "member_meal_slot_meal_slot_id_meal_slot_id_fk" FOREIGN KEY ("meal_slot_id") REFERENCES "public"."meal_slot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_trip" ADD CONSTRAINT "shopping_trip_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_household_id_idx" ON "member" USING btree ("household_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meal_slot_household_name_idx" ON "meal_slot" USING btree ("household_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "meal_slot_household_time_idx" ON "meal_slot" USING btree ("household_id","time");--> statement-breakpoint
CREATE INDEX "member_meal_slot_meal_slot_id_idx" ON "member_meal_slot" USING btree ("meal_slot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shopping_trip_household_day_time_idx" ON "shopping_trip" USING btree ("household_id","day_of_week","time");