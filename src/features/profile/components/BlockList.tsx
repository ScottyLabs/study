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
import { ShieldCheck, UserMinus } from "lucide-react";

const defaultBlockedUsers: BlockedUsers = {
  blockedByMe: [],
  blockedByThem: [],
};

function blockedUsersFrom(state: BlockedUsers): BlockedUsers {
  return { blockedByMe: state.blockedByMe, blockedByThem: state.blockedByThem };
}

function useBlockedUsers(userId: string) {
  const [blocked, setBlocked] = useState<BlockedUsers>(defaultBlockedUsers);

  const refresh = useCallback(
    () =>
      fetchBlockingState()
        .then((state) => {
          setBlocked(blockedUsersFrom(state));
        })
        .catch((err: unknown) => {
          console.error(err);
          setBlocked(defaultBlockedUsers);
        }),
    [],
  );

  useEffect(() => {
    if (userId === "") return;
    void refresh();
  }, [refresh, userId]);

  useEffect(() => {
    setupGoogleApi().catch((err: unknown) => {
      console.warn("Failed to initialize Google API:", err);
    });
  }, []);

  const unblock = async (email: string) => {
    await unblockEmail(email);
    setBlocked((current) => ({
      blockedByMe: current.blockedByMe.filter((u) => u !== email),
      blockedByThem: current.blockedByThem,
    }));
  };

  const recover = (err: unknown) => {
    console.error(err);
    void refresh();
  };

  return { blocked, setBlocked, unblock, recover };
}

async function confirmSharedGroups(confirm: ReturnType<typeof useConfirm>, email: string) {
  const { sharedGroupCount: numShared } = await fetchBlockImpact(email);
  if (numShared <= 0) return true;
  const calendarAuthorization: { promise?: Promise<void> } = {};
  const ok = await confirm(
    `You are currently in ${numShared} group${numShared === 1 ? "" : "s"} with ${email}. You will be removed from ${numShared === 1 ? "this group" : "these groups"} if you continue.`,
    () => {
      if (!hasCalendarAccess()) {
        calendarAuthorization.promise = requestCalendarAccessInteractive().catch((err: unknown) => {
          console.warn("Calendar auth failed:", err);
        });
      }
    },
  );
  if (ok && calendarAuthorization.promise) await calendarAuthorization.promise;
  return ok;
}

async function blockAfterConfirming(confirm: ReturnType<typeof useConfirm>, email: string) {
  if (!(await confirmSharedGroups(confirm, email))) return null;
  const result = await blockEmail(email);
  await Promise.all(result.calendarEventIds.map((eventId) => deleteFromCal(eventId)));
  return blockedUsersFrom(await fetchBlockingState());
}

type BlockFormProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

function BlockForm({ value, onChange, onSubmit }: BlockFormProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <input
        id="blockInput"
        className="course-search-input"
        type="text"
        pattern="[A-Za-z0-9]+@andrew\.cmu\.edu"
        title='"<id>@andrew.cmu.edu"'
        value={value}
        onChange={(event) => {
          onChange(event.target.value.toLowerCase().trim());
        }}
        placeholder="student@andrew.cmu.edu"
        required
      />
      <button type="submit" className="button-outline mt-2 w-full">
        Block User
      </button>
    </form>
  );
}

function BlockedUserList({
  users,
  onUnblock,
}: {
  users: string[];
  onUnblock: (user: string) => void;
}) {
  if (users.length === 0) {
    return (
      <div className="blocked-empty">
        <ShieldCheck size={30} />
        <strong>No blocked users</strong>
      </div>
    );
  }
  return (
    <ul className="class-list-items">
      {users.map((blockedUser) => (
        <li key={blockedUser} className="class-list-item">
          <div className="class-list-text">{blockedUser}</div>
          <button
            onClick={() => {
              onUnblock(blockedUser);
            }}
            className="unblock-text-button"
            aria-label={`Unblock ${blockedUser}`}
          >
            <UserMinus size={16} /> Unblock
          </button>
        </li>
      ))}
    </ul>
  );
}

export function BlockList() {
  const { user } = useUser();
  const userId = user?.emailAddresses[0]?.emailAddress ?? "";
  const { blocked, setBlocked, unblock, recover } = useBlockedUsers(userId);
  const [inputValue, setInputValue] = useState<string>("");
  const confirm = useConfirm();

  const handleBlockSubmit = () => {
    const userToBlock = inputValue.toLowerCase().trim();
    if (userToBlock === "" || userId === "") return;
    if (blocked.blockedByMe.includes(userToBlock)) {
      setInputValue("");
      return;
    }
    blockAfterConfirming(confirm, userToBlock)
      .then((updated) => {
        if (updated === null) return;
        setBlocked(updated);
        setInputValue("");
      })
      .catch(recover);
  };

  const handleUnblock = (userToUnblock: string) => {
    if (userId === "") return;
    unblock(userToUnblock)
      .then(() => {
        setInputValue("");
      })
      .catch(recover);
  };

  return (
    <div className="block-list">
      <div>
        <BlockForm value={inputValue} onChange={setInputValue} onSubmit={handleBlockSubmit} />
      </div>
      <BlockedUserList users={blocked.blockedByMe} onUnblock={handleUnblock} />
    </div>
  );
}
