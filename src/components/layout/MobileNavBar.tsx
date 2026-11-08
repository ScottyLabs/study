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
import { useUserTheme } from "~/features/profile/hooks/useUserTheme";
import { setIsCreateGroupModalOpen } from "~/lib/features/uiSlice";
import Link from "next/link";

const bottomItems = [
  { href: "/feed", label: "Find", page: "feed", icon: Search },
  { href: "/my-groups", label: "My Groups", page: "my-groups", icon: Users },
  { href: "/profile", label: "Profile", page: "profile", icon: User },
];

type DrawerState = { isOpen: boolean; close: () => void };

function MobileHeader({
  isOpen,
  toggle,
  close,
  page,
}: DrawerState & { toggle: () => void; page?: string }) {
  return (
    <header className="mobile-nav-bar">
      <button
        type="button"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-drawer"
        onClick={toggle}
        className="mobile-menu-button"
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      <Link href="/feed" className="mobile-brand" aria-label="CMU Study home" onClick={close}>
        <span>CMU</span> Study
      </Link>
      {page === "profile" && (
        <SignOutButton>
          <button type="button" className="mobile-logout-quick">
            <LogOut size={18} /> Log out
          </button>
        </SignOutButton>
      )}
    </header>
  );
}

function DrawerLinks({ isOpen, close, userId }: DrawerState & { userId?: string }) {
  const { theme, toggleTheme } = useUserTheme(userId);
  const tabIndex = isOpen ? 0 : -1;
  return (
    <nav className="mobile-drawer-links">
      <Link href="/feed" className="nav-link" tabIndex={tabIndex} onClick={close}>
        <Search className="nav-link-icon" /> Group Finder
      </Link>
      <Link href="/my-groups" className="nav-link" tabIndex={tabIndex} onClick={close}>
        <Users className="nav-link-icon" /> My Groups
      </Link>
      <a
        href="https://forms.gle/MEQ7miCZCrC48P6y8"
        target="_blank"
        rel="noopener noreferrer"
        className="nav-link"
        tabIndex={tabIndex}
        onClick={close}
      >
        <MessageSquare className="nav-link-icon" /> Feedback
      </a>
      <Link
        href="/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="nav-link"
        tabIndex={tabIndex}
        onClick={close}
      >
        <FileText className="nav-link-icon" /> Privacy
      </Link>
      <button
        type="button"
        onClick={() => {
          void toggleTheme();
        }}
        className="nav-link"
        tabIndex={tabIndex}
      >
        {theme === "light" ? <Moon className="nav-link-icon" /> : <Sun className="nav-link-icon" />}
        {theme === "light" ? "Dark mode" : "Light mode"}
      </button>
    </nav>
  );
}

function MobileDrawer({ isOpen, close }: DrawerState) {
  const { user } = useUser();
  const userId = user?.emailAddresses[0]?.emailAddress;
  const dispatch = useDispatch();
  return (
    <aside
      id="mobile-nav-drawer"
      className={`mobile-drawer ${isOpen ? "mobile-drawer-open" : ""}`}
      aria-hidden={!isOpen}
    >
      <div className="mobile-drawer-header">
        <strong>{user?.fullName ?? user?.firstName ?? "CMU student"}</strong>
        <small>{userId}</small>
      </div>
      <button
        type="button"
        className="sidebar-create-button"
        tabIndex={isOpen ? 0 : -1}
        onClick={() => {
          dispatch(setIsCreateGroupModalOpen(true));
          close();
        }}
      >
        <Plus size={19} /> New group
      </button>
      <DrawerLinks isOpen={isOpen} close={close} userId={userId} />
      <SignOutButton>
        <button type="button" className="sidebar-logout" tabIndex={isOpen ? 0 : -1}>
          <LogOut size={18} /> Log out
        </button>
      </SignOutButton>
    </aside>
  );
}

function BottomNav({ page, close }: { page?: string; close: () => void }) {
  return (
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
            onClick={close}
          >
            <Icon size={22} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function MobileNavBar() {
  const route = usePathname().split("/")[1];
  const page = route === "groups" ? "feed" : route;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const close = () => {
    setIsDrawerOpen(false);
  };

  return (
    <Fragment>
      <MobileHeader
        isOpen={isDrawerOpen}
        close={close}
        toggle={() => {
          setIsDrawerOpen((open) => !open);
        }}
        page={page}
      />

      {isDrawerOpen && (
        <button
          type="button"
          className="mobile-drawer-backdrop"
          onClick={close}
          aria-label="Close navigation menu"
        />
      )}

      <MobileDrawer isOpen={isDrawerOpen} close={close} />
      <BottomNav page={page} close={close} />
    </Fragment>
  );
}
