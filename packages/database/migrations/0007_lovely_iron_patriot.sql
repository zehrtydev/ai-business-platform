ALTER TABLE "services" ADD COLUMN "price_minor_units" integer;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "currency_code" text;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_price_minor_units_non_negative" CHECK ("services"."price_minor_units" is null or "services"."price_minor_units" >= 0);--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_price_currency_consistent" CHECK ((
        ("services"."price_minor_units" is null and "services"."currency_code" is null)
        or
        (
          "services"."price_minor_units" is not null
          and "services"."currency_code" is not null
          and "services"."currency_code" ~ '^[A-Z]{3}$'
        )
      ));