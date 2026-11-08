"use client";

import { Pencil, X } from "lucide-react";

type GroupDetailsHeaderProps = {
  title: string;
  course: string;
  purpose: string;
  canEdit: boolean;
  onEdit: () => void;
  onClose: () => void;
};

export function GroupDetailsHeader({
  title,
  course,
  purpose,
  canEdit,
  onEdit,
  onClose,
}: GroupDetailsHeaderProps) {
  return (
    <div className="group-details-header">
      <div className="group-details-heading">
        <div className="group-details-eyebrow">
          <span>{course}</span>
          <span>{purpose}</span>
        </div>
        <h2 className="group-details-title">{title}</h2>
      </div>
      <div className="group-details-actions">
        {canEdit ? (
          <button className="group-details-action" onClick={onEdit} aria-label="Edit group">
            <Pencil size={18} />
          </button>
        ) : (
          <div />
        )}
        <button className="group-details-action" onClick={onClose} aria-label="Close details">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
