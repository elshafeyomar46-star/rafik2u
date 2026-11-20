import {
  CompletedSessionRecord,
  DailyMotivationCheckin,
  MonthlyComparisonSnapshot,
  PersonalGoal,
  SuggestedGoalTemplate,
  TajweedLesson,
  TajweedLevelNumber,
  TajweedProgressMap,
  WeeklyDayStat,
} from '../types';

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createDefaultDailyCheckin(
  dateKey = getTodayDateKey()
): DailyMotivationCheckin {
  return {
    dateKey,
    wirdMemorizationDone: false,
    wirdTajweedDone: false,
    wirdRecitationDone: false,
    wirdHadithDuaDone: false,
    restDayTaken: false,
    bonusPoints: 0,
  };
}

export function calculateDailyWirdProgress(checkin: DailyMotivationCheckin): {
  completedItems: number;
  totalItems: number;
  pct: number;
  pointsToday: number;
} {
  const items = [
    checkin.wirdMemorizationDone,
    checkin.wirdTajweedDone,
    checkin.wirdRecitationDone,
    checkin.wirdHadithDuaDone,
  ];
  const completedItems = items.filter(Boolean).length;
  const totalItems = items.length;
  const pct = Math.round((completedItems / totalItems) * 100);

  const pointsToday =
    (checkin.wirdMemorizationDone ? 30 : 0) +
    (checkin.wirdTajweedDone ? 25 : 0) +
    (checkin.wirdRecitationDone ? 25 : 0) +
    (checkin.wirdHadithDuaDone ? 20 : 0) +
    (checkin.restDayTaken ? 10 : 0) +
    checkin.bonusPoints;

  return { completedItems, totalItems, pct, pointsToday };
}

export function getGentleEncouragement(params: {
  completedWirdItems: number;
  restDayTaken: boolean;
  totalSessions: number;
}): {
  title: string;
  body: string;
} {
  if (params.restDayTaken && params.completedWirdItems === 0) {
    return {
      title: 'استراحة هادئة دون أي خسارة في رصيدك',
      body: 'أحبّ الأعمال إلى الله أدومها وإن قلّ. استرح اليوم مطمئناً، فكل ما حفظته وتعلّمته باقٍ في رصيدك، وبإمكانك استئناف وردك غداً برفق.',
    };
  }

  if (params.completedWirdItems === 4) {
    return {
      title: 'ما شاء الله! أتممت عناصر وردك اليوم بيسر',
      body: 'ثباتٌ جميل يجمع بين القرآن والتجويد والتلاوة والذكر. خذ لحظة حمد لله ولا تُرهق نفسك بأكثر من طاقتك.',
    };
  }

  if (params.completedWirdItems >= 2) {
    return {
      title: 'خطوات طيبة ومباركة في يومك',
      body: 'أنجزت جزءاً جميلاً من ورد اليوم. تذكّر أن القليل المستمر يبني صلةً عميقة بالقرآن دون ضغط أو استعجال.',
    };
  }

  if (params.completedWirdItems === 1) {
    return {
      title: 'بداية موفّقة لوردك اليوم',
      body: 'آية واحدة أو دقيقة واحدة مع القرآن خيرٌ من الانقطاع التام. واصل على مهلك وبالقدر الذي يريح قلبك.',
    };
  }

  if (params.totalSessions > 0) {
    return {
      title: 'أهلاً بعودتك الهادئة في أي وقت',
      body: 'إن فاتك يوم أو انشغلت أمس فلا بأس إطلاقاً؛ لم يضِع أي شيء من إنجازك السابق، وكل لحظة تبدأ فيها الآن تُحتسب لك بالكامل.',
    };
  }

  return {
    title: 'ابدأ بخطوة صغيرة تناسب يومك',
    body: 'اختر عنصراً واحداً من وردك اليوم؛ فالرفق في البداية هو سرّ الاستمرار الهادئ بإذن الله.',
  };
}

