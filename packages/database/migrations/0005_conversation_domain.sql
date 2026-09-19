CREATE TYPE "public"."conversation_status" AS ENUM('OPEN', 'HUMAN_REQUIRED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('INBOUND', 'OUTBOUND');--> statement-breakpoint
CREATE TYPE "public"."message_sender" AS ENUM('CONTACT', 'AI', 'HUMAN');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('TEXT');--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"status" "conversation_status" DEFAULT 'OPEN' NOT NULL,
	"assigned_to_user_id" uuid,
	"ai_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_business_id_id_unique" UNIQUE("business_id","id"),
	CONSTRAINT "conversations_channel_not_blank" CHECK (length(trim("conversations"."channel")) > 0),
	CONSTRAINT "conversations_ai_state_valid" CHECK ("conversations"."status" = 'OPEN' or "conversations"."ai_enabled" = false)
);
--> statement-breakpoint
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"direction" "message_direction" NOT NULL,
	"sender" "message_sender" NOT NULL,
	"sender_user_id" uuid,
	"content" text NOT NULL,
	"message_type" "message_type" DEFAULT 'TEXT' NOT NULL,
	"provider_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_business_id_id_unique" UNIQUE("business_id","id"),
	CONSTRAINT "messages_content_not_blank" CHECK (length(trim("messages"."content")) > 0),
	CONSTRAINT "messages_provider_message_id_not_blank" CHECK ("messages"."provider_message_id" is null or length(trim("messages"."provider_message_id")) > 0),
	CONSTRAINT "messages_direction_sender_valid" CHECK (("messages"."direction" = 'INBOUND' and "messages"."sender" = 'CONTACT')
        or ("messages"."direction" = 'OUTBOUND' and "messages"."sender" in ('AI', 'HUMAN'))),
	CONSTRAINT "messages_human_sender_user_valid" CHECK (("messages"."sender" = 'HUMAN' and "messages"."sender_user_id" is not null)
        or ("messages"."sender" <> 'HUMAN' and "messages"."sender_user_id" is null))
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_business_contact_fk" FOREIGN KEY ("business_id","contact_id") REFERENCES "public"."contacts"("business_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_business_assignee_fk" FOREIGN KEY ("business_id","assigned_to_user_id") REFERENCES "public"."business_memberships"("business_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_business_conversation_fk" FOREIGN KEY ("business_id","conversation_id") REFERENCES "public"."conversations"("business_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_business_sender_user_fk" FOREIGN KEY ("business_id","sender_user_id") REFERENCES "public"."business_memberships"("business_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversations_business_status_updated_idx" ON "conversations" USING btree ("business_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "conversations_business_contact_updated_idx" ON "conversations" USING btree ("business_id","contact_id","updated_at");--> statement-breakpoint
CREATE INDEX "conversations_business_assignee_idx" ON "conversations" USING btree ("business_id","assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "messages_business_conversation_created_idx" ON "messages" USING btree ("business_id","conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_business_sender_user_idx" ON "messages" USING btree ("business_id","sender_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_business_provider_message_uidx" ON "messages" USING btree ("business_id","provider_message_id") WHERE "messages"."provider_message_id" is not null;