import type { Credentials } from "google-auth-library";

export type AttemptRow = {
  id: string;
  userId: string;
  appOrigin: string;
  sessionId: string;
  stateHash: string;
  codeVerifier: string;
  expiresAt: Date;
  status: string;
};

export type ConnectionRow = {
  id: string;
  userId: string;
  appOrigin: string;
  googleAccountId: string | null;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  scopes: string[];
  requiresReconnection: boolean;
  updatedAt: Date;
};

export type CalendarRequest = {
  operation: string;
  params: { calendarId?: string };
  options: { retry?: boolean };
  credentials: Credentials;
};

type Where = Record<string, unknown>;

export const calendarEnv: Record<string, string | undefined> = {};

export const calendarStore = {
  attempts: new Map<string, AttemptRow>(),
  connection: null as ConnectionRow | null,
};

export const googleCalendar = {
  eventError: undefined as Error | undefined,
  requests: [] as CalendarRequest[],
};

function matches(row: Record<string, unknown>, where: Where) {
  return Object.entries(where).every(([key, expected]) => {
    const actual = row[key];
    if (expected instanceof Date) {
      return actual instanceof Date && actual.getTime() === expected.getTime();
    }
    if (typeof expected === "object" && expected !== null && actual instanceof Date) {
      if ("gt" in expected && expected.gt instanceof Date) return actual > expected.gt;
      if ("lt" in expected && expected.lt instanceof Date) return actual < expected.lt;
    }
    return actual === expected;
  });
}

function findAttempt({ where }: { where: Where }) {
  const rows = [...calendarStore.attempts.values()];
  return Promise.resolve(rows.find((row) => matches(row, where)) ?? null);
}

export const calendarDb = {
  calendarAuthAttempt: {
    deleteMany({ where }: { where: Where }) {
      for (const [id, attempt] of calendarStore.attempts) {
        if (matches(attempt, where)) calendarStore.attempts.delete(id);
      }
      return Promise.resolve();
    },
    updateMany({ where, data }: { where: Where; data: Partial<AttemptRow> }) {
      const claimed = [...calendarStore.attempts.values()].filter((row) => matches(row, where));
      for (const attempt of claimed) Object.assign(attempt, data);
      return Promise.resolve({ count: claimed.length });
    },
    create({ data }: { data: Omit<AttemptRow, "id" | "status"> }) {
      const row: AttemptRow = { id: crypto.randomUUID(), status: "pending", ...data };
      calendarStore.attempts.set(row.id, row);
      return Promise.resolve(row);
    },
    findUnique: findAttempt,
    findFirst: findAttempt,
    update({ where, data }: { where: { id: string }; data: Partial<AttemptRow> }) {
      Object.assign(calendarStore.attempts.get(where.id) ?? {}, data);
      return Promise.resolve();
    },
  },
  calendarConnection: {
    findUnique({ where }: { where: { userId_appOrigin: Where } }) {
      const { connection } = calendarStore;
      const found = connection !== null && matches(connection, where.userId_appOrigin);
      return Promise.resolve(found ? { ...connection } : null);
    },
    upsert({
      create,
      update,
    }: {
      create: Omit<ConnectionRow, "id" | "updatedAt">;
      update: Partial<ConnectionRow>;
    }) {
      const { connection } = calendarStore;
      calendarStore.connection = {
        id: "connection-1",
        updatedAt: new Date(),
        ...(connection ? { ...connection, ...update } : create),
      };
      return Promise.resolve(calendarStore.connection);
    },
    updateMany({ where, data }: { where: Where; data: Partial<ConnectionRow> }) {
      const { connection } = calendarStore;
      if (!connection || !matches(connection, where)) return Promise.resolve({ count: 0 });
      calendarStore.connection = { ...connection, ...data, updatedAt: new Date(Date.now() + 1) };
      return Promise.resolve({ count: 1 });
    },
  },
  $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
};

class Calendar {
  readonly events;

  constructor({ auth }: { auth: { credentials: Credentials } }) {
    const request =
      (operation: string) =>
      (params: CalendarRequest["params"], options: CalendarRequest["options"]) => {
        googleCalendar.requests.push({ operation, params, options, credentials: auth.credentials });
        if (googleCalendar.eventError) return Promise.reject(googleCalendar.eventError);
        return Promise.resolve({
          data: {
            id: "event-1",
            htmlLink: "https://calendar.google.com/event-1",
            privateField: "never-return",
          },
        });
      };
    this.events = { insert: request("insert"), patch: request("patch"), delete: request("delete") };
  }
}

export const calendarModule = { calendar_v3: { Calendar } };
