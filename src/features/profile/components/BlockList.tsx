import React, { useCallback, useEffect, useState } from "react";
import { useUser } from "~/lib/auth-client";
import { useConfirm } from "~/components/ui/ConfirmContext";
import {
  blockEmail,
  fetchBlockImpact,
  fetchBlockingState,
  unblockEmail,
} from "~/features/profile/services/profileApi";
import type { BlockedUsers } from "~/features/profile/types";
import {
  deleteFromCal,
  setupGoogleApi,
  hasCalendarAccess,
  requestCalendarAccessInteractive,
} from "~/helpers/calendar_helper";

const defaultBlockedUsers: BlockedUsers = {
  blockedByMe: [],
  blockedByThem: [],
};

export function BlockList() {
  const { user } = useUser();
  const [blocked, setBlocked] = useState<BlockedUsers>(defaultBlockedUsers);
  const [groups, setGroups] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const confirm = useConfirm();

  const getBlocked = useCallback(async () => {
    if (!user) return;
    const userId = user?.emailAddresses[0]?.emailAddress;
    try {
      if (!userId) {
        return;
      }
      const blockingState = await fetchBlockingState();
      setBlocked({
        blockedByMe: blockingState.blockedByMe,
        blockedByThem: blockingState.blockedByThem,
      });
      setGroups(blockingState.joinedGroups);
    } catch (err) {
      console.error(err);
      setBlocked(defaultBlockedUsers);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }
    void getBlocked();
  }, [getBlocked, user]);

  useEffect(() => {
    setupGoogleApi().catch((err) => {
      console.warn("Failed to initialize Google API:", err);
    });
  }, []);

  const handleBlock = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const userToBlock = event.target.value.toLowerCase().trim();
    setInputValue(userToBlock);
  };

  const handleBlockSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const userToBlock = inputValue.toLowerCase().trim();

    if (userToBlock === "" || !user) {
      return;
    }

    const userId = user?.emailAddresses[0]?.emailAddress;
    if (!userId) return;

    const alreadyBlockedByMe = blocked.blockedByMe.some(
      (b) => b === userToBlock,
    );
    if (alreadyBlockedByMe) {
      setInputValue("");
      return;
    }

    try {
      const { sharedGroupCount: numShared } =
        await fetchBlockImpact(userToBlock);
      if (numShared > 0) {
        const calendarAuthorization: { promise?: Promise<void> } = {};
        const ok = await confirm(
          `You are currently in ${numShared} group${numShared === 1 ? "" : "s"} with ${userToBlock}. You will be removed from ${numShared === 1 ? "this group" : "these groups"} if you continue.`,
          () => {
            if (!hasCalendarAccess()) {
              calendarAuthorization.promise = requestCalendarAccessInteractive().catch((err) => {
                console.warn("Calendar auth failed:", err);
              });
            }
          },
        );
        if (!ok) {
          return;
        }
        if (calendarAuthorization.promise) await calendarAuthorization.promise;
      }

      const result = await blockEmail(userToBlock);
      await Promise.all(result.calendarEventIds.map(deleteFromCal));

      const updatedState = await fetchBlockingState();
      setBlocked({
        blockedByMe: updatedState.blockedByMe,
        blockedByThem: updatedState.blockedByThem,
      });
      setGroups(updatedState.joinedGroups);
      setInputValue("");
    } catch (err) {
      console.error(err);
      void getBlocked();
    }
  };

  const handleUnblock = async (userToUnblock: string) => {
    if (!user) return;
    const userId = user?.emailAddresses[0]?.emailAddress;
    if (!userId) return;

    try {
      await unblockEmail(userToUnblock);

      const newBlocked: BlockedUsers = {
        blockedByMe: blocked.blockedByMe.filter((u) => u !== userToUnblock),
        blockedByThem: blocked.blockedByThem,
      };

      setBlocked(newBlocked);
      setInputValue("");
    } catch (err) {
      console.error(err);
      void getBlocked();
    }
  };

  return (
    <div className="mt-8">
      <div className="p-0">
        <h1 className="section-heading">Block Users</h1>
        <form onSubmit={handleBlockSubmit}>
          <input
            id="blockInput"
            className="course-search-input"
            type="text"
            pattern="[A-Za-z0-9]+@andrew\.cmu\.edu"
            title='"<id>@andrew.cmu.edu"'
            value={inputValue}
            onChange={handleBlock}
            placeholder="Emails added here will not see groups you're in"
            required
          />
          <button type="submit" className="button-primary mt-2 w-full">
            Block User
          </button>
        </form>
      </div>
      <br />
      <h2 className="mb-1 text-lg font-bold text-black dark:text-white">
        {blocked.blockedByMe.length > 0 ? "Blocked Students" : ""}
      </h2>
      <ul className="mt-2 space-y-2">
        {blocked.blockedByMe.map((blockedUser) => (
          <li key={blockedUser} className="class-list-item">
            <div className="class-list-text">{blockedUser}</div>
            <button
              onClick={() => handleUnblock(blockedUser)}
              className="unblock-button"
              aria-label={`Unblock ${blockedUser}`}
            >
              <strong>&times;</strong>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
