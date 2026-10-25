"use client";

import { Suspense } from "react";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  CheckSquare,
  Clock,
  MapPin,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { SignedIn, SignedOut, SignInButton, useUser } from "~/lib/auth-client";

import { destinationQuery, groupDestination } from "~/lib/group-destination";
import Link from "next/link";

const previewGroups = [
  {
    course: "15-112",
    title: "Principles of Imperative Computation",
    schedule: "Tue 7:00 - 8:30 PM",
    location: "Wean 5213",
    seats: "12 / 16",
    status: "Open",
  },
  {
    course: "21-127",
    title: "Great Theoretical Ideas in CS",
    schedule: "Wed 6:00 - 7:30 PM",
    location: "GHC 4401",
    seats: "9 / 14",
    status: "Open",
  },
  {
    course: "36-200",
    title: "Probability & Statistics",
    schedule: "Thu 7:30 - 9:00 PM",
    location: "Posner 413",
    seats: "7 / 12",
    status: "Filling",
  },
];

function HomePageContent() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginUrl = `/login${destinationQuery(groupDestination(searchParams.get("next")))}`;
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setIsRedirecting(true);
    router.replace(loginUrl);
  }, [user, router, loginUrl]);

  return (
    <div className="landing-page">
      <SignedOut>
        <header className="landing-nav">
          <Link href="/" className="landing-brand">
            <span>CMU</span> Study
          </Link>
          <nav className="landing-nav-actions">
            <SignInButton forceRedirectUrl={loginUrl}>
              <button type="button" className="landing-signin">
                Sign in
              </button>
            </SignInButton>
            <SignInButton forceRedirectUrl={loginUrl}>
              <button type="button" className="button-primary">
                Create account
              </button>
            </SignInButton>
          </nav>
          <SignInButton forceRedirectUrl={loginUrl}>
            <button type="button" className="landing-mobile-signin">
              Sign in
            </button>
          </SignInButton>
        </header>

        <main className="landing-main">
          <section className="landing-hero">
            <h1>
              Find your people.
              <br />
              Get the work done.
            </h1>
            <p>Create or join study groups for your CMU courses.</p>
            <div className="landing-actions">
              <SignInButton forceRedirectUrl={loginUrl}>
                <button type="button" className="button-large">
                  Find a study group
                </button>
              </SignInButton>
              <SignInButton forceRedirectUrl={loginUrl}>
                <button
                  type="button"
                  className="button-outline landing-secondary"
                >
                  Get started
                </button>
              </SignInButton>
            </div>
          </section>

          <section className="landing-browser" aria-label="Study group preview">
            <div className="landing-browser-heading">
              <h2>Browse study groups</h2>
            </div>
            <div className="landing-browser-tools">
              <div className="landing-search">
                <Search size={18} />
                <span>Search courses or keywords</span>
              </div>
              <div className="landing-filter">All courses</div>
              <div className="landing-filter">Upcoming</div>
            </div>
            <div className="landing-group-list">
              {previewGroups.map((group) => (
                <article key={group.course} className="landing-group-row">
                  <div className="landing-course-code">{group.course}</div>
                  <div className="landing-group-name">
                    <strong>{group.title}</strong>
                    <span>
                      <span
                        className={
                          group.status === "Filling"
                            ? "status-filling"
                            : "status-open"
                        }
                      >
                        {group.status}
                      </span>{" "}
                      {group.seats} members
                    </span>
                  </div>
                  <div className="landing-group-meta">
                    <span>
                      <Clock size={16} />
                      {group.schedule}
                    </span>
                    <span>
                      <MapPin size={16} />
                      {group.location}
                    </span>
                  </div>
                  <div className="landing-avatar-stack">
                    <i>AK</i>
                    <i>MS</i>
                    <i>JL</i>
                  </div>
                  <button type="button">View group</button>
                </article>
              ))}
            </div>
          </section>

          <section className="landing-features">
            <article>
              <Users />
              <div>
                <h3>Find your people</h3>
                <p>Connect with classmates in your courses.</p>
              </div>
            </article>
            <article>
              <CalendarDays />
              <div>
                <h3>Coordinate easily</h3>
                <p>Plan sessions around your schedule.</p>
              </div>
            </article>
            <article>
              <CheckSquare />
              <div>
                <h3>Stay organized</h3>
                <p>Keep every group in one place.</p>
              </div>
            </article>
            <article>
              <ShieldCheck />
              <div>
                <h3>Built for CMU</h3>
                <p>Private, focused, and student-first.</p>
              </div>
            </article>
          </section>
        </main>
        <footer className="landing-footer">
          <span>CMU Study</span>
          <Link href="/privacy">Privacy</Link>
        </footer>
      </SignedOut>

      <SignedIn>
        {isRedirecting && (
          <div className="redirect-state">
            <div className="loading-mark" />
            <strong>Welcome back</strong>
            <span>Opening CMU Study...</span>
          </div>
        )}
      </SignedIn>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<p role="status">Loading...</p>}>
      <HomePageContent />
    </Suspense>
  );
}
