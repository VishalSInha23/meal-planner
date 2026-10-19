CREATE TABLE "meal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"date" date NOT NULL,
	"meal_slot_id" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_dish" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_id" uuid NOT NULL,
	"dish_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_dish_member" (
	"meal_dish_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	CONSTRAINT "meal_dish_member_meal_dish_id_member_id_pk" PRIMARY KEY("meal_dish_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "week_plan" (
	"household_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"planned_at" timestamp DEFAULT now() NOT NULL,
	"planned_by_member_id" uuid,
	CONSTRAINT "week_plan_household_id_week_start_pk" PRIMARY KEY("household_id","week_start")
);
--> statement-breakpoint
ALTER TABLE "meal" ADD CONSTRAINT "meal_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal" ADD CONSTRAINT "meal_meal_slot_id_meal_slot_id_fk" FOREIGN KEY ("meal_slot_id") REFERENCES "public"."meal_slot"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_dish" ADD CONSTRAINT "meal_dish_meal_id_meal_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_dish" ADD CONSTRAINT "meal_dish_dish_id_dish_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dish"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_dish_member" ADD CONSTRAINT "meal_dish_member_meal_dish_id_meal_dish_id_fk" FOREIGN KEY ("meal_dish_id") REFERENCES "public"."meal_dish"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_dish_member" ADD CONSTRAINT "meal_dish_member_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week_plan" ADD CONSTRAINT "week_plan_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week_plan" ADD CONSTRAINT "week_plan_planned_by_member_id_member_id_fk" FOREIGN KEY ("planned_by_member_id") REFERENCES "public"."member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "meal_household_date_slot_idx" ON "meal" USING btree ("household_id","date","meal_slot_id");--> statement-breakpoint
CREATE INDEX "meal_meal_slot_id_idx" ON "meal" USING btree ("meal_slot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meal_dish_meal_dish_idx" ON "meal_dish" USING btree ("meal_id","dish_id");--> statement-breakpoint
CREATE INDEX "meal_dish_dish_id_idx" ON "meal_dish" USING btree ("dish_id");--> statement-breakpoint
CREATE INDEX "meal_dish_member_member_id_idx" ON "meal_dish_member" USING btree ("member_id");