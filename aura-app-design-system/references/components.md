# AURA · Components

부품 카탈로그. 모든 클래스는 `assets/base.css`에 정의되어 있고, 이 문서는 사용 예제만 모아둡니다.

---

## 1. Button

```html
<button class="btn btn-primary">확인</button>          <!-- 기본 INK -->
<button class="btn btn-aurora">Aura에게 묻기</button>  <!-- 강조 — 발견의 순간 -->
<button class="btn btn-outline">취소</button>
<button class="btn btn-ghost">건너뛰기</button>
<button class="btn btn-soft">나중에</button>
<button class="btn btn-danger">연결 해제</button>
<button class="btn btn-google">
  <svg class="g-mark"><!-- Google G mark --></svg>
  Google 계정으로 시작하기
</button>
```

크기: `.btn-xs` `.btn-sm` `.btn-md` `.btn` `.btn-lg` `.btn-xl`. 풀폭은 `.btn-block`.

---

## 2. Chips / Tags

```html
<span class="chip chip-aurora-soft">AI 요약</span>
<span class="chip chip-calm-soft">뉴스</span>
<span class="chip chip-warm-soft">메일</span>
<span class="chip chip-urgent">지금 출발</span>
<span class="tag-news">NEWS</span>
<span class="tag-mail">MAIL</span>
<span class="tag-calendar">EVENT</span>
<span class="signal-dot"></span> <!-- 새 항목 표시 -->
```

---

## 3. Forms

```html
<div class="field">
  <label>뉴스 토픽 (최대 5개)</label>
  <input class="input" placeholder="예: AI, 경제, 스포츠"/>
  <span class="help">쉼표로 구분</span>
</div>

<div class="search focus">
  <svg><!-- search icon --></svg>
  <input placeholder="브리핑·메일에서 찾기"/>
</div>

<!-- 채팅 입력 -->
<div class="chat-input">
  <textarea rows="1" placeholder="Aura에게 물어보세요"></textarea>
  <button class="send" aria-label="보내기">↑</button>
</div>
```

토글:

```html
<label class="switch">
  <input type="checkbox" checked>
  <span class="track"></span>
  <span class="thumb"></span>
</label>
```

---

## 4. Cards (AURA 도메인)

### Brief Card — 일일 브리핑 요약 한 블록

```html
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
    <span>오전 7:00 갱신 · 한국어</span>
    <button class="btn btn-ghost btn-sm">새로 받기</button>
  </div>
</article>
```

### News Card

```html
<article class="news-card">
  <div class="meta">
    <span class="tag-news">{카테고리}</span>
    <span class="num">{발행시각}</span>
    <span>{출처}</span>
  </div>
  <h4>{기사 제목}</h4>
</article>
```

### Mail Card

```html
<article class="mail-card unread">
  <div class="ava">{이니셜}</div>
  <div>
    <div class="meta">
      <span class="from">{보낸이}</span>
      <span class="num">{시간}</span>
    </div>
    <div class="subj">{제목}</div>
    <div class="snip">{스니펫}</div>
  </div>
</article>
```

### Calendar + Travel Card — "다음 일정까지 16분"

```html
<article class="card card-pad">
  <div class="head" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
    <span class="tag-calendar">EVENT</span>
    <span class="muted t-xs">오후 2:00 회의</span>
  </div>
  <h3 class="t-h2">{일정 제목}</h3>
  <div class="stack-h" style="margin-top:12px;">
    <span class="chip chip-aurora">대중교통 16분</span>
    <span class="chip">자차 9분</span>
  </div>
  <button class="btn btn-aurora btn-block" style="margin-top:16px;">길 안내 받기</button>
</article>
```

---

## 5. Tabs / Segmented

```html
<nav class="tabs">
  <button class="active">전체</button>
  <button>중요</button>
  <button>오늘</button>
</nav>

<div class="segmented">
  <button class="active">한국어</button>
  <button>English</button>
</div>
```

---

## 6. Alerts / Toast

```html
<div class="alert info">
  <div class="ic">i</div>
  <div>
    <div class="title">새 브리핑이 준비됐어요</div>
    <div class="msg">오전 7:00 기준</div>
  </div>
</div>

<div class="alert err">
  <div class="ic">!</div>
  <div>
    <div class="title">Gmail 연결이 끊겼어요</div>
    <div class="msg">설정 → 통합에서 다시 연결해주세요.</div>
  </div>
</div>

<div class="toast"><span class="ok-ic">✓</span>저장됨</div>
```

---

## 7. Progress / Spinner

```html
<!-- 일일 토큰 사용량 -->
<div class="progress"><i style="width:62%"></i></div>

<!-- 위급(90% 이상) -->
<div class="progress"><i style="width:94%;background:var(--urgent)"></i></div>

<div class="spinner"></div>
```

---

## 8. Bottom Sheet / Modal

```html
<div class="sheet-scrim"></div>
<div class="sheet">
  <div class="grabber"></div>
  <h5>뉴스 카테고리 선택</h5>
  <div class="sub">최대 5개까지 선택할 수 있어요</div>
  <!-- 옵션 리스트 -->
</div>

<div class="modal-scrim">
  <div class="modal">
    <div class="emo">★</div>
    <h4>구글 계정 연결을 해제할까요?</h4>
    <p>Gmail 요약과 캘린더 알림이 중단됩니다.</p>
    <div class="actions">
      <button class="btn btn-outline">취소</button>
      <button class="btn btn-danger">해제</button>
    </div>
  </div>
</div>
```

---

## 9. Chat Bubbles

```html
<div style="display:flex;flex-direction:column;gap:8px;padding:16px;">
  <div class="bubble me">{사용자 질문}</div>
  <div class="bubble ai">
    {AI 답변}
    <span class="cite">📰 {출처 기사 제목}</span>
  </div>
</div>
```

---

## 10. Aurora Hero (헤더 1회용)

```html
<section class="aurora-hero">
  <h1>안녕하세요, {이름} 님</h1>
  <div class="sub">오늘 챙겨야 할 일정 3건과 새 메일 12건이 있어요.</div>
</section>
```

> **주의**: aurora-hero는 화면당 최대 1회. 카드 배경에 그라데이션을 반복하면 톤이 무너집니다.
