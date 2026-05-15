interface AuraLogoProps {
  size?: number;
  className?: string;
}

export default function AuraLogo({ size = 32, className }: AuraLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-aura.svg"
      width={size}
      height={size}
      alt="AURA"
      className={className}
      style={{ display: "inline-block", flexShrink: 0 }}
    />
  );
}
