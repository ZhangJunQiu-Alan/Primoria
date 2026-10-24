ALTER TABLE "media_assets" ALTER COLUMN "data_base64" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "storage_path" text;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_bytes_location_check" CHECK ("media_assets"."data_base64" is not null or "media_assets"."storage_path" is not null);