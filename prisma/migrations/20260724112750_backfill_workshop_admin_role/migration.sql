UPDATE "User" SET "workshopRole" = 'ADMIN' WHERE "workshopId" IS NOT NULL AND "workshopRole" IS NULL;
