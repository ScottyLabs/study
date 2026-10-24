"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { StudyGroup } from "~/types";
import { GroupModalFrame } from "./GroupModalFrame";
import {
  groupLink,
  invitationEmail,
  invitationMessage,
  nativeInvitation,
} from "../utils/groupSharing";

export function ShareGroupModal({
  group,
  onClose,
}: {
  group: StudyGroup;
  onClose: () => void;
}) {
  const [link] = useState(() => groupLink(window.location.origin, group.id));
  const [message, setMessage] = useState(() => invitationMessage(group, link));
  const [feedback, setFeedback] = useState("");
  const [sharing, setSharing] = useState(false);
  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback(`${label} copied`);
    } catch {
      setFeedback(
        "Could not copy. Select the text above and copy it manually.",
      );
    }
  };
  const share = async () => {
    setSharing(true);
    try {
      await navigator.share(nativeInvitation(group.course, message, link));
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setFeedback(
          "Could not open sharing. Try email or copy your invitation.",
        );
      }
    } finally {
      setSharing(false);
    }
  };
  return createPortal(
    <div className="ph-no-capture ph-mask">
      <GroupModalFrame
        id="share-group"
        title="Invite classmates"
        onClose={onClose}
      >
        <label className="block" htmlFor="invitation-message">
          Message
        </label>
        <textarea
          id="invitation-message"
          className="ph-no-capture border-gray-400 my-2 w-full rounded-lg border bg-transparent p-3"
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <div className="mt-4 flex flex-wrap gap-3">
          {typeof navigator.share === "function" && (
            <button
              type="button"
              className="button-primary"
              disabled={sharing}
              onClick={() => void share()}
            >
              Share
            </button>
          )}
          <a
            className="button-primary"
            href={invitationEmail(group.course, message)}
          >
            Email
          </a>
          <button
            type="button"
            className="button-outline"
            onClick={() => void copy(message, "Message")}
          >
            Copy message
          </button>
        </div>
        <p className="mt-3" role="status">
          {feedback}
        </p>
      </GroupModalFrame>
    </div>,
    document.body,
  );
}
