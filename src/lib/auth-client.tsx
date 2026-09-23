"use client";

import type { ReactElement, ReactNode } from "react";
import { cloneElement, isValidElement, useMemo, useState } from "react";
import { createAuthClient } from "better-auth/react";
import {
  genericOAuthClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

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

export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? `${window.location.origin}/api/auth`
      : `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/api/auth`,
  plugins: [
    genericOAuthClient(),
    inferAdditionalFields({
      user: {
        andrewID: {
          type: "string",
          required: false,
        },
      },
    }),
  ],
});

function getCompatUser(
  session: ReturnType<typeof authClient.useSession>["data"],
): CompatUser | null {
  if (!session?.user) {
    return null;
  }

  const name = session.user.name ?? "";
  const firstName = name.split(" ").filter(Boolean)[0];
  const andrewID = session.user.andrewID ?? undefined;

  return {
    id: session.user.id,
    fullName: name,
    firstName,
    andrewID,
    username: andrewID,
    imageUrl: session.user.image ?? undefined,
    emailAddresses: [{ emailAddress: session.user.email }],
  };
}

function withClickHandler(
  children: ReactNode,
  onClick: () => void | Promise<void>,
): ReactNode {
  const runClickHandler = () => {
    void Promise.resolve(onClick()).catch((error) => {
      console.error("Auth click handler failed:", error);
    });
  };

  if (!isValidElement(children)) {
    return (
      <button type="button" onClick={runClickHandler}>
        {children}
      </button>
    );
  }

  const element = children as ReactElement<{ onClick?: () => void }>;

  return cloneElement(element, {
    onClick: () => {
      element.props.onClick?.();
      runClickHandler();
    },
  });
}

export function useUser() {
  const session = authClient.useSession();
  const user = useMemo(() => getCompatUser(session.data), [session.data]);

  return {
    user,
    isLoaded: !session.isPending,
    isSignedIn: Boolean(user),
  };
}

export function SignedIn({ children }: ButtonProps) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return <>{children}</>;
}

export function SignedOut({ children }: ButtonProps) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded || isSignedIn) {
    return null;
  }

  return <>{children}</>;
}

export function SignInButton({
  children,
  forceRedirectUrl = "/login",
}: SignInButtonProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    if (isSigningIn) return;

    setIsSigningIn(true);
    try {
      await authClient.signIn.oauth2({
        providerId: "keycloak",
        callbackURL: forceRedirectUrl,
      });
    } catch (error) {
      console.error("Auth click handler failed:", error);
      setIsSigningIn(false);
    }
  };

  const spinner = (
    <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
  );

  if (!isValidElement(children)) {
    return (
      <button
        type="button"
        onClick={() => void handleSignIn()}
        disabled={isSigningIn}
        aria-busy={isSigningIn}
        aria-label={isSigningIn ? "Signing in" : undefined}
      >
        {isSigningIn ? spinner : children}
      </button>
    );
  }

  const element = children as ReactElement<SignInElementProps>;

  return cloneElement(element, {
    "aria-busy": isSigningIn,
    "aria-label": isSigningIn ? "Signing in" : undefined,
    disabled: Boolean(element.props.disabled) || isSigningIn,
    onClick: () => {
      if (isSigningIn) return;
      element.props.onClick?.();
      void handleSignIn();
    },
    children: isSigningIn ? spinner : element.props.children,
  });
}

export function SignOutButton({ children }: ButtonProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  return <>{withClickHandler(children, handleSignOut)}</>;
}
