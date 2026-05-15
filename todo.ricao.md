# idea

## 0. 목적성

- 모든 idea에 대해 목적이 분명해야함

  - impact 있는 idea

- 범용성 있는 idea. 특정 분야 인물상의 5시간 줄이기보다, 전체적인 사람들의 30분 줄이는 idea가 더 좋음

- user target 명확히 하게 해야한다

수익 모델 -> 작은 회사들에게 우리가 다른 작업들을 다 해줄테니 구독료를 내라

-> 작은 회사들의 system의 기반을 좀 줄 수 있는 app.

- ex. 회사 별로 다른 것들을 하나로 통합해서 할 수 있는 idea. needs의 교집합

ex. 저녁메뉴 고르기

## 1. group mode

가족 모임. url 방식으로 유저들끼리 합쳐서 모임 정보를 공유할 수 있도록.

### 앱 위치

하단 메뉴바에 `그룹` 생성

### flow

1. 한 유저가 링크 생성. 해당 링크를 받은 다른 사용자는 한 group에 속하게 됨

   - 링크는 복사, 공유 기능으로 다른 메신저 앱 등으로 보낼 수 있게 함. 공유로 보낼 시

   <예시>

   > ~님이 AURA 그룹에 초대하셨어요! link : ~

   - 해당 링크가 너무 디자인 없이 올라가면 좀 아쉽기에 링크에 embed 되는 이미지를 넣게 하면 좋지 않을까?

2. 링크 느루면 `AURA` 앱 켜서 `그룹` 탭 자동 오픈. 새로운 탭 생성

   - 유저는 여러개의 그룹에 있을 수 있음.
   - 그룹을 생성한 사람은 해당 그룹 카드에 표시 `Owner`

3. 그룹에 모든 유저가 `일정 공유` 가능.
   - 자신의 calander 기반 일정 선택하기 or 새로운 일정 생성으로 전체 그룹에 배포하는 방식
   - background msg(firebase)로 해당 group의 다른 유저들도 정보 받기. 그 background msg를 다른 유저들이 누르면 AURA 앱이 켜지고, 해당 일정에 대해 확인할 수 있는 모달 바로 켜지기. 그리고 해당 일정에 대한 `참석/불참석` 버튼 누를 수 있게 하기.
     - 일정 공유된 그 그룹의 카드 모달에 해당 일정 하단에 참석 인원 몇 명/불참석 인원 몇명 표시되게(모두)
     - 참석 시, calander에 저장.(가능하면 local calander에 자동으로 저장되게 추가)

- 추가적인 아이디어 있으면 claude에서 생각해보기.

## 2. coupon share

coupon data를 만들어보자.

ex. kakao talk coupon -> dumb design 덮어씌우기

### flow

**전제조건** : 최대한 backend를 사용하지 않고, front 상에서 처리하기.

현재 ocr을 통해서 coupon에 대한 정보 가져옴. 그 내용과 바코드 자체를 가져오기

1. `dumb_coupon_card.jpg` 생성

   - 해당 `jpg`는 claude와 디자인 하면서 생성해볼 것.
     - 일반적인 쿠폰 이미지 크기
     - 테두리 및 디자인 색상은 `dumb` 고유 색상 사용할 것.
       - [dumb-token.css](/dumb-design/tokens.css)사용할 것
     - 상단의 로고는 [dumb-logo-black.svg](./front/src/features/app/assets/dumb-logo-black.svg) 또는 [dumb-logo.jpg](./front/src/features/app/assets/dumb-logo.jpg)를 사용할 것

2. image를 생성된 `dumb_coupon_card`형식으로 저장
   - local storage에 저장함
   - 공유하기 버튼으로 해당 coupon을 공유할 때도, dumb design으로 refactoring된 쿠폰 카드를 보내는 방식으로.

### final goal

coupon market을 만들 수 있도록. - 해당 coupon market 관련은 추후 제작할 수 있도록

# 수정사항

## 0. manual 정리

현재 과도하게 많은 manual들 존재.

이미 완료된 내용에 대한 매뉴얼은 삭제. 그리고 구조에 따라 매뉴얼도 `./manual` 폴더 내 하위폴더 만들어서 관리. 현재 너무 중구난방이다.

## 1. 중복 일정

google calander 내용과 local calander 일정 내용이 동일한데 app 상에서는 둘 다 보여줌.

-> 내용 하나만 보여주기. local caldander 우선

## 2. 경로

지하철 몇 분 남았다 알람까지 포함

## idea

~~- 미팅 전 배경 조사~~
