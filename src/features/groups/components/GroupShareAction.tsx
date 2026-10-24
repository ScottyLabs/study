"use client";

import { useEffect, useState } from "react";
import { Link2, Share } from "lucide-react";
import toast from "react-hot-toast";
import type { StudyGroup } from "~/types";
import { groupLink } from "../utils/groupSharing";
import { ShareGroupModal } from "./ShareGroupModal";

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
  onOpenChange,
}: {
  group: StudyGroup;
  compact?: boolean;
  className?: string;
  mobileLabel?: string;
  desktopLabel?: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setMobile(usesMobileInvitations(navigator));
  }, []);
  const setInvitationOpen = (value: boolean) => {
    setOpen(value);
    onOpenChange?.(value);
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
        onClick={(event) => {
          event.stopPropagation();
          if (mobile) setInvitationOpen(true);
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
      {open && (
        <ShareGroupModal
          group={group}
          onClose={() => setInvitationOpen(false)}
        />
      )}
    </>
  );
}
