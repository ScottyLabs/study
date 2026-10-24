"use client";

import { Suspense } from "react";

import { ClassList } from "~/features/profile/components/ClassList";
import { ProfileDetailsForm } from "~/features/profile/components/ProfileDetailsForm";
import { ProfileHeader } from "~/features/profile/components/ProfileHeader";
import { useUserTheme } from "~/features/profile/hooks/useUserTheme";
import { useUser } from "~/lib/auth-client";

import { useSearchParams } from "next/navigation";
import { groupDestination } from "~/lib/group-destination";

function ContinueButton() {
  const params = useSearchParams();
  return (
    <a href={groupDestination(params.get("next"))} className="button-primary">
      Continue
    </a>
  );
}

function CreateAccountPageContent() {
  const { user } = useUser();
  const userId = user?.emailAddresses[0]?.emailAddress;
  useUserTheme(userId);

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
          <ContinueButton />
        </div>
      </section>
      <div className="profile-workspace">
        <div className="profile-column">
          <ProfileHeader user={user} showLogout />
          <div className="settings-panel">
            <ProfileDetailsForm userId={userId} mastersValue="Masters" />
          </div>
        </div>
        <div className="profile-column desktop:flex">
          <div className="settings-panel w-full">
            <div className="settings-panel-heading">
              <div>
                <h2>My courses</h2>
                <p>
                  Add the courses you are taking to connect with classmates.
                </p>
              </div>
            </div>
            <ClassList />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateAccountPage() {
  return (
    <Suspense fallback={<p role="status">Loading...</p>}>
      <CreateAccountPageContent />
    </Suspense>
  );
}
