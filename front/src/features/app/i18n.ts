import type { NewsCategory } from '@features/news/types';

export type AppLanguage = 'en' | 'ko';

export interface AppCopy {
  common: {
    backToSettings: string;
    close: string;
    loadingSession: string;
    ok: string;
  };
  tabs: {
    mail: string;
    todo: string;
    news: string;
    settings: string;
  };
  signIn: {
    eyebrow: string;
    title: string;
    subtitle: string;
    sectionTitle: string;
    helper: string;
    signingIn: string;
  };
  mail: {
    eyebrow: string;
    title: string;
    subtitle: string;
    dailyBriefTitle: string;
    dailyBriefSubtitle: string;
    dailyBriefEmpty: string;
    dailyBriefPreparing: string;
    dailyBriefRefresh: string;
    dailyBriefOpenMail: string;
    dailyBriefOpenNews: string;
    dailyBriefEmailLabel: string;
    dailyBriefNewsLabel: string;
    gmailNotConnectedTitle: string;
    gmailNotConnectedBody: string;
    todayBriefTitle: string;
    summarizeToday: string;
    updatingBrief: string;
    inboxPreviewTitle: string;
    loadRecent: string;
    summarizeInbox: string;
    replyDraft: string;
    draftingReply: string;
    noPreview: string;
    mailSettings: string;
    openIgnoredSenderSettings: string;
  };
  news: {
    eyebrow: string;
    title: string;
    subtitle: string;
    todayBriefTitle: string;
    activeCategories: string;
    loadBrief: string;
    editTopics: string;
    loading: string;
    unknownTime: string;
    openArticle: string;
  };
  todo: {
    eyebrow: string;
    title: string;
    subtitle: string;
    deviceTitle: string;
    deviceSubtitle: string;
    deviceConnectTitle: string;
    deviceConnectBody: string;
    deviceConnectAction: string;
    reconnectTitle: string;
    reconnectBody: string;
    reconnectAction: string;
    loadAgenda: string;
    loading: string;
    today: string;
    tomorrow: string;
    noEvents: string;
    allDay: string;
    travelBasisTitle: string;
    travelModeTransit: string;
    travelModeDriving: string;
    travelLoading: string;
    travelFromCurrent: (minutes: number, departureTime: string) => string;
    travelFromPrevious: (
      originTitle: string,
      minutes: number,
      departureTime: string,
    ) => string;
    travelMode: (mode: 'driving' | 'transit' | 'walking') => string;
    travelTightWarning: string;
  };
  settings: {
    eyebrow: string;
    title: string;
    subtitle: string;
    gmailTitle: string;
    gmailSubtitle: string;
    currentStatus: string;
    connected: string;
    address: string;
    connectedAt: string;
    notConnected: string;
    yes: string;
    no: string;
    refreshRequired: string;
    refreshHelp: string;
    refreshGmail: string;
    connectGmail: string;
    disconnectGmail: string;
    ignoredTitle: string;
    ignoredSubtitle: string;
    ignoredManage: string;
    ignoredHelper: string;
    ignoredPlaceholder: string;
    addIgnored: string;
    noIgnored: string;
    remove: string;
    newsTopicsTitle: string;
    newsTopicsSubtitle: string;
    maxTopicsHelp: string;
    selectedTopics: (count: number) => string;
    included: string;
    excluded: string;
    on: string;
    off: string;
    languageTitle: string;
    languageSubtitle: string;
    languageEnglish: string;
    languageKorean: string;
    notificationsTitle: string;
    notificationsSubtitle: string;
    notificationsStatus: string;
    notificationsPermission: string;
    notificationsTime: string;
    notificationsEnabled: string;
    notificationsDisabled: string;
    notificationsAllow: string;
    notificationsBlocked: string;
    notificationsEnable: string;
    notificationsDisable: string;
    notificationsRefresh: string;
    permissionsTitle: string;
    permissionsSubtitle: string;
    permissionsDeviceCalendar: string;
    permissionsNotifications: string;
    permissionsGoogleCalendar: string;
    permissionsOpenSettings: string;
    permissionsReconnectGoogle: string;
    menuGmail: string;
    menuIgnored: (count: number) => string;
    menuNewsTopics: string;
    menuLanguage: string;
    menuNotifications: string;
    menuPermissions: string;
    logoutTitle: string;
    logoutSubtitle: string;
    logoutAction: string;
  };
}

