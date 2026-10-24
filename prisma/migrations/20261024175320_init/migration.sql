-- CreateTable
CREATE TABLE "users" (
    "firebase_uid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("firebase_uid")
);

-- CreateTable
CREATE TABLE "wardrobe_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL,
    "formality" TEXT NOT NULL,
    "warmth" INTEGER NOT NULL,
    "weather_tags" TEXT[],
    "color" TEXT NOT NULL,
    "color_hex" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "image_url" TEXT,
    "icon_name" TEXT,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wardrobe_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "warmth_lean" TEXT NOT NULL DEFAULT 'balanced',
    "formality_lean" INTEGER NOT NULL DEFAULT 0,
    "commute_comfort_priority" BOOLEAN NOT NULL DEFAULT true,
    "rain_tolerance_threshold" INTEGER NOT NULL DEFAULT 30,
    "favorite_colors" TEXT[],
    "disliked_materials" TEXT[],
    "feedback_count" INTEGER NOT NULL DEFAULT 0,
    "weights" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfit_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "meeting_title" TEXT NOT NULL,
    "meeting_location" TEXT NOT NULL,
    "meeting_formality" TEXT NOT NULL,
    "worn_at" TIMESTAMP(3) NOT NULL,
    "item_ids" TEXT[],
    "feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfit_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopper_cache" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gaps_hash" TEXT NOT NULL,
    "recommendations" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopper_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wardrobe_items_user_id_idx" ON "wardrobe_items"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE INDEX "outfit_history_user_id_idx" ON "outfit_history"("user_id");

-- CreateIndex
CREATE INDEX "shopper_cache_user_id_gaps_hash_idx" ON "shopper_cache"("user_id", "gaps_hash");

-- AddForeignKey
ALTER TABLE "wardrobe_items" ADD CONSTRAINT "wardrobe_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("firebase_uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("firebase_uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_history" ADD CONSTRAINT "outfit_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("firebase_uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopper_cache" ADD CONSTRAINT "shopper_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("firebase_uid") ON DELETE CASCADE ON UPDATE CASCADE;
