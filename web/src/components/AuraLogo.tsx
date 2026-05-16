import Image from "next/image";
import logoSrc from "@/app/logo-aura.png";

interface AuraLogoProps {
  size?: number;
  className?: string;
}

export default function AuraLogo({ size = 32, className }: AuraLogoProps) {
  return (
    <Image
      src={logoSrc}
      width={size}
      height={size}
      alt="AURA"
      className={className}
      style={{ display: "inline-block", flexShrink: 0 }}
    />
  );
}