const EN_COPY: AppCopy = {
  common: {
    backToSettings: 'Back to settings',
    close: 'Close',
    loadingSession: 'Restoring your Aura session...',
    ok: 'OK',
  },
  tabs: {
    mail: 'Mail',
    todo: 'Todo',
    news: 'News',
    settings: 'Settings',
  },
  signIn: {
    eyebrow: 'Aura',
    title: 'Daily AI briefings for your news and inbox',
    subtitle:
      'Sign in with your Google account to activate the real Aura session flow.',
    sectionTitle: 'Google Sign-In',
    helper:
      'This uses your real Google OAuth client IDs and backend token verification.',
    signingIn: 'Signing in...',
  },
  mail: {
    eyebrow: 'Mail',
    title: "Today's email brief",
    subtitle:
      'Focus on the inbox items that matter and hide ignored senders automatically.',
    dailyBriefTitle: 'Daily Brief',
    dailyBriefSubtitle:
      'A quick snapshot of your inbox and news before you dive into details.',
    dailyBriefEmpty:
      'Your daily brief will appear here after mail and news are prepared.',
    dailyBriefPreparing: 'Preparing your daily brief...',
    dailyBriefRefresh: 'Refresh brief',
    dailyBriefOpenMail: 'Open Mail',
    dailyBriefOpenNews: 'Open News',
    dailyBriefEmailLabel: 'Mail',
    dailyBriefNewsLabel: 'News',
    gmailNotConnectedTitle: 'Gmail not connected',
    gmailNotConnectedBody:
      'Gmail access is connected automatically right after Google sign-in. If it is still not connected, open Settings and reconnect Gmail there.',
    todayBriefTitle: "Today's Email Brief",
    summarizeToday: "Summarize Today's Email",
    updatingBrief: 'Updating email brief...',
    inboxPreviewTitle: 'Inbox Preview',
    loadRecent: 'Load Recent Emails',
    summarizeInbox: 'Summarize Inbox',
    replyDraft: 'Reply draft',
    draftingReply: 'Drafting...',
    noPreview: 'No preview available.',
    mailSettings: 'Mail Settings',
    openIgnoredSenderSettings: 'Open ignored sender settings',
  },
  news: {
    eyebrow: 'News',
    title: 'Daily news briefing',
    subtitle:
      'Get a compact briefing built from the categories you enabled in settings.',
    todayBriefTitle: "Today's Brief",
    activeCategories: 'Active categories',
    loadBrief: 'Load Daily News Brief',
    editTopics: 'Edit News Topics',
    loading: 'Loading daily news...',
    unknownTime: 'Unknown time',
    openArticle: 'Open article',
  },
  todo: {
    eyebrow: 'Todo',
    title: 'Your schedule',
    subtitle: 'See what is coming up today and tomorrow from Google Calendar.',
    deviceTitle: 'Device calendar',
    deviceSubtitle: 'Read calendar events already stored on this phone.',
    deviceConnectTitle: 'Device calendar access needed',
    deviceConnectBody:
      'Allow calendar access to read schedules from your phone calendar apps.',
    deviceConnectAction: 'Allow device calendar',
    reconnectTitle: 'Calendar access needed',
    reconnectBody:
      'Reconnect Google access once to include your calendar schedule here.',
    reconnectAction: 'Reconnect Google',
    loadAgenda: 'Load schedule',
    loading: 'Loading your schedule...',
    today: 'Today',
    tomorrow: 'Tomorrow',
    noEvents: 'No events scheduled.',
    allDay: 'All day',
    travelBasisTitle: 'Travel estimate basis',
    travelModeTransit: 'Transit',
    travelModeDriving: 'Car',
    travelLoading: 'Calculating travel time between events...',
    travelFromCurrent: (minutes, departureTime) =>
      `${minutes} min from current location. Leave by ${departureTime}.`,
    travelFromPrevious: (originTitle, minutes, departureTime) =>
      `${originTitle} -> ${minutes} min. Leave by ${departureTime}.`,
    travelMode: mode => {
      if (mode === 'driving') {
        return 'by car';
      }
      if (mode === 'transit') {
        return 'by transit';
      }
      return 'on foot';
    },
    travelTightWarning: 'You may need to leave immediately.',
  },
  settings: {
    eyebrow: 'Settings',
    title: 'Control Aura',
    subtitle:
      'Open Gmail access settings, manage ignored senders, choose news topics, or change the app language from here.',
    gmailTitle: 'Gmail access',
    gmailSubtitle:
      'Reconnect Gmail here if access expired or you want to disconnect this account.',
    currentStatus: 'Current status',
    connected: 'Connected',
    address: 'Address',
    connectedAt: 'Connected at',
    notConnected: 'Not connected',
    yes: 'Yes',
    no: 'No',
    refreshRequired: 'Refresh required',
    refreshHelp:
      'Gmail access has expired. Reconnect Gmail to keep inbox features working.',
    refreshGmail: 'Refresh Gmail Access',
    connectGmail: 'Connect Gmail',
    disconnectGmail: 'Disconnect Gmail',
    ignoredTitle: 'Ignored senders',
    ignoredSubtitle:
      'Add or remove email addresses that Aura should hide from mail lists and summaries.',
    ignoredManage: 'Manage ignored senders',
    ignoredHelper:
      'Enter an email address. Messages from matching senders will be filtered out locally.',
    ignoredPlaceholder: 'newsletter@example.com',
    addIgnored: 'Add ignored sender',
    noIgnored: 'No custom ignored senders yet.',
    remove: 'Remove',
    newsTopicsTitle: 'News topics',
    newsTopicsSubtitle:
      'Choose up to 5 topics Aura should include when building your daily news briefing.',
    maxTopicsHelp: 'You can select up to 5 topics.',
    selectedTopics: count => `${count}/5 selected`,
    included: 'Included in your news brief',
    excluded: 'Excluded from your news brief',
    on: 'On',
    off: 'Off',
    languageTitle: 'Language',
    languageSubtitle: 'Choose the app language for labels and controls.',
    languageEnglish: 'English',
    languageKorean: 'Korean',
    notificationsTitle: 'Daily brief notifications',
    notificationsSubtitle:
      'Send a local Aura reminder every morning and prepare the latest mail and news brief when opened.',
    notificationsStatus: 'Status',
    notificationsPermission: 'Permission',
    notificationsTime: 'Delivery time',
    notificationsEnabled: 'Enabled',
    notificationsDisabled: 'Disabled',
    notificationsAllow: 'Allowed',
    notificationsBlocked: 'Blocked',
    notificationsEnable: 'Enable daily brief',
    notificationsDisable: 'Disable daily brief',
    notificationsRefresh: 'Refresh schedule',
    permissionsTitle: 'Permissions',
    permissionsSubtitle:
      'Manage the access Aura needs to show your briefings and schedule.',
    permissionsDeviceCalendar: 'Device calendar',
    permissionsNotifications: 'Notifications',
    permissionsGoogleCalendar: 'Google Calendar',
    permissionsOpenSettings: 'Open app settings',
    permissionsReconnectGoogle: 'Reconnect Google',
    menuGmail: 'Google Account',
    menuIgnored: count => `${count} custom sender${count === 1 ? '' : 's'}`,
    menuNewsTopics: 'News topics',
    menuLanguage: 'Language',
    menuNotifications: 'Daily brief notifications',
    menuPermissions: 'Permissions',
    logoutTitle: 'Sign out',
    logoutSubtitle: 'Remove this Aura session from the device.',
    logoutAction: 'Sign out',
  },
};

