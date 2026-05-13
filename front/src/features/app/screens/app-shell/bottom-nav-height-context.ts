import React from "react";

/**
 * AppShell이 BottomNav onLayout 측정값을 여기에 저장. 모달/시트 등이 nav 위에
 * 정확히 정렬되어야 할 때 hook으로 읽는다. AppShell 아래 어디서든 안전하게 사용 가능.
 * 측정 전 기본값은 0 — 측정 직후 첫 layout 통지로 갱신.
 */
export const BottomNavHeightContext = React.createContext<number>(0);

export function useBottomNavHeight(): number {
  return React.useContext(BottomNavHeightContext);
}
