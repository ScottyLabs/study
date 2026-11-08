"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "~/lib/auth-client";
import { ApiRequestError } from "~/lib/api/client";
import type { StudyGroup } from "~/types";
import { fetchGroup } from "../services/groupApi";
import { fetchBlockingState } from "~/features/profile/services/profileApi";
import { GroupFinder } from "./GroupFinder";

type Loaded = { status: "ready" | "missing" | "error"; group?: StudyGroup };

async function loadSharedGroup(groupId: string): Promise<Loaded> {
  try {
    const [details, blocking] = await Promise.all([fetchGroup(groupId), fetchBlockingState()]);
    const blocked = new Set(
      [...blocking.blockedByMe, ...blocking.blockedByThem].map((email) => email.toLowerCase()),
    );
    if (details.participantDetails.some((person) => blocked.has(person.email.toLowerCase()))) {
      return { status: "missing" };
    }
    return { status: "ready", group: details };
  } catch (error) {
    return {
      status: error instanceof ApiRequestError && error.status === 404 ? "missing" : "error",
    };
  }
}

// Key results by group and attempt so a stale result reads as loading
function useSharedGroup(groupId: string, signedIn: boolean) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<(Loaded & { key: string }) | null>(null);
  const key = `${groupId}:${attempt}`;

  useEffect(() => {
    let cancelled = false;
    if (signedIn) {
      void loadSharedGroup(groupId).then((loaded) => {
        if (!cancelled) setResult({ ...loaded, key });
      });
    }
    return () => {
      cancelled = true;
    };
  }, [groupId, key, signedIn]);

  const current = result?.key === key ? result : null;
  return {
    status: current?.status ?? "loading",
    group: current?.group,
    markMissing: () => {
      setResult({ key, status: "missing" });
    },
    retry: () => {
      setAttempt((value) => value + 1);
    },
  };
}

export function SharedGroupPage({ groupId }: { groupId: string }) {
  const { user } = useUser();
  const router = useRouter();
  const shared = useSharedGroup(groupId, Boolean(user));
  const close = useCallback(() => {
    router.push("/feed");
  }, [router]);

  if (shared.status === "ready" && shared.group) {
    return (
      <GroupFinder
        key={shared.group.id}
        initialGroup={shared.group}
        onCloseInitialGroup={close}
        onInitialGroupUnavailable={shared.markMissing}
      />
    );
  }

  return (
    <main className="content-page">
      {shared.status === "loading" && <output className="block">Loading group...</output>}
      {shared.status === "missing" && (
        <div className="app-empty">
          <h1>Group unavailable</h1>
          <Link href="/feed" className="button-primary">
            Find study groups
          </Link>
        </div>
      )}
      {shared.status === "error" && (
        <div className="app-empty">
          <p>Could not load this group.</p>
          <button className="button-primary" onClick={shared.retry}>
            Retry
          </button>
        </div>
      )}
    </main>
  );
}
