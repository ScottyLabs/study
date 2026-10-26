import axios from "axios";

import {
  fetchProfile,
  fetchTheme,
  updateProfile,
  updateTheme,
} from "./profileApi";
import type {
  Course,
  ProfileDetails,
  ProfileSummary,
  ThemePreference,
} from "../types";

export const defaultProfileDetails: ProfileDetails = {
  year: "default",
  majors: "",
  minors: "",
};

export async function getUserProfileDetails(): Promise<ProfileDetails> {
  const profile = await fetchProfile();
  return {
    year: profile.year,
    majors: profile.majors,
    minors: profile.minors,
  };
}

export async function getUserProfileSummary(): Promise<ProfileSummary> {
  const profile = await getUserProfileDetails();
  return {
    year: profile.year,
    majors: profile.majors,
    minors: profile.minors,
  };
}

export async function updateUserProfileDetails(
  updates: Partial<ProfileDetails>,
) {
  await updateProfile(updates);
}

export async function getAllCourses(): Promise<Course[]> {
  const response = await axios.get<Course[]>(
    "https://course.apis.scottylabs.org/courses/all",
  );
  return response.data;
}

export async function getUserTheme(): Promise<ThemePreference> {
  return fetchTheme();
}

export async function updateUserTheme(theme: ThemePreference) {
  await updateTheme(theme);
}
