"use client";

import { useState } from "react";

type UserAvatarProps = {
  user?: {
    image?: unknown;
    imageUrl?: string | null;
    firstName?: string | null;
  } | null;
  label?: string;
  size?: "sm" | "lg";
};

type AvatarImageProps = {
  src?: string | null;
  alt: string;
  fallbackText?: string;
  size?: "sm" | "lg";
};

export function AvatarImage({
  src,
  alt,
  fallbackText = "Profile",
  size = "sm",
}: AvatarImageProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const sizeClass = size === "lg" ? "avatar-large" : "avatar-small";
  const fallbackClass =
    size === "lg" ? "avatar-fallback-large" : "avatar-fallback";
  const initial = fallbackText[0] ?? "P";

  if (src && !hasImageError) {
    return (
      <img
        src={src}
        alt={alt}
        className={sizeClass}
        onError={() => setHasImageError(true)}
      />
    );
  }

  return <div className={fallbackClass}>{initial}</div>;
}

export function UserAvatar({
  user,
  label = "Profile",
  size = "sm",
}: UserAvatarProps) {
  const fallbackClass =
    size === "lg" ? "avatar-fallback-large" : "avatar-fallback";
  const labelClass = size === "lg" ? "avatar-label-large" : "avatar-label";
  const initial = user?.firstName?.[0] ?? label[0];

  if (user?.imageUrl) {
    return (
      <AvatarImage
        src={user.imageUrl}
        alt={label}
        fallbackText={initial}
        size={size}
      />
    );
  }

  if (user) {
    return <div className={fallbackClass}>{initial}</div>;
  }

  return <div className={labelClass}>{label}</div>;
}
