"use client";

import "~/styles/globals.css";
import Image from "next/image";
import darkLogo from "~/image/darkLogoLarge.png";
import lightLogo from "~/image/lightLogoLarge.png";
import { ShieldAlert } from "lucide-react";
import { SignOutButton } from "~/lib/auth-client";
import Link from "next/link";

export default function AccessRestrictedPage() {
  return (
    <div className="center-page">
      <div className="center-panel">
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <Image
            className="hidden dark:block"
            src={darkLogo}
            alt="CMU Study Logo"
            width={500}
            height={250}
            priority
          />
          <Image
            className="block dark:hidden"
            src={lightLogo}
            alt="CMU Study Logo"
            width={500}
            height={250}
            priority
          />
        </div>

        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="avatar-icon-large">
            <ShieldAlert className="h-10 w-10 text-black dark:text-white" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="access-title">Access Restricted</h1>

        {/* Message */}
        <p className="access-message">
          This platform is intended exclusively for CMU students.
          <br />
          Faculty members are not permitted to access or use this application.
        </p>
        <br />
        <div className="ml-auto">
          <SignOutButton>
            <button className="button-primary">Home</button>
          </SignOutButton>
        </div>

        {/* Subtle footer note */}
        <div className="mt-12 text-sm text-black opacity-70 dark:text-white">
          If you believe you reached this page in error, please contact{" "}
          <a
            href="mailto:cmustudy.help@gmail.com?subject=Access%20Restriction%20Issue"
            className="inline-link"
          >
            cmustudy.help@gmail.com
          </a>
          .
        </div>
      </div>
    </div>
  );
}
