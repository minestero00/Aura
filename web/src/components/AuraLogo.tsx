import { useId } from "react";

interface AuraLogoProps {
  size?: number;
  className?: string;
}

export default function AuraLogo({ size = 32, className }: AuraLogoProps) {
  const uid = useId();
  const gid = `ag${uid.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "inline-block", flexShrink: 0 }}
      aria-label="AURA"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6B5BFF" />
          <stop offset=".55" stopColor="#8E76FF" />
          <stop offset="1" stopColor="#34D2FF" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill={`url(#${gid})`} />
      <path
        d="M22 42 L32 18 L42 42 M26.5 33 H37.5"
        stroke="#fff"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
