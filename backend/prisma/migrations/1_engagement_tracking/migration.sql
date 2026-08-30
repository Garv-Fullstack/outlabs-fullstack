-- CreateEnum
CREATE TYPE "EngagementEventType" AS ENUM ('OPENED', 'CLICKED');

-- AlterTable
ALTER TABLE "email_deliveries" ADD COLUMN "tracking_token" VARCHAR(255);
UPDATE "email_deliveries" SET "tracking_token" = gen_random_uuid()::text WHERE "tracking_token" IS NULL;
ALTER TABLE "email_deliveries" ALTER COLUMN "tracking_token" SET NOT NULL;

-- CreateTable
CREATE TABLE "email_engagement_events" (
    "id" UUID NOT NULL,
    "delivery_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_type" "EngagementEventType" NOT NULL,
    "tracked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "destination_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_engagement_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_engagement_events_delivery_id_idx" ON "email_engagement_events"("delivery_id");

-- CreateIndex
CREATE INDEX "email_engagement_events_campaign_id_event_type_idx" ON "email_engagement_events"("campaign_id", "event_type");

-- CreateIndex
CREATE INDEX "email_engagement_events_user_id_tracked_at_idx" ON "email_engagement_events"("user_id", "tracked_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_deliveries_tracking_token_key" ON "email_deliveries"("tracking_token");

-- AddForeignKey
ALTER TABLE "email_engagement_events" ADD CONSTRAINT "email_engagement_events_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "email_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_engagement_events" ADD CONSTRAINT "email_engagement_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "email_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_engagement_events" ADD CONSTRAINT "email_engagement_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
