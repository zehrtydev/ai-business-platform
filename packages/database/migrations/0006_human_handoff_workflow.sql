ALTER TABLE "conversations" DROP CONSTRAINT "conversations_ai_state_valid";--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_ai_state_valid" CHECK ((
        (
          "conversations"."status" = 'OPEN'
          and (
            (
              "conversations"."ai_enabled" = true
              and "conversations"."assigned_to_user_id" is null
            )
            or (
              "conversations"."ai_enabled" = false
              and "conversations"."assigned_to_user_id" is not null
            )
          )
        )
        or (
          "conversations"."status" = 'HUMAN_REQUIRED'
          and "conversations"."ai_enabled" = false
          and "conversations"."assigned_to_user_id" is null
        )
        or (
          "conversations"."status" = 'CLOSED'
          and "conversations"."ai_enabled" = false
          and "conversations"."assigned_to_user_id" is null
        )
      ));