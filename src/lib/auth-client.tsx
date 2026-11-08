"use client";

import type { ReactNode } from "react";
import { cloneElement, isValidElement, useEffect, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { apiRequest } from "~/lib/api/client";

type CompatUser = {
  emailAddresses: Array<{ emailAddress: string }>;
  firstName?: string;
  fullName: string;
  id: string;
  imageUrl?: string;
  andrewID?: string;
  username?: string;
};

type ButtonProps = {
  children: ReactNode;
};

type SignInButtonProps = ButtonProps & {
  forceRedirectUrl?: string;
};

type SignInElementProps = {
  "aria-busy"?: boolean;
  "aria-label"?: string;
  children?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  andrewID: string | null;
};

// one request per page load, shared by every useUser caller
let sessionUser: Promise<SessionUser | null> | undefined;

function loadSessionUser() {
  sessionUser ??= apiRequest<{ user: SessionUser | null }>("/api/auth/session", {
    cache: "no-store",
  })
    .then((body) => body.user)
    .catch((error: unknown) => {
      sessionUser = undefined;
      console.error("Session lookup failed:", error);
      return null;
    });
  return sessionUser;
}

function forgetSessionUser() {
  sessionUser = undefined;
}

function getCompatUser(user: SessionUser | null): CompatUser | null {
  if (!user) {
    return null;
  }

  const firstName = user.name.split(" ").find((part) => part !== "");
  const andrewID = user.andrewID ?? undefined;

  return {
    id: user.id,
    fullName: user.name,
    firstName,
    andrewID,
    username: andrewID,
    imageUrl: user.image ?? undefined,
    emailAddresses: [{ emailAddress: user.email }],
  };
}

function withClickHandler(children: ReactNode, onClick: () => void | Promise<void>): ReactNode {
  const runClickHandler = () => {
    void Promise.resolve(onClick()).catch((error) => {
      console.error("Auth click handler failed:", error);
    });
  };

  if (!isValidElement<{ onClick?: () => void }>(children)) {
    return (
      <button type="button" onClick={runClickHandler}>
        {children}
      </button>
    );
  }

  return cloneElement(children, {
    onClick: () => {
      children.props.onClick?.();
      runClickHandler();
    },
  });
}

export function useUser() {
  const [session, setSession] = useState<{
    isLoaded: boolean;
    user: SessionUser | null;
  }>({ isLoaded: false, user: null });

  useEffect(() => {
    let active = true;
    void loadSessionUser().then((user) => {
      if (active) setSession({ isLoaded: true, user });
    });
    return () => {
      active = false;
    };
  }, []);

  const user = useMemo(() => getCompatUser(session.user), [session.user]);

  return {
    user,
    isLoaded: session.isLoaded,
    isSignedIn: Boolean(user),
  };
}

export function SignedIn({ children }: ButtonProps) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return children;
}

export function SignedOut({ children }: ButtonProps) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded || isSignedIn) {
    return null;
  }

  return children;
}

export function SignInButton({ children, forceRedirectUrl = "/login" }: SignInButtonProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = () => {
    if (isSigningIn) return;

    setIsSigningIn(true);
    window.location.assign(`/api/auth/login?next=${encodeURIComponent(forceRedirectUrl)}`);
  };

  const spinner = <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />;

  if (!isValidElement<SignInElementProps>(children)) {
    return (
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isSigningIn}
        aria-busy={isSigningIn}
        aria-label={isSigningIn ? "Signing in" : undefined}
      >
        {isSigningIn ? spinner : children}
      </button>
    );
  }

  return cloneElement(children, {
    "aria-busy": isSigningIn,
    "aria-label": isSigningIn ? "Signing in" : undefined,
    disabled: Boolean(children.props.disabled) || isSigningIn,
    onClick: () => {
      if (isSigningIn) return;
      children.props.onClick?.();
      handleSignIn();
    },
    children: isSigningIn ? spinner : children.props.children,
  });
}

export function SignOutButton({ children }: ButtonProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    forgetSessionUser();
    router.push("/");
    router.refresh();
  };

  return withClickHandler(children, handleSignOut);
}
