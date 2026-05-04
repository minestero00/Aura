---
name: aura-design-system
description: AURA(Ai for User Reliable Assistant) 모바일/웹 화면용 공식 디자인 시스템. 일일 뉴스 브리핑, Gmail 다이제스트, 캘린더+이동시간 안내, AI 채팅(Aura Chat) 등 정보 요약·대화·맥락 알림을 다루는 모든 화면의 톤을 통일시키는 시스템. "AURA", "오로라 톤", "브리핑/메일/뉴스/채팅 카드", "AI 비서 화면", "출발 알림" 같은 요청에서 반드시 트리거됩니다. 색은 인디고-퍼플(--aurora) + Calm cyan + Warm orange의 3색 역할 분담을 따르고, 디자인 시스템을 재작성하지 말고 토큰(tokens.css) · 베이스(base.css) · 로고(logo.svg) · 템플릿(starter.html/minimal.html)과 references/의 화면 패턴을 그대로 활용해 주세요.
---

# AURA · Design System Skill

AURA의 모든 화면은 이 스킬 한 벌로 찍습니다. 이커머스 디자인이 아니라 **정보 요약 · 맥락 알림 · AI 대화** 톤입니다. 화면이 100개로 늘어나도 같은 색·같은 폰트·같은 라운드·같은 버튼이 나오게 토큰화되어 있습니다.

> **범위 — UI 전용**
> 이 스킬은 **구조·색·타이포·컴포넌트·레이아웃**만 다룹니다. 브리핑 헤드라인·이메일 요약 문구·CTA 라벨 같은 **본문은 백엔드(Anthropic 요약)나 사용자가 채워넣습니다**. 모든 템플릿/패턴의 텍스트는 `{헤드라인}`, `{불릿}`, `{CTA}` 같은 placeholder로 비워둡니다.

## 이 스킬의 3가지 핵심

1. **토큰 중심**: 색·폰트·사이즈는 `assets/tokens.css`의 CSS 변수(`var(--aurora)`, `var(--ink)`, `var(--r-md)`...)로만 참조합니다. 하드코딩 금지.
2. **재사용 자산**: 로고는 `<symbol id="aura">`로 한 번만 선언, `<use href="#aura"/>`로 꺼내 씁니다. 컴포넌트는 `base.css`의 클래스를 조합합니다.
3. **템플릿 시작점**: 새 화면은 항상 `templates/starter.html`(모바일 앱 프레임) 또는 `templates/minimal.html`(문서/랜딩)을 복사해서 시작합니다.

---

## 색의 역할 분담 (이게 AURA의 톤 전부)

