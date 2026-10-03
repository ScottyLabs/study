"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClassList } from "~/features/profile/components/ClassList";
import { ProfileDetailsForm } from "~/features/profile/components/ProfileDetailsForm";
import { ProfileHeader } from "~/features/profile/components/ProfileHeader";
import { useUserTheme } from "~/features/profile/hooks/useUserTheme";
import { fetchCourseCodes } from "~/features/profile/services/profileApi";
import { useUser } from "~/lib/auth-client";

function CourseRequiredPopup({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="course-required-message"
        className="confirm-panel flex items-center gap-4"
        onClick={(event) => event.stopPropagation()}
      >
        <p
          id="course-required-message"
          className="confirm-message m-0 flex-1 text-left"
        >
          Add at least one course to continue.
        </p>
        <div className="confirm-actions m-0 shrink-0">
          <button
            type="button"
            className="confirm-button-continue"
            onClick={onClose}
            autoFocus
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

function ContinueButton({ onNeedsCourse }: { onNeedsCourse: () => void }) {
  const router = useRouter();

  const handleContinue = async () => {
    try {
      const courseCodes = await fetchCourseCodes();
      if (courseCodes.length === 0) {
        onNeedsCourse();
        return;
      }
      router.push("/feed");
    } catch (error) {
      console.error("Error checking saved courses:", error);
    }
  };

  return (
    <button type="button" className="button-primary" onClick={handleContinue}>
      Continue
    </button>
  );
}

export default function CreateAccountPage() {
  const { user } = useUser();
  const userId = user?.emailAddresses[0]?.emailAddress;
  useUserTheme(userId);
  const [showCoursePopup, setShowCoursePopup] = useState(false);

  return (
    <div className="profile-page-panel">
      <section className="workspace-header mb-5">
        <div>
          <div className="workspace-kicker">Welcome</div>
          <h1 className="workspace-title">Set up CMU Study</h1>
          <p className="workspace-subtitle">
            Add your profile details and at least one course to start finding
            useful study groups.
          </p>
        </div>
        <div className="workspace-actions">
          <ContinueButton onNeedsCourse={() => setShowCoursePopup(true)} />
        </div>
      </section>
      <div className="profile-workspace">
        <div className="profile-column">
          <ProfileHeader user={user} showLogout />
          <div className="settings-panel">
            <ProfileDetailsForm userId={userId} mastersValue="Masters" />
          </div>
        </div>
        <div className="profile-column">
          <div className="settings-panel">
            <ClassList />
          </div>
        </div>
      </div>
      {showCoursePopup && (
        <CourseRequiredPopup onClose={() => setShowCoursePopup(false)} />
      )}
    </div>
  );
}
