"use client";

import { useEffect, useState } from "react";
import { fetchBlockingState } from "~/features/profile/services/profileApi";
import { subscribeToGroupChanges } from "~/features/groups/services/groupApi";

export function useUserGroupState(userId?: string) {
  const [joinedGroups, setJoinedGroups] = useState<string[] | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    let requestVersion = 0;
    const loadState = () => {
      setLoading(true);
      const currentRequest = ++requestVersion;
      void fetchBlockingState()
        .then(({ joinedGroups, blockedByMe, blockedByThem }) => {
          if (cancelled || currentRequest !== requestVersion) return;
          setLoading(false);
          setJoinedGroups(joinedGroups);
          setBlockedUsers(
            blockedByMe
              .concat(blockedByThem)
              .map((email) => email.toLowerCase()),
          );
        })
        .catch((error) =>
          console.error("Error getting blocking state:", error),
        );
    };

    loadState();
    const unsubscribe = subscribeToGroupChanges(loadState);
    const refreshInterval = window.setInterval(loadState, 30_000);

    return () => {
      cancelled = true;
      setLoading(false)
      unsubscribe();
      window.clearInterval(refreshInterval);
    };
  }, [userId]);

  return { joinedGroups, setJoinedGroups, blockedUsers, loading };
}
