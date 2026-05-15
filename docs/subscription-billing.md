# AURA Subscription & Billing

> Business Mode 유료 구독 구현 가이드.  
> **현재 상태: 코드 없음 — 이 문서는 설계 + 구현 지침이다.**

---

## 개요

| 항목 | 내용 |
|------|------|
| 대상 | `account_type = "business"` 사용자 |
| 플랜 | Business Monthly / Business Yearly |
| 트라이얼 | 14일 무료 (카드 없이 시작) |
| 결제 방식 | Stripe (해외 카드) + 토스페이먼츠 (국내 카드/계좌) |
| 미결제 → 접근 | 트라이얼 만료/결제 실패 시 personal 기능만 허용 |

---

## 구독 상태 머신

```
[트라이얼 생성] → trial
                    ↓ 결제 성공
                  active ←────────────────┐
                    ↓ 다음 결제 실패       │
                  past_due               │
                    ↓ 72h 재시도 실패     │ 갱신 성공
                  cancelled             ─┘
                    ↓ (별도 취소 요청도 이 경로)
                  cancelled
                    ↓ current_period_end 경과
                  expired
```

접근 허용 상태: `trial` (trial_ends_at 미경과), `active`  
접근 거부 상태: `past_due`, `cancelled`, `expired`, 구독 row 없음

---

## DB 스키마

```sql
-- users 테이블에 추가
ALTER TABLE aura.users
  ADD COLUMN account_type text NOT NULL DEFAULT 'personal'
    CHECK (account_type IN ('personal', 'business'));

-- 구독 테이블
CREATE TABLE aura.subscriptions (
  id                     varchar(36) PRIMARY KEY,
  user_id                uuid        NOT NULL REFERENCES aura.users(id) ON DELETE CASCADE,
  plan                   text        NOT NULL CHECK (plan IN ('business_monthly', 'business_yearly')),
  status                 text        NOT NULL CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'expired')),

  -- 트라이얼
  trial_ends_at          timestamptz,

  -- 현재 청구 주기
  current_period_start   timestamptz,
  current_period_end     timestamptz,

  -- Stripe (해외 결제)
  stripe_customer_id     text,
  stripe_subscription_id text,

  -- 토스페이먼츠 (국내 결제)
  toss_customer_key      text,   -- 고객 식별키 (고정, 우리가 생성)
  toss_billing_key       text,   -- 자동결제용 빌링키 (카드 등록 후 발급)
  toss_order_id_last     text,   -- 가장 최근 orderId (중복 결제 방지)

  payment_provider       text    CHECK (payment_provider IN ('stripe', 'toss', 'manual')),

  cancelled_at           timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id)  -- 사용자당 구독 row 1개
);

CREATE INDEX ON aura.subscriptions (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX ON aura.subscriptions (toss_billing_key) WHERE toss_billing_key IS NOT NULL;
CREATE INDEX ON aura.subscriptions (status, current_period_end);
```

---

## Stripe 연동

### 환경변수

```
STRIPE_SECRET_KEY=sk_live_...          # 서버 사이드 only
STRIPE_WEBHOOK_SECRET=whsec_...        # webhook signature 검증
STRIPE_PRICE_MONTHLY=price_...         # Stripe Dashboard에서 생성
STRIPE_PRICE_YEARLY=price_...
```

### 구현 흐름

#### 1. 트라이얼 시작 (카드 불필요)
```
POST /api/v1/business/subscribe  { provider: "stripe", plan: "monthly" }
  ↓
Stripe: customers.create({ email, metadata: { userId } })
Stripe: subscriptions.create({
  customer, items, trial_period_days: 14,
  payment_settings: { save_default_payment_method: "on_subscription" }
})
  ↓
DB: subscriptions.insert({ status: "trial", trial_ends_at: +14d, stripe_* })
DB: users SET account_type = "business"
```

