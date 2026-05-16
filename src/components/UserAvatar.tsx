import { useMemo, useState } from "react";

type UserAvatarProps = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  className?: string;
  textClassName?: string;
};

export function getUserDisplayName({
  firstName,
  lastName,
  email,
}: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  const name = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");
  if (name) {
    return name;
  }

  if (email?.trim()) {
    return email.trim().split("@")[0] ?? email.trim();
  }

  return "Member";
}

export function getUserInitials({
  firstName,
  lastName,
  email,
}: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  const first = firstName?.trim();
  const last = lastName?.trim();

  if (first && last) {
    return `${first[0]}${last[0]}`.toUpperCase();
  }

  if (first) {
    return first.slice(0, 2).toUpperCase();
  }

  if (email?.trim()) {
    const cleaned = email.trim().split("@")[0]?.replace(/[^a-zA-Z0-9]/g, "") ?? "";
    return cleaned.slice(0, 2).toUpperCase() || "ME";
  }

  return "ME";
}

export function UserAvatar({
  firstName,
  lastName,
  email,
  avatarUrl,
  className = "h-10 w-10",
  textClassName = "text-sm",
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = useMemo(
    () => getUserInitials({ firstName, lastName, email }),
    [firstName, lastName, email],
  );

  if (avatarUrl && !imageFailed) {
    return (
      <span
        className={`inline-flex overflow-hidden rounded-full ring-1 ring-white/10 ${className}`}
      >
        <img
          src={avatarUrl}
          alt={getUserDisplayName({ firstName, lastName, email })}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-accent/25 to-white/5 font-semibold uppercase tracking-wide text-accent ring-1 ring-white/10 ${className} ${textClassName}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
