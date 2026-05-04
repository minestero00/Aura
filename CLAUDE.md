## Claude.md

## before start first time

전체적인 폴더 구조를 다 탐색하고, 어떤 작업을 진행해야할지 스스로 생각을 해보고, 그에 따른 제시를 나에게 하라.

각 폴더별로 어떤 작업을 해야할지 `Claude.md` 및 필요한 내용이 나누어져 담긴 `.md` file을 작성하도록 한다. 언제나 가장 중요한 작업의 방식은 user 입장에서 최소한의 action, 최대한의 제공이 있어야 한다. backend에서 처리할 수 있는 것을 모두 처리하도록 해야 user의 불편함이 없을 것이다.

모든 작업에서 보안과 billing 문제가 제일 중요하다. 이를 고려하여 작업 scheduling을 하자.

## design

현재 유지되고 있는 자체적인 디자인 `Aura` design에서 `./dumb-app-system-design`의 방식을 차용해 유사하게 `./aura-app-system-design`을 만들자.

만들어지면, 전체적인 디자인을 그에 따라 수정한다.

## 기능

현재 가지고 있는 기능과 더불어, 추가적인 기능이 필요하다고 생각되는 것을 `./todo.md`를 작성하여 workflow를 명세하자.

## app deploy

각 `ios`, `android` application deploy를 할 것이고, server는 vercel 혹은 railway를 사용할 것이다.
