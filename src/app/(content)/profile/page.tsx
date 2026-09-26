"use client";

import { useState } from "react";

import { ConfirmProvider } from "~/components/ui/ConfirmContext";
import { useUser } from "~/lib/auth-client";
import { BlockList } from "~/features/profile/components/BlockList";
import { ClassList } from "~/features/profile/components/ClassList";
import { ProfileDetailsForm } from "~/features/profile/components/ProfileDetailsForm";
import { ProfileHeader } from "~/features/profile/components/ProfileHeader";

type ProfileTab = "courses" | "blocked" | "account";

export default function ProfilePage() {
  const { user } = useUser();
  const userId = user?.emailAddresses[0]?.emailAddress;
  const [activeTab, setActiveTab] = useState<ProfileTab>("courses");
  return (
    <main className="profile-page">
      <ConfirmProvider>
        <h1 className="workspace-title profile-page-title">Profile</h1>
        <ProfileHeader user={user} />

        <div
          className="profile-tabs"
          role="tablist"
          aria-label="Profile sections"
        >
          {(["courses", "blocked", "account"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={activeTab === tab ? "profile-tab-active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "courses"
                ? "Courses"
                : tab === "blocked"
                  ? "Blocked"
                  : "Account"}
            </button>
          ))}
        </div>

        <div className="profile-workspace">
          <section
            className={`settings-panel profile-section profile-section-courses ${activeTab === "courses" ? "profile-section-active" : ""}`}
          >
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
          <section
            className={`settings-panel profile-section profile-section-blocked ${activeTab === "blocked" ? "profile-section-active" : ""}`}
          >
            <div className="settings-panel-heading">
              <div>
                <h2>Blocked users</h2>
                <p>Manage who can see groups you participate in.</p>
              </div>
            </div>
            <BlockList />
          </section>
          <section
            className={`settings-panel profile-section profile-section-account ${activeTab === "account" ? "profile-section-active" : ""}`}
          >
            <div className="settings-panel-heading">
              <div>
                <h2>Account details</h2>
                <p>Keep your academic profile up to date.</p>
              </div>
            </div>
            <ProfileDetailsForm userId={userId} />
          </section>
        </div>
      </ConfirmProvider>
    </main>
  );
}
