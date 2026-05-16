# AURA

<div style="display: flex; justify-content: center; gap: 100px; align-items: center;">
  <img src="Image/AuraIcon/Assets.xcassets/AppIcon.appiconset/256.png" alt="Aura_Icon" width="200" />
</div>

_Ai assistant application for all users_

> **A**i, for **U**ser **R**eliable **A**ssistant

## Why?

친절한 AI 비서.

평소에 뭘 해야할지 캘린더에는 적어놓는데,

- 바로 몇 시에 그 작업이 있는지 확인하려면 캘린더에 들어가야함.
- 그리고 그 곳까지 가는데 길을 찾아야함.(대중교통 특히)
- 뉴스 읽기도 귀찮은데 세상은 알아야 할 것 같음(트럼프 형이 워낙워낙 빠꾸가 없으셔서 모르면 주식 꼬라박을수도)

## Structure

- App
  - [Android](https://github.com/e-commerce-dumb/Aura/releases)
  - iOS : testflight
- [Web](https://dumb.io.kr/aura)
  - [AURA buisness](https://dumb.io.kr/aura/buisness)
  - [slack bot](https://dumb.io.kr/aura/slack) : github organization commit cron bot
- backend : for all front jobs
  - railway
    - aura api
    - aura work
  - supabase
    - database

## Target

1. 일반적인 user

2. 작은 회사에게 도움을 줄 수 있는 AI

## Language

한국어 / English

![React Native](https://img.shields.io/badge/React_Native-20232A?style=flat&logo=react&logoColor=61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat&logo=supabase&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=flat&logo=railway&logoColor=white)
![Anthropic](https://img.shields.io/badge/Anthropic_API-191919?style=flat&logo=anthropic&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/firebase-ffca28?style=flat&logo=firebase&logoColor=white)
![Github](https://img.shields.io/badge/Github_App-0B0D0E?style=flat&logo=github&logoColor=white)
![Slack](https://img.shields.io/badge/Slack_Bot-4A154B?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik01LjA0MiAxNS4xNjVhMi41MjggMi41MjggMCAwIDEtMi41MiAyLjUyM0EyLjUyOCAyLjUyOCAwIDAgMSAwIDE1LjE2NWEyLjUyNyAyLjUyNyAwIDAgMSAyLjUyMi0yLjUyaDIuNTJ2Mi41MnpNNi4zMTMgMTUuMTY1YTIuNTI3IDIuNTI3IDAgMCAxIDIuNTIxLTIuNTIgMi41MjcgMi41MjcgMCAwIDEgMi41MjEgMi41MnY2LjMxM0EyLjUyOCAyLjUyOCAwIDAgMSA4LjgzNCAyNGEyLjUyOCAyLjUyOCAwIDAgMS0yLjUyMS0yLjUyMnYtNi4zMTN6TTguODM0IDUuMDQyYTIuNTI4IDIuNTI4IDAgMCAxLTIuNTIxLTIuNTJBMi41MjggMi41MjggMCAwIDEgOC44MzQgMGEyLjUyOCAyLjUyOCAwIDAgMSAyLjUyMSAyLjUyMnYyLjUySDguODM0ek04LjgzNCA2LjMxM2EyLjUyOCAyLjUyOCAwIDAgMSAyLjUyMSAyLjUyMSAyLjUyOCAyLjUyOCAwIDAgMS0yLjUyMSAyLjUyMUgyLjUyMkEyLjUyOCAyLjUyOCAwIDAgMSAwIDguODM0YTIuNTI4IDIuNTI4IDAgMCAxIDIuNTIyLTIuNTIxaDYuMzEyek0xOC45NTYgOC44MzRhMi41MjggMi41MjggMCAwIDEgMi41MjItMi41MjFBMi41MjggMi41MjggMCAwIDEgMjQgOC44MzRhMi41MjggMi41MjggMCAwIDEtMi41MjIgMi41MjFoLTIuNTIyVjguODM0ek0xNy42ODggOC44MzRhMi41MjggMi41MjggMCAwIDEtMi41MjMgMi41MjEgMi41MjcgMi41MjcgMCAwIDEtMi41Mi0yLjUyMVYyLjUyMkEyLjUyNyAyLjUyNyAwIDAgMSAxNS4xNjUgMGEyLjUyOCAyLjUyOCAwIDAgMSAyLjUyMyAyLjUyMnY2LjMxMnpNMTUuMTY1IDE4Ljk1NmEyLjUyOCAyLjUyOCAwIDAgMSAyLjUyMyAyLjUyMkEyLjUyOCAyLjUyOCAwIDAgMSAxNS4xNjUgMjRhMi41MjcgMi41MjcgMCAwIDEtMi41Mi0yLjUyMnYtMi41MjJoMi41MnpNMTUuMTY1IDE3LjY4OGEyLjUyNyAyLjUyNyAwIDAgMS0yLjUyLTIuNTIzIDIuNTI2IDIuNTI2IDAgMCAxIDIuNTItMi41Mmg2LjMxM0EyLjUyNyAyLjUyNyAwIDAgMSAyNCAxNS4xNjVhMi41MjggMi41MjggMCAwIDEtMi41MjIgMi41MjNoLTYuMzEzeiIvPjwvc3ZnPgo=)

## Auth

[Auth.md](docs/Auth.md)

## Design

| 분야       | 설명                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------- |
| 기본 색    | ![AURORA](https://img.shields.io/badge/AURORA-6B5BFF?style=for-the-badge&logoColor=white) |
| 모션       | `auraMotion` Token. 최대한 user가 딱딱하게 느껴지지 않게                                  |
| 5 Tab Icon | `react-native-svg` line icon                                                              |

## Versions

| 날짜     | 핵심                                                                                                                     | 링크                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| 26/04/10 | Alpha version                                                                                                            | [docs/versions/Alpha.md](docs/versions/Alpha.md)       |
| 26/05/08 | Railway 배포 + 화면 진입 모션 + 2차 디자인 패스 + Sign-in lock fix                                                       | [docs/versions/26.05.08.md](docs/versions/26.05.08.md) |
| 26/05/09 | 버스 도착 알림 client-driven 전환 (iOS Region Monitoring + Android GeofencingClient) + Android 첫 빌드 + v0.1.0 test APK | [docs/versions/26.05.09.md](docs/versions/26.05.09.md) |
| 26/05/10 | Health Connect 연동 + brief wellnessTip · 열람 시간 학습 · 하루 1회 표시 · unsubscribe 1-tap · mail → 일정 자동 추출     | [docs/versions/26.05.10.md](docs/versions/26.05.10.md) |
