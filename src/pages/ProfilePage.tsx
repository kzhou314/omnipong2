import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

type MemberProfile = {
  id: string;
  email: string;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  club_name: string | null;
  city: string | null;
  state: string | null;
  usatt_id: string | null;
  usatt_rating: number | null;
  membership_status: string;
  created_at: string;
  updated_at: string;
};

type ProfileForm = {
  firstName: string;
  lastName: string;
  phone: string;
  clubName: string;
  city: string;
  state: string;
  usattId: string;
  usattRating: string;
};

type FieldErrors = {
  usattId?: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "loaded"; profile: MemberProfile };

const emptyForm: ProfileForm = {
  firstName: "",
  lastName: "",
  phone: "",
  clubName: "",
  city: "",
  state: "",
  usattId: "",
  usattRating: "",
};

const PROFILE_AVATAR_BUCKET = "profile-avatars";

function toFormState(profile: MemberProfile): ProfileForm {
  return {
    firstName: profile.first_name ?? "",
    lastName: profile.last_name ?? "",
    phone: profile.phone ?? "",
    clubName: profile.club_name ?? "",
    city: profile.city ?? "",
    state: profile.state ?? "",
    usattId: profile.usatt_id ?? "",
    usattRating: profile.usatt_rating?.toString() ?? "",
  };
}

