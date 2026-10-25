"use client";

import { Fragment, useState } from "react";
import { usePathname } from "next/navigation";
import { useDispatch } from "react-redux";
import {
  FileText,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Sun,
  User,
  Users,
  X,
} from "lucide-react";
import { SignOutButton, useUser } from "~/lib/auth-client";
import { UserAvatar } from "~/components/ui/UserAvatar";
import { useUserTheme } from "~/features/profile/hooks/useUserTheme";
import { setIsCreateGroupModalOpen } from "~/lib/features/uiSlice";

const bottomItems = [
  { href: "/feed", label: "Find", page: "feed", icon: Search },
  { href: "/my-groups", label: "My Groups", page: "my-groups", icon: Users },
  { href: "/profile", label: "Profile", page: "profile", icon: User },
];

export default function MobileNavBar() {
  const { user } = useUser();
  const userId = user?.emailAddresses[0]?.emailAddress;
  const route = usePathname().split("/")[1];
  const page = route === "groups" ? "feed" : route;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { theme, toggleTheme } = useUserTheme(userId);
  const dispatch = useDispatch();

  return (
    <Fragment>
      <header className="mobile-nav-bar">
        <button
          type="button"
          aria-label={
            isDrawerOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={isDrawerOpen}
          aria-controls="mobile-nav-drawer"
          onClick={() => setIsDrawerOpen((open) => !open)}
          className="mobile-menu-button"
        >
          {isDrawerOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <a href="/feed" className="mobile-brand" aria-label="CMU Study home">
          <span>CMU</span> Study
        </a>
        {page === "profile" ? (
          <SignOutButton>
            <button type="button" className="mobile-logout-quick">
              <LogOut size={18} /> Log out
            </button>
          </SignOutButton>
        ) : (
          <a
            href="/profile"
            className="mobile-avatar-link"
            aria-label="Open profile"
          >
            <UserAvatar user={user} />
          </a>
        )}
      </header>

      {isDrawerOpen && (
        <button
          type="button"
          className="mobile-drawer-backdrop"
          onClick={() => setIsDrawerOpen(false)}
          aria-label="Close navigation menu"
        />
      )}

      <aside
        id="mobile-nav-drawer"
        className={`mobile-drawer ${isDrawerOpen ? "mobile-drawer-open" : ""}`}
        aria-hidden={!isDrawerOpen}
      >
        <div className="mobile-drawer-header">
          <strong>{user?.fullName ?? user?.firstName ?? "CMU student"}</strong>
          <small>{userId}</small>
        </div>
        <button
          type="button"
          className="sidebar-create-button"
          tabIndex={isDrawerOpen ? 0 : -1}
          onClick={() => {
            dispatch(setIsCreateGroupModalOpen(true));
            setIsDrawerOpen(false);
          }}
        >
          <Plus size={19} /> New group
        </button>
        <nav className="mobile-drawer-links">
          <a href="/feed" className="nav-link" tabIndex={isDrawerOpen ? 0 : -1}>
            <Search className="nav-link-icon" /> Group Finder
          </a>
          <a
            href="/my-groups"
            className="nav-link"
            tabIndex={isDrawerOpen ? 0 : -1}
          >
            <Users className="nav-link-icon" /> My Groups
          </a>
          <a
            href="/profile"
            className="nav-link"
            tabIndex={isDrawerOpen ? 0 : -1}
          >
            <User className="nav-link-icon" /> Profile
          </a>
          <a
            href="https://forms.gle/MEQ7miCZCrC48P6y8"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
            tabIndex={isDrawerOpen ? 0 : -1}
          >
            <MessageSquare className="nav-link-icon" /> Feedback
          </a>
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
            tabIndex={isDrawerOpen ? 0 : -1}
          >
            <FileText className="nav-link-icon" /> Privacy
          </a>
          <button
            type="button"
            onClick={toggleTheme}
            className="nav-link"
            tabIndex={isDrawerOpen ? 0 : -1}
          >
            {theme === "light" ? (
              <Moon className="nav-link-icon" />
            ) : (
              <Sun className="nav-link-icon" />
            )}
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>
        </nav>
        <SignOutButton>
          <button
            type="button"
            className="sidebar-logout"
            tabIndex={isDrawerOpen ? 0 : -1}
          >
            <LogOut size={18} /> Log out
          </button>
        </SignOutButton>
      </aside>

      <nav className="mobile-bottom-nav" aria-label="Primary navigation">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const active = page === item.page;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`mobile-bottom-link ${active ? "mobile-bottom-link-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={22} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </Fragment>
  );
}
