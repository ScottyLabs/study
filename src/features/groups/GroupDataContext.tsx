"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { StudyGroup } from "~/types";
import { useUser } from "~/lib/auth-client";
import { useStudyGroups } from "./hooks/useStudyGroups";
import { useUserGroupState } from "./hooks/useUserGroupState";

interface GroupDataContextValue {
  groups: StudyGroup[];
  joinedGroups: string[] | null;
  setJoinedGroups: ReturnType<typeof useUserGroupState>["setJoinedGroups"];
  blockedUsers: string[];
  loading: boolean;
}

const GroupDataContext = createContext<GroupDataContextValue | null>(
  null,
);

export function GroupDataProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const userId = user?.emailAddresses[0]?.emailAddress;
  const groups = useStudyGroups(Boolean(user));
  const { joinedGroups, setJoinedGroups, blockedUsers, loading } =
    useUserGroupState(userId);

  return (
    <GroupDataContext.Provider
      value={{ groups, joinedGroups, setJoinedGroups, blockedUsers, loading }}
    >
      {children}
    </GroupDataContext.Provider>
  );
}

export function useGroupData() {
  const context = useContext(GroupDataContext);

  if (!context) {
    throw new Error("useGroupData must be used within GroupDataProvider");
  }

  return context;
}
