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

interface UserMapping {
  github_login: string;
  slack_user_id: string;
  slack_display_name: string;
}

interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  github_login: string;
  url: string;
}

interface PrInfo {
  number: number;
  title: string;
  author: string;
  url: string;
}

interface ReleaseInfo {
  tag: string;
  name: string;
  url: string;
}

interface RepoDigest {
  name: string;
  url: string;
  commits: CommitInfo[];
  prs: PrInfo[];
  releases: ReleaseInfo[];
  diff?: string;
}

export async function getInstallationsDueNow(now: Date): Promise<Installation[]> {
  const pool = getPool();
  const { rows } = await pool.query<Installation>(
    `SELECT * FROM bot_installations WHERE is_active = true`
  );
  return rows.filter(inst => isDueNow(inst, now));
}

export async function getManualTriggers(): Promise<Installation[]> {
  const pool = getPool();
  const { rows } = await pool.query<Installation>(
    `SELECT * FROM bot_installations WHERE is_active = true AND manual_trigger = true`
  );
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
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit"
  });
  const todayLocal = formatter.format(now);
  const todayUTC = new Date(`${todayLocal}T00:00:00`);

  const offsetMs = now.getTime() - new Date(now.toLocaleString("en-US", { timeZone: "UTC" })).getTime()
    + new Date(now.toLocaleString("en-US", { timeZone: timezone })).getTime() - now.getTime();

  const todayStart = new Date(todayUTC.getTime() - offsetMs);
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);

  return {
    since: yesterdayStart.toISOString(),
    until: todayStart.toISOString()
  };
}

async function loadMappings(pool: Pool, installationId: string): Promise<UserMapping[]> {
  const { rows } = await pool.query<UserMapping>(
    `SELECT github_login, slack_user_id, slack_display_name FROM user_mappings WHERE installation_id = $1`,
    [installationId]
  );
  return rows;
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

  const { data: commits } = await octokit.repos.listCommits({
    owner, repo: repoName,
    since, until,
    per_page: maxCommits
  });

  const commitInfos: CommitInfo[] = commits.map(c => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split("\n")[0].slice(0, 100),
    author: c.commit.author?.name ?? "unknown",
    github_login: c.author?.login ?? "",
    url: c.html_url
  }));

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
  } catch { /* search API 실패 시 무시 */ }

  let releases: ReleaseInfo[] = [];
  try {
    const { data: releaseData } = await octokit.repos.listReleases({
      owner, repo: repoName, per_page: 5
    });
    releases = releaseData
      .filter(r => r.published_at && new Date(r.published_at) >= new Date(since))
      .map(r => ({ tag: r.tag_name, name: r.name || r.tag_name, url: r.html_url }));
  } catch { /* releases 조회 실패 시 무시 */ }

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
      } catch { /* diff 조회 실패 시 무시 */ }
    }
  }

  return { name: repo.name, url: `https://github.com/${repo.full_name}`, commits: commitInfos, prs, releases, diff };
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
      const commits = r.commits.map(c => `  - [${c.sha}] ${c.message} (${c.github_login || c.author})`).join("\n");
      const prs = r.prs.map(p => `  - PR #${p.number} ${p.title} by @${p.author}`).join("\n");
      const diff = r.diff ? `\n[코드 변경]\n${r.diff}` : "";
      return `## ${r.name}\n커밋:\n${commits || "  없음"}\nMerged PR:\n${prs || "  없음"}${diff}`;
    })
    .join("\n\n");

  if (!repoSections) return { text: "", tokensUsed: 0 };

  const prompt = lang === "ko"
    ? `개발팀 GitHub 일일 현황을 Slack mrkdwn으로 요약해주세요.

${date}의 변경 내용:
${repoSections}

규칙:
1. repo별 1-2줄로 핵심만
2. 새 기능/버그 수정/배포 위주로 강조
3. Slack mrkdwn (*bold*, \`code\`) 사용
4. 이모지 적절히 포함
5. 전체 3-5줄 이내로 간결하게${customPrompt ? `\n6. 추가 지시: ${customPrompt}` : ""}`
    : `Summarize GitHub daily updates for the team in Slack mrkdwn. Date: ${date}\n\n${repoSections}\n\nKeep it concise, 3-5 lines total.`;

  return callAnthropicText(prompt);
}