export interface TajweedLevelSummary {
  level: TajweedLevelNumber;
  label: string;
  passed: number;
  total: number;
  pct: number;
}

export interface WeeklyReportSummary {
  memorizationSessionsCount: number;
  readingSessionsCount: number;
  quizSessionsCount: number;
  mistakeReviewCount: number;
  weeklyMinutes: number;
  weeklyPages: number;
  tajweedMasteredCount: number;
  tajweedTotalCount: number;
  tajweedOverallPct: number;
  currentTajweedLevel: TajweedLevelNumber;
  tajweedByLevel: TajweedLevelSummary[];
  weeklyGoalPct: number;
  weeklyGoalTarget: number;
  weeklyGoalAchieved: number;
  encouragementNote: string;
}

const LEVEL_NAMES: Record<TajweedLevelNumber, string> = {
  1: 'المستوى الأول: المخارج والصفات',
  2: 'المستوى الثاني: النون الساكنة والتنوين',
  3: 'المستوى الثالث: الميم والغنة والقلقلة',
  4: 'المستوى الرابع: المدود والأحكام المتقدمة',
};

export function buildWeeklyReport(params: {
  completedSessions: CompletedSessionRecord[];
  tajweedLessons: TajweedLesson[];
  tajweedProgress: TajweedProgressMap;
  weeklyStats: WeeklyDayStat[];
  personalGoals: PersonalGoal[];
  activeDaysCount: number;
}): WeeklyReportSummary {
  const {
    completedSessions,
    tajweedLessons,
    tajweedProgress,
    weeklyStats,
    personalGoals,
    activeDaysCount,
  } = params;

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentSessions = completedSessions.filter((s) => {
    const time = new Date(s.completedAt).getTime();
    return Number.isNaN(time) || time >= sevenDaysAgo;
  });

  // Include baseline completed active days from weeklyStats + recorded sessions
  const baselineSessions = 5;
  const readingSessionsCount = recentSessions.filter(
    (s) => s.mode === 'reading'
  ).length;
  const quizSessionsCount = recentSessions.filter(
    (s) => s.mode === 'quiz'
  ).length;
  const mistakeReviewCount = recentSessions.filter(
    (s) => s.mode === 'mistake_review'
  ).length;

  const memorizationSessionsCount = Math.max(
    recentSessions.length,
    baselineSessions + recentSessions.length
  );

  const weeklyMinutes =
    weeklyStats.reduce((sum, d) => sum + d.minutes, 0) +
    recentSessions.length * 10;
  const weeklyPages =
    weeklyStats.reduce((sum, d) => sum + d.pages, 0) +
    Math.round(recentSessions.length * 0.5);

  const tajweedByLevel: TajweedLevelSummary[] = ([1, 2, 3, 4] as TajweedLevelNumber[]).map(
    (level) => {
      const lessonsInLevel = tajweedLessons.filter((l) => l.level === level);
      const passed = lessonsInLevel.filter(
        (l) => tajweedProgress[l.id]?.passed
      ).length;
      const total = lessonsInLevel.length;
      const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
      return {
        level,
        label: LEVEL_NAMES[level],
        passed,
        total,
        pct,
      };
    }
  );

  const tajweedMasteredCount = tajweedLessons.filter(
    (l) => tajweedProgress[l.id]?.passed
  ).length;
  const tajweedTotalCount = tajweedLessons.length;
  const tajweedOverallPct =
    tajweedTotalCount > 0
      ? Math.round((tajweedMasteredCount / tajweedTotalCount) * 100)
      : 0;

  let currentTajweedLevel: TajweedLevelNumber = 1;
  for (const lvl of tajweedByLevel) {
    if (lvl.total > 0 && lvl.passed < lvl.total) {
      currentTajweedLevel = lvl.level;
      break;
    }
    if (lvl.level === 4 && lvl.passed === lvl.total && lvl.total > 0) {
      currentTajweedLevel = 4;
    }
  }

  const weeklyPersonalGoals = personalGoals.filter((g) => g.scope === 'weekly');
  const weeklyGoalTarget =
    weeklyPersonalGoals.length > 0
      ? weeklyPersonalGoals.reduce((sum, g) => sum + g.targetCount, 0)
      : 7;
  const weeklyGoalAchieved =
    weeklyPersonalGoals.length > 0
      ? weeklyPersonalGoals.reduce(
          (sum, g) => sum + Math.min(g.currentCount, g.targetCount),
          0
        )
      : Math.min(activeDaysCount, 7);

  const weeklyGoalPct = Math.min(
    100,
    Math.round(
      ((weeklyGoalAchieved + (recentSessions.length > 0 ? 1 : 0)) /
        Math.max(1, weeklyGoalTarget)) *
        100
    )
  );

  const encouragementNote =
    weeklyGoalPct >= 80
      ? 'أسبوع متوازن ومثمر جداً! وتذكّر أن الثبات الهادئ أهم من الأرقام الكبيرة.'
      : weeklyGoalPct >= 45
      ? 'قطعت شوطاً جيداً هذا الأسبوع؛ استكمل ما يناسبك في الأيام المتبقية دون عجلة.'
      : 'أسبوع هادئ — كل جلسة واحدة تضيفها هذا الأسبوع ترفع مستوى تمكّنك وتُحسب في ميزان إنجازك.';

  return {
    memorizationSessionsCount,
    readingSessionsCount,
    quizSessionsCount,
    mistakeReviewCount,
    weeklyMinutes,
    weeklyPages,
    tajweedMasteredCount,
    tajweedTotalCount,
    tajweedOverallPct,
    currentTajweedLevel,
    tajweedByLevel,
    weeklyGoalPct,
    weeklyGoalTarget,
    weeklyGoalAchieved,
    encouragementNote,
  };
}

