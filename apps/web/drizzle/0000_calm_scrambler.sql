CREATE TABLE "collected_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" varchar(20) NOT NULL,
	"device_id" varchar(64) NOT NULL,
	"device_name" varchar(100),
	"source_key" varchar(64) NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"title" text,
	"url" text,
	"data" jsonb NOT NULL,
	"collected_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" varchar(20) NOT NULL,
	"items_count" integer NOT NULL,
	"collected_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" varchar(20) NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error" text,
	"title" text,
	"content" text,
	"highlights" jsonb,
	"data_stats" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(20) NOT NULL,
	"email" varchar(255) NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"scope" text NOT NULL,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_collected_items_source_device_key" ON "collected_items" USING btree ("source_type","device_id","source_key");--> statement-breakpoint
CREATE INDEX "idx_collected_items_timestamp" ON "collected_items" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_collected_items_source_type" ON "collected_items" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "idx_collected_items_source_timestamp" ON "collected_items" USING btree ("source_type","timestamp");--> statement-breakpoint
CREATE INDEX "idx_collected_items_device_id" ON "collected_items" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "idx_collection_logs_source_type" ON "collection_logs" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "idx_collection_logs_received_at" ON "collection_logs" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "idx_summaries_period" ON "summaries" USING btree ("period");--> statement-breakpoint
CREATE INDEX "idx_summaries_period_start" ON "summaries" USING btree ("period_start");--> statement-breakpoint
CREATE INDEX "idx_summaries_created_at" ON "summaries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_summaries_status" ON "summaries" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_oauth_tokens_provider_email" ON "oauth_tokens" USING btree ("provider","email");