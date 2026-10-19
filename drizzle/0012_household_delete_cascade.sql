ALTER TABLE "dish_ingredient" DROP CONSTRAINT "dish_ingredient_ingredient_id_ingredient_id_fk";
--> statement-breakpoint
ALTER TABLE "meal" DROP CONSTRAINT "meal_meal_slot_id_meal_slot_id_fk";
--> statement-breakpoint
ALTER TABLE "dish_ingredient" ADD CONSTRAINT "dish_ingredient_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal" ADD CONSTRAINT "meal_meal_slot_id_meal_slot_id_fk" FOREIGN KEY ("meal_slot_id") REFERENCES "public"."meal_slot"("id") ON DELETE cascade ON UPDATE no action;