# IDEA

slack bot 설치 사이트.

> 각 회사들의 github organization project들에 대한 그 날의 update 내용에 대해 ai가 요약해서 메시지를 쏴줌

# 예상도

기본 web view page에

- github organization owner의 github login.(auth를 이걸로 진행)

- 해당 organization에 대한 내용을 가져오고. 유저가 선택한 project들에 대한 매일 commit 및 코드 변경점에 대한 ai 요약을 받아볼 수 있게

- one-click slack bot 설치

## feature

- user 시간대 설정해서 해당 때에 repo들에 대한 요약
  - 명령어 `@AURA /brief` 뭐 이런 방식으로 실행도 가능하게
  - `@AURA /setting`은 우리가 만드는 page의 setting 부분에 들어와서 유저가 gui에서 수정할 수 있는건 수정할 수 있게.

## 현재

우선, 우리 팀이 쓸 수 있도록 먼저 만들 예정. 이 또한 `AURA`라는 이름으로 할 것이고, 앱과는 관련없이 시작할 것이다. 하지만, 추후 app에 이에 대한 내용을 볼 수 있게 연동까지 될 수 있게 해보고 싶음.

commit 내용이 자세하고, 내용에 대한 수정이 필요 없으면 괜찮을듯.

- 만약 commit 내용이 부족하면, diff에 대한 내용을 설명해 줄 수 있는 자체적인 프로그램을 만들어서 설치하게 하면?

웹 자체는 현재 `web/` 프로젝트 내에 넣을 것.
