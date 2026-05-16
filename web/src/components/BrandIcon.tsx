/**
 * Brand glyphs for integration cards.
 * Single-file SVGs with accurate brand colors — no external icon font/dep.
 */

interface Props {
  name:
    | "google-calendar"
    | "local-calendar"
    | "gmail"
    | "slack"
    | "github"
    | "anthropic"
    | "openweather";
  size?: number;
}

export default function BrandIcon({ name, size = 40 }: Props) {
  switch (name) {
    case "google-calendar":
      return <GoogleCalendar size={size} />;
    case "local-calendar":
      return <LocalCalendar size={size} />;
    case "gmail":
      return <Gmail size={size} />;
    case "slack":
      return <Slack size={size} />;
    case "github":
      return <GitHub size={size} />;
    case "anthropic":
      return <Anthropic size={size} />;
    case "openweather":
      return <OpenWeather size={size} />;
  }
}

function GoogleCalendar({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <path fill="#fff" d="M148.882 43.618l-47.368-5.263-57.895 5.263L38.355 96.25l5.264 52.632 52.631 6.579 52.632-6.579 5.263-53.947z" />
      <path fill="#1A73E8" d="M65.211 125.276c-3.934-2.658-6.658-6.539-8.158-11.671l9.132-3.763c.836 3.184 2.296 5.651 4.378 7.401 2.069 1.75 4.589 2.618 7.539 2.618 3.013 0 5.598-.916 7.756-2.749s3.243-4.168 3.243-6.997c0-2.894-1.137-5.255-3.41-7.085S80.4 100.3 77.067 100.3h-5.276v-9.039h4.737c2.869 0 5.288-.776 7.256-2.329 1.967-1.553 2.949-3.677 2.949-6.381 0-2.408-.882-4.327-2.645-5.762-1.763-1.434-3.997-2.158-6.711-2.158-2.65 0-4.755.703-6.316 2.119-1.561 1.417-2.692 3.158-3.395 5.224l-9.039-3.763c1.158-3.276 3.276-6.171 6.368-8.671 3.092-2.5 7.046-3.763 11.842-3.763 3.553 0 6.75.685 9.579 2.066 2.829 1.382 5.052 3.296 6.658 5.737 1.605 2.453 2.408 5.197 2.408 8.243 0 3.105-.75 5.737-2.25 7.908-1.5 2.17-3.342 3.829-5.526 4.987v.526a16.683 16.683 0 016.842 5.276c1.789 2.394 2.684 5.263 2.684 8.605s-.842 6.342-2.526 9c-1.684 2.658-4.026 4.737-7.013 6.342-3 1.605-6.368 2.421-10.105 2.421-4.329.013-8.342-1.316-12.276-3.974zM131.447 79.408l-9.974 7.25-5.013-7.605 17.974-12.974h6.895v61.197h-9.882z" />
      <path fill="#EA4335" d="M148.882 196.711L196.25 149.342l-23.684-10.526-23.684 10.526-10.526 23.684z" />
      <path fill="#34A853" d="M27.434 172.566l10.526 23.685h110.921v-46.908H38.355z" />
      <path fill="#4285F4" d="M11.645 3.355C6.566 3.355 2.5 7.42 2.5 12.5v136.842l23.685 10.526 22.171-10.526v-105.13l10.527-23.685L37.487 3.355z" />
      <path fill="#188038" d="M2.5 149.342v37.763c0 5.079 4.066 9.145 9.145 9.145h37.763l-1.487-25.171L38.355 149.342l-25.171-1.487z" />
      <path fill="#FBBC04" d="M148.882 43.618V149.342H196.25V43.618l-25.171-1.487z" />
      <path fill="#1967D2" d="M196.25 43.618V12.5c0-5.079-4.066-9.145-9.145-9.145H49.408v40.263z" />
    </svg>
  );
}

