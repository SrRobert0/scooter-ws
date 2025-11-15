-- CreateTable
CREATE TABLE "scooters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "battery_level" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "displacement" DOUBLE PRECISION NOT NULL,
    "on_use" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scooters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unlock_attempts" (
    "id" TEXT NOT NULL,
    "scooter_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unlock_attempts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "unlock_attempts" ADD CONSTRAINT "unlock_attempts_scooter_id_fkey" FOREIGN KEY ("scooter_id") REFERENCES "scooters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
