# `aura-app-design-system/` — Design System (UI tokens + components)

## 책임
- AURA 모든 화면의 색·폰트·라운드·간격·컴포넌트 토큰 single source of truth.
- 웹 프로토타입(HTML/CSS)과 React Native 앱(`front/src/features/app/styles/theme.ts`)이 모두 이 토큰을 따라간다.

## 파일 맵
```
aura-app-design-system/
├── SKILL.md                  ← 디자인 시스템 사용 규칙 (이걸 먼저 읽기)
├── assets/
│   ├── tokens.css            ← 모든 CSS 변수
│   ├── base.css              ← 컴포넌트 클래스
│   └── logo.svg
├── templates/
│   ├── starter.html          ← 모바일 앱 프레임 시작점
│   └── minimal.html          ← 1장짜리 문서 시작점
└── references/
    ├── components.md         ← 부품 카탈로그
    └── patterns.md           ← AURA 화면 패턴 (브리핑/뉴스/메일/채팅/설정/온보딩/긴급알림)
```

## 절대 금지
- 토큰 외 hex/px 값을 base.css 또는 새 컴포넌트에 인라인. 항상 `var(--...)`.
- 새 색을 SKILL.md의 "색의 역할 분담" 4역할(AURORA / INK / CALM / WARM / URGENT) 밖에서 추가.
- 카카오/네이버 등 한국 커머스용 소셜 컬러를 가져오기. AURA는 Google 단일 로그인.
- `aurora-hero` (그라데이션) 한 화면에 2번 이상 사용.

## 항상 지킬 것
- 토큰을 추가/변경하면 `front/src/features/app/styles/theme.ts`도 함께 수정.
- 새 컴포넌트는 (1) `base.css`에 클래스 추가 → (2) `references/components.md`에 사용 예 추가 → (3) `front/`의 `blocks/`에서 RN 스타일로 미러.
- 다크 모드 색은 `tokens.css`의 `[data-theme='dark']` 블록 또는 RN의 `darkTheme`에서만 다룸.
- 새 화면 패턴이 reusable하다 싶으면 `references/patterns.md`에 한 단원으로 추가.