function LocalCalendar({ size }: { size: number }) {
  // Generic device calendar — iOS-ish white sheet with red header strip
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      {/* Rings */}
      <rect x="13" y="2" width="3" height="8" rx="1.5" fill="#3A3D52" />
      <rect x="32" y="2" width="3" height="8" rx="1.5" fill="#3A3D52" />
      {/* Sheet */}
      <rect x="6" y="6" width="36" height="38" rx="5" fill="#fff" stroke="#E2E3EC" strokeWidth="1.5" />
      {/* Header band */}
      <path d="M6 11a5 5 0 015-5h26a5 5 0 015 5v5H6v-5z" fill="#FF3B30" />
      {/* Day number */}
      <text
        x="24"
        y="36"
        textAnchor="middle"
        fontFamily="-apple-system, system-ui, sans-serif"
        fontSize="16"
        fontWeight="700"
        fill="#0F1226"
      >
        17
      </text>
    </svg>
  );
}

function Gmail({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 193" aria-hidden>
      <path fill="#4285F4" d="M58.182 192.05V93.14L27.507 65.077 0 49.504v125.091c0 9.658 7.825 17.455 17.455 17.455z" />
      <path fill="#34A853" d="M197.818 192.05h40.727c9.659 0 17.455-7.826 17.455-17.455V49.505l-31.156 17.837-27.026 25.798z" />
      <path fill="#EA4335" d="M58.182 93.14L54.024 54.66l4.158-36.797L128 70.45l69.818-52.585 4.654 34.687-4.654 40.586L128 145.726z" />
      <path fill="#FBBC04" d="M197.818 17.862V93.14L256 49.504V26.595c0-21.21-24.21-33.272-41.207-20.51z" />
      <path fill="#C5221F" d="M0 49.504l26.759 20.075L58.182 93.14V17.862L41.207 6.085C24.18-6.677 0 5.385 0 26.595z" />
    </svg>
  );
}

function Slack({ size }: { size: number }) {
  // Tight viewBox around actual paths (70-197 range) so icon fills the box
  return (
    <svg width={size} height={size} viewBox="68 68 132 132" aria-hidden>
      <path fill="#E01E5A" d="M99.4 151.2c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9 5.8-12.9 12.9-12.9h12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9z" />
      <path fill="#36C5F0" d="M118.8 99.4c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9 12.9 5.8 12.9 12.9v12.9zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H86.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9z" />
      <path fill="#2EB67D" d="M170.6 118.8c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9h-12.9zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V86.5c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9z" />
      <path fill="#ECB22E" d="M151.2 170.6c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9v-12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9z" />
    </svg>
  );
}

function GitHub({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#181717"
        d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
      />
    </svg>
  );
}

function Anthropic({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 176" aria-hidden>
      <path
        fill="#D97757"
        d="M147.486 0h32.355L256 175.515h-32.355zM75.871 0L0 175.515h33.038L48.55 137.07h79.408l15.512 38.445h33.038L100.65 0zm-16.74 109.84L86.06 43.673l26.93 66.167z"
      />
    </svg>
  );
}

function OpenWeather({ size }: { size: number }) {
  // Simple sun + cloud composition in OpenWeather's brand orange
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <circle cx="32" cy="16" r="7" fill="#FCC02E" />
      <g stroke="#FCC02E" strokeWidth="2" strokeLinecap="round">
        <line x1="32" y1="3" x2="32" y2="6" />
        <line x1="32" y1="26" x2="32" y2="29" />
        <line x1="19" y1="16" x2="22" y2="16" />
        <line x1="42" y1="16" x2="45" y2="16" />
        <line x1="22.8" y1="6.8" x2="24.9" y2="8.9" />
        <line x1="39.1" y1="23.1" x2="41.2" y2="25.2" />
        <line x1="22.8" y1="25.2" x2="24.9" y2="23.1" />
        <line x1="39.1" y1="8.9" x2="41.2" y2="6.8" />
      </g>
      <path
        fill="#5A8DEE"
        d="M11 24c-4.4 0-8 3.6-8 8 0 4.4 3.6 8 8 8h22c3.9 0 7-3.1 7-7s-3.1-7-7-7c-.7 0-1.3.1-1.9.3-1.2-4.7-5.5-8.3-10.6-8.3-5.3 0-9.7 3.8-10.7 8.8-.1-.1-.5-.8-1.8.2z"
      />
    </svg>
  );
}
