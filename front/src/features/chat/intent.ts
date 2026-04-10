export function isUrgentMailQuestion(message: string) {
  const normalized = message.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  const keywords = [
    "급한 메일",
    "urgent mail",
    "urgent email",
    "important email",
    "important mail",
    "reply first",
    "먼저 답장",
    "우선 답장",
    "중요 메일"
  ];

  return keywords.some(keyword => normalized.includes(keyword));
}
