CREATE TABLE "CalendarConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appOrigin" TEXT NOT NULL,
    "googleAccountId" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMPTZ(3) NOT NULL,
    "scopes" TEXT[],
    "requiresReconnection" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "CalendarConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalendarAuthAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "appOrigin" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "codeVerifier" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CalendarAuthAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarConnection_userId_appOrigin_key" ON "CalendarConnection"("userId", "appOrigin");
CREATE UNIQUE INDEX "CalendarAuthAttempt_stateHash_key" ON "CalendarAuthAttempt"("stateHash");
CREATE INDEX "CalendarAuthAttempt_expiresAt_idx" ON "CalendarAuthAttempt"("expiresAt");
CREATE INDEX "CalendarAuthAttempt_userId_appOrigin_idx" ON "CalendarAuthAttempt"("userId", "appOrigin");
ALTER TABLE "CalendarConnection" ADD CONSTRAINT "CalendarConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarAuthAttempt" ADD CONSTRAINT "CalendarAuthAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
