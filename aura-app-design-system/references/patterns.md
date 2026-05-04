# AURA · Screen Patterns

AURA의 핵심 화면 5+α 가지 패턴. 모두 `templates/starter.html`(모바일 프레임)을 베이스로 합니다.

---

## A. Briefing Home (앱 진입 화면)

상단 헤더(aurora-hero, 1회) → 새 브리핑 카드 → 빠른 액션(메일 답장 초안, 캘린더 다음 일정) → 사용량 요약.

```html
<section class="aurora-hero">
  <h1>안녕하세요, {이름} 님</h1>
  <div class="sub">오늘 메일 {N}건, 일정 {M}건 · 가장 임박한 일정까지 {분}분</div>
</section>

<div class="stack-v" style="padding:16px;">
  <article class="brief-card">
    <div class="head">
      <span class="badge">오늘의 브리핑</span>
      <span class="signal-dot"></span>
    </div>
    <h3>{헤드라인}</h3>
    <ul class="bullets">
      <li>{불릿 1}</li>
      <li>{불릿 2}</li>
      <li>{불릿 3}</li>
    </ul>
    <div class="foot">
      <span class="muted">오전 7:00 갱신 · 한국어</span>
      <button class="btn btn-ghost btn-sm">새로 받기</button>
    </div>
  </article>

  <!-- 캘린더 + 이동 -->
  <article class="card card-pad">
    <div class="stack-h" style="margin-bottom:8px;">
      <span class="tag-calendar">EVENT</span>
      <span class="muted t-xs">오후 2:00</span>
    </div>
    <h3 class="t-h3">{다음 일정}</h3>
    <div class="stack-h" style="margin-top:12px;">
      <span class="chip chip-aurora">대중교통 {N}분</span>
      <span class="chip">자차 {M}분</span>
    </div>
    <button class="btn btn-aurora btn-block" style="margin-top:16px;">길 안내 받기</button>
  </article>

  <!-- 메일 짧은 요약 -->
  <article class="brief-card">
    <div class="head">
      <span class="badge" style="color:var(--warm-600)">메일 요약</span>
    </div>
    <h3>{메일 헤드라인}</h3>
    <ul class="bullets"><!-- 2~3개 --></ul>
    <button class="btn btn-outline">전체 메일 보기</button>
  </article>
</div>
```

---

## B. News List (뉴스 화면)

상단 segmented (한국어/English) + chip-tabs (카테고리) + news-card 리스트.

```html
<header style="padding:16px 16px 8px;">
  <div class="segmented">
    <button class="active">한국어</button>
    <button>English</button>
  </div>
  <div class="chip-tabs" style="margin-top:10px;">
    <button class="active">전체</button>
    <button>경제</button>
    <button>스포츠</button>
    <button>IT</button>
    <button>+ 토픽 변경</button>
  </div>
</header>

<div class="stack-v" style="padding:0 16px 24px;">
  <article class="news-card">
    <div class="meta">
      <span class="tag-news">경제</span>
      <span class="muted num">10분 전</span>
      <span class="muted">{출처}</span>
    </div>
    <h4>{기사 제목}</h4>
  </article>
  <!-- 반복 -->
</div>
```

---

## C. Mail Digest (메일 화면)

탭(전체/중요/오늘) → mail-card 리스트. 답장 초안 sheet.

```html
<nav class="tabs">
  <button class="active">전체</button>
  <button>중요</button>
  <button>오늘</button>
</nav>

<div class="stack-v" style="padding:16px;">
  <article class="mail-card unread">
    <div class="ava">A</div>
    <div>
      <div class="meta">
        <span class="from">{보낸이}</span>
        <span class="muted num">{시간}</span>
      </div>
      <div class="subj">{제목}</div>
      <div class="snip">{스니펫}</div>
    </div>
  </article>
</div>

<!-- 답장 초안 바텀시트 -->
<div class="sheet">
  <div class="grabber"></div>
  <h5>답장 초안</h5>
  <div class="sub">{보낸이}에게 · AI 작성</div>
  <textarea class="textarea" rows="8">{초안 본문}</textarea>
  <div class="stack-h" style="margin-top:16px;">
    <button class="btn btn-soft">다시 만들기</button>
    <button class="btn btn-aurora btn-block">Gmail 임시보관함에 저장</button>
  </div>
</div>
```

---

## D. Aura Chat (채팅 화면)

상단 minimal 헤더 → bubble 리스트 → 하단 chat-input 고정.

```html
<header style="padding:14px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--gray-200);">
  <svg style="width:24px;height:24px;color:var(--aurora);"><use href="#aura"/></svg>
  <h2 class="t-h3">Aura</h2>
  <span class="muted t-xs" style="margin-left:auto;">오늘의 브리핑 기준 답변</span>
</header>

<main style="display:flex;flex-direction:column;gap:8px;padding:16px 16px 80px;flex:1;overflow-y:auto;">
  <div class="bubble ai">무엇을 도와드릴까요? 메일·뉴스·일정에 대해 물어보세요.</div>
  <div class="bubble me">오늘 가장 급한 메일 알려줘</div>
  <div class="bubble ai">
    {답변 본문}
    <span class="cite">📧 {출처 메일 제목}</span>
  </div>
</main>

<footer style="position:fixed;left:0;right:0;bottom:0;padding:12px 16px;background:var(--white);border-top:1px solid var(--gray-200);">
  <div class="chat-input">
    <textarea rows="1" placeholder="Aura에게 물어보세요"></textarea>
    <button class="send" aria-label="보내기">↑</button>
  </div>
</footer>
```

