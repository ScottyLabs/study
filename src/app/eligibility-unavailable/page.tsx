"use client";

import "~/styles/globals.css";
import { RefreshCw, ShieldAlert } from "lucide-react";

import { SignOutButton } from "~/lib/auth-client";
import Link from "next/link";

export default function EligibilityUnavailablePage() {
  return (
    <div className="center-page">
      <div className="center-panel">
        <div className="mb-8 flex justify-center">
          <div className="avatar-icon-large">
            <ShieldAlert className="h-10 w-10 text-black dark:text-white" />
          </div>
        </div>

        <h1 className="access-title">Verification temporarily unavailable</h1>
        <p className="access-message">
          We could not verify your CMU student status right now. Please try
          again in a few minutes.
        </p>
        <div className="mt-8 flex justify-end gap-3">
          <Link href="/login" className="button-primary">
            <RefreshCw className="nav-link-icon" />
            Try again
          </Link>
          <SignOutButton>
            <button className="button-outline">Sign out</button>
          </SignOutButton>
        </div>

        <div className="mt-12 text-sm text-black opacity-70 dark:text-white">
          If this continues, please contact{" "}
          <Link
            href="mailto:cmustudy.help@gmail.com?subject=Student%20Eligibility%20Verification"
            className="inline-link"
          >
            cmustudy.help@gmail.com
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
