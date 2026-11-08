"use client";

import { useEffect, useState } from "react";
import { getUserTheme, updateUserTheme } from "../services/profileService";
import type { ThemePreference } from "../types";

export function useUserTheme(userId?: string) {
  const [theme, setTheme] = useState<ThemePreference>("light");
  const [hasHydratedTheme, setHasHydratedTheme] = useState(false);

  useEffect(() => {
    const savedTheme: ThemePreference = localStorage.getItem("theme") === "dark" ? "dark" : "light";

    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
    setHasHydratedTheme(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedTheme) return;

    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [hasHydratedTheme, theme]);

  useEffect(() => {
    if (!userId) return;
    let ignored = false;

    const loadTheme = async () => {
      try {
        const loadedTheme = await getUserTheme();
        if (!ignored) {
          setTheme(loadedTheme);
        }
      } catch (error) {
        console.error("Error fetching theme:", error);
      }
    };

    void loadTheme();
    return () => {
      ignored = true;
    };
  }, [userId]);

  const toggleTheme = async () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);

    if (!userId) return;

    try {
      await updateUserTheme(nextTheme);
    } catch (error) {
      console.error("Error saving theme to DB:", error);
    }
  };

  return { theme, toggleTheme };
}
