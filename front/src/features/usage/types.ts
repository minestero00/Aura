export interface UsageResponse {
  periodStart: string;
  periodEnd: string;
  counters: {
    briefingsGenerated: number;
    chatRequests: number;
    refreshRequests: number;
    tokensUsed: number;
  };
  remaining: {
    dailyOverview: number;
    dailyChat: number;
    dailyManualRefresh: number;
  };
  saturation: {
    dailyOverview: number;
    dailyChat: number;
    dailyManualRefresh: number;
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
