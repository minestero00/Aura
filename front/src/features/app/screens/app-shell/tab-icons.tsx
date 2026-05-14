import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

interface TabIconProps {
  color: string;
  size?: number;
}

// Line 아이콘 5종. Phosphor 톤 (stroke 1.75, round). 24×24 viewBox.
// active 여부에 따라 stroke 색만 바뀐다 — fill은 항상 none.

export function MailIcon({ color, size = 22 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3}
        y={5.5}
        width={18}
        height={13}
        rx={2.5}
        stroke={color}
        strokeWidth={1.75}
      />
      <Path
        d="M3.5 7.5L12 13.5L20.5 7.5"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TodoIcon({ color, size = 22 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3}
        y={5}
        width={18}
        height={16}
        rx={2.5}
        stroke={color}
        strokeWidth={1.75}
      />
      <Path
        d="M3 10H21M8 3V7M16 3V7"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
      <Circle cx={8.5} cy={14.5} r={1} fill={color} />
      <Circle cx={12} cy={14.5} r={1} fill={color} />
      <Circle cx={15.5} cy={14.5} r={1} fill={color} />
    </Svg>
  );
}

export function NewsIcon({ color, size = 22 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 4H17C18.1 4 19 4.9 19 6V19C19 20.1 19.9 21 21 21H6C4.34 21 3 19.66 3 18V6C3 4.9 3.9 4 5 4Z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <Path
        d="M19 8V19"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
      <Path
        d="M7 8H15M7 12H15M7 16H12"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Aura — 채팅 + sparkle. 브랜드 톤이 들어가는 유일한 탭.
export function AskIcon({ color, size = 22 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 11.5C21 15.9 17 19.5 12 19.5C10.6 19.5 9.3 19.2 8.1 18.7L3.5 20L4.7 16C3.8 14.7 3 13.2 3 11.5C3 7.1 7 3.5 12 3.5C17 3.5 21 7.1 21 11.5Z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <Path
        d="M12 8L12.8 10.2L15 11L12.8 11.8L12 14L11.2 11.8L9 11L11.2 10.2L12 8Z"
        fill={color}
      />
    </Svg>
  );
}

export function SettingsIcon({ color, size = 22 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.75} />
      <Path
        d="M12 2L13.5 4.5L16.5 4L17 7L19.5 8.5L18.5 11.5L20 14L18 16L19 19L16 19.5L14.5 22L12 21L9.5 22L8 19.5L5 19L6 16L4 14L5.5 11.5L4.5 8.5L7 7L7.5 4L10.5 4.5L12 2Z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Solo bottom-nav indicator용 — settings sub-section(예: wallet) 진입 시 BottomNav
// 중앙에 단독 표시. NavExpandDrawer의 wallet SVG와 동일 path.
export function WalletIcon({ color, size = 22 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={6} width={18} height={13} rx={2.5} stroke={color} strokeWidth={1.75} />
      <Path d="M3 9h18" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Path d="M16.5 13h2" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Path
        d="M7 6V4.5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 19 4.5V6"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Transit sub-section indicator icon — 위치/도착 알림 의미. Pin shape.
export function TransitIcon({ color, size = 22 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s-7-7.5-7-12.5a7 7 0 1 1 14 0C19 13.5 12 21 12 21Z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={9} r={2.5} stroke={color} strokeWidth={1.75} />
    </Svg>
  );
}

export type TabIconKey = "mail" | "todo" | "news" | "ask" | "settings";
export type SoloIconKey = "wallet" | "transit";

export const TAB_ICONS: Record<
  TabIconKey,
  React.ComponentType<TabIconProps>
> = {
  mail: MailIcon,
  todo: TodoIcon,
  news: NewsIcon,
  ask: AskIcon,
  settings: SettingsIcon
};

export const SOLO_ICONS: Record<
  SoloIconKey,
  React.ComponentType<TabIconProps>
> = {
  wallet: WalletIcon,
  transit: TransitIcon
};
