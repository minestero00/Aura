import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

function getPrivateKey() {
  return (process.env.GITHUB_APP_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
}

function getAppOctokit(installationId: number) {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID!,
      privateKey: getPrivateKey(),
      installationId
    }
  });
}

export async function getInstallationRepos(installationId: number) {
  const octokit = getAppOctokit(installationId);
  const repos = await octokit.paginate(octokit.apps.listReposAccessibleToInstallation, {
    per_page: 100
  });
  return repos.map(r => ({
    name: r.name,
    full_name: r.full_name,
    private: r.private,
    description: r.description ?? null,
    pushedAt: r.pushed_at ?? null
  }));
}

export async function getInstallationAccount(installationId: number): Promise<{ login: string; type: string }> {
  const octokit = getAppOctokit(installationId);
  const { data } = await octokit.apps.getInstallation({ installation_id: installationId });
  return {
    login: (data.account as { login?: string })?.login ?? "unknown",
    type: (data.account as { type?: string })?.type ?? "Organization"
  };
}

export async function getOrgMembers(
  installationId: number,
  org: string
): Promise<{ login: string; avatar_url: string }[]> {
  try {
    const octokit = getAppOctokit(installationId);
    const members = await octokit.paginate(octokit.orgs.listMembers, {
      org,
      per_page: 100
    });
    return members.map(m => ({ login: m.login, avatar_url: m.avatar_url }));
  } catch {
    return [];
  }
}

export async function exchangeCodeForUser(code: string): Promise<{ id: string; login: string }> {
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_APP_CLIENT_ID,
      client_secret: process.env.GITHUB_APP_CLIENT_SECRET,
      code
    })
  });
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) throw new Error("token_exchange_failed");

  const userOctokit = new Octokit({ auth: tokenData.access_token });
  const { data } = await userOctokit.users.getAuthenticated();
  return { id: String(data.id), login: data.login };
}
