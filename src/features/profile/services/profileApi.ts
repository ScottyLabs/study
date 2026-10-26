import { apiRequest } from "~/lib/api/client";
import { notifyGroupsChanged } from "~/features/groups/services/groupApi";
import type { ProfileDetails, ThemePreference } from "../types";

type ProfileResponse = {
  profile: ProfileDetails & { theme: ThemePreference };
};

export async function fetchProfile() {
  const response = await apiRequest<ProfileResponse>("/api/v1/me/profile", {
    cache: "no-store",
  });
  return response.profile;
}

export async function updateProfile(updates: Partial<ProfileDetails>) {
  const response = await apiRequest<ProfileResponse>("/api/v1/me/profile", {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return response.profile;
}

export async function fetchTheme() {
  const profile = await fetchProfile();
  return profile.theme;
}

export async function updateTheme(theme: ThemePreference) {
  await apiRequest("/api/v1/me/theme", {
    method: "PATCH",
    body: JSON.stringify({ theme }),
  });
}

export async function fetchCourseCodes() {
  const response = await apiRequest<{ courseCodes: string[] }>(
    "/api/v1/me/courses",
    { cache: "no-store" },
  );
  return response.courseCodes;
}

export async function addCourseCode(courseCode: string) {
  await apiRequest("/api/v1/me/courses", {
    method: "POST",
    body: JSON.stringify({ courseCode }),
  });
}

export async function deleteCourseCode(courseCode: string) {
  await apiRequest(`/api/v1/me/courses/${encodeURIComponent(courseCode)}`, {
    method: "DELETE",
  });
}

export async function fetchBlockingState() {
  return apiRequest<{
    blockedByMe: string[];
    blockedByThem: string[];
    joinedGroups: string[];
  }>("/api/v1/me/blocking", { cache: "no-store" });
}

export async function fetchBlockImpact(email: string) {
  return apiRequest<{ sharedGroupCount: number }>(
    `/api/v1/me/blocks/${encodeURIComponent(email)}/impact`,
    { cache: "no-store" },
  );
}

export async function blockEmail(email: string) {
  const response = await apiRequest<{ calendarEventIds: string[] }>(
    "/api/v1/me/blocks",
    {
    method: "POST",
    body: JSON.stringify({ email }),
    },
  );
  notifyGroupsChanged();
  return response;
}

export async function unblockEmail(email: string) {
  await apiRequest(`/api/v1/me/blocks/${encodeURIComponent(email)}`, {
    method: "DELETE",
  });
}
