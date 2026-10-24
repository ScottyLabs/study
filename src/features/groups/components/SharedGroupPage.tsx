"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "~/lib/auth-client";
import { ApiRequestError } from "~/lib/api/client";
import type { StudyGroup } from "~/types";
import { fetchGroup } from "../services/groupApi";
import { fetchBlockingState } from "~/features/profile/services/profileApi";
import GroupDetails from "./GroupDetails";

export function SharedGroupPage({ groupId }: { groupId: string }) {
  const { user } = useUser();
  const router = useRouter();
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [, setJoinedGroups] = useState<string[] | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "missing" | "error"
  >("loading");
  const [attempt, setAttempt] = useState(0);
  const close = useCallback(() => router.push("/feed"), [router]);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setStatus("loading");
    void Promise.all([fetchGroup(groupId), fetchBlockingState()])
      .then(([details, blocking]) => {
        if (cancelled) return;
        const blocked = new Set(
          [...blocking.blockedByMe, ...blocking.blockedByThem].map((email) =>
            email.toLowerCase(),
          ),
        );
        if (
          details.participantDetails.some((person) =>
            blocked.has(person.email.toLowerCase()),
          )
        ) {
          setStatus("missing");
          return;
        }
        setGroup(details);
        setJoinedGroups(blocking.joinedGroups);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setStatus(
            error instanceof ApiRequestError && error.status === 404
              ? "missing"
              : "error",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [groupId, user, attempt]);
  return (
    <main className="content-page">
      {status === "loading" && <p role="status">Loading group...</p>}
      {status === "missing" && (
        <div className="app-empty">
          <h1>Group unavailable</h1>
          <Link href="/feed" className="button-primary">
            Find study groups
          </Link>
        </div>
      )}
      {status === "error" && (
        <div className="app-empty">
          <p>Could not load this group.</p>
          <button
            className="button-primary"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry
          </button>
        </div>
      )}
      {status === "ready" && group && (
        <GroupDetails
          details={group}
          onClick={close}
          onUnavailable={() => setStatus("missing")}
          updateJoinedGroups={setJoinedGroups}
        />
      )}
    </main>
  );
}