function normalizeUsattId(value: string) {
  return value.trim().toUpperCase();
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ProfilePage() {
  const auth = useAuth();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function fetchMemberProfile(userId: string) {
    const preferred = await supabase
      .from("members")
      .select(
        "id, email, avatar_url, first_name, last_name, phone, club_name, city, state, usatt_id, usatt_rating, membership_status, created_at, updated_at",
      )
      .eq("id", userId)
      .single<MemberProfile>();

    if (!preferred.error && preferred.data) {
      return preferred.data;
    }

    const fallback = await supabase
      .from("members")
      .select(
        "id, email, first_name, last_name, phone, club_name, city, state, usatt_id, usatt_rating, membership_status, created_at, updated_at",
      )
      .eq("id", userId)
      .single<
        Omit<MemberProfile, "avatar_url">
      >();

    if (fallback.error || !fallback.data) {
      throw preferred.error ?? fallback.error ?? new Error("Could not load your member profile.");
    }

    return {
      ...fallback.data,
      avatar_url: null,
    } satisfies MemberProfile;
  }

  async function loadProfile(userId: string) {
    setLoadState({ status: "loading" });
    try {
      const data = await fetchMemberProfile(userId);
      setLoadState({ status: "loaded", profile: data });
      setForm(toFormState(data));
    } catch (error) {
      setLoadState({
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Could not load your member profile.",
      });
    }
  }

  useEffect(() => {
    if (auth.status !== "authenticated") {
      return;
    }

    const userId = auth.user.id;
    let cancelled = false;

    async function runLoad() {
      setLoadState({ status: "loading" });
      try {
        const data = await fetchMemberProfile(userId);
        if (cancelled) {
          return;
        }
        setLoadState({ status: "loaded", profile: data });
        setForm(toFormState(data));
      } catch (error) {
        if (cancelled) {
          return;
        }
        setLoadState({
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "Could not load your member profile.",
        });
      }
    }

    void runLoad();

    return () => {
      cancelled = true;
    };
  }, [auth]);

  async function onAvatarSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || auth.status !== "authenticated" || loadState.status !== "loaded") {
      return;
    }

    setAvatarError(null);
    setFormError(null);
    setSuccessMessage(null);

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Profile images need to be 5 MB or smaller.");
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const objectPath = `${auth.user.id}/avatar-${Date.now()}.${extension}`;

    setUploadingAvatar(true);

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_AVATAR_BUCKET)
      .upload(objectPath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      setUploadingAvatar(false);
      setAvatarError(
        uploadError.message.includes("bucket")
          ? "Avatar upload is not configured yet. Run docs/supabase-profile-avatars.sql in Supabase first."
          : uploadError.message,
      );
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(objectPath);

    const { error: updateError } = await supabase
      .from("members")
      .update({
        avatar_url: `${publicUrl}?v=${Date.now()}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", auth.user.id);

    if (updateError) {
      setUploadingAvatar(false);
      setAvatarError(updateError.message);
      return;
    }

    await loadProfile(auth.user.id);
    await auth.refresh();
    setUploadingAvatar(false);
    setSuccessMessage("Profile photo updated.");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (auth.status !== "authenticated" || loadState.status !== "loaded") {
      return;
    }

    setFormError(null);
    setAvatarError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const normalizedUsattId = normalizeUsattId(form.usattId);
    const parsedUsattRating = Number(form.usattRating);

    if (!Number.isInteger(parsedUsattRating) || parsedUsattRating < 0) {
      setFormError("USATT rating must be a whole number.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("members")
      .update({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        phone: form.phone.trim(),
        club_name: form.clubName.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        usatt_id: normalizedUsattId,
        usatt_rating: parsedUsattRating,
        updated_at: new Date().toISOString(),
      })
      .eq("id", auth.user.id);

    if (error) {
      setSaving(false);

      if (error.code === "23505") {
        setFieldErrors({
          usattId: "Account with USATT ID already exists.",
        });
        return;
      }

      setFormError(error.message);
      return;
    }

    await loadProfile(auth.user.id);
    setSaving(false);
    setSuccessMessage("Profile updated.");
  }

  if (auth.status === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-400">
        Loading…
      </div>
    );
  }

  if (auth.status === "anonymous") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="rounded-2xl border border-white/10 bg-panel/90 p-8 text-center backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Member profile
          </p>
          <h1 className="font-display mt-3 text-4xl tracking-wide text-white">
            Sign in to view your profile
          </h1>
          <p className="mt-4 text-slate-400">
            This page pulls your member record directly from Supabase, so you
            need to be signed in first.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button to="/login" className="px-5 py-2.5">
              Sign in
            </Button>
            <Button to="/register" variant="secondary" className="px-5 py-2.5">
              Create account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loadState.status === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-400">
        Loading your member record…
      </div>
    );
  }

  if (loadState.status === "error") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="rounded-2xl border border-red-400/20 bg-panel/90 p-8 text-center backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
            Profile error
          </p>
          <h1 className="font-display mt-3 text-4xl tracking-wide text-white">
            We could not load your member record
          </h1>
          <p className="mt-4 text-sm text-red-300">{loadState.error}</p>
          <p className="mt-3 text-sm text-slate-400">
            The next thing we would check is whether the `members` row exists
            and whether the row-level security policies allow your user to read
            it.
          </p>
        </div>
      </div>
    );
  }

  const { profile } = loadState;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-white/10 bg-panel/90 p-6 backdrop-blur-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Member profile
          </p>
          <h1 className="font-display mt-3 text-4xl tracking-wide text-white">
            Edit your stored account details
          </h1>
          <p className="mt-4 max-w-2xl text-slate-400">
            Update the member information stored in Supabase. Email and
            membership status stay read-only here, while the rest of your player
            profile is editable.
          </p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-space/40 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Profile photo
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <UserAvatar
                firstName={profile.first_name}
                lastName={profile.last_name}
                email={profile.email}
                avatarUrl={profile.avatar_url}
                className="h-20 w-20"
                textClassName="text-xl"
              />
              <div className="space-y-3">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-space shadow-[0_0_20px_-4px_rgba(45,212,160,0.5)] transition hover:brightness-110">
                  {uploadingAvatar ? "Uploading…" : "Choose image"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => void onAvatarSelected(event)}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>
                <p className="text-xs text-slate-500">
                  Default fallback is your initials. Upload a square image for the cleanest result.
                </p>
              </div>
            </div>
            {avatarError ? (
              <p className="mt-3 text-sm font-medium text-red-400" role="alert">
                {avatarError}
              </p>
            ) : null}
          </div>

          <form onSubmit={(event) => void onSubmit(event)} className="mt-8 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  readOnly
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/50 px-3 py-2.5 text-sm text-slate-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Membership status
                </label>
                <input
                  type="text"
                  value={profile.membership_status}
                  readOnly
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/50 px-3 py-2.5 text-sm capitalize text-slate-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  First name
                </label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Last name
                </label>
                <input
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Phone
                </label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Club name
                </label>
                <input
                  type="text"
                  required
                  value={form.clubName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      clubName: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  City
                </label>
                <input
                  type="text"
                  required
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  State
                </label>
                <input
                  type="text"
                  required
                  value={form.state}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      state: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  USATT ID
                </label>
                <input
                  type="text"
                  required
                  value={form.usattId}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      usattId: event.target.value,
                    }));
                    setFieldErrors((current) => ({
                      ...current,
                      usattId: undefined,
                    }));
                  }}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                />
                {fieldErrors.usattId ? (
                  <p className="mt-1 text-xs font-medium text-red-400" role="alert">
                    {fieldErrors.usattId}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  USATT rating
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={form.usattRating}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      usattRating: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                />
              </div>
            </div>

            {formError ? (
              <p className="text-sm font-medium text-red-400" role="alert">
                {formError}
              </p>
            ) : null}

            {successMessage ? (
              <p className="text-sm font-medium text-accent" role="status">
                {successMessage}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" className="px-6 py-3" disabled={saving}>
                {saving ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </form>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-dashed border-accent/25 bg-panel-muted/60 p-6">
            <h2 className="font-display text-2xl tracking-wide text-white">
              Member record
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              <li>Created: {formatTimestamp(profile.created_at)}</li>
              <li>Last updated: {formatTimestamp(profile.updated_at)}</li>
              <li>Edits save directly back into your Supabase `members` table.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-panel/90 p-6 backdrop-blur-sm">
            <h2 className="font-display text-2xl tracking-wide text-white">
              Validation notes
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              The `USATT ID` must stay unique. If another member already owns
              it, you will see the same small red inline error style that the
              signup form uses.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