---

## E. Settings (설정 화면)

리스트 카드형 + switch.

```html
<div class="stack-v" style="padding:16px;">
  <article class="card card-pad">
    <h3 class="t-h3">통합</h3>
    <div class="stack-v" style="margin-top:12px;gap:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-weight:600;">Gmail</div>
          <div class="muted t-xs">{이메일} · 연결됨</div>
        </div>
        <button class="btn btn-soft btn-sm">관리</button>
      </div>
      <div class="divider"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-weight:600;">Google 캘린더</div>
          <div class="muted t-xs">읽기 전용</div>
        </div>
        <label class="switch"><input type="checkbox" checked><span class="track"></span><span class="thumb"></span></label>
      </div>
    </div>
  </article>

  <article class="card card-pad">
    <h3 class="t-h3">알림</h3>
    <div class="stack-v" style="margin-top:12px;gap:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-weight:600;">아침 브리핑 알림</div>
          <div class="muted t-xs">매일 오전 7:00</div>
        </div>
        <label class="switch"><input type="checkbox" checked><span class="track"></span><span class="thumb"></span></label>
      </div>
    </div>
  </article>

  <article class="card card-pad">
    <h3 class="t-h3">사용량 (오늘)</h3>
    <div class="stack-v" style="margin-top:12px;">
      <div>
        <div class="stack-h" style="justify-content:space-between;">
          <span class="t-sm">AI 토큰</span>
          <span class="num t-sm">{used}/{budget}</span>
        </div>
        <div class="progress" style="margin-top:6px;"><i style="width:{N}%"></i></div>
      </div>
      <div>
        <div class="stack-h" style="justify-content:space-between;">
          <span class="t-sm">채팅 요청</span>
          <span class="num t-sm">{used}/100</span>
        </div>
        <div class="progress" style="margin-top:6px;"><i style="width:{N}%"></i></div>
      </div>
    </div>
  </article>
</div>
```

---

## F. Onboarding (Google 로그인 1장)

```html
<main style="display:flex;flex-direction:column;justify-content:center;align-items:center;gap:24px;padding:48px 24px;text-align:center;flex:1;">
  <svg style="width:96px;height:96px;"><use href="#aura"/></svg>
  <div>
    <h1 class="t-d1">AURA</h1>
    <p class="t-body" style="margin-top:8px;">하루를 정리해주는 AI 비서</p>
  </div>
  <ul style="list-style:none;padding:0;display:grid;gap:12px;text-align:left;">
    <li class="stack-h"><span class="signal-dot"></span> 매일 아침 뉴스·메일·일정 한 줄 요약</li>
    <li class="stack-h"><span class="signal-dot"></span> 다음 일정까지 출발 시각 알림</li>
    <li class="stack-h"><span class="signal-dot"></span> 메일 답장 초안 자동 작성</li>
  </ul>
  <button class="btn btn-google btn-lg btn-block">Google 계정으로 시작하기</button>
  <span class="t-xs muted">로그인 시 약관 및 개인정보 처리방침에 동의하게 됩니다.</span>
</main>
```

---

## G. Travel Alert (긴급 출발 알림 화면 — 배경 흰, urgent 액센트)

```html
<main style="padding:24px;display:flex;flex-direction:column;gap:16px;">
  <span class="chip chip-urgent">지금 출발하세요</span>
  <h1 class="t-d1">{N}분 뒤 도착하려면 지금 출발</h1>
  <p class="t-body">목적지: {장소} · {교통수단} {N}분 소요</p>
  <article class="card card-pad">
    <div class="muted t-xs">다음 일정</div>
    <div class="t-h3" style="margin-top:4px;">{일정 제목}</div>
    <div class="muted t-sm">{시간} · {장소}</div>
  </article>
  <button class="btn btn-aurora btn-block btn-lg">길 안내 열기</button>
  <button class="btn btn-ghost">10분 뒤 다시 알림</button>
</main>
```

---

## 표준 5탭 (모바일 하단)

순서·아이콘·라벨 고정:

| # | 라벨 | 아이콘 의미 |
|---|---|---|
| 1 | 홈 | 일일 브리핑 (aurora-hero가 보이는 화면) |
| 2 | 뉴스 | 신문 |
| 3 | 메일 | 봉투 |
| 4 | Aura | 로고(`<use href="#aura"/>`) — 채팅 |
| 5 | 설정 | 톱니 |

활성 탭은 `.tab.on` (color = aurora). 다른 라벨/순서로 바꾸지 마세요 — 탭 위치 학습 비용이 모든 화면 톤보다 비싼 비용입니다.
