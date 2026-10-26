import type { ReactNode } from "react";
import NavBar from "./NavBar";

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <NavBar />
      <div className="app-content">
        <div className="app-main">{children}</div>
      </div>
    </div>
  );
}
