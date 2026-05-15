import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { WebClient } from "@slack/web-api";
import { decryptSecret } from "../../lib/security/encryption.js";
import { createPgPool } from "../../lib/db/pool.js";
import type { Pool } from "pg";

let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) _pool = createPgPool({ max: 3 });
  return _pool;
}

interface Installation {
  id: string;
  slack_team_id: string;
  slack_bot_token: string;
  slack_channel_id: string;
  github_org: string;
  github_installation_id: string;
  repos: { name: string; full_name: string }[];
  digest_time: string;
  timezone: string;
  digest_days: string[];
  include_diffs: boolean;
  max_commits_per_repo: number;
  custom_prompt: string | null;
  summary_lang: "ko" | "en";
}

interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  url: string;
}

interface PrInfo {
  number: number;
  title: string;
  author: string;
  url: string;
}

interface RepoDigest {
  name: string;
  url: string;
  commits: CommitInfo[];
  prs: PrInfo[];
  diff?: string;
}

// 30분마다 호출 — 현재 시각이 해당 팀의 digest_time인 installation들 반환
export async function getInstallationsDueNow(now: Date): Promise<Installation[]> {
  const pool = getPool();
  const { rows } = await pool.query<Installation>(
    `SELECT * FROM bot_installations WHERE is_active = true`
  );

  return rows.filter(inst => isDueNow(inst, now));
}

// manual_trigger 플래그가 있는 installation들 반환
export async function getManualTriggers(): Promise<Installation[]> {
  const pool = getPool();
  const { rows } = await pool.query<Installation>(
    `SELECT * FROM bot_installations WHERE is_active = true AND manual_trigger = true`
  );
  // 플래그 초기화
  if (rows.length > 0) {
    await pool.query(
      `UPDATE bot_installations SET manual_trigger = false WHERE id = ANY($1)`,
      [rows.map(r => r.id)]
    );
  }
  return rows;
}

function isDueNow(inst: Installation, now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: inst.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short"
  }).formatToParts(now);

  const hour = parts.find(p => p.type === "hour")?.value ?? "00";
  const min  = parts.find(p => p.type === "minute")?.value ?? "00";
  const day  = parts.find(p => p.type === "weekday")?.value?.toLowerCase().slice(0, 3) ?? "mon";

  return (
    `${hour}:${min}` === inst.digest_time &&
    inst.digest_days.includes(day)
  );
}

function getYesterdayRange(timezone: string): { since: string; until: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
  const todayLocal = formatter.format(now);
  const todayUTC = new Date(`${todayLocal}T00:00:00`);

  // timezone offset 보정
  const offsetMs = now.getTime() - new Date(now.toLocaleString("en-US", { timeZone: "UTC" })).getTime()
    + new Date(now.toLocaleString("en-US", { timeZone: timezone })).getTime() - now.getTime();

  const todayStart = new Date(todayUTC.getTime() - offsetMs);
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);

  return {
    since: yesterdayStart.toISOString(),
    until: todayStart.toISOString()
  };
}

async function collectRepoData(
  octokit: Octokit,
  repo: { name: string; full_name: string },
  since: string,
  until: string,
  maxCommits: number,
  includeDiffs: boolean
): Promise<RepoDigest> {
  const [owner, repoName] = repo.full_name.split("/");

  // commits 수집
  const { data: commits } = await octokit.repos.listCommits({
    owner, repo: repoName,
    since, until,
    per_page: maxCommits
  });

  const commitInfos: CommitInfo[] = commits.map(c => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split("\n")[0],
    author: c.commit.author?.name ?? "unknown",
    url: c.html_url
  }));

  // merged PRs 수집
  let prs: PrInfo[] = [];
  try {
    const { data: prData } = await octokit.search.issuesAndPullRequests({
      q: `repo:${repo.full_name} is:pr is:merged merged:${since}..${until}`,
      per_page: 10
    });
    prs = prData.items.map(pr => ({
      number: pr.number,
      title: pr.title,
      author: pr.user?.login ?? "unknown",
      url: pr.html_url
    }));
  } catch {
    // search API 실패 시 무시
  }

  // diff 수집 (commit message 빈약 시)
  let diff: string | undefined;
  if (includeDiffs && commitInfos.length > 0) {
    const weakMessages = commitInfos.filter(c => c.message.length < 15);
    if (weakMessages.length > commitInfos.length / 2) {
      try {
        const { data: commitDetail } = await octokit.repos.getCommit({
          owner, repo: repoName, ref: commits[0].sha
        });
        diff = commitDetail.files
          ?.filter(f => f.patch)
          .map(f => `${f.filename}:\n${f.patch}`)
          .join("\n\n")
          .slice(0, 2000);
      } catch {
        // diff 조회 실패 시 무시
      }
    }
  }

  return {
    name: repo.name,
    url: `https://github.com/${repo.full_name}`,
    commits: commitInfos,
    prs,
    diff
  };
}

