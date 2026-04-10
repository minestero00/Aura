export interface UsageResponse {
  periodStart: string;
  counters: {
    briefingsGenerated: number;
    chatRequests: number;
    refreshRequests: number;
    tokensUsed: number;
  };
  limits: {
    minutePerFeature: number;
    dailyNewsBriefing: number;
    dailyEmailSummary: number;
    dailyOverview: number;
    dailyChat: number;
    dailyManualRefresh: number;
  };
}
