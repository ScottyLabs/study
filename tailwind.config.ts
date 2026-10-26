import { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";
import {
  DESKTOP_LAYOUT_QUERY,
  MOBILE_LAYOUT_QUERY,
} from "./src/lib/responsive";

export default {
  content: ["./src/**/*.tsx"],
  darkMode: "class",
  safelist: [
    "bg-lightAccent",
    "dark:bg-darkAccent",
    "bg-lightSidebar",
    "dark:bg-darkSidebar",
  ],
  theme: {
    extend: {
      screens: {
        desktop: { raw: DESKTOP_LAYOUT_QUERY },
        compact: { raw: MOBILE_LAYOUT_QUERY },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...fontFamily.sans],
      },
    },
    colors: {
      transparent: "transparent",
      white: "#FFFFFF",
      black: "#000000",
      lightText: "#111827",
      darkText: "#F9FAFB",

      // light mode
      lightbg: "#F6F6F4",
      lightSidebar: "#FFFFFF",
      lightAccent: "#F9ECEF",
      lightSelected: "#C41230",
      lightButton: "#C41230",
      lightInput: "#FFFFFF",

      //dark mode
      darkbg: "#111214",
      darkSidebar: "#191B1F",
      darkAccent: "#3A2027",
      darkSelected: "#FF6B7D",
      darkButton: "#E33A52",
      darkInput: "#202328",

      // green joined label
      joined: "#ECFDF3",
      joinedText: "#067647",
    },
  },
  plugins: [require("@tailwindcss/aspect-ratio")],
} satisfies Config;