#### 2. 트라이얼 중 카드 등록
```
클라이언트: Stripe.js elements → PaymentElement (SetupIntent)
POST /api/v1/business/payment-method  { setupIntentId }
  ↓
Stripe: setupIntents.retrieve → paymentMethodId
Stripe: customers.update({ invoice_settings.default_payment_method })
```

#### 3. Webhook → 구독 상태 동기화

엔드포인트: `POST /api/v1/webhooks/stripe`

```typescript
// signature 검증 필수
const event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);

switch (event.type) {
  case "invoice.payment_succeeded":
    // status → "active", current_period_start/end 갱신
  case "invoice.payment_failed":
    // status → "past_due"
  case "customer.subscription.deleted":
    // status → "cancelled", cancelled_at = now
  case "customer.subscription.trial_will_end":
    // 트라이얼 3일 전 → 사용자에게 push ("카드를 등록하세요")
}
```

**주의**: webhook은 반드시 raw body (`express.raw({ type: "application/json" })`)로 받아야 signature 검증이 통과한다. `express.json()`으로 파싱된 body는 사용 불가.

#### 4. 재시도 / 취소
- Stripe Dashboard에서 재시도 간격 설정 (권장: 실패 후 1일, 3일, 7일)
- 사용자가 취소: `stripe.subscriptions.cancel(id)` → webhook `customer.subscription.deleted`

---

## 토스페이먼츠 연동

### 환경변수

```
TOSS_CLIENT_KEY=test_ck_...            # 클라이언트 (앱/웹 노출 OK)
TOSS_SECRET_KEY=test_sk_...            # 서버 사이드 only
```

### 빌링키 방식 (자동결제)

토스페이먼츠 자동결제는 두 단계: **카드 등록(빌링키 발급) → 정기 자동결제 요청**.

#### 1. 빌링키 발급 (최초 카드 등록)

```
클라이언트: TossPayments SDK → requestBillingAuth({
  method: "카드",
  customerKey: userId,   // 우리가 고정 식별자로 사용
  successUrl, failUrl
})
  ↓ 토스 인증 완료 후 successUrl?authKey=...&customerKey=... 리다이렉트
  ↓
POST /api/v1/webhooks/toss/billing-auth  { authKey, customerKey }
  ↓
서버: POST https://api.tosspayments.com/v1/billing/authorizations/issue
  Authorization: Basic base64(secretKey:)
  Body: { authKey, customerKey }
  ↓ 응답: { billingKey, card: { ... } }
  ↓
DB: subscriptions.update({ toss_billing_key: billingKey })
```

#### 2. 정기 결제 요청 (매월/매년)

```
서버 (워커): POST https://api.tosspayments.com/v1/billing/{billingKey}
  Authorization: Basic base64(secretKey:)
  Body: {
    customerKey, amount, orderId,  // orderId는 매번 새로운 unique ID
    orderName: "AURA Business Monthly",
    customerEmail, customerName
  }
  ↓ 응답: { status: "DONE" | "ABORTED", ... }
  ↓
성공: DB status → "active", current_period_start/end 갱신
실패: DB status → "past_due", push 알림 발송
```

#### 3. 결제 실패 재시도
- 워커에서 `past_due` 구독 중 `current_period_end` 이내인 것 대상 재시도
- 24시간 간격, 최대 3회 → 3회 초과 시 `cancelled`

#### 4. 웹훅 (토스 → 우리 서버)

엔드포인트: `POST /api/v1/webhooks/toss`

```typescript
// 토스는 자체 서명 없음 — IP allowlist로 보호 (설정 권장)
// 이벤트 타입: PAYMENT_STATUS_CHANGED, BILLING_STATUS_CHANGED
switch (body.eventType) {
  case "BILLING_STATUS_CHANGED":
    // billingKey 만료/취소 처리
}
```

토스 웹훅은 Stripe만큼 신뢰도가 높지 않으므로 **능동적 폴링(워커)을 primary**로 사용하고 웹훅은 보조.

---

## 공통 API 설계