function mentionOf(login: string, mappings: UserMapping[]): string {
  const m = mappings.find(mp => mp.github_login === login);
  return m?.slack_user_id ? `<@${m.slack_user_id}>` : `*${login || "unknown"}*`;
}

function buildRepoBlocks(repo: RepoDigest, mappings: UserMapping[]): object[] {
  const blocks: object[] = [];

  // 레포 헤더
  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*📁 <${repo.url}|${repo.name}>* — 커밋 ${repo.commits.length}개 · PR ${repo.prs.length}개${repo.releases.length > 0 ? ` · 릴리즈 ${repo.releases.length}개` : ""}`
    }
  });

  // 작성자별 커밋 목록
  const byAuthor = new Map<string, CommitInfo[]>();
  for (const c of repo.commits) {
    const key = c.github_login || c.author;
    const existing = byAuthor.get(key) ?? [];
    byAuthor.set(key, [...existing, c]);
  }

  const authorLines: string[] = [];
  for (const [login, commits] of byAuthor) {
    const mention = mentionOf(login, mappings);
    const lines = commits.slice(0, 5).map(c => `  • \`${c.sha}\` ${c.message}`);
    if (commits.length > 5) lines.push(`  _외 ${commits.length - 5}개_`);
    authorLines.push(`👤 ${mention} — ${commits.length}개\n${lines.join("\n")}`);
  }
  if (authorLines.length > 0) {
    const text = authorLines.join("\n").slice(0, 2900);
    blocks.push({ type: "section", text: { type: "mrkdwn", text } });
  }

  // PR 목록
  for (const pr of repo.prs) {
    const mention = mentionOf(pr.author, mappings);
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `🔗 *PR #${pr.number}:* <${pr.url}|${pr.title}> — ${mention}` }
    });
  }

  // 릴리즈
  for (const rel of repo.releases) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `🚀 *${rel.name || rel.tag}* 릴리즈` },
      accessory: {
        type: "button",
        text: { type: "plain_text", text: "릴리즈 노트" },
        url: rel.url
      }
    });
  }

  return blocks;
}

async function sendToSlack(
  token: string,
  channelId: string,
  summary: string,
  repoDigests: RepoDigest[],
  mappings: UserMapping[],
  date: string,
  stats: { commits: number; prs: number; repos: number }
) {
  const slack = new WebClient(token);
  const activeRepos = repoDigests.filter(r => r.commits.length > 0 || r.prs.length > 0);

  const blocks: object[] = [
    { type: "header", text: { type: "plain_text", text: `📋 ${date} 개발 현황` } },
    { type: "divider" }
  ];

  // AI 요약 (전체)
  if (summary) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: summary } });
    blocks.push({ type: "divider" });
  }

  // 레포별 상세 섹션
  for (const repo of activeRepos) {
    const repoBlocks = buildRepoBlocks(repo, mappings);
    blocks.push(...repoBlocks);
    blocks.push({ type: "divider" });

    // Slack 최대 50 블록 제한 방어
    if (blocks.length > 45) break;
  }

  blocks.push({
    type: "context",
    elements: [{
      type: "mrkdwn",
      text: `커밋 *${stats.commits}*개 · PR *${stats.prs}*개 · ${stats.repos}개 레포 · AURA Bot`
    }]
  });

  await slack.chat.postMessage({
    channel: channelId,
    blocks,
    text: `📋 ${date} 개발 현황 — 커밋 ${stats.commits}개 · PR ${stats.prs}개`
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
    const [repoDigests, mappings] = await Promise.all([
      Promise.all(
        inst.repos.map(repo =>
          collectRepoData(octokit, repo, since, until, inst.max_commits_per_repo, inst.include_diffs)
        )
      ),
      loadMappings(pool, inst.id)
    ]);

    const activeRepos = repoDigests.filter(r => r.commits.length > 0 || r.prs.length > 0);
    if (activeRepos.length === 0) {
      await pool.query(
        `INSERT INTO bot_digest_logs (installation_id, digest_date, status) VALUES ($1, $2, 'skipped') ON CONFLICT (installation_id, digest_date) DO NOTHING`,
        [inst.id, dateKey]
      );
      return { status: "skipped" };
    }

    const { text: summary, tokensUsed } = await summarize(repoDigests, dateStr, inst.summary_lang, inst.custom_prompt);

    await sendToSlack(slackToken, inst.slack_channel_id, summary, repoDigests, mappings, dateStr, {
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