const KO_COPY: AppCopy = {
  common: {
    backToSettings: '설정으로 돌아가기',
    close: '닫기',
    loadingSession: 'Aura 세션을 복원하는 중...',
    ok: '확인',
  },
  tabs: {
    mail: '메일',
    todo: '일정',
    news: '뉴스',
    settings: '설정',
  },
  signIn: {
    eyebrow: 'Aura',
    title: '뉴스와 메일을 위한 일일 AI 브리핑',
    subtitle: 'Google 계정으로 로그인해서 실제 Aura 세션을 시작하세요.',
    sectionTitle: 'Google 로그인',
    helper: '실제 Google OAuth 클라이언트 ID와 백엔드 토큰 검증을 사용합니다.',
    signingIn: '로그인하는 중...',
  },
  mail: {
    eyebrow: '메일',
    title: '오늘의 메일 브리핑',
    subtitle: '중요한 메일만 빠르게 보고, 무시한 발신자는 자동으로 제외합니다.',
    dailyBriefTitle: '데일리 브리프',
    dailyBriefSubtitle: '메일과 뉴스의 핵심만 먼저 준비했습니다.',
    dailyBriefEmpty:
      '메일과 뉴스가 준비되면 여기서 오늘의 브리프를 볼 수 있습니다.',
    dailyBriefPreparing: '오늘의 브리프를 준비하는 중...',
    dailyBriefRefresh: '브리프 새로고침',
    dailyBriefOpenMail: '메일 보기',
    dailyBriefOpenNews: '뉴스 보기',
    dailyBriefEmailLabel: '메일',
    dailyBriefNewsLabel: '뉴스',
    gmailNotConnectedTitle: 'Gmail이 연결되지 않음',
    gmailNotConnectedBody:
      'Google 로그인 직후 Gmail 연결을 자동으로 시도합니다. 아직 연결되지 않았다면 설정에서 다시 연결하세요.',
    todayBriefTitle: '오늘의 메일 브리핑',
    summarizeToday: '오늘 메일 요약하기',
    updatingBrief: '메일 브리핑을 업데이트하는 중...',
    inboxPreviewTitle: '받은편지함 미리보기',
    loadRecent: '최근 메일 불러오기',
    summarizeInbox: '받은편지함 요약하기',
    replyDraft: '답장 초안',
    draftingReply: '작성 중...',
    noPreview: '미리보기가 없습니다.',
    mailSettings: '메일 설정',
    openIgnoredSenderSettings: '발신자 무시 설정 열기',
  },
  news: {
    eyebrow: '뉴스',
    title: '일일 뉴스 브리핑',
    subtitle: '설정에서 켠 토픽만 모아서 간단한 뉴스 브리핑을 보여줍니다.',
    todayBriefTitle: '오늘의 브리핑',
    activeCategories: '활성 토픽',
    loadBrief: '오늘 뉴스 브리핑 불러오기',
    editTopics: '뉴스 토픽 설정',
    loading: '오늘 뉴스를 불러오는 중...',
    unknownTime: '시간 정보 없음',
    openArticle: '기사 보기',
  },
  todo: {
    eyebrow: '일정',
    title: '오늘의 일정',
    subtitle: 'Google Calendar에서 오늘과 내일 일정을 확인하세요.',
    deviceTitle: '기기 캘린더',
    deviceSubtitle: '이 휴대폰에 저장된 일정 앱의 이벤트를 읽습니다.',
    deviceConnectTitle: '기기 캘린더 권한 필요',
    deviceConnectBody:
      '휴대폰 캘린더 앱의 일정을 읽으려면 캘린더 권한을 허용하세요.',
    deviceConnectAction: '기기 캘린더 허용',
    reconnectTitle: '캘린더 권한 필요',
    reconnectBody:
      '한 번만 Google 접근을 다시 연결하면 여기서 일정을 볼 수 있습니다.',
    reconnectAction: 'Google 다시 연결',
    loadAgenda: '일정 불러오기',
    loading: '일정을 불러오는 중...',
    today: '오늘',
    tomorrow: '내일',
    noEvents: '예정된 일정이 없습니다.',
    allDay: '종일',
    travelBasisTitle: '이동시간 계산 기준',
    travelModeTransit: '대중교통',
    travelModeDriving: '자차',
    travelLoading: '일정 간 이동 시간을 계산하는 중...',
    travelFromCurrent: (minutes, departureTime) =>
      `현재 위치 기준 약 ${minutes}분 소요. ${departureTime}까지 출발 권장`,
    travelFromPrevious: (originTitle, minutes, departureTime) =>
      `${originTitle} 이후 약 ${minutes}분 소요. ${departureTime}까지 출발 권장`,
    travelMode: mode => {
      if (mode === 'driving') {
        return '자동차 기준';
      }
      if (mode === 'transit') {
        return '대중교통 기준';
      }
      return '도보 기준';
    },
    travelTightWarning: '시간이 촉박합니다.',
  },
  settings: {
    eyebrow: '설정',
    title: 'Aura 설정',
    subtitle:
      'Gmail 접근, 발신자 무시, 뉴스 토픽, 앱 언어를 여기서 관리합니다.',
    gmailTitle: 'Gmail 접근',
    gmailSubtitle:
      '접근 권한이 만료됐거나 계정을 해제하고 싶다면 여기서 관리하세요.',
    currentStatus: '현재 상태',
    connected: '연결됨',
    address: '주소',
    connectedAt: '연결 시각',
    notConnected: '연결되지 않음',
    yes: '예',
    no: '아니오',
    refreshRequired: '재연결 필요',
    refreshHelp:
      'Gmail 접근이 만료되었습니다. 메일 기능을 계속 쓰려면 다시 연결하세요.',
    refreshGmail: 'Gmail 접근 갱신',
    connectGmail: 'Gmail 연결',
    disconnectGmail: 'Gmail 연결 해제',
    ignoredTitle: '발신자 무시',
    ignoredSubtitle:
      '목록과 요약에서 제외할 이메일 주소를 추가하거나 제거하세요.',
    ignoredManage: '발신자 무시 관리',
    ignoredHelper:
      '이메일 주소를 입력하면 해당 발신자의 메일을 로컬에서 숨깁니다.',
    ignoredPlaceholder: 'newsletter@example.com',
    addIgnored: '발신자 무시 추가',
    noIgnored: '등록된 사용자 정의 발신자 무시가 없습니다.',
    remove: '삭제',
    newsTopicsTitle: '뉴스 토픽',
    newsTopicsSubtitle:
      '일일 뉴스 브리핑에 포함할 토픽을 최대 5개까지 선택하세요.',
    maxTopicsHelp: '최대 5개까지 선택할 수 있습니다.',
    selectedTopics: count => `${count}/5 선택됨`,
    included: '뉴스 브리핑에 포함됨',
    excluded: '뉴스 브리핑에서 제외됨',
    on: '사용',
    off: '해제',
    languageTitle: '언어',
    languageSubtitle: '버튼과 화면 이름에 사용할 앱 언어를 선택하세요.',
    languageEnglish: '영어',
    languageKorean: '한국어',
    notificationsTitle: '데일리 브리핑 알림',
    notificationsSubtitle:
      '매일 아침 Aura 알림을 받고, 열면 최신 메일과 뉴스를 바로 준비합니다.',
    notificationsStatus: '상태',
    notificationsPermission: '권한',
    notificationsTime: '도착 시간',
    notificationsEnabled: '활성화됨',
    notificationsDisabled: '비활성화됨',
    notificationsAllow: '허용됨',
    notificationsBlocked: '차단됨',
    notificationsEnable: '데일리 브리핑 켜기',
    notificationsDisable: '데일리 브리핑 끄기',
    notificationsRefresh: '알림 일정 새로고침',
    permissionsTitle: '권한',
    permissionsSubtitle:
      '브리핑과 일정을 보여주기 위해 필요한 접근 권한을 관리합니다.',
    permissionsDeviceCalendar: '기기 캘린더',
    permissionsNotifications: '알림',
    permissionsGoogleCalendar: 'Google 캘린더',
    permissionsOpenSettings: '앱 설정 열기',
    permissionsReconnectGoogle: 'Google 다시 연결',
    menuGmail: 'Google 계정',
    menuIgnored: count => `사용자 지정 발신자 ${count}개`,
    menuNewsTopics: '뉴스 토픽',
    menuLanguage: '언어',
    menuNotifications: '데일리 브리핑 알림',
    menuPermissions: '권한',
    logoutTitle: '로그아웃',
    logoutSubtitle: '이 기기에서 Aura 세션을 종료합니다.',
    logoutAction: '로그아웃',
  },
};

const CATEGORY_LABELS: Record<AppLanguage, Record<NewsCategory, string>> = {
  en: {
    world: 'World',
    business: 'Business',
    tech: 'Tech',
    science: 'Science',
    health: 'Health',
    sports: 'Sports',
    entertainment: 'Entertainment',
    politics: 'Politics',
    finance: 'Finance',
    travel: 'Travel',
    climate: 'Climate',
    ai: 'AI',
  },
  ko: {
    world: '세계',
    business: '비즈니스',
    tech: '기술',
    science: '과학',
    health: '건강',
    sports: '스포츠',
    entertainment: '엔터테인먼트',
    politics: '정치',
    finance: '금융',
    travel: '여행',
    climate: '기후',
    ai: 'AI',
  },
};

export function getCopy(language: AppLanguage) {
  return language === 'ko' ? KO_COPY : EN_COPY;
}

export function getCategoryLabel(
  language: AppLanguage,
  category: NewsCategory,
) {
  return CATEGORY_LABELS[language][category];
}
