"use client";

import { useEffect, useRef, useState } from "react";
import { SignOutButton, useUser } from "~/lib/auth-client";
import { UserAvatar } from "./UserAvatar";
import Link from "next/link";

type ProfileMenuProps = {
  containerClassName?: string;
};

export function ProfileMenu({
  containerClassName = "profile-menu-container",
}: ProfileMenuProps) {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={menuRef} className={containerClassName}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="avatar-button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <UserAvatar user={user} />
      </button>
      {isOpen && (
        <div className="profile-menu">
          <Link
            href="/profile"
            className="profile-menu-item"
            onClick={() => setIsOpen(false)}
          >
            Profile
          </Link>
          <SignOutButton>
            <button type="button" className="profile-menu-item">
              Logout
            </button>
          </SignOutButton>
        </div>
      )}
    </div>
  );
}
