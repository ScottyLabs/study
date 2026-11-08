"use client";

import { useEffect, useRef } from "react";
import type { KeyboardEvent, ReactNode, RefObject } from "react";
import { X } from "lucide-react";

type GroupModalFrameProps = {
  id: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function trapFocus(event: KeyboardEvent, panel: HTMLElement) {
  const focusableElements = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => !element.hasAttribute("disabled"),
  );
  const firstElement = focusableElements.at(0);
  const lastElement = focusableElements.at(-1);
  if (firstElement === undefined || lastElement === undefined) {
    event.preventDefault();
    return;
  }

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

// Focus the first control on open and give focus back to the opener on close
function useModalFocus(panelRef: RefObject<HTMLDialogElement | null>) {
  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => {
      if (previousFocus?.isConnected === true) previousFocus.focus();
    };
  }, [panelRef]);
}

export function GroupModalFrame({ id, title, onClose, children }: GroupModalFrameProps) {
  const panelRef = useRef<HTMLDialogElement>(null);
  const titleId = `${id}-title`;
  useModalFocus(panelRef);

  // Keydowns bubble here from the panel
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    event.stopPropagation();
    if (panelRef.current) trapFocus(event, panelRef.current);
  };

  return (
    <div
      className="modal-overlay"
      id={id}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <dialog
        open
        ref={panelRef}
        className="modal-panel"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h2 id={titleId} className="modal-title">
            {title}
          </h2>
          <button onClick={onClose} className="modal-close" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        {children}
      </dialog>
    </div>
  );
}
