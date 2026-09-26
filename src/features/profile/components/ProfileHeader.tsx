"use client";

import { SignOutButton } from "~/lib/auth-client";
import { UserAvatar } from "~/components/ui/UserAvatar";
import { CalendarDays, GraduationCap } from "lucide-react";
import { useProfileSummary } from "~/features/profile/hooks/useProfileSummary";

type ProfileHeaderProps = {
  user?: {
    image?: unknown;
    imageUrl?: string | null;
    firstName?: string | null;
    fullName?: string | null;
    username?: string | null;
    emailAddresses?: { emailAddress?: string }[];
  } | null;
  showLogout?: boolean;

};

export function ProfileHeader({
  user,
  showLogout = false,
}: ProfileHeaderProps) {
  const displayName =
    user?.fullName ?? user?.firstName ?? user?.username ?? "User";
  const emailAddress = user?.emailAddresses?.[0]?.emailAddress;
  const profile = useProfileSummary(emailAddress);

  return (
    <section className="profile-header">
      <UserAvatar user={user} size="lg" />
      <div className="profile-header-meta">
        <h1 className="profile-header-title">{displayName}</h1>
        <div className="profile-header-details">
          {profile.majors && (
            <span>
              <GraduationCap size={17} /> {profile.majors}
            </span>
          )}
          {profile.year && (
            <span>
              <CalendarDays size={17} />{" "}
              {profile.year === "Masters Student" ||
              profile.year === "PhD Student"
                ? profile.year
                : `Class of ${profile.year}`}
            </span>
          )}
        </div>
        <p className="profile-header-email">{emailAddress}</p>
      </div>
      {showLogout && (
        <div className="ml-auto">
          <SignOutButton>
            <button className="button-primary">Logout</button>
          </SignOutButton>
        </div>
      )}
    </section>
  );
}