async function callAnthropicText(prompt: string): Promise<{ text: string; tokensUsed: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { text: "", tokensUsed: 0 };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const body = (await response.json().catch(() => null)) as {
    content?: Array<{ type?: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  } | null;

  const text = body?.content?.find(c => c.type === "text")?.text ?? "";
  const tokensUsed = (body?.usage?.input_tokens ?? 0) + (body?.usage?.output_tokens ?? 0);
  return { text, tokensUsed };
}

async function summarize(
  repoDigests: RepoDigest[],
  date: string,
  lang: "ko" | "en",
  customPrompt: string | null
): Promise<{ text: string; tokensUsed: number }> {
  const repoSections = repoDigests
    .filter(r => r.commits.length > 0 || r.prs.length > 0)
    .map(r => {
      const commits = r.commits.map(c => `  - [${c.sha}] ${c.message} (${c.author})`).join("\n");
      const prs = r.prs.map(p => `  - #${p.number} ${p.title} (${p.author})`).join("\n");
      const diff = r.diff ? `\n[코드 변경]\n${r.diff}` : "";
      return `## ${r.name}\n커밋:\n${commits || "  없음"}\nMerged PR:\n${prs || "  없음"}${diff}`;
    })
    .join("\n\n");

  if (!repoSections) return { text: "", tokensUsed: 0 };

  const prompt = lang === "ko"
    ? `당신은 개발팀의 GitHub 일일 업데이트를 Slack에 전달하는 AI입니다.

${date} 변경 내용:

${repoSections}

요약 규칙:
1. repo별로 1-3줄 이내
2. 중요 변경사항(새 기능, 버그 수정, 배포) 강조
3. commit이 없는 repo는 생략
4. Slack mrkdwn 형식 (*bold*, \`code\`)
5. 이모지 적절히 사용${customPrompt ? `\n6. 추가 지시: ${customPrompt}` : ""}`
    : `Summarize GitHub updates for the team in Slack mrkdwn format. Date: ${date}\n\n${repoSections}`;

  return callAnthropicText(prompt);
}

async function sendToSlack(
  token: string,
  channelId: string,
  summary: string,
  date: string,
  stats: { commits: number; prs: number; repos: number }
) {
  const slack = new WebClient(token);
  await slack.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `📋 ${date} 개발 현황` }
      },
      { type: "divider" },
      {
        type: "section",
        text: { type: "mrkdwn", text: summary }
      },
      { type: "divider" },
      {
        type: "context",
        elements: [{
          type: "mrkdwn",
          text: `커밋 ${stats.commits}개 · PR ${stats.prs}개 · ${stats.repos}개 레포`
        }]
      }
    ]
  });
}

export async function safeDigest(
  inst: Installation,
  force = false
): Promise<{ status: "success" | "failed" | "skipped"; tokensUsed?: number }> {
  const pool = getPool();

  const { since, until } = getYesterdayRange(inst.timezone);
  const dateStr = new Date(since).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
  const dateKey = new Date(since).toISOString().slice(0, 10);

  // 오늘 이미 실행됐는지 확인 (force=true면 스킵)
  if (!force) {
    const { rows } = await pool.query(
      `SELECT id FROM bot_digest_logs WHERE installation_id = $1 AND digest_date = $2 AND status = 'success'`,
      [inst.id, dateKey]
    );
    if (rows.length > 0) return { status: "skipped" };
  }

  const slackToken = decryptSecret(inst.slack_bot_token) ?? "";
  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID!,
      privateKey: (process.env.GITHUB_APP_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      installationId: Number(inst.github_installation_id)
    }
  });

  try {
    // 각 repo 데이터 수집
    const repoDigests = await Promise.all(
      inst.repos.map(repo =>
        collectRepoData(octokit, repo, since, until, inst.max_commits_per_repo, inst.include_diffs)
      )
    );

    const activeRepos = repoDigests.filter(r => r.commits.length > 0 || r.prs.length > 0);
    if (activeRepos.length === 0) {
      await pool.query(
        `INSERT INTO bot_digest_logs (installation_id, digest_date, status) VALUES ($1, $2, 'skipped') ON CONFLICT (installation_id, digest_date) DO NOTHING`,
        [inst.id, dateKey]
      );
      return { status: "skipped" };
    }

    const { text: summary, tokensUsed } = await summarize(repoDigests, dateStr, inst.summary_lang, inst.custom_prompt);
    await sendToSlack(slackToken, inst.slack_channel_id, summary, dateStr, {
      commits: activeRepos.reduce((s, r) => s + r.commits.length, 0),
      prs: activeRepos.reduce((s, r) => s + r.prs.length, 0),
      repos: activeRepos.length
    });

    await pool.query(
      `INSERT INTO bot_digest_logs (installation_id, digest_date, status, commit_count, pr_count, tokens_used)
       VALUES ($1, $2, 'success', $3, $4, $5)
       ON CONFLICT (installation_id, digest_date) DO UPDATE SET status='success', commit_count=$3, pr_count=$4, tokens_used=$5`,
      [
        inst.id, dateKey,
        activeRepos.reduce((s, r) => s + r.commits.length, 0),
        activeRepos.reduce((s, r) => s + r.prs.length, 0),
        tokensUsed
      ]
    );
    await pool.query(
      `UPDATE bot_installations SET last_digest_at = NOW() WHERE id = $1`,
      [inst.id]
    );

    return { status: "success", tokensUsed };
  } catch (err) {
    await pool.query(
      `INSERT INTO bot_digest_logs (installation_id, digest_date, status, error_message)
       VALUES ($1, $2, 'failed', $3)
       ON CONFLICT (installation_id, digest_date) DO UPDATE SET status='failed', error_message=$3`,
      [inst.id, dateKey, err instanceof Error ? err.message : String(err)]
    );
    return { status: "failed" };
  }
}
