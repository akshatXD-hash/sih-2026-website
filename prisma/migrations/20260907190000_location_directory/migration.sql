CREATE TABLE "search_places" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "name_key" TEXT NOT NULL,
  "aliases" TEXT[] NOT NULL DEFAULT '{}',
  "district" TEXT,
  "state" TEXT,
  "pincode" TEXT,
  "kind" TEXT NOT NULL,
  "population" INTEGER NOT NULL DEFAULT 0,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "source_url" TEXT NOT NULL,
  "imported_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "search_places_coordinates" CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
);
CREATE INDEX "search_places_name_key_idx" ON "search_places" ("name_key" text_pattern_ops);
CREATE INDEX "search_places_aliases_idx" ON "search_places" USING GIN ("aliases");
CREATE INDEX "search_places_pincode_idx" ON "search_places" ("pincode");

CREATE TABLE "bank_directory" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "address_line" TEXT,
  "district" TEXT,
  "state" TEXT,
  "pincode" TEXT,
  "phone" TEXT,
  "source_url" TEXT NOT NULL,
  "imported_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "location" geography(Point, 4326) NOT NULL
);
CREATE INDEX "bank_directory_location_gist_idx" ON "bank_directory" USING GIST ("location");
