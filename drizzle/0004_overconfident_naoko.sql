CREATE TABLE "ingredient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dish" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kcal_per_serving" integer,
	"protein_g_per_serving" numeric(4, 1),
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dish_kcal_check" CHECK ("dish"."kcal_per_serving" is null or "dish"."kcal_per_serving" between 0 and 5000),
	CONSTRAINT "dish_protein_check" CHECK ("dish"."protein_g_per_serving" is null or "dish"."protein_g_per_serving" between 0 and 300)
);
--> statement-breakpoint
CREATE TABLE "dish_ingredient" (
	"dish_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	CONSTRAINT "dish_ingredient_dish_id_ingredient_id_pk" PRIMARY KEY("dish_id","ingredient_id")
);
--> statement-breakpoint
ALTER TABLE "ingredient" ADD CONSTRAINT "ingredient_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish" ADD CONSTRAINT "dish_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish_ingredient" ADD CONSTRAINT "dish_ingredient_dish_id_dish_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dish"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish_ingredient" ADD CONSTRAINT "dish_ingredient_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_household_name_idx" ON "ingredient" USING btree ("household_id",lower(trim("name")));--> statement-breakpoint
CREATE UNIQUE INDEX "dish_household_name_idx" ON "dish" USING btree ("household_id",lower(trim("name")));--> statement-breakpoint
CREATE INDEX "dish_ingredient_ingredient_id_idx" ON "dish_ingredient" USING btree ("ingredient_id");