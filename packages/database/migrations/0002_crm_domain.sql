CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text,
	"phone" text,
	"email" text,
	"source" text NOT NULL,
	"last_interaction_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_business_id_id_unique" UNIQUE("business_id","id"),
	CONSTRAINT "contacts_source_not_blank" CHECK (length(trim("contacts"."source")) > 0),
	CONSTRAINT "contacts_name_not_blank" CHECK ("contacts"."name" is null or length(trim("contacts"."name")) > 0),
	CONSTRAINT "contacts_phone_not_blank" CHECK ("contacts"."phone" is null or length(trim("contacts"."phone")) > 0),
	CONSTRAINT "contacts_email_not_blank" CHECK ("contacts"."email" is null or length(trim("contacts"."email")) > 0),
	CONSTRAINT "contacts_has_identity" CHECK ("contacts"."name" is not null or "contacts"."phone" is not null or "contacts"."email" is not null)
);
--> statement-breakpoint
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"pipeline_stage_id" uuid NOT NULL,
	"service_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_business_id_id_unique" UNIQUE("business_id","id")
);
--> statement-breakpoint
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pipeline_stages_business_pipeline_id_unique" UNIQUE("business_id","pipeline_id","id"),
	CONSTRAINT "pipeline_stages_business_pipeline_position_unique" UNIQUE("business_id","pipeline_id","position"),
	CONSTRAINT "pipeline_stages_name_not_blank" CHECK (length(trim("pipeline_stages"."name")) > 0),
	CONSTRAINT "pipeline_stages_position_positive" CHECK ("pipeline_stages"."position" > 0)
);
--> statement-breakpoint
ALTER TABLE "pipeline_stages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pipelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pipelines_business_id_id_unique" UNIQUE("business_id","id"),
	CONSTRAINT "pipelines_name_not_blank" CHECK (length(trim("pipelines"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "pipelines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_business_contact_fk" FOREIGN KEY ("business_id","contact_id") REFERENCES "public"."contacts"("business_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_business_pipeline_stage_fk" FOREIGN KEY ("business_id","pipeline_id","pipeline_stage_id") REFERENCES "public"."pipeline_stages"("business_id","pipeline_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_business_service_fk" FOREIGN KEY ("business_id","service_id") REFERENCES "public"."services"("business_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_business_pipeline_fk" FOREIGN KEY ("business_id","pipeline_id") REFERENCES "public"."pipelines"("business_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contacts_business_id_idx" ON "contacts" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "contacts_business_phone_idx" ON "contacts" USING btree ("business_id","phone");--> statement-breakpoint
CREATE INDEX "contacts_business_email_idx" ON "contacts" USING btree ("business_id","email");--> statement-breakpoint
CREATE INDEX "leads_business_contact_idx" ON "leads" USING btree ("business_id","contact_id");--> statement-breakpoint
CREATE INDEX "leads_business_pipeline_stage_idx" ON "leads" USING btree ("business_id","pipeline_id","pipeline_stage_id");--> statement-breakpoint
CREATE INDEX "leads_business_service_idx" ON "leads" USING btree ("business_id","service_id");--> statement-breakpoint
CREATE INDEX "pipelines_business_id_idx" ON "pipelines" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pipelines_business_name_uidx" ON "pipelines" USING btree ("business_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "pipelines_one_default_per_business_uidx" ON "pipelines" USING btree ("business_id") WHERE "pipelines"."is_default" = true;