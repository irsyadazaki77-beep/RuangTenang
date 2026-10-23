CREATE TABLE "UserAgentProfiles" (
    "userId" TEXT NOT NULL,
    "aboutMe" TEXT NOT NULL DEFAULT '',
    "responseInstructions" TEXT NOT NULL DEFAULT '',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserAgentProfiles_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "UserAgentProfiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