```
POST /api/v1/business/trial-start
  body: { plan: "business_monthly" | "business_yearly", provider: "stripe" | "toss" }
  → 트라이얼 구독 생성

POST /api/v1/business/payment-method
  body: { provider: "stripe", setupIntentId } | { provider: "toss", authKey, customerKey }
  → 결제 수단 등록

GET  /api/v1/business/subscription
  → 현재 구독 상태 조회 (status, plan, trial_ends_at, current_period_end)

POST /api/v1/business/cancel
  → 구독 취소 예약 (기간 끝까지 유지 후 cancelled)

POST /api/v1/webhooks/stripe   (raw body, stripe-signature 헤더)
POST /api/v1/webhooks/toss     (IP allowlist)
```

모든 `/business/*` 라우트는 `requireAuth` + `requireBusinessTrialOrActive` 미들웨어 적용.  
단, `trial-start`와 `payment-method` 등록은 `requireAuth`만 (구독 없어도 접근 가능).

---

## 접근 제어 미들웨어

```typescript
// back/src/modules/subscription/middleware.ts

export async function requireBusinessAccess(req, res, next) {
  const userId = req.authUser!.id;
  const sub = await getActiveSubscription(userId);

  if (!sub) return res.status(403).json({ error: "business_subscription_required" });

  if (sub.status === "trial") {
    if (sub.trial_ends_at && sub.trial_ends_at < new Date()) {
      return res.status(403).json({ error: "trial_expired" });
    }
    return next();
  }

  if (sub.status === "active") return next();

  return res.status(403).json({ error: "subscription_inactive", status: sub.status });
}
```

게이트 적용 대상 (현재):
- `meeting_brief` 기능 (worker 내부 체크)
- 향후: 회의록 생성, STT, AI 정리, 공유 링크

---

## 가격 정책 (초안)

| 플랜 | 월 납부 | 연 납부 |
|------|---------|---------|
| Business | ₩19,900/월 | ₩199,000/년 (~17% 할인) |

초기 런칭 프로모션: 3개월 ₩0 (트라이얼 90일) — 코드로 관리.

---

## 환경변수 전체 목록

```bash
# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_MONTHLY=
STRIPE_PRICE_YEARLY=

# 토스페이먼츠
TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=
```

---

## 구현 순서

1. **DB 마이그레이션** — `users.account_type` + `subscriptions` 테이블 (이미 완료)
2. **`subscription/repository.ts`** — `getActiveSubscription`, `upsertSubscription`, `updateStatus`
3. **`subscription/middleware.ts`** — `requireBusinessAccess`
4. **`subscription/routes.ts`** — trial-start, payment-method, GET status, cancel
5. **`webhooks/stripe.ts`** — raw body 파서 + event 라우팅
6. **`webhooks/toss.ts`** — IP 검증 + event 라우팅
7. **`subscription/worker.ts`** — 토스 자동결제 청구 + 재시도 로직
8. **`meeting-brief/service.ts`** — `requireBusinessAccess` 체크 추가
9. **프론트** — 구독 상태 화면, 카드 등록 (Stripe.js / 토스 SDK)
10. **웹앱** — Next.js 결제 페이지 (Vercel)

---

## 보안 체크리스트

- [ ] Stripe webhook: `constructEvent`로 signature 검증, raw body 사용
- [ ] 토스 webhook: IP allowlist (`api.tosspayments.com` 대역)
- [ ] `STRIPE_SECRET_KEY`, `TOSS_SECRET_KEY` — Railway/Vercel env 저장, 코드 노출 금지
- [ ] `toss_billing_key`, `stripe_customer_id` — DB 평문 저장 OK (우리만 접근, 카드번호 아님)
- [ ] orderId 중복 방지 — `toss_order_id_last` 체크 or `createId()` per 청구
- [ ] 구독 상태 조회 API — 타 사용자 구독 정보 노출 금지 (`WHERE user_id = $userId`)
