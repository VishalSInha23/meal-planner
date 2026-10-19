CREATE TABLE "grocery_check" (
	"household_id" uuid NOT NULL,
	"list_key" text NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"checked_by_member_id" uuid,
	"checked_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grocery_check_household_id_list_key_ingredient_id_pk" PRIMARY KEY("household_id","list_key","ingredient_id")
);
--> statement-breakpoint
ALTER TABLE "grocery_check" ADD CONSTRAINT "grocery_check_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_check" ADD CONSTRAINT "grocery_check_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_check" ADD CONSTRAINT "grocery_check_checked_by_member_id_member_id_fk" FOREIGN KEY ("checked_by_member_id") REFERENCES "public"."member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grocery_check_ingredient_id_idx" ON "grocery_check" USING btree ("ingredient_id");