# AURA · Visual Design Direction

작성: 2026-05-07
참조: `aura-app-design-system/assets/tokens.css`, `aura-app-design-system/CLAUDE.md`, `aura-app-design-system/SKILL.md`

## 1. 의도

AURA는 일일 브리핑 + 대화형 비서 앱이다. 시각 언어는 다음 세 가지 인상을 동시에 전달해야 한다.

| 인상 | 의미 | 적용 |
|---|---|---|
| **새벽이 밝아 오는 빛** (Aurora) | 하루의 시작/통찰 | 그라데이션 hero, 펄스 애니메이션 |
| **물리적 부피감 있는 카드** | 손에 잡히는 정보 | 큰 라운드 코너(18~22), soft shadow |
| **단조롭지 않은 정적 상태** | 관찰하는 재미 | 로딩/대기 화면의 미세 모션, 타이핑 인디케이터 |

레퍼런스 이미지(파란 그라데이션 + 흰 카드 + 둥근 탭 바)를 받아들이되, 기존 Aurora 보라(#6B5BFF) 브랜드 색을 보존해 hybrid한다 — hero는 보라→시안 그라데이션, 본문은 lightness 높은 white/elevated.

## 2. 색 시스템 (현행 + 보강)

source of truth: `aura-app-design-system/assets/tokens.css`. 본 문서는 적용 가이드.

### 핵심 4 역할
| 역할 | Light | Dark | 용도 |
|---|---|---|---|
| **Aurora 보라** | `#6B5BFF` | `#8E76FF` | 브랜드, 주요 CTA, 강조 |
| **Calm 시안** | `#34D2FF` | (TBD) | 보조 hero gradient end |
| **Warm 오렌지** | `#FF8A4C` | (TBD) | 메일/긴급 서브 톤 |
| **Urgent 레드** | `#FF3B5C` | `#FF8FA3` | 도착 임박 등 위험·긴급 |

### Hero gradient (신규 정형화)
브리핑 헤더, 환영 배너, 로딩 오브 등에서만 사용. 한 화면 1번만.
```
linear-gradient(135deg, var(--aurora) 0%, #8E76FF 45%, var(--calm) 100%)
```
이미 `--grad-aurora`로 tokens.css에 정의됨. RN 미러는 LinearGradient 패키지 도입 후 적용 예정 (Phase 2).

### 표면 톤
- `background` (페이지) → `surface` (카드) → `elevated` (모달) — 1단계씩 밝거나(다크: 어둡거나) 더 채도가 낮음.

## 3. 컴포넌트 가이드

### 3.1 Primary Button (CTA)
- 배경: `colors.accent` (Aurora 보라)
- 텍스트: `colors.accentText`
- shadow: aurora 색의 `0 6px 12px rgba(107,91,255, 0.24)` (light) / 0.20 (dark)
- borderRadius: **18**
- min-height: **56**
- 비활성: `colors.lineStrong` 배경, shadow 0 — `primaryButtonDisabled` (이미 추가됨).

### 3.2 Card
- 배경: `colors.surface`
- borderRadius: **22** (대형) / **16** (보조)
- 1px border `colors.line`
- shadow: 매우 얕게(`sh-1`) — 떠 있는 느낌만

### 3.3 Hero
- 화면 상단 그라데이션 영역. 배경 `--grad-aurora`. 흰 텍스트 + 큰 타이틀.
- 한 앱 화면당 1회만 사용 (브리핑 헤더, 환영 배너 등). 남용 금지.

### 3.4 Bottom Tab Bar
참조 이미지처럼 아이콘 + 라벨. 활성 탭은 accent로 칠하고 인디케이터 dot 옵션. 5탭 고정(메일/일정/뉴스/Aura/설정). Phase 3에서 정리.

### 3.5 Loading 표시 (보는 맛)
- **풀 스크린 로딩** (Phase 1 적용 완료):
  - 중앙에 Aura 아이콘 PNG (`@features/app/assets/aura-icon.png`, `Image/AuraIcon/playstore.png` 원본)
  - 아이콘 본체: scale `0.94 ↔ 1.08`, opacity `0.85 ↔ 1.0` 동기 펄스
  - 뒤편 후광(halo): accent 색 원, scale `1.0 ↔ 1.25`, opacity `0.32 ↔ 0`로 expand-fade — 호흡감
  - 사이클 1.8s, `Easing.inOut(Easing.quad)`, `useNativeDriver: true` (60fps 보장)
  - 캡션 "Aura를 시작하는 중..." 아래 배치
- **버튼 인라인**: 기존 `ActivityIndicator` (변경 없음).
- **Chat typing**: spinner + "Aura가 답변을 작성하는 중..." (이미 적용).

## 4. 적용 단계 (phased)

| Phase | 범위 | 변경 |
|---|---|---|
| **1** ✅ | LoadingScreen | 로고 펄스 애니메이션 (Animated only, 의존성 추가 X) |
| **2** ✅ | LinearGradient 도입 | `react-native-linear-gradient` deps + `<HeroGradient>` 컴포넌트, SignIn hero + LoadingScreen full-fill 적용 |
| **3** ✅ | Bottom Tab 리프레시 | 활성 탭 위 22×3 accent 인디케이터 바 + 활성 아이콘/라벨 accent 컬러 |
| 4 | Card / Button 톤 강화 | Primary CTA 그림자/사이즈 통일, card 라운드 22로 통일 |
| **5** ✅ | Hero pattern 화면별 적용 | mail/todo/news/settings hero를 HeroWaveDecoration → HeroGradient 교체 |
| 6 | Empty state 일러스트 | 메일 0건/뉴스 0건 등에서 simple SVG/이모지 hero |

각 phase는 독립 PR로 가능.

## 5. 체크리스트 (구현 시)

- [ ] 새 컴포넌트는 hex 인라인 금지 — `theme.colors.*`만.
- [ ] Hero/그라데이션은 한 화면당 1회 미만.
- [ ] 다크모드 토큰 동시 정의 (light → dark variant 즉시 추가).
- [ ] 새 색 추가 시 4역할(Aurora/Calm/Warm/Urgent) 안에 머무를 것.
- [ ] tokens.css 변경 시 `front/src/features/app/styles/theme.tsx` 동기.
- [ ] 모션은 60fps 보장 — `useNativeDriver: true` 가능한 transform/opacity만.

## 6. 참조

- `aura-app-design-system/assets/tokens.css` — 토큰 정의
- `aura-app-design-system/SKILL.md` — 디자인 시스템 사용 룰
- `aura-app-design-system/references/components.md` — 부품 카탈로그
- `aura-app-design-system/references/patterns.md` — 화면 패턴 (브리핑/뉴스/메일/채팅/설정/온보딩/긴급알림)
- `front/src/features/app/styles/theme.tsx` — RN 토큰 미러
- `front/src/features/app/styles/blocks/{shell,content,interactive}.ts` — 블록별 스타일

## 7. 결정 로그

- 2026-05-07: 본 문서 신설 + Phase 1 (LoadingScreen 로고 펄스) 적용.
- 2026-05-07: Phase 2 적용 — `react-native-linear-gradient ^2.8.3` + `<HeroGradient>` 컴포넌트 신설 (`features/app/components/hero-gradient.tsx`). SignIn hero(panel variant) + LoadingScreen 풀 fill 적용. tokens.css의 `--grad-aurora`(aurora→aurora-light→calm)를 RN으로 미러. Hero 위 텍스트는 흰색/반투명 흰색 톤(`*OnGradient` 스타일).
- 2026-05-07: Kakao 네이티브 init 크래시 회피 — Info.plist에 `KAKAO_APP_KEY` placeholder 추가. RNKakaoLogins.swift는 부팅 시 자동 init되며 nil 강제 언래핑이 발생. 검수 통과 시 실제 native app key로 교체.
- 2026-05-07: Phase 3 적용 — Bottom Tab 활성 인디케이터(22×3 accent 바) + 활성 탭 아이콘/라벨 accent 컬러. `bottomNavItemActive`(accentSoft pill) 제거하고 시각적으로 더 명확.
- 2026-05-07: Phase 5 적용 — mail/todo/news/settings 4개 화면의 `HeroWaveDecoration`을 `HeroGradient`로 일괄 교체. 흰색 hero 텍스트 톤 일관성. SignIn/LoadingScreen 포함 5개 화면이 동일 그라데이션 언어 사용.
- Aurora 브랜드 보라를 유지하기로 결정 (참조 이미지의 단순 블루로 갈지 두고 보았으나, 기존 토큰/마케팅 자산과의 정합 우선).
