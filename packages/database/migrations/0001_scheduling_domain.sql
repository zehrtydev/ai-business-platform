CREATE TABLE "availability_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"staff_member_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_rules_day_of_week_range" CHECK ("availability_rules"."day_of_week" between 1 and 7),
	CONSTRAINT "availability_rules_valid_time_range" CHECK ("availability_rules"."start_time" < "availability_rules"."end_time")
);
--> statement-breakpoint
ALTER TABLE "availability_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration_minutes" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_business_id_id_unique" UNIQUE("business_id","id"),
	CONSTRAINT "services_name_not_blank" CHECK (length(trim("services"."name")) > 0),
	CONSTRAINT "services_duration_minutes_positive" CHECK ("services"."duration_minutes" > 0)
);
--> statement-breakpoint
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "staff_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_members_business_id_id_unique" UNIQUE("business_id","id"),
	CONSTRAINT "staff_members_name_not_blank" CHECK (length(trim("staff_members"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "staff_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "staff_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"staff_member_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_services" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "timezone" text NOT NULL;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_business_staff_fk" FOREIGN KEY ("business_id","staff_member_id") REFERENCES "public"."staff_members"("business_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_business_staff_fk" FOREIGN KEY ("business_id","staff_member_id") REFERENCES "public"."staff_members"("business_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_business_service_fk" FOREIGN KEY ("business_id","service_id") REFERENCES "public"."services"("business_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_rules_business_staff_day_idx" ON "availability_rules" USING btree ("business_id","staff_member_id","day_of_week");--> statement-breakpoint
CREATE INDEX "services_business_id_idx" ON "services" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "staff_members_business_id_idx" ON "staff_members" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_services_business_staff_service_uidx" ON "staff_services" USING btree ("business_id","staff_member_id","service_id");--> statement-breakpoint
CREATE INDEX "staff_services_business_service_idx" ON "staff_services" USING btree ("business_id","service_id");--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_timezone_not_blank" CHECK (length(trim("businesses"."timezone")) > 0);