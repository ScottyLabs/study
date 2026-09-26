"use client";

import { useRef } from "react";

import { ConfirmProvider } from "~/components/ui/ConfirmContext";
import { useUser } from "~/lib/auth-client";
import { BlockList } from "~/features/profile/components/BlockList";
import { ClassList } from "~/features/profile/components/ClassList";
import { ProfileDetailsForm } from "~/features/profile/components/ProfileDetailsForm";
import { ProfileHeader } from "~/features/profile/components/ProfileHeader";

export default function ProfilePage() {
  const { user } = useUser();
  const userId = user?.emailAddresses[0]?.emailAddress;
  const accountRef = useRef<HTMLDivElement>(null);

  const openAccountEditor = () => {
    accountRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <main className="profile-page">
      <ConfirmProvider>
        <h1 className="workspace-title profile-page-title">Profile</h1>
        <ProfileHeader user={user} onEdit={openAccountEditor} />

        <div className="profile-workspace">
          <section
            ref={accountRef}
            className="settings-panel profile-section-account"
          >
            <div className="settings-panel-heading">
              <div>
                <h2>Account details</h2>
                <p>Keep your academic profile up to date.</p>
              </div>
            </div>
            <ProfileDetailsForm userId={userId} />
          </section>
          <section className="settings-panel">
            <div className="settings-panel-heading">
              <div>
                <h2>My courses</h2>
                <p>
                  Add the courses you are taking to connect with classmates.
                </p>
              </div>
            </div>
            <ClassList />
          </section>
          <section className="settings-panel">
            <div className="settings-panel-heading">
              <div>
                <h2>Blocked users</h2>
                <p>Manage who can see groups you participate in.</p>
              </div>
            </div>
            <BlockList />
          </section>
        </div>
      </ConfirmProvider>
    </main>
  );
}
