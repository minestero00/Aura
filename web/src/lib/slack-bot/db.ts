import { createClient } from "@supabase/supabase-js";

// bot 스키마 접근은 service_role key 필요 (RLS 우회)
export function getBotDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface Installation {
  id: string;
  slack_team_id: string;
  slack_team_name: string;
  slack_bot_token: string;
  slack_channel_id: string;
  github_org: string;
  github_token: string;
  github_user_id: string;
  repos: { name: string; full_name: string; private: boolean }[];
  digest_time: string;
  timezone: string;
  digest_days: string[];
  summary_lang: "ko" | "en";
  include_diffs: boolean;
  max_commits_per_repo: number;
  custom_prompt: string | null;
  is_active: boolean;
  last_digest_at: string | null;
}
