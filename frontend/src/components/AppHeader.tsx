import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import "./AppHeader.css";

interface AppHeaderProps {
  children?: ReactNode;
  navigationLabel?: string;
}

function BrainLogo() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg
        className="brand-logo-icon"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20.5 9.5c-4.4-3.6-10.5-.3-10.1 5.2-4.1 1.1-5.3 6.4-2.1 9.1-2.2 3.7.1 8.6 4.5 8.8.9 4.2 6.2 5.3 8.9 2.1V13.2c0-1.5-.4-2.8-1.2-3.7Z"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M27.5 9.5c4.4-3.6 10.5-.3 10.1 5.2 4.1 1.1 5.3 6.4 2.1 9.1 2.2 3.7-.1 8.6-4.5 8.8-.9 4.2-6.2 5.3-8.9 2.1V13.2c0-1.5.4-2.8 1.2-3.7Z"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M14 18h6M12 25h8M16 32h4M34 18h-6M36 25h-8M32 32h-4"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function AppHeader({
  children,
  navigationLabel = "Application navigation",
}: AppHeaderProps) {
  return (
    <header className="site-header">
      <div className="header-content">
        <Link
          className="brand"
          to="/"
          aria-label="Decision Study home"
        >
          <BrainLogo />

          <span className="brand-text">
            <span className="brand-title">
              Decision Study
            </span>

            <span className="brand-subtitle">
              Human vs Machine
            </span>
          </span>
        </Link>

        {children && (
          <nav aria-label={navigationLabel}>
            {children}
          </nav>
        )}
      </div>
    </header>
  );
}

export default AppHeader;
