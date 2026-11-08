"use client";

import { useDispatch } from "react-redux";
import { useProfileSummary } from "~/features/profile/hooks/useProfileSummary";
import { useAppSelector } from "~/lib/hooks";
import { setIsViewProfileOpen } from "~/lib/features/uiSlice";
import { X } from "lucide-react";

interface CreateProfilePopUpProps {
  username: string;
  email: string;
}

const formatYear = (year?: string) => {
  if (!year) return "";
  return year.startsWith("2") ? `Class of ${year}` : year;
};

function CreateProfilePopUp({ username, email }: CreateProfilePopUpProps) {
  const dispatch = useDispatch();
  const isOpen = useAppSelector((state) => state.ui.isViewProfileOpen);
  const profile = useProfileSummary(email, isOpen);
  const firstName = username.split(" ")[0] ?? username;

  const handleClose = () => {
    dispatch(setIsViewProfileOpen(false));
  };

  if (!isOpen) return null;

  return (
    <div className="profile-popup-overlay">
      <div className="profile-popup-panel">
        <div className="profile-popup-header">
          <div className="text-default">
            <h2 className="text-xl font-bold">{firstName}</h2>
            <p className="text-sm text-black/60 dark:text-white/60">{email}</p>
            {profile.year && <p className="font-bold">{formatYear(profile.year)}</p>}
            {profile.majors && (
              <p>
                <strong>Majors: </strong>
                {profile.majors}
              </p>
            )}
            {profile.minors && (
              <p>
                <strong>Minors: </strong>
                {profile.minors}
              </p>
            )}
          </div>
          <button onClick={handleClose} className="profile-popup-close" aria-label="Close profile">
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateProfilePopUp;
