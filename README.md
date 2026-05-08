# Aura

<div style="display: flex; justify-content: center; gap: 100px; align-items: center;">
  <img src="Image/AuraIcon/Assets.xcassets/AppIcon.appiconset/256.png" alt="Aura_Icon" width="200" />
  <img src="Image/testImage/splashImage.png" alt="Aura_SplashImage" width="200" />
</div>

_Ai assistant application for all users_

## Why?

친절한 AI 비서.

평소에 뭘 해야할지 캘린더에는 적어놓는데,

- 바로 몇 시에 그 작업이 있는지 확인하려면 캘린더에 들어가야함.
- 그리고 그 곳까지 가는데 길을 찾아야함.(대중교통 특히)
- 뉴스 읽기도 귀찮은데 세상은 알아야 할 것 같음(트럼프 형이 워낙워낙 빠꾸가 없으셔서 모르면 주식 꼬라박을수도)

내 성격이 이래서 내 문제를 해결하기 위해서 시작한 Application.

## Features(26/05/08)

1. 유저가 원하는 뉴스 토픽(최대 5가지)에 대한 요약을 받아볼 수 있음. 실제 뉴스 링크도 제공함.

   - briefing by anthropic api
   - 일일 브리핑 스냅샷 30분 캐시 + 워커 사전 계산 (재요청 비용 절감)

2. 유저의 로그인한 구글 계정 기반으로 하루치 메일 분석 및 답변 초안 작성해줌

3. 유저의 휴대폰에 저장된 캘린더 + 구글 캘린더 내용을 가져와서 오늘, 내일 할 일 알려줌.

   - 다음 일정을 맞추기 위해 대중교통/자차로 언제 출발해야하는지 값 제공. + Google Maps 연동

4. Aura Chat. 일일 브리핑(메일/뉴스) context를 그라운딩한 답변 + 스트리밍.

   - 처음엔 "쓸모 모르겠다" 였는데 일일 브리핑을 자연어로 묻는 용도로 굳어지는 중.

## User Login

기본은 Google. Supabase Auth가 발급한 JWT를 백엔드가 검증.

- Google (메인) — Gmail/Calendar 분석에 같은 토큰 사용해서 어차피 필요
- Kakao — `KAKAO_LOGIN_ENABLED=true` 일 때만 노출 (Kakao 비즈앱 검수 통과 후에 켜는 가드)
- 휴대전화 OTP — Supabase phone provider
- Dumb 계정(이메일/비번) — 같은 Supabase project를 dumb이랑 공유하는 SSO 백업

설정 위치
- Google Cloud Console (qww9363@gmail.com)
- Supabase Auth → Providers
- 휴대전화 인증: <https://console.solapi.com/dashboard> (dumbteam2025@gmail.com, 명의는 조민제)

## Language

한국어 / English

- 설마 더 다른 언어가 필요할까. 필요하면 번역기 돌린다는 마인드

## Stack

- **Mobile**: React Native 0.84 (iOS / Android 단일 코드베이스)
- **Backend**: Express + TypeScript, Railway 배포 (`aura-api` + `aura-worker` + Redis 같은 프로젝트, internal 통신)
- **DB**: Supabase Postgres (Session pooler) — `aura` schema 단독 소유
- **Cache**: Railway Redis (rate limit / 캐시 / dedup) — 미설정 시 in-memory fallback
- **AI**: Anthropic Claude Sonnet 4.6 (`ANTHROPIC_MODEL`) + Haiku 4.5 (`ANTHROPIC_MODEL_LIGHT`, 단순 요약 절감용)

## Design

자체 디자인 시스템 `aura-app-design-system/` — tokens.css 기반, RN은 `front/src/features/app/styles/`에서 미러.

- **색**: AURORA(#6B5BFF) + INK + CALM + WARM + URGENT 5역할 분담
- **모션**: `auraMotion` 토큰 (duration/easing/screen-enter spec) — 화면 진입 시 위/아래 카드 슬라이드 인 (480ms, 80ms stagger)
- **5탭 아이콘**: react-native-svg line 아이콘 (Phosphor 톤, stroke 1.75)

## Version

### Alpha → Beta 전환 중

2026/05/08 update

by. codex cli (plus) + claude code (opus)

순수하게 내가 쓰려고 만들기 시작했는데 이왕 하는김에 할짓 없을때 하면 좋겠다라고 생각해서 만들기 시작한게 이렇게 됨

Design부터 어플 이름까지 죄다 AI한테 맡겨서 신박한 경험임(Aura 라는 어플 이름도 AI가 정해준 것으로 기억남. **A**i, for **U**ser **R**eliable **A**ssistant << 방금 이거 쓰면서 대충 정해봤음. 왜 처음에 Aura라고 했는지 모르겠네?)

- 나중에 저 이름 길게 한 버전을 어플에 깔끔하게 넣으면 좀 멋있을 듯.

## Changelog

날짜별 패치 노트는 `docs/versions/` 폴더. 새 패치를 합칠 때마다 같은 형식으로 한 파일씩 추가.

| 날짜 | 핵심 | 링크 |
|---|---|---|
| 2026-05-08 | Railway 정식 배포 + 화면 진입 모션 + 2차 디자인 패스 + Sign-in lock fix | [docs/versions/2026-05-08.md](docs/versions/2026-05-08.md) |

---

**실제 테스트 영상**

<div style="display: flex; justify-content: center; align-items: center;">
  <video width="50%" controls>
   <source src="https://youtube.com/shorts/FxfYeaELkao?feature=share" type="video/mp4">
  </video>
</div>

[Youtube Link](https://youtube.com/shorts/FxfYeaELkao?feature=share)

- Ai Chat 기능에서 만들다가 뭘 할지 당장 생각이 안나서 일단 냅두고 있음. 생각나면 만든다는 마인드 ;;
- 그때 그때 생각나는 추가적인 것 있으면 수정할 예정.
