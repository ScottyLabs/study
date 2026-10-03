// app/privacy/page.tsx
"use client";

import React from "react";
import "~/styles/globals.css";

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <div className="privacy-card">
        <h1 className="privacy-title">Privacy Policy</h1>
        <p className="mb-12 text-center text-sm opacity-70">
          Effective Date: October 3, 2026
        </p>

        <section className="privacy-content">
          <p className="text-center text-lg opacity-90">
            <strong>CMU Study</strong> (&quot;we,&quot; &quot;our,&quot; or &quot;the app&quot;) uses the
            Google Calendar API solely to help users create and manage
            study-related events on their Google Calendar. This Privacy Policy
            explains what data we access, how we use it, how we store and
            protect it, and what control users have over their information.
          </p>

          {/* Data Accessed */}
          <div className="p-6">
            <h2 className="mb-3 text-2xl font-bold">Data Accessed</h2>

            <p>
              CMU Study only requests the minimum Google Calendar permissions
              necessary to function.
            </p>

            <h3 className="mt-4 font-semibold">Google User Data Accessed</h3>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>Permission to create new events on your Google Calendar</li>
              <li>Permission to delete events previously created by the app</li>
            </ul>

            <h3 className="mt-4 font-semibold">Data We Do Not Access</h3>
            <p className="mt-2">
              We do <strong>not</strong> read, view, or access:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>Existing events on your calendar</li>
              <li>Event titles, descriptions, times, or locations</li>
              <li>Attendee information</li>
              <li>Any other personal Google Calendar data</li>
            </ul>

            <p className="mt-3 opacity-90">
              No other Google user data is accessed beyond the limited scope
              described above.
            </p>
          </div>

          {/* How We Use Data */}
          <div className="p-6">
            <h2 className="mb-3 text-2xl font-bold">
              How We Use Google User Data
            </h2>

            <p>We use your granted calendar access solely to:</p>

            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Create events on your Google Calendar when you request it</li>
              <li>
                Delete events created by CMU Study if you choose to remove them
              </li>
            </ul>

            <p className="mt-4 opacity-90">
              We do <strong>not</strong>:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>Process, analyze, or scan your events</li>
              <li>Use your data for advertising or marketing</li>
              <li>Combine calendar data with any other data sources</li>
            </ul>

            <p className="mt-4 opacity-90">
              All event creation and deletion occurs only when you explicitly
              request it.
            </p>
          </div>

          {/* Data Stored */}
          <div className="p-6">
            <h2 className="mb-3 text-2xl font-bold">Data We Store</h2>

            <p>
              We store the <strong>event ID</strong> for each event created by
              CMU Study so the app can modify or delete it later. When you
              connect Google Calendar, we also store encrypted access and
              refresh tokens, their expiration information, granted permissions,
              and a Google account identifier when provided. These credentials
              let the server perform Calendar actions you request without asking
              you to reconnect each time an access token expires.
            </p>

            <p className="mt-4 opacity-90">
              We do <strong>not</strong> store:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>Event titles</li>
              <li>Event descriptions</li>
              <li>Dates, times, or locations</li>
              <li>Attendee lists</li>
              <li>Any personal Google Calendar content</li>
            </ul>
          </div>

          {/* Data Sharing */}
          <div className="p-6">
            <h2 className="mb-3 text-2xl font-bold">Data Sharing</h2>
            <p>
              We <strong>do not</strong> share, sell, or transmit any Google
              user data or stored event IDs to third parties.
            </p>

            <p className="mt-4">Your data is never shared with:</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>Advertisers</li>
              <li>Analytics providers</li>
              <li>External companies or researchers</li>
              <li>Any third-party service</li>
            </ul>

            <p className="mt-4 opacity-90">
              CMU Study operates independently and does not integrate with any
              third-party system that uses your data.
            </p>
          </div>

          {/* Data Storage & Protection */}
          <div className="p-6">
            <h2 className="mb-3 text-2xl font-bold">
              Data Storage & Protection
            </h2>

            <p>
              We use reasonable industry security measures to protect stored
              event IDs and Calendar connections, including:
            </p>

            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Secure server storage</li>
              <li>Encryption of Google access and refresh tokens</li>
              <li>Restricted internal access controls</li>
              <li>Logical and physical safeguards</li>
            </ul>

            <p className="mt-4 opacity-90">
              Google access and refresh tokens remain on the server and are
              never sent to your browser. Calendar requests use your connected
              account only for actions you initiate.
            </p>
          </div>

          {/* Data Retention & Deletion */}
          <div className="p-6">
            <h2 className="mb-3 text-2xl font-bold">
              Data Retention & Deletion
            </h2>

            <h3 className="font-semibold">How Long We Retain Data</h3>
            <p className="mt-2">
              Event IDs are retained only as long as needed to allow users to
              modify or delete events created by the app. They may be removed
              automatically when no longer necessary.
              Calendar connection credentials are retained to support those
              actions until deleted. Temporary authorization attempts expire
              after ten minutes and are removed during subsequent connection
              requests.
            </p>

            <h3 className="mt-4 font-semibold">User Data Deletion</h3>
            <p className="mt-2">
              You may request deletion of stored event IDs and Calendar
              connection credentials at any time by
              contacting:
              <br />
              <strong>cmustudy.help@gmail.com</strong>
            </p>

            <h3 className="mt-4 font-semibold">Revoking Access</h3>
            <p className="mt-2">
              You can revoke the app&apos;s access to your Google Account at any
              time via your{" "}
              <a
                href="https://myaccount.google.com/permissions"
                className="text-lightSelected hover:underline dark:text-darkSelected"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Account Permissions
              </a>{" "}
              page. After access is revoked, the app will no longer be able to
              create or delete events.
            </p>
          </div>

          {/* Changes */}
          <div className="p-6">
            <h2 className="mb-3 text-2xl font-bold">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Any revisions
              will be posted on this page with a new effective date.
            </p>
          </div>

          {/* Contact */}
          <div className="p-6">
            <h2 className="mb-3 text-2xl font-bold">Contact</h2>
            <p>
              For questions, support, or data deletion requests, please contact:
              <br />
              <strong>cmustudy.help@gmail.com</strong>
            </p>
          </div>
        </section>

        <footer className="mt-12 text-center text-sm opacity-70">
          &copy; {new Date().getFullYear()} CMU Study. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
