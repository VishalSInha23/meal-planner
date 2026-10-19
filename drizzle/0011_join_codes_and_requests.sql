CREATE TABLE "join_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"sex" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"decided_at" timestamp,
	"decided_by_member_id" uuid,
	CONSTRAINT "join_request_sex_check" CHECK ("join_request"."sex" in ('male', 'female')),
	CONSTRAINT "join_request_status_check" CHECK ("join_request"."status" in ('pending', 'approved', 'declined', 'cancelled', 'dismissed'))
);
--> statement-breakpoint
CREATE TABLE "join_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"attempted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "join_code" text;--> statement-breakpoint
UPDATE "household" SET "join_code" = upper(substr(md5(random()::text || "id"::text), 1, 8));--> statement-breakpoint
ALTER TABLE "household" ALTER COLUMN "join_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "join_request" ADD CONSTRAINT "join_request_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_request" ADD CONSTRAINT "join_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_request" ADD CONSTRAINT "join_request_decided_by_member_id_member_id_fk" FOREIGN KEY ("decided_by_member_id") REFERENCES "public"."member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_attempt" ADD CONSTRAINT "join_attempt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "join_request_household_id_idx" ON "join_request" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "join_request_user_id_idx" ON "join_request" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "join_request_user_pending_idx" ON "join_request" USING btree ("user_id") WHERE "join_request"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "join_attempt_user_id_attempted_at_idx" ON "join_attempt" USING btree ("user_id","attempted_at");--> statement-breakpoint
ALTER TABLE "household" ADD CONSTRAINT "household_join_code_unique" UNIQUE("join_code");