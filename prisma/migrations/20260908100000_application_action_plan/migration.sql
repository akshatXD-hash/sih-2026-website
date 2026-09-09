CREATE TABLE "application_tasks" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "application_id" TEXT NOT NULL REFERENCES "applications"("id") ON DELETE CASCADE,
  "task_key" TEXT NOT NULL,
  "completed_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "application_tasks_application_id_task_key_key" ON "application_tasks"("application_id", "task_key");

CREATE TABLE "applicant_competencies" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "application_id" TEXT NOT NULL REFERENCES "applications"("id") ON DELETE CASCADE,
  "skill_key" TEXT NOT NULL,
  "level" TEXT NOT NULL CHECK ("level" IN ('NOT_SURE', 'LEARNING', 'CONFIDENT')),
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "applicant_competencies_application_id_skill_key_key" ON "applicant_competencies"("application_id", "skill_key");
