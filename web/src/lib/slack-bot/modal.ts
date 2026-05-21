// /aura setting modal — bot_installations 일부 필드를 Slack 안에서 직접 변경
// repos/channel/github_org는 양과 보안 측면에서 web에서만 변경 (modal에는 포함 X)
const DAY_OPTIONS: { label: string; value: string }[] = [
  { label: "월", value: "mon" },
  { label: "화", value: "tue" },
  { label: "수", value: "wed" },
  { label: "목", value: "thu" },
  { label: "금", value: "fri" },
  { label: "토", value: "sat" },
  { label: "일", value: "sun" },
];

const LANG_OPTIONS = [
  { label: "한국어", value: "ko" },
  { label: "English", value: "en" },
];

const TZ_OPTIONS = [
  "Asia/Seoul",
  "Asia/Tokyo",
  "Asia/Singapore",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "UTC",
];

interface ModalState {
  installationId: string;
  digestTime: string;
  timezone: string;
  digestDays: string[];
  includeDiffs: boolean;
  summaryLang: string;
  customPrompt: string;
}

export function buildSettingsModal(state: ModalState) {
  const dayChecked = DAY_OPTIONS.filter(d => state.digestDays.includes(d.value)).map(d => ({
    text: { type: "plain_text" as const, text: d.label },
    value: d.value,
  }));

  return {
    type: "modal" as const,
    callback_id: "aura_settings_submit",
    private_metadata: state.installationId,
    title: { type: "plain_text" as const, text: "AURA Bot 설정" },
    submit: { type: "plain_text" as const, text: "저장" },
    close: { type: "plain_text" as const, text: "취소" },
    blocks: [
      {
        type: "input",
        block_id: "digest_time",
        label: { type: "plain_text", text: "다이제스트 시각" },
        element: {
          type: "timepicker",
          action_id: "value",
          initial_time: normalizeTime(state.digestTime),
        },
      },
      {
        type: "input",
        block_id: "timezone",
        label: { type: "plain_text", text: "타임존" },
        element: {
          type: "static_select",
          action_id: "value",
          initial_option: optionFor(state.timezone, TZ_OPTIONS),
          options: TZ_OPTIONS.map(tz => ({
            text: { type: "plain_text" as const, text: tz },
            value: tz,
          })),
        },
      },
      {
        type: "input",
        block_id: "digest_days",
        label: { type: "plain_text", text: "요일 선택" },
        element: {
          type: "checkboxes",
          action_id: "value",
          ...(dayChecked.length > 0 ? { initial_options: dayChecked } : {}),
          options: DAY_OPTIONS.map(d => ({
            text: { type: "plain_text" as const, text: d.label },
            value: d.value,
          })),
        },
      },
      {
        type: "input",
        block_id: "summary_lang",
        label: { type: "plain_text", text: "요약 언어" },
        element: {
          type: "static_select",
          action_id: "value",
          initial_option: {
            text: {
              type: "plain_text" as const,
              text: LANG_OPTIONS.find(l => l.value === state.summaryLang)?.label ?? "한국어",
            },
            value: state.summaryLang,
          },
          options: LANG_OPTIONS.map(l => ({
            text: { type: "plain_text" as const, text: l.label },
            value: l.value,
          })),
        },
      },
      {
        type: "input",
        block_id: "include_diffs",
        optional: true,
        label: { type: "plain_text", text: "diff 포함" },
        element: {
          type: "checkboxes",
          action_id: "value",
          ...(state.includeDiffs
            ? {
                initial_options: [
                  {
                    text: { type: "plain_text" as const, text: "코드 변경 내용 포함" },
                    value: "yes",
                  },
                ],
              }
            : {}),
          options: [
            {
              text: { type: "plain_text" as const, text: "코드 변경 내용 포함" },
              value: "yes",
            },
          ],
        },
      },
      {
        type: "input",
        block_id: "custom_prompt",
        optional: true,
        label: { type: "plain_text", text: "추가 지시 (선택)" },
        element: {
          type: "plain_text_input",
          action_id: "value",
          multiline: true,
          max_length: 1000,
          ...(state.customPrompt ? { initial_value: state.customPrompt } : {}),
          placeholder: {
            type: "plain_text",
            text: "예: bug fix와 feature를 분리해서 보여줘",
          },
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "레포·채널·GitHub 연결은 <" +
              (process.env.NEXT_PUBLIC_APP_URL ?? "") +
              "/slack/settings|웹 설정 페이지>에서 변경하세요.",
          },
        ],
      },
    ],
  };
}

function normalizeTime(t: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return "09:00";
  const hh = Math.min(23, Math.max(0, parseInt(m[1], 10))).toString().padStart(2, "0");
  const mm = Math.min(59, Math.max(0, parseInt(m[2], 10))).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function optionFor(value: string, list: string[]) {
  const v = list.includes(value) ? value : list[0];
  return {
    text: { type: "plain_text" as const, text: v },
    value: v,
  };
}
