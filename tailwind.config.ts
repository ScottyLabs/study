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
      white: "rgb(var(--color-white-rgb) / <alpha-value>)",
      black: "rgb(var(--color-black-rgb) / <alpha-value>)",
      lightText: "var(--color-light-text)",
      darkText: "var(--color-dark-text)",

      // light mode
      lightbg: "rgb(var(--color-light-background-rgb) / <alpha-value>)",
      lightSidebar: "var(--color-light-sidebar)",
      lightAccent: "var(--color-light-accent)",
      lightSelected: "rgb(var(--color-light-selected-rgb) / <alpha-value>)",
      lightButton: "var(--color-light-button)",
      lightButtonHover: "var(--color-light-button-hover)",
      lightInput: "var(--color-light-input)",
      lightSubtleBorder: "var(--color-light-subtle-border)",

      //dark mode
      darkbg: "rgb(var(--color-dark-background-rgb) / <alpha-value>)",
      darkSidebar: "rgb(var(--color-dark-sidebar-rgb) / <alpha-value>)",
      darkAccent: "var(--color-dark-accent)",
      darkSelected: "rgb(var(--color-dark-selected-rgb) / <alpha-value>)",
      darkButton: "var(--color-dark-button)",
      darkButtonHover: "var(--color-dark-button-hover)",
      darkInput: "var(--color-dark-input)",
      darkSubtleBorder: "var(--color-dark-subtle-border)",

      lightSuccessBackground: "var(--color-light-success-background)",
      darkSuccessBackground: "var(--color-dark-success-background)",
      lightSuccessBorder: "var(--color-light-success-border)",
      darkSuccessBorder: "var(--color-dark-success-border)",
      lightSuccessText: "var(--color-light-success-text)",
      darkSuccessText: "var(--color-dark-success-text)",
      lightSuccessHighlight: "var(--color-light-success-highlight)",
      darkSuccessHighlight: "var(--color-dark-success-highlight)",
      lightSuccessStrongBorder: "var(--color-light-success-strong-border)",
      darkSuccessStrongBorder: "var(--color-dark-success-strong-border)",
      lightJoined: "var(--color-light-joined-background)",
      darkJoined: "var(--color-dark-joined-background)",
      lightJoinedText: "var(--color-light-joined-text)",
      darkJoinedText: "var(--color-dark-joined-text)",
      lightWarningBackground: "var(--color-light-warning-background)",
      darkWarningBackground: "var(--color-dark-warning-background)",
      lightWarningText: "var(--color-light-warning-text)",
      darkWarningText: "var(--color-dark-warning-text)",
      lightWarningAccent: "var(--color-light-warning-accent)",
      darkWarningAccent: "var(--color-dark-warning-accent)",
      lightControlBorder: "var(--color-light-control-border)",
      darkControlBorder: "var(--color-dark-control-border)",
    },
  },
  plugins: [require("@tailwindcss/aspect-ratio")],
} satisfies Config;
