# AI 요약 로직

---

## 전략

commit message 품질에 따라 두 단계 분기.

```
1단계: commit messages만으로 요약 시도
  → 메시지가 충분하면 (평균 10자 이상) → 바로 Claude에 전달
  → 메시지가 빈약하면 (install.include_diffs = true인 경우) → diff 추가 조회
```

commit message 품질 판단:
```typescript
function isMessageWeak(messages: string[]): boolean {
  const avg = messages.reduce((sum, m) => sum + m.length, 0) / messages.length;
  return avg < 15;  // "fix", "update", "wip" 수준
}
```

---

## 요약 프롬프트

```typescript
// web/src/lib/slack-bot/summarizer.ts

export function buildPrompt(data: DigestInput, lang: "ko" | "en"): string {
  const date = data.date;
  const repoSections = data.repos.map(repo => {
    const commits = repo.commits.map(c =>
      `  - [${c.sha}] ${c.message} (${c.author})`
    ).join("\n");
    const prs = repo.prs.map(pr =>
      `  - #${pr.number} ${pr.title} (${pr.author})`
    ).join("\n");
    const diffs = repo.diffs ? `\n[주요 변경 코드]\n${repo.diffs}` : "";

    return `## ${repo.name}\n커밋:\n${commits || "없음"}\nMerged PR:\n${prs || "없음"}${diffs}`;
  }).join("\n\n");

  if (lang === "ko") {
    return `당신은 개발팀의 일일 GitHub 업데이트를 Slack에 전달하는 AI입니다.

아래는 ${date}의 변경 내용입니다:

${repoSections}

위 내용을 팀원들이 빠르게 파악할 수 있도록 요약해주세요.

요약 규칙:
1. repo별로 한 줄~세 줄 이내로 작성
2. 기술 용어는 그대로 사용, 불필요한 설명 생략
3. 중요한 변경 (새 기능, 버그 수정, 배포 관련) 강조
4. commit이 없는 repo는 생략
5. 전체 마지막에 "오늘의 하이라이트" 한 줄 추가 (선택)
6. Slack mrkdwn 형식으로 작성 (*bold*, \`code\`, 줄바꿈 \n)
7. 이모지 적절히 사용 (과하지 않게)

${data.customPrompt ? `추가 지시:\n${data.customPrompt}` : ""}`;
  }

  // 영어 버전 (lang === "en")
  return `You are an AI that summarizes daily GitHub updates for a development team on Slack.
...`;
}
```

---

## Claude 호출

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function summarizeDigest(
  data: DigestInput,
  lang: "ko" | "en" = "ko"
): Promise<{ summary: string; tokensUsed: number }> {
  const prompt = buildPrompt(data, lang);

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",  // 요약은 Haiku로 충분, 비용 절감
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }]
  });

  const summary = message.content[0].type === "text"
    ? message.content[0].text
    : "";

  return {
    summary,
    tokensUsed: message.usage.input_tokens + message.usage.output_tokens
  };
}
```

**모델 선택 이유 — Haiku:**
- 일일 요약은 창의성 불필요, 구조적 요약 작업
- Haiku: $0.25/MTok input, $1.25/MTok output
- Sonnet 대비 5-10배 저렴
- 응답 속도 빠름 (Slack 3초 제한 대응)
- 팀 100개 × 365일 × 1000 token = 36.5M token → 연 ~$9 수준

---

## 토큰 예산 관리

repo 10개, commit 20개/repo 기준:
- 프롬프트 입력: ~2,000 token
- diff 포함 시: ~5,000 token
- 출력: ~500 token

팀당 하루 토큰 상한:
```typescript
const MAX_INPUT_TOKENS = 8000;  // 초과 시 commit 수 줄임

function trimToTokenBudget(repos: RepoData[]): RepoData[] {
  // 각 repo의 commit을 최대 10개로 줄임
  // diff는 repo당 최대 2개 commit만
  return repos.map(repo => ({
    ...repo,
    commits: repo.commits.slice(0, 10),
    diffs: repo.diffs?.slice(0, 1500)
  }));
}
```

---

## 요약 품질 향상 아이디어

### 1. 맥락 기억 (나중에)
어제 요약 + 오늘 데이터 → "어제 시작한 인증 리팩터링이 오늘 완료됐습니다" 같은 연속성 있는 요약.

### 2. 팀 맞춤 프롬프트
설정 UI에서 팀장이 직접 입력:
```
예) "우리 팀은 보안 관련 변경사항을 반드시 별도 강조해주세요."
예) "배포와 관련된 커밋은 항상 첫 번째로 언급해주세요."
```

### 3. 중요도 자동 분류
Claude에게 먼저 중요도 점수 매기게 하고, 높은 것만 상세 요약:
```
배포/릴리즈 관련 → 🔴 중요
버그 수정 → 🟡 보통
리팩터링/스타일 → 🟢 일반
```

---

## 오류 처리

```typescript
export async function safeDigest(installation: Installation): Promise<DigestResult> {
  try {
    const data = await collectGitHubData(installation);
    if (data.totalCommits === 0 && data.totalPRs === 0) {
      return { status: "skipped", reason: "no_activity" };
    }
    const { summary, tokensUsed } = await summarizeDigest(data);
    await sendToSlack(installation, summary);
    return { status: "success", tokensUsed };
  } catch (err) {
    // Slack에 에러 알림은 보내지 않음 (팀원에게 불필요한 노이즈)
    // 내부 로그만 기록
    console.error("Digest failed:", installation.slack_team_id, err);
    return { status: "failed", error: String(err) };
  }
}
```

활동이 없는 날(주말 commit 없음 등)은 `skipped`로 기록 — Slack에 빈 메시지 보내지 않음.