- **AURORA (인디고-퍼플 #6B5BFF)** — 브랜드 시그니처. 로고, "새로운 인사이트" 표시, 보내기 버튼, AI 답변 강조. 차분한 발견의 색.
- **INK (#0F1226)** — 행동의 표면. 일반 CTA 블랙(약간 푸른빛). 결제·구매가 아니라 "확인", "다음", "저장" 같은 일상 행동.
- **CALM (#34D2FF)** — 정보·뉴스 보조 컬러. news-card 호버, 정보성 alert.
- **WARM (#FF8A4C)** — 메일·일정·시간 임박 보조 컬러. mail-card 라벨.
- **URGENT (#FF3B5C)** — "지금 출발해야 합니다", "긴급 메일", 거절 — 진짜 위급할 때만.
- **STAGE (화이트/--gray-100)** — 콘텐츠의 무대. 카드·차트·텍스트가 주인공이 되도록 UI는 조용한 배경.

CTA 위계:
- 기본 CTA = **INK 블랙**(`.btn.btn-primary`).
- 강조 CTA = **AURORA**(`.btn-aurora`). "지금 출발", "새 브리핑 받기", "Aura에게 묻기" 같은 발견의 순간 한 번만.
- 위험 = **DANGER**(`.btn-danger`). "연결 해제", "삭제".

---

## 언제 이 스킬을 쓰는가

AURA 컨텍스트에서 UI를 만들면 **무조건** 트리거.

- 일일 브리핑 홈, 뉴스 카드 리스트, 메일 다이제스트, 메일 답장 초안, 캘린더 + 이동시간 카드, 날씨 카드, 채팅 화면, 설정(통합/권한/사용량), 온보딩(Google 로그인), 임박 알림, 사용량(quota) 페이지
- "AURA 화면 만들어줘", "오로라 톤으로 ___", "브리핑 카드", "메일 카드", "채팅 화면", "출발 알림 카드", "사용량 페이지"
- 설령 "디자인 시스템"이라는 말이 없어도 AURA 맥락의 UI라면 켭니다.

---

## 워크플로우 (화면 1개 만들 때)

### Step 1 · 템플릿 선택

| 상황 | 템플릿 |
|---|---|
| 모바일 앱 화면 (홈/브리핑/메일/채팅/설정/온보딩) | `templates/starter.html` |
| 랜딩, 약관, 사용량 영수증 1장짜리 | `templates/minimal.html` |

### Step 2 · 로고 심볼 확인

`<body>` 최상단에 로고 심볼이 들어 있어야 합니다 (템플릿에 이미 포함):

```html
<svg xmlns="http://www.w3.org/2000/svg" style="display:none;" aria-hidden="true">
  <symbol id="aura" viewBox="0 0 64 64">
    <!-- assets/logo.svg의 path 그대로 -->
  </symbol>
</svg>
```

렌더:

```html
<svg style="width:24px;height:24px;color:var(--aurora);"><use href="#aura"/></svg>
```

### Step 3 · 화면 조립

가까운 패턴을 순서대로 찾습니다:

1. **AURA 핵심 화면**(브리핑 홈·뉴스·메일·채팅·캘린더+이동·설정·사용량) → `references/patterns.md`
2. **부품 단위 조립** → `references/components.md`

### Step 4 · 세부 톤 (실수 금지 리스트)

- 한 화면 한 메시지 — 메일 카드 옆에 광고/판촉 섞지 않습니다.
- 숫자(시간·도착·온도·토큰)는 `.num` 또는 `font-variant-numeric: tabular-nums` 적용.
- Aurora gradient(`--grad-aurora`)는 **브리핑 헤더**나 **온보딩 환영 배너**처럼 결정적 한 장면에만. 일반 카드 배경에 쓰지 않습니다.
- 숫자형 카운터(quota saturation)는 `.progress`(잉크) 또는 `.progress > i { background: var(--aurora); }` (강조). 빨강은 `.progress > i { background: var(--urgent); }` 90% 이상에서만.
- 한국어 본문은 Pretendard Variable 단독. 한글이 깨질 만한 시스템 폰트로 절대 fallback 금지.
- 카드 사이 간격은 `--s-3`(12px) 기본, 그룹 간격은 `--s-6`(24px).
- 메일 카드의 `unread`는 좌측 3px 인디케이터(`border-left: 3px solid var(--aurora)`)로만. 배경색을 통째로 바꾸지 않습니다.

### Step 5 · 마감 체크리스트

1. 로고는 `<use href="#aura"/>`로 그렸나? (이미지 파일/가짜 로고 금지)
2. 색은 전부 `var(--...)` 토큰? (`#6B5BFF` 같은 hex 인라인 금지)
3. 기본 CTA는 INK 블랙? AURORA는 결정적 강조에만?
4. Pretendard Variable이 로드되어 있나?
5. 메일 카드의 unread는 좌측 3px 라인으로만?
6. 화면 하단 탭바 라벨/순서는 표준인가? (홈 · 뉴스 · 메일 · 채팅 · 설정)

---

## 파일 맵

```
aura-app-design-system/
├── SKILL.md                         ← 이 문서
├── assets/
│   ├── logo.svg                     ← 단일 SVG 로고 (currentColor + aurora-grad)
│   ├── tokens.css                   ← CSS 변수 (색/폰트/간격/라운드/그림자/모션, 다크 테마 포함)
│   └── base.css                     ← 베이스 리셋 + 모든 컴포넌트 클래스
├── templates/
│   ├── starter.html                 ← 모바일 앱 프레임 (iPhone mock + 5탭)
│   └── minimal.html                 ← 1장짜리 문서 (랜딩/사용량 영수증)
└── references/
    ├── components.md                ← 부품 (버튼·폼·카드·바텀시트·얼럿·채팅 입력…)
    └── patterns.md                  ← AURA 화면 (브리핑 홈·뉴스·메일·채팅·캘린더·설정·사용량·온보딩)
```

---

## 핵심 토큰 (암기용 요약)

| 역할 | 토큰 | 값 |
|---|---|---|
| 시그니처 인디고-퍼플 | `var(--aurora)` | `#6B5BFF` |
| 정보(뉴스) 보조 | `var(--calm)` | `#34D2FF` |
| 메일/시간 보조 | `var(--warm)` | `#FF8A4C` |
| 기본 잉크 (CTA 블랙) | `var(--ink)` | `#0F1226` |
| 페이지 배경 | `var(--gray-100)` | `#F7F8FB` |
| 검색/입력 fill | `var(--gray-150)` | `#F4F4F8` |
| 긴급 | `var(--urgent)` | `#FF3B5C` |
| 기본 CTA 라운드 | `var(--r-md)` | `12px` |
| 바텀시트 라운드 | `var(--r-2xl)` | `28px` |
| 칩/검색바 라운드 | `var(--r-full)` | `999px` |
| 폰트 | `var(--font)` | Pretendard Variable |
| Aurora glow | `var(--glow-aurora)` | `0 0 0 4px rgba(107,91,255,.18)` |

---

## 새 컴포넌트가 필요할 때

1. 색은 변수로 (`var(--aurora)`, `var(--ink)`...)
2. 라운드는 7단 중에서 (`--r-xs` ~ `--r-full`)
3. 간격은 4px 기반 (`--s-1` ~ `--s-20`)
4. 모션은 `var(--d-fast)` / `var(--d-base)` + `var(--ease)`
5. 폰트 크기는 타입 스케일 내에서 (`--fs-d1` ~ `--fs-3xs`)

재사용성이 있다면 `base.css`에 추가하고 `references/components.md`에 스니펫을 덧붙입니다.

---

## 왜 이렇게까지 규칙을 박아두는가

AURA는 **사용자가 행동을 거의 안 할수록 좋은 앱**입니다. 화면을 100개 만들어도 일관된 톤이 나와야 사용자가 학습 비용 없이 정보만 흡수합니다. 디자인 리뷰를 100번 하지 않으려고 이 토큰을 박아둔 겁니다.
