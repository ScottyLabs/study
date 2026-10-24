"use client";

import { useEffect, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { X } from "lucide-react";

type GroupModalFrameProps = {
  id: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
  suspended?: boolean;
};

export function GroupModalFrame({
  id,
  title,
  onClose,
  children,
  suspended = false,
}: GroupModalFrameProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = `${id}-title`;

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const panel = panelRef.current;
    if (!panel) return;

    const firstFocusable = panel.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    firstFocusable?.focus();
    return () => {
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== "Tab") return;
    event.stopPropagation();

    const panel = panelRef.current;
    if (!panel) return;

    const focusableElements = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hasAttribute("disabled"));

    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0]!;
    const lastElement = focusableElements[focusableElements.length - 1]!;

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  return (
    <div
      className="modal-overlay"
      id={id}
      onClick={onClose}
      aria-hidden={suspended || undefined}
      style={suspended ? { display: "none" } : undefined}
    >
      <div
        ref={panelRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="modal-header">
          <h2 id={titleId} className="modal-title">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="modal-close"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
