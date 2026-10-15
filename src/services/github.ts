import type { PullRequest } from "../types.js";

type GithubPull = {
  number: number;
  title: string;
  html_url: string;
  draft: boolean;
  updated_at: string;
};

export async function fetchOpenPulls(
  owner: string,
  repo: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PullRequest[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=100`;
  const res = await fetchImpl(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "tj-command-center",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status}`);
  }

  const body = (await res.json()) as GithubPull[];
  return body.map((pr) => ({
    number: pr.number,
    title: pr.title,
    htmlUrl: pr.html_url,
    draft: pr.draft,
    updatedAt: pr.updated_at,
  }));
}

export async function fetchAllRepoPulls(
  repos: { owner: string; repo: string; key: string }[],
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, PullRequest[]>> {
  const out: Record<string, PullRequest[]> = {};
  await Promise.all(
    repos.map(async ({ owner, repo, key }) => {
      out[key] = await fetchOpenPulls(owner, repo, token, fetchImpl);
    }),
  );
  return out;
}
