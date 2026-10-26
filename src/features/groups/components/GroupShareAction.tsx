"use client";

import { useEffect, useState } from "react";
import { Link2, Share } from "lucide-react";
import toast from "react-hot-toast";
import type { StudyGroup } from "~/types";
import {
  groupLink,
  invitationMessage,
  nativeInvitation,
} from "../utils/groupSharing";

// iPads can identify as Macs when requesting desktop websites.
export function usesMobileInvitations(
  device: Pick<Navigator, "userAgent" | "maxTouchPoints">,
) {
  return (
    /Android|iPhone|iPad|iPod/i.test(device.userAgent) ||
    (/Macintosh/i.test(device.userAgent) && device.maxTouchPoints > 1)
  );
}

export function GroupShareAction({
  group,
  compact = false,
  className = "button-outline gap-2",
  mobileLabel = "Invite friends",
  desktopLabel = "Copy link",
}: {
  group: StudyGroup;
  compact?: boolean;
  className?: string;
  mobileLabel?: string;
  desktopLabel?: string;
}) {
  const [mobile, setMobile] = useState(false);
  const [sharing, setSharing] = useState(false);
  useEffect(() => {
    setMobile(usesMobileInvitations(navigator));
  }, []);
  const shareInvitation = async () => {
    const link = groupLink(window.location.origin, group.id);
    const message = invitationMessage(group, link);
    if (typeof navigator.share !== "function") {
      try {
        await navigator.clipboard.writeText(message);
        toast.success(
          "Invitation copied. Paste it into your messaging or email app.",
        );
      } catch {
        toast.error(
          "Sharing is unavailable and the invitation could not be copied.",
        );
      }
      return;
    }
    setSharing(true);
    try {
      // Invoke directly from the click, before any await, to preserve user activation.
      await navigator.share(nativeInvitation(group.course, message, link));
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast.error("Could not open sharing. Please try again.");
      }
    } finally {
      setSharing(false);
    }
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        groupLink(window.location.origin, group.id),
      );
      toast.success("Study group link copied");
    } catch {
      toast.error("Could not copy the link. Please try again.");
    }
  };
  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={mobile ? mobileLabel : desktopLabel}
        title={mobile ? mobileLabel : desktopLabel}
        disabled={sharing}
        onClick={(event) => {
          event.stopPropagation();
          if (mobile) void shareInvitation();
          else void copyLink();
        }}
      >
        {mobile ? (
          <Share size={18} aria-hidden="true" />
        ) : (
          <Link2 size={18} aria-hidden="true" />
        )}
        {(!compact || !mobile) && (
          <span>{mobile ? mobileLabel : desktopLabel}</span>
        )}
      </button>
    </>
  );
}
