"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { useDispatch } from "react-redux";
import {
  FileText,
  LogOut,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Sun,
  User,
  Users,
} from "lucide-react";
import { SignOutButton, useUser } from "~/lib/auth-client";
import { UserAvatar } from "~/components/ui/UserAvatar";
import MobileNavBar from "~/components/layout/MobileNavBar";
import CreateGroupModal from "~/features/groups/components/CreateGroupModal";
import { useUserTheme } from "~/features/profile/hooks/useUserTheme";
import { setIsCreateGroupModalOpen } from "~/lib/features/uiSlice";
import Link from "next/link";

const navItems = [
  { href: "/feed", label: "Group Finder", page: "feed", icon: Search },
  { href: "/my-groups", label: "My Groups", page: "my-groups", icon: Users },
  { href: "/profile", label: "Profile", page: "profile", icon: User },
];

export default function NavBar() {
  const { user } = useUser();
  const userId = user?.emailAddresses[0]?.emailAddress;
  const route = usePathname().split("/")[1];
  const page = route === "groups" ? "feed" : route;
  const { theme, toggleTheme } = useUserTheme(userId);
  const dispatch = useDispatch();
  const displayName = user?.fullName ?? user?.firstName ?? "CMU student";
  console.log("ge")
  return (
    <Fragment>
      <aside className="sidebar-shell" aria-label="Primary navigation">
        <div className="sidebar-content">
          <div>
            <Link
              href="/feed"
              className="sidebar-brand"
              aria-label="CMU Study home"
            >
              <span>CMU</span> Study
            </Link>
            <button
              type="button"
              className="sidebar-create-button"
              onClick={() => dispatch(setIsCreateGroupModalOpen(true))}
            >
              <Plus size={19} /> New group
            </button>
            <nav className="sidebar-nav">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-link ${page === item.page ? "nav-link-active" : ""}`}
                    aria-current={page === item.page ? "page" : undefined}
                  >
                    <Icon className="nav-link-icon" /> {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="sidebar-bottom">
            <nav className="sidebar-utilities" aria-label="Utility navigation">
              <Link
                href="https://forms.gle/MEQ7miCZCrC48P6y8"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link"
              >
                <MessageSquare className="nav-link-icon" /> Feedback
              </Link>
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link"
              >
                <FileText className="nav-link-icon" /> Privacy
              </Link>
              <button type="button" onClick={toggleTheme} className="nav-link">
                {theme === "light" ? (
                  <Moon className="nav-link-icon" />
                ) : (
                  <Sun className="nav-link-icon" />
                )}
                {theme === "light" ? "Dark mode" : "Light mode"}
              </button>
            </nav>
            <Link href="/profile" className="sidebar-account">
              <UserAvatar user={user} />
              <span className="sidebar-account-copy">
                <strong>{displayName}</strong>
                <small>{userId}</small>
              </span>
            </Link>
            <SignOutButton>
              <button type="button" className="sidebar-logout">
                <LogOut size={18} /> Log out
              </button>
            </SignOutButton>
          </div>
        </div>
      </aside>
      <MobileNavBar />
      <CreateGroupModal />
    </Fragment>
  );
}
