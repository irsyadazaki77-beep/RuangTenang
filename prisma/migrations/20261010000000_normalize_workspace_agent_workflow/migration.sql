CREATE TABLE "WorkspacePlans" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titleEncrypted" TEXT NOT NULL,
    "goalEncrypted" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "WorkspacePlans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WorkspacePlans_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspaces"("chatId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "WorkspacePlanTasks" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "titleEncrypted" TEXT NOT NULL,
    "descriptionEncrypted" TEXT,
    "taskType" TEXT NOT NULL DEFAULT 'analysis',
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "modelId" TEXT,
    "currentExecutionId" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkspacePlanTasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WorkspacePlanTasks_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WorkspacePlans"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "WorkspaceTaskDependencies" (
    "taskId" TEXT NOT NULL,
    "dependsOnTaskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceTaskDependencies_pkey" PRIMARY KEY ("taskId", "dependsOnTaskId"),
    CONSTRAINT "WorkspaceTaskDependencies_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "WorkspacePlanTasks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkspaceTaskDependencies_dependsOnTaskId_fkey" FOREIGN KEY ("dependsOnTaskId") REFERENCES "WorkspacePlanTasks"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "WorkspaceTaskExecutions" (
    "id" TEXT NOT NULL,
    "planTaskId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "snapshotEncrypted" TEXT NOT NULL,
    "outputEncrypted" TEXT,
    "sourcesEncrypted" TEXT,
    "outputArtifactId" TEXT,
    "attemptNumber" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heartbeatAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    CONSTRAINT "WorkspaceTaskExecutions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WorkspaceTaskExecutions_planTaskId_fkey" FOREIGN KEY ("planTaskId") REFERENCES "WorkspacePlanTasks"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WorkspacePlanTasks_planId_position_key" ON "WorkspacePlanTasks"("planId", "position");
CREATE INDEX "WorkspacePlans_workspaceId_status_updatedAt_idx" ON "WorkspacePlans"("workspaceId", "status", "updatedAt");
CREATE INDEX "WorkspacePlans_userId_workspaceId_idx" ON "WorkspacePlans"("userId", "workspaceId");
CREATE INDEX "WorkspacePlanTasks_planId_status_position_idx" ON "WorkspacePlanTasks"("planId", "status", "position");
CREATE INDEX "WorkspacePlanTasks_currentExecutionId_idx" ON "WorkspacePlanTasks"("currentExecutionId");
CREATE INDEX "WorkspaceTaskDependencies_dependsOnTaskId_idx" ON "WorkspaceTaskDependencies"("dependsOnTaskId");
CREATE INDEX "WorkspaceTaskExecutions_planTaskId_startedAt_idx" ON "WorkspaceTaskExecutions"("planTaskId", "startedAt");
CREATE INDEX "WorkspaceTaskExecutions_workspaceId_status_idx" ON "WorkspaceTaskExecutions"("workspaceId", "status");
CREATE INDEX "WorkspaceTaskExecutions_userId_workspaceId_idx" ON "WorkspaceTaskExecutions"("userId", "workspaceId");
CREATE INDEX "WorkspaceTaskExecutions_outputArtifactId_idx" ON "WorkspaceTaskExecutions"("outputArtifactId");
