-- Add a distinct supervisor hierarchy without changing the system role.
CREATE TYPE "SupervisorType" AS ENUM ('PRINCIPAL', 'ADJOINT', 'NORMAL');
ALTER TABLE "User" ADD COLUMN "supervisorType" "SupervisorType" DEFAULT 'NORMAL';
UPDATE "User" SET "supervisorType" = 'NORMAL' WHERE "supervisorType" IS NULL;
