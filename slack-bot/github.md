# GitHub 연동

---

## GitHub OAuth App 생성

GitHub → Settings → Developer settings → OAuth Apps → New OAuth App

```
Application name: AURA Bot
Homepage URL: https://aura.so/slack
Authorization callback URL: https://aura.so/api/github/callback
```

발급 후:
- `Client ID` → `GITHUB_CLIENT_ID`
- `Client Secret` → `GITHUB_CLIENT_SECRET`

---

## OAuth 플로우

### 1. GitHub 로그인 시작

```typescript
// web/src/app/slack/setup/page.tsx 에서 버튼 클릭 시
const GITHUB_OAUTH_URL =
  `https://github.com/login/oauth/authorize` +
  `?client_id=${process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID}` +
  `&scope=read:org,repo` +      // org 목록 + repo 접근
  `&state=${csrfToken}`;        // CSRF 방지용 랜덤 값 (세션에 저장)
```

### 2. 콜백 처리

```typescript
// web/src/app/api/github/callback/route.ts

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // CSRF 검증 (세션의 state와 비교)

  // code → access_token 교환
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code
    })
  });
  const { access_token } = await res.json();

  // 암호화 후 세션 또는 임시 쿠키에 저장
  // → /slack/setup 으로 리다이렉트
}
```

---

## API 사용

### 패키지

```bash
npm install @octokit/rest
```

### 클라이언트 초기화

```typescript
// web/src/lib/slack-bot/github.ts

import { Octokit } from "@octokit/rest";
import { decrypt } from "./crypto";

export function getOctokit(encryptedToken: string) {
  return new Octokit({ auth: decrypt(encryptedToken) });
}
```

---

### 주요 API 호출

#### Organization 목록 가져오기 (설정 화면)

```typescript
export async function getUserOrgs(octokit: Octokit) {
  const { data } = await octokit.orgs.listForAuthenticatedUser({ per_page: 100 });
  return data.map(org => ({ login: org.login, avatarUrl: org.avatar_url }));
}
```

#### Org의 Repo 목록

```typescript
export async function getOrgRepos(octokit: Octokit, org: string) {
  const repos = await octokit.paginate(octokit.repos.listForOrg, {
    org,
    type: "all",
    sort: "pushed",         // 최근 활동 순
    per_page: 100
  });
  return repos.map(r => ({
    name: r.name,
    full_name: r.full_name,
    private: r.private,
    description: r.description
  }));
}
```

#### 어제 Commits 수집

```typescript
export async function getYesterdayCommits(
  octokit: Octokit,
  fullName: string,
  since: Date,
  until: Date,
  maxCount = 20
) {
  const [owner, repo] = fullName.split("/");
  const { data } = await octokit.repos.listCommits({
    owner, repo,
    since: since.toISOString(),
    until: until.toISOString(),
    per_page: maxCount
  });
  return data.map(c => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split("\n")[0],  // 첫 줄만
    author: c.commit.author?.name ?? "unknown",
    url: c.html_url
  }));
}
```

#### Diff 조회 (commit message 빈약 시)

```typescript
export async function getCommitDiff(
  octokit: Octokit,
  fullName: string,
  sha: string
): Promise<string> {
  const [owner, repo] = fullName.split("/");
  const { data } = await octokit.repos.getCommit({ owner, repo, ref: sha });

  // 파일별 patch 합산 (최대 3000자 제한 — 토큰 절약)
  const patches = data.files
    ?.filter(f => f.patch)
    .map(f => `### ${f.filename}\n${f.patch}`)
    .join("\n\n") ?? "";

  return patches.slice(0, 3000);
}
```

#### 어제 Merged PRs 수집

```typescript
export async function getYesterdayPRs(
  octokit: Octokit,
  fullName: string,
  since: Date,
  until: Date
) {
  const [owner, repo] = fullName.split("/");
  // Search API 사용 — 날짜 필터 정확
  const { data } = await octokit.search.issuesAndPullRequests({
    q: `repo:${fullName} is:pr is:merged merged:${since.toISOString()}..${until.toISOString()}`,
    per_page: 10
  });
  return data.items.map(pr => ({
    number: pr.number,
    title: pr.title,
    author: pr.user?.login ?? "unknown",
    url: pr.html_url
  }));
}
```

---

## Rate Limit 전략

GitHub OAuth App: 인증된 요청 **5,000 req/hour**.

### 예상 사용량 (팀 1개, repo 10개)

| 작업 | 호출 수 |
|------|---------|
| commits 조회 (repo당 1회) | 10 |
| PRs 조회 (repo당 1회) | 10 |
| diff 조회 (commit당, 최대 5개) | 최대 50 |
| **합계** | **최대 70 req** |

100팀 동시 digest → 7,000 req → rate limit 초과 가능.

### 대응 방법

1. **Cron을 정시 1개로** — 매 정시에 전체 팀 처리 → 1시간에 걸쳐 분산
2. **rate limit 헤더 체크** — `X-RateLimit-Remaining` < 100 시 다음 정시까지 대기
3. **diff 기본값 off** — `include_diffs: false` 기본값 → rate limit 50% 절감
4. **GitHub App 전환 기준** — 팀 50개 이상 시 GitHub App으로 교체 (rate limit 별도)

```typescript
// rate limit 체크 예시
const octokit = getOctokit(token);
octokit.hook.after("request", async (response) => {
  const remaining = parseInt(response.headers["x-ratelimit-remaining"] ?? "5000");
  if (remaining < 50) {
    // 로그 + 알림, 해당 installation 스킵
    console.warn("GitHub rate limit low:", remaining);
  }
});
```

---

## Scope 최소화 원칙

MVP에서 요청하는 scope:
- `read:org` — organization 정보 + repo 목록
- `repo` — private repo commit 읽기

`repo` scope는 넓다(write 포함). 나중에 `contents:read` fine-grained token으로 교체 권장.
