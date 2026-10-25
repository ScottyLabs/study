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
import Link from "next/link";

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
        <Link
          href="/feed"
          className="mobile-brand"
          aria-label="CMU Study home"
          onClick={() => setIsDrawerOpen(false)}
        >
          <span>CMU</span> Study
        </Link>
        {page === "profile" ? (
          <SignOutButton>
            <button type="button" className="mobile-logout-quick">
              <LogOut size={18} /> Log out
            </button>
          </SignOutButton>
        ) : (
          <Link
            href="/profile"
            className="mobile-avatar-link"
            aria-label="Open profile"
            onClick={() => setIsDrawerOpen(false)}
          >
            <UserAvatar user={user} />
          </Link>
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
          <Link
            href="/feed"
            className="nav-link"
            tabIndex={isDrawerOpen ? 0 : -1}
            onClick={() => setIsDrawerOpen(false)}
          >
            <Search className="nav-link-icon" /> Group Finder
          </Link>
          <Link
            href="/my-groups"
            className="nav-link"
            tabIndex={isDrawerOpen ? 0 : -1}
            onClick={() => setIsDrawerOpen(false)}
          >
            <Users className="nav-link-icon" /> My Groups
          </Link>
          <Link
            href="/profile"
            className="nav-link"
            tabIndex={isDrawerOpen ? 0 : -1}
            onClick={() => setIsDrawerOpen(false)}
          >
            <User className="nav-link-icon" /> Profile
          </Link>
          <Link
            href="https://forms.gle/MEQ7miCZCrC48P6y8"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
            tabIndex={isDrawerOpen ? 0 : -1}
            onClick={() => setIsDrawerOpen(false)}
          >
            <MessageSquare className="nav-link-icon" /> Feedback
          </Link>
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
            tabIndex={isDrawerOpen ? 0 : -1}
            onClick={() => setIsDrawerOpen(false)}
          >
            <FileText className="nav-link-icon" /> Privacy
          </Link>
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
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-bottom-link ${active ? "mobile-bottom-link-active" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={() => setIsDrawerOpen(false)}
            >
              <Icon size={22} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </Fragment>
  );
}