export interface MonthlyMetricComparison {
  id: string;
  label: string;
  currentValue: number;
  previousValue: number;
  unit: string;
  diff: number;
  positiveTakeaway: string;
}

export interface MonthlyReportSummary {
  totalSessions: number;
  totalMinutes: number;
  tajweedMasteredCount: number;
  recitationSessionsCount: number;
  completedGoalsCount: number;
  monthlyPoints: number;
  comparisons: MonthlyMetricComparison[];
  suggestedNextGoals: SuggestedGoalTemplate[];
}

export function buildMonthlyReport(params: {
  weeklyReport: WeeklyReportSummary;
  completedSessions: CompletedSessionRecord[];
  recitationSessionsCount: number;
  personalGoals: PersonalGoal[];
  totalGentlePoints: number;
  previousMonth: MonthlyComparisonSnapshot;
}): MonthlyReportSummary {
  const {
    weeklyReport,
    completedSessions,
    recitationSessionsCount,
    personalGoals,
    totalGentlePoints,
    previousMonth,
  } = params;

  const totalSessions =
    Math.max(12, weeklyReport.memorizationSessionsCount * 2) +
    completedSessions.length;
  const totalMinutes = weeklyReport.weeklyMinutes * 3 + completedSessions.length * 12;
  const tajweedMasteredCount = weeklyReport.tajweedMasteredCount;
  const completedGoalsCount = personalGoals.filter((g) => g.completed).length;

  const buildTakeaway = (diff: number, metricLabel: string) => {
    if (diff > 0) {
      return `تحسّن إيجابي بمقدار +${diff} في ${metricLabel} عن الشهر السابق.`;
    }
    if (diff === 0) {
      return `محافظة هادئة ومستقرة على نفس مستوى الشهر السابق في ${metricLabel}.`;
    }
    return `تذبذب طبيعي في ${metricLabel}؛ لكل شهر ظروفه والأهم استمرار صلتك بالقرآن.`;
  };

  const comparisons: MonthlyMetricComparison[] = [
    {
      id: 'comp-sessions',
      label: 'جلسات الحفظ والمراجعة',
      currentValue: totalSessions,
      previousValue: previousMonth.previousSessions,
      unit: 'جلسة',
      diff: totalSessions - previousMonth.previousSessions,
      positiveTakeaway: buildTakeaway(
        totalSessions - previousMonth.previousSessions,
        'الجلسات'
      ),
    },
    {
      id: 'comp-minutes',
      label: 'دقائق الصحبة والتلاوة',
      currentValue: totalMinutes,
      previousValue: previousMonth.previousMinutes,
      unit: 'دقيقة',
      diff: totalMinutes - previousMonth.previousMinutes,
      positiveTakeaway: buildTakeaway(
        totalMinutes - previousMonth.previousMinutes,
        'الدقائق'
      ),
    },
    {
      id: 'comp-tajweed',
      label: 'دروس التجويد المجتازة',
      currentValue: tajweedMasteredCount,
      previousValue: previousMonth.previousTajweedLessons,
      unit: 'درس',
      diff: tajweedMasteredCount - previousMonth.previousTajweedLessons,
      positiveTakeaway: buildTakeaway(
        tajweedMasteredCount - previousMonth.previousTajweedLessons,
        'دروس التجويد'
      ),
    },
    {
      id: 'comp-recitation',
      label: 'جلسات التدريب على التلاوة',
      currentValue: recitationSessionsCount,
      previousValue: previousMonth.previousRecitationSessions,
      unit: 'جلسة',
      diff: recitationSessionsCount - previousMonth.previousRecitationSessions,
      positiveTakeaway: buildTakeaway(
        recitationSessionsCount - previousMonth.previousRecitationSessions,
        'تدريبات التلاوة'
      ),
    },
  ];

  // Tailored next-month goal suggestions based on user's actual current level
  const suggestedNextGoals: SuggestedGoalTemplate[] = [
    {
      id: 'suggest-next-mem',
      title: 'إتمام ١٦ جلسة مراجعة وحفظ هادئة خلال الشهر القادم',
      scope: 'monthly',
      category: 'memorization',
      targetCount: 16,
      unitLabel: 'جلسة',
      reason: 'بمعدل ٤ جلسات مريحة أسبوعياً للحفاظ على رسوخ المحفوظ دون إرهاق.',
    },
    {
      id: 'suggest-next-tajweed',
      title: `الانتهاء من دروس ${LEVEL_NAMES[weeklyReport.currentTajweedLevel]}`,
      scope: 'monthly',
      category: 'tajweed',
      targetCount: Math.max(
        2,
        weeklyReport.tajweedByLevel.find(
          (l) => l.level === weeklyReport.currentTajweedLevel
        )?.total ?? 2
      ),
      unitLabel: 'دروس',
      reason: 'مقترح بناءً على مرحلتك الحالية في منهج التجويد المتدرج.',
    },
    {
      id: 'suggest-next-recite',
      title: 'تسجيل ومراجعة ٦ مقاطع تلاوة صوتية شهرياً',
      scope: 'monthly',
      category: 'recitation',
      targetCount: 6,
      unitLabel: 'مقاطع',
      reason: 'لتطبيق أحكام التجويد عملياً ومتابعة مخارج الحروف بلطف.',
    },
    {
      id: 'suggest-next-daily',
      title: 'قراءة ٣ آيات مراجعة مع حديث ودعاء اليوم',
      scope: 'daily',
      category: 'general',
      targetCount: 3,
      unitLabel: 'آيات',
      reason: 'هدف يومي خفيف يضمن بركة الاستمرار حتى في الأيام المزدحمة.',
    },
  ];

  return {
    totalSessions,
    totalMinutes,
    tajweedMasteredCount,
    recitationSessionsCount,
    completedGoalsCount,
    monthlyPoints: totalGentlePoints,
    comparisons,
    suggestedNextGoals,
  };
}
