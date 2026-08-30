-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SCHEDULED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED', 'RATE_LIMITED_DELAYED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'ENQUEUED', 'FAILED');

-- CreateEnum
CREATE TYPE "SlackStatus" AS ENUM ('ACTIVE', 'DISCONNECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "google_id" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "avatar_url" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sender_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "smtp_host" VARCHAR(255) NOT NULL DEFAULT 'smtp.ethereal.email',
    "smtp_port" INTEGER NOT NULL DEFAULT 587,
    "smtp_user" VARCHAR(255) NOT NULL,
    "smtp_pass_encrypted" TEXT NOT NULL,
    "hourly_limit" INTEGER NOT NULL DEFAULT 100,
    "min_delay_seconds" INTEGER NOT NULL DEFAULT 2,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sender_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_campaigns" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "body_text" TEXT NOT NULL,
    "body_html" TEXT,
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "scheduled_start_time" TIMESTAMPTZ NOT NULL,
    "delay_between_emails_seconds" INTEGER NOT NULL DEFAULT 2,
    "hourly_limit" INTEGER NOT NULL DEFAULT 100,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_deliveries" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "recipient_email" VARCHAR(255) NOT NULL,
    "recipient_name" VARCHAR(255),
    "idempotency_key" VARCHAR(255) NOT NULL,
    "bullmq_job_id" VARCHAR(255),
    "status" "EmailStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_for" TIMESTAMPTZ NOT NULL,
    "sent_at" TIMESTAMPTZ,
    "failed_at" TIMESTAMPTZ,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "ethereal_message_id" VARCHAR(255),
    "ethereal_preview_url" TEXT,
    "indexed_in_es" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "locked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slack_integrations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "slack_team_id" VARCHAR(255) NOT NULL,
    "slack_team_name" VARCHAR(255),
    "slack_channel_id" VARCHAR(255) NOT NULL,
    "slack_channel_name" VARCHAR(255),
    "access_token_enc" TEXT NOT NULL,
    "incoming_webhook_url" TEXT,
    "status" "SlackStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slack_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_events" (
    "id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "hour_bucket" VARCHAR(32) NOT NULL,
    "emails_dispatched" INTEGER NOT NULL,
    "limit_threshold" INTEGER NOT NULL,
    "slack_notified" BOOLEAN NOT NULL DEFAULT false,
    "triggered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sender_accounts_user_id_email_key" ON "sender_accounts"("user_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "email_campaigns_idempotency_key_key" ON "email_campaigns"("idempotency_key");

-- CreateIndex
CREATE INDEX "email_campaigns_user_id_created_at_idx" ON "email_campaigns"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_deliveries_idempotency_key_key" ON "email_deliveries"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "email_deliveries_bullmq_job_id_key" ON "email_deliveries"("bullmq_job_id");

-- CreateIndex
CREATE INDEX "email_deliveries_status_idx" ON "email_deliveries"("status");

-- CreateIndex
CREATE INDEX "email_deliveries_user_id_status_idx" ON "email_deliveries"("user_id", "status");

-- CreateIndex
CREATE INDEX "email_deliveries_sender_id_scheduled_for_idx" ON "email_deliveries"("sender_id", "scheduled_for");

-- CreateIndex
CREATE INDEX "email_deliveries_campaign_id_idx" ON "email_deliveries"("campaign_id");

-- CreateIndex
CREATE INDEX "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "slack_integrations_user_id_key" ON "slack_integrations"("user_id");

-- CreateIndex
CREATE INDEX "rate_limit_events_sender_id_hour_bucket_idx" ON "rate_limit_events"("sender_id", "hour_bucket");

-- AddForeignKey
ALTER TABLE "sender_accounts" ADD CONSTRAINT "sender_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "sender_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "email_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "sender_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_integrations" ADD CONSTRAINT "slack_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_limit_events" ADD CONSTRAINT "rate_limit_events_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "sender_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_limit_events" ADD CONSTRAINT "rate_limit_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
