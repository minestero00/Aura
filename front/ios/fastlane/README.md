fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios beta

```sh
[bundle exec] fastlane ios beta
```

TestFlight 베타 배포 — build number 자동 bump + Archive + Upload

### ios next_build

```sh
[bundle exec] fastlane ios next_build
```

다음 build number만 미리 계산 (CI dry-run / 로컬 확인용)

### ios list_beta_groups

```sh
[bundle exec] fastlane ios list_beta_groups
```

TestFlight 베타 그룹 / 빌드 / 테스터 출력

### ios attach_build

```sh
[bundle exec] fastlane ios attach_build
```

기존 빌드를 베타 그룹에 attach — 예: bundle exec fastlane attach_build group:"Internal Testers" version:1.0 build:1

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
