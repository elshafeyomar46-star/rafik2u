import { useEffect, useMemo, useState } from 'react';
import { AchievementsScreen } from './components/AchievementsScreen';
import { HadithDuaScreen } from './components/HadithDuaScreen';
import { HomeScreen } from './components/HomeScreen';
import { MemorizationScreen } from './components/MemorizationScreen';
import { NavigationShell } from './components/NavigationShell';
import { ProfileSettingsScreen } from './components/ProfileSettingsScreen';
import { RecitationScreen } from './components/RecitationScreen';
import { TajweedScreen } from './components/TajweedScreen';
import { WelcomeScreen } from './components/WelcomeScreen';
import { DEFAULT_DAILY_HADITH_DUA } from './data/hadithDuaData';
import {
  DEFAULT_PERSONAL_GOALS,
  INITIAL_ACHIEVEMENTS,
  INITIAL_SETTINGS,
  PREVIOUS_MONTH_BASELINE,
  WEEKLY_STATS,
} from './data/sampleData';
import { DEFAULT_TAJWEED_CURRICULUM } from './data/tajweedCurriculum';
import {
  CompletedSessionRecord,
  DailyHadithDuaEntry,
  DailyMotivationCheckin,
  HadithLibraryRecord,
  MemorizationLevel,
  MemorizationPlan,
  MistakeQueueItem,
  PersonalGoal,
  QuizQuestion,
  ScreenId,
  SmartReviewMemory,
  TajweedLesson,
  TajweedProgressMap,
  UserSettings,
} from './types';
import {
  calculateDailyWirdProgress,
  createDefaultDailyCheckin,
  getGentleEncouragement,
  getTodayDateKey,
} from './utils/motivationEngine';
import { generateDailySchedule } from './utils/quranQuizGenerator';

const STORAGE_PLANS_KEY = 'rifq_memorization_plans_v1';
const STORAGE_ACTIVE_PLAN_KEY = 'rifq_active_plan_id_v1';
const STORAGE_MISTAKES_KEY = 'rifq_mistake_queue_v1';
const STORAGE_SESSIONS_KEY = 'rifq_completed_sessions_v1';
const STORAGE_TAJWEED_LESSONS_KEY = 'rifq_tajweed_curriculum_v2';
const STORAGE_TAJWEED_LESSONS_V1_KEY = 'rifq_tajweed_curriculum_v1';
const STORAGE_TAJWEED_PROGRESS_KEY = 'rifq_tajweed_progress_v1';
const STORAGE_HADITH_ENTRIES_KEY = 'rifq_hadith_dua_entries_v1';
const STORAGE_HADITH_FAVORITES_KEY = 'rifq_hadith_dua_favorites_v1';
const STORAGE_SAVED_LIBRARY_HADITHS_KEY = 'rifq_saved_library_hadiths_v1';
const STORAGE_DAILY_CHECKIN_KEY = 'rifq_daily_checkin_v1';
const STORAGE_BASE_POINTS_KEY = 'rifq_base_gentle_points_v1';
const STORAGE_ACTIVE_DAYS_KEY = 'rifq_active_days_count_v1';
const STORAGE_LAST_ACTIVE_DATE_KEY = 'rifq_last_active_date_v1';
const STORAGE_PERSONAL_GOALS_KEY = 'rifq_personal_goals_v1';
const STORAGE_SMART_MEMORY_KEY = 'rifq_smart_review_v1';

const DEFAULT_SMART_MEMORY: SmartReviewMemory = {
  ayahStats: {},
  surahLastReviewed: {},
  confusedMutashabihIds: {},
  recentQuestionIds: [],
};

const DEFAULT_INITIAL_PLAN: MemorizationPlan = {
  id: 'plan-default-112',
  surahNumber: 112,
  surahName: 'سُورَةُ ٱلْإِخْلَاصِ',
  fromAyah: 1,
  toAyah: 4,
  ayahsPerDay: 2,
  level: 'new',
  createdAt: new Date().toISOString(),
  schedule: generateDailySchedule(1, 4, 2, 'new'),
};

function loadJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('welcome');
  const [settings, setSettings] = useState<UserSettings>(INITIAL_SETTINGS);

  const [plans, setPlans] = useState<MemorizationPlan[]>(() =>
    loadJsonStorage<MemorizationPlan[]>(STORAGE_PLANS_KEY, [DEFAULT_INITIAL_PLAN])
  );
  const [activePlanId, setActivePlanId] = useState<string>(() =>
    loadJsonStorage<string>(STORAGE_ACTIVE_PLAN_KEY, DEFAULT_INITIAL_PLAN.id)
  );
  const [mistakeQueue, setMistakeQueue] = useState<MistakeQueueItem[]>(() =>
    loadJsonStorage<MistakeQueueItem[]>(STORAGE_MISTAKES_KEY, [])
  );
  const [completedSessions, setCompletedSessions] = useState<
    CompletedSessionRecord[]
  >(() => loadJsonStorage<CompletedSessionRecord[]>(STORAGE_SESSIONS_KEY, []));

  const [tajweedLessons, setTajweedLessons] = useState<TajweedLesson[]>(() => {
    const v2 = loadJsonStorage<TajweedLesson[] | null>(
      STORAGE_TAJWEED_LESSONS_KEY,
      null
    );
    if (v2 && Array.isArray(v2) && v2.length > 0 && v2[0].unitId) {
      return v2;
    }
    const v1 = loadJsonStorage<TajweedLesson[]>(
      STORAGE_TAJWEED_LESSONS_V1_KEY,
      []
    );
    const customV1 = v1
      .filter((l) => l.id.startsWith('taj-custom-'))
      .map((l) => ({
        ...l,
        unitId: l.unitId ?? 'unit-01',
        unitNumber: l.unitNumber ?? 1,
        unitTitle: l.unitTitle ?? 'أساسيات علم التجويد',
        category: l.category ?? ('tajweed_phonetics' as const),
        learningObjectives: l.learningObjectives ?? [],
        mutunWitnesses: l.mutunWitnesses ?? [],
      }));
    return [...DEFAULT_TAJWEED_CURRICULUM, ...customV1];
  });
  const [tajweedProgress, setTajweedProgress] = useState<TajweedProgressMap>(
    () => loadJsonStorage<TajweedProgressMap>(STORAGE_TAJWEED_PROGRESS_KEY, {})
  );
  const [selectedTajweedId, setSelectedTajweedId] = useState(
    DEFAULT_TAJWEED_CURRICULUM[0].id
  );

  const [hadithEntries, setHadithEntries] = useState<DailyHadithDuaEntry[]>(
    () =>
      loadJsonStorage<DailyHadithDuaEntry[]>(
        STORAGE_HADITH_ENTRIES_KEY,
        DEFAULT_DAILY_HADITH_DUA
      )
  );
  const [favoriteHadithDuaIds, setFavoriteHadithDuaIds] = useState<string[]>(
    () =>
      loadJsonStorage<string[]>(STORAGE_HADITH_FAVORITES_KEY, [
        'hadith:day-entry-1',
        'dua:day-entry-1',
      ])
  );
  const [savedLibraryRecords, setSavedLibraryRecords] = useState<
    HadithLibraryRecord[]
  >(() =>
    loadJsonStorage<HadithLibraryRecord[]>(
      STORAGE_SAVED_LIBRARY_HADITHS_KEY,
      []
    )
  );
  const [recitationSessionsCount, setRecitationSessionsCount] = useState(3);

  const [initialMotivation] = useState(() => {
    const today = getTodayDateKey();
    const storedBase = loadJsonStorage<number>(STORAGE_BASE_POINTS_KEY, 145);
    const storedCheckin = loadJsonStorage<DailyMotivationCheckin | null>(
      STORAGE_DAILY_CHECKIN_KEY,
      null
    );
    if (!storedCheckin) {
      return {
        basePoints: storedBase,
        checkin: createDefaultDailyCheckin(today),
      };
    }
    if (storedCheckin.dateKey !== today) {
      const prevSummary = calculateDailyWirdProgress(storedCheckin);
      return {
        basePoints: storedBase + prevSummary.pointsToday,
        checkin: createDefaultDailyCheckin(today),
      };
    }
    return {
      basePoints: storedBase,
      checkin: storedCheckin,
    };
  });

  const [baseGentlePoints] = useState<number>(initialMotivation.basePoints);
  const [activeDaysCount, setActiveDaysCount] = useState<number>(() =>
    loadJsonStorage<number>(STORAGE_ACTIVE_DAYS_KEY, 7)
  );
  const [lastActiveDate, setLastActiveDate] = useState<string>(() =>
    loadJsonStorage<string>(STORAGE_LAST_ACTIVE_DATE_KEY, '')
  );
  const [dailyCheckin, setDailyCheckin] = useState<DailyMotivationCheckin>(
    initialMotivation.checkin
  );

  const [personalGoals, setPersonalGoals] = useState<PersonalGoal[]>(() =>
    loadJsonStorage<PersonalGoal[]>(
      STORAGE_PERSONAL_GOALS_KEY,
      DEFAULT_PERSONAL_GOALS
    )
  );
  const [smartMemory, setSmartMemory] = useState<SmartReviewMemory>(() =>
    loadJsonStorage<SmartReviewMemory>(
      STORAGE_SMART_MEMORY_KEY,
      DEFAULT_SMART_MEMORY
    )
  );

  useEffect(() => {
    const root = document.documentElement;
    if (settings.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PLANS_KEY, JSON.stringify(plans));
      localStorage.setItem(STORAGE_ACTIVE_PLAN_KEY, JSON.stringify(activePlanId));
      localStorage.setItem(STORAGE_MISTAKES_KEY, JSON.stringify(mistakeQueue));
      localStorage.setItem(
        STORAGE_SESSIONS_KEY,
        JSON.stringify(completedSessions)
      );
      localStorage.setItem(
        STORAGE_TAJWEED_LESSONS_KEY,
        JSON.stringify(tajweedLessons)
      );
      localStorage.setItem(
        STORAGE_TAJWEED_PROGRESS_KEY,
        JSON.stringify(tajweedProgress)
      );
      localStorage.setItem(
        STORAGE_HADITH_ENTRIES_KEY,
        JSON.stringify(hadithEntries)
      );
      localStorage.setItem(
        STORAGE_HADITH_FAVORITES_KEY,
        JSON.stringify(favoriteHadithDuaIds)
      );
      localStorage.setItem(
        STORAGE_SAVED_LIBRARY_HADITHS_KEY,
        JSON.stringify(savedLibraryRecords)
      );
      localStorage.setItem(
        STORAGE_DAILY_CHECKIN_KEY,
        JSON.stringify(dailyCheckin)
      );
      localStorage.setItem(
        STORAGE_BASE_POINTS_KEY,
        JSON.stringify(baseGentlePoints)
      );
      localStorage.setItem(
        STORAGE_ACTIVE_DAYS_KEY,
        JSON.stringify(activeDaysCount)
      );
      localStorage.setItem(
        STORAGE_LAST_ACTIVE_DATE_KEY,
        JSON.stringify(lastActiveDate)
      );
      localStorage.setItem(
        STORAGE_PERSONAL_GOALS_KEY,
        JSON.stringify(personalGoals)
      );
      localStorage.setItem(
        STORAGE_SMART_MEMORY_KEY,
        JSON.stringify(smartMemory)
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [
    plans,
    activePlanId,
    mistakeQueue,
    completedSessions,
    tajweedLessons,
    tajweedProgress,
    hadithEntries,
    favoriteHadithDuaIds,
    savedLibraryRecords,
    dailyCheckin,
    baseGentlePoints,
    activeDaysCount,
    lastActiveDate,
    personalGoals,
    smartMemory,
  ]);

  const fontSizeClass = useMemo(() => {
    if (settings.fontScale === 'xlarge') return 'text-xl';
    if (settings.fontScale === 'large') return 'text-lg';
    return 'text-base';
  }, [settings.fontScale]);

  const activePlan =
    plans.find((p) => p.id === activePlanId) ?? plans[0] ?? null;

  const completedDaysCount = activePlan
    ? activePlan.schedule.filter((d) => d.completed).length
    : 0;
  const totalDaysCount = activePlan ? activePlan.schedule.length : 0;

  const completedTajweedCount = tajweedLessons.filter(
    (l) => tajweedProgress[l.id]?.passed
  ).length;

  const dailyCompletionPct = useMemo(() => {
    const planRatio =
      totalDaysCount > 0 ? (completedDaysCount / totalDaysCount) * 70 : 0;
    const tajweedRatio = Math.min(completedTajweedCount, 2) * 15;
    return Math.min(100, Math.round(planRatio + tajweedRatio));
  }, [completedDaysCount, totalDaysCount, completedTajweedCount]);

  const handleCreatePlan = (newPlan: MemorizationPlan) => {
    setPlans((prev) => [newPlan, ...prev]);
    setActivePlanId(newPlan.id);
  };

  const handleUpdatePlanLevel = (planId: string, level: MemorizationLevel) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, level } : p))
    );
  };

  const handleDeletePlan = (planId: string) => {
    setPlans((prev) => {
      const next = prev.filter((p) => p.id !== planId);
      if (activePlanId === planId && next[0]) {
        setActivePlanId(next[0].id);
      }
      return next;
    });
  };

  const markTodayActive = () => {
    const today = getTodayDateKey();
    if (lastActiveDate !== today) {
      setLastActiveDate(today);
      setActiveDaysCount((c) => c + 1);
    }
  };

  const handleRecordSession = (
    planId: string | null,
    dayNumber: number | null,
    record: CompletedSessionRecord
  ) => {
    setCompletedSessions((prev) => [record, ...prev]);
    setDailyCheckin((prev) => ({
      ...prev,
      wirdMemorizationDone: true,
    }));
    markTodayActive();
    if (planId && dayNumber !== null) {
      setPlans((prev) =>
        prev.map((plan) => {
          if (plan.id !== planId) return plan;
          return {
            ...plan,
            schedule: plan.schedule.map((day) =>
              day.dayNumber === dayNumber
                ? {
                    ...day,
                    completed: true,
                    completedAt: record.completedAt,
                    lastScorePct: record.scorePct,
                  }
                : day
            ),
          };
        })
      );
    }
  };

  const handleAddMistake = (item: MistakeQueueItem) => {
    setMistakeQueue((prev) => {
      const existing = prev.find((m) => m.id === item.id);
      if (existing) {
        return prev.map((m) =>
          m.id === item.id
            ? { ...m, attempts: m.attempts + 1, errorSummary: item.errorSummary }
            : m
        );
      }
      return [item, ...prev];
    });
  };

  const handleResolveMistake = (mistakeId: string) => {
    setMistakeQueue((prev) => prev.filter((m) => m.id !== mistakeId));
  };

  const handleRecordSmartOutcome = (
    question: QuizQuestion,
    isCorrect: boolean
  ) => {
    const nowIso = new Date().toISOString();
    const ayahKey = `${question.surahNumber}:${question.targetAyahNumber}`;
    setSmartMemory((prev) => {
      const existing = prev.ayahStats[ayahKey];
      const nextCorrect = (existing?.correctCount ?? 0) + (isCorrect ? 1 : 0);
      const nextMistake = (existing?.mistakeCount ?? 0) + (isCorrect ? 0 : 1);
      const mastered = nextCorrect >= 2 && (isCorrect || nextMistake === 0);

      const nextConfused = { ...prev.confusedMutashabihIds };
      if (!isCorrect && question.mutashabihPairId) {
        nextConfused[question.mutashabihPairId] =
          (nextConfused[question.mutashabihPairId] ?? 0) + 1;
      }

      const nextRecent = [
        question.id,
        ...prev.recentQuestionIds.filter((id) => id !== question.id),
      ].slice(0, 40);

      return {
        ayahStats: {
          ...prev.ayahStats,
          [ayahKey]: {
            key: ayahKey,
            surahNumber: question.surahNumber,
            surahName: question.surahName,
            ayahNumber: question.targetAyahNumber,
            juzNumber: question.juzNumber,
            correctCount: nextCorrect,
            mistakeCount: nextMistake,
            lastReviewedAt: nowIso,
            mastered,
          },
        },
        surahLastReviewed: {
          ...prev.surahLastReviewed,
          [question.surahNumber]: nowIso,
        },
        confusedMutashabihIds: nextConfused,
        recentQuestionIds: nextRecent,
      };
    });
  };

  const handleMarkTajweedPractice = (lessonId: string) => {
    setTajweedProgress((prev) => ({
      ...prev,
      [lessonId]: {
        passed: prev[lessonId]?.passed ?? false,
        bestScorePct: prev[lessonId]?.bestScorePct ?? 0,
        practiceCompleted: true,
      },
    }));
    setDailyCheckin((prev) => ({
      ...prev,
      wirdTajweedDone: true,
    }));
    markTodayActive();
  };

  const handleRecordTajweedQuiz = (
    lessonId: string,
    scorePct: number,
    passed: boolean
  ) => {
    setTajweedProgress((prev) => {
      const current = prev[lessonId];
      return {
        ...prev,
        [lessonId]: {
          passed: (current?.passed ?? false) || passed,
          bestScorePct: Math.max(current?.bestScorePct ?? 0, scorePct),
          practiceCompleted: current?.practiceCompleted ?? false,
        },
      };
    });
    setDailyCheckin((prev) => ({
      ...prev,
      wirdTajweedDone: true,
    }));
    markTodayActive();
  };

  const handleSaveTajweedLesson = (lesson: TajweedLesson, isNew: boolean) => {
    setTajweedLessons((prev) => {
      if (isNew) return [...prev, lesson];
      return prev.map((l) => (l.id === lesson.id ? lesson : l));
    });
    setSelectedTajweedId(lesson.id);
  };

  const handleDeleteTajweedLesson = (lessonId: string) => {
    setTajweedLessons((prev) => {
      const next = prev.filter((l) => l.id !== lessonId);
      if (selectedTajweedId === lessonId && next[0]) {
        setSelectedTajweedId(next[0].id);
      }
      return next;
    });
  };

  const handleResetTajweedCurriculum = () => {
    setTajweedLessons(DEFAULT_TAJWEED_CURRICULUM);
    setSelectedTajweedId(DEFAULT_TAJWEED_CURRICULUM[0].id);
  };

  const handleToggleHadithDuaFavorite = (favoriteKey: string) => {
    setFavoriteHadithDuaIds((prev) =>
      prev.includes(favoriteKey)
        ? prev.filter((k) => k !== favoriteKey)
        : [...prev, favoriteKey]
    );
    setDailyCheckin((prev) => ({
      ...prev,
      wirdHadithDuaDone: true,
    }));
    markTodayActive();
  };

  const handleToggleSaveLibraryRecord = (record: HadithLibraryRecord) => {
    setSavedLibraryRecords((prev) =>
      prev.some((r) => r.id === record.id)
        ? prev.filter((r) => r.id !== record.id)
        : [record, ...prev]
    );
    setDailyCheckin((prev) => ({
      ...prev,
      wirdHadithDuaDone: true,
    }));
    markTodayActive();
  };

  const handleSaveHadithDuaEntry = (
    entry: DailyHadithDuaEntry,
    isNew: boolean
  ) => {
    setHadithEntries((prev) => {
      if (isNew) return [entry, ...prev];
      return prev.map((item) => (item.id === entry.id ? entry : item));
    });
  };

  const handleDeleteHadithDuaEntry = (id: string) => {
    setHadithEntries((prev) => prev.filter((item) => item.id !== id));
    setFavoriteHadithDuaIds((prev) =>
      prev.filter((key) => key !== `hadith:${id}` && key !== `dua:${id}`)
    );
  };

  const handleResetHadithDuaEntries = () => {
    setHadithEntries(DEFAULT_DAILY_HADITH_DUA);
  };

  const handleToggleWirdItem = (
    key:
      | 'wirdMemorizationDone'
      | 'wirdTajweedDone'
      | 'wirdRecitationDone'
      | 'wirdHadithDuaDone'
  ) => {
    setDailyCheckin((prev) => {
      const nextValue = !prev[key];
      if (nextValue) markTodayActive();
      return {
        ...prev,
        [key]: nextValue,
      };
    });
  };

  const handleToggleRestDay = () => {
    setDailyCheckin((prev) => ({
      ...prev,
      restDayTaken: !prev.restDayTaken,
    }));
  };

  const handleAddPersonalGoal = (
    goalData: Omit<PersonalGoal, 'id' | 'createdAt' | 'completed'>
  ) => {
    const newGoal: PersonalGoal = {
      ...goalData,
      id: `pg-${Date.now()}`,
      createdAt: new Date().toISOString(),
      completed: goalData.currentCount >= goalData.targetCount,
    };
    setPersonalGoals((prev) => [newGoal, ...prev]);
  };

  const handleIncrementPersonalGoal = (goalId: string, delta: number) => {
    setPersonalGoals((prev) =>
      prev.map((goal) => {
        if (goal.id !== goalId) return goal;
        const nextCount = Math.max(0, goal.currentCount + delta);
        const completed = nextCount >= goal.targetCount;
        return {
          ...goal,
          currentCount: nextCount,
          completed,
        };
      })
    );
    if (delta > 0) {
      setDailyCheckin((prev) => ({
        ...prev,
        bonusPoints: prev.bonusPoints + 5,
      }));
      markTodayActive();
    }
  };

  const handleDeletePersonalGoal = (goalId: string) => {
    setPersonalGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  const handleResetPersonalGoals = () => {
    setPersonalGoals(DEFAULT_PERSONAL_GOALS);
  };

  const dailySummary = useMemo(
    () => calculateDailyWirdProgress(dailyCheckin),
    [dailyCheckin]
  );

  const totalGentlePoints = baseGentlePoints + dailySummary.pointsToday;

  const encouragement = useMemo(
    () =>
      getGentleEncouragement({
        completedWirdItems: dailySummary.completedItems,
        restDayTaken: dailyCheckin.restDayTaken,
        totalSessions: completedSessions.length,
      }),
    [dailySummary.completedItems, dailyCheckin.restDayTaken, completedSessions.length]
  );

  const completedGoalsCount = personalGoals.filter((g) => g.completed).length;

  const dynamicBadges = useMemo(() => {
    const tajweedPct =
      tajweedLessons.length > 0
        ? Math.round((completedTajweedCount / tajweedLessons.length) * 100)
        : 0;

    return INITIAL_ACHIEVEMENTS.map((badge) => {
      if (badge.id === 'ach-1') {
        const unlocked =
          completedSessions.length > 0 ||
          completedDaysCount > 0 ||
          dailySummary.completedItems > 0;
        return {
          ...badge,
          unlocked,
          progressLabel: unlocked ? 'مكتمل' : '٠ / ١ جلسة',
        };
      }
      if (badge.id === 'ach-daily-wird') {
        const unlocked = dailySummary.completedItems >= 3;
        return {
          ...badge,
          unlocked,
          progressLabel: unlocked
            ? 'مكتمل اليوم'
            : `${dailySummary.completedItems} / 3 عناصر`,
        };
      }
      if (badge.id === 'ach-2') {
        const unlocked = activeDaysCount >= 5;
        return {
          ...badge,
          unlocked,
          progressLabel: unlocked ? `${activeDaysCount} / 5 أيام` : `${activeDaysCount} / 5 أيام`,
        };
      }
      if (badge.id === 'ach-3') {
        const unlocked = completedTajweedCount >= 3;
        return {
          ...badge,
          unlocked,
          progressLabel: unlocked
            ? 'مكتمل'
            : `${completedTajweedCount} / 3 دروس`,
        };
      }
      if (badge.id === 'ach-4') {
        const unlocked = recitationSessionsCount >= 5;
        return {
          ...badge,
          unlocked,
          progressLabel: unlocked
            ? 'مكتمل'
            : `${recitationSessionsCount} / 5 جلسات`,
        };
      }
      if (badge.id === 'ach-monthly-companion') {
        const unlocked = totalGentlePoints >= 200;
        return {
          ...badge,
          unlocked,
          progressLabel: unlocked
            ? 'مكتمل'
            : `${totalGentlePoints} / 200 نقطة`,
        };
      }
      if (badge.id === 'ach-monthly-goals') {
        const unlocked = completedGoalsCount >= 2;
        return {
          ...badge,
          unlocked,
          progressLabel: unlocked
            ? 'مكتمل'
            : `${completedGoalsCount} / 2 هدف`,
        };
      }
      if (badge.id === 'ach-monthly-tajweed') {
        const unlocked = tajweedPct >= 50;
        return {
          ...badge,
          unlocked,
          progressLabel: `${tajweedPct}%`,
        };
      }
      return badge;
    });
  }, [
    completedSessions.length,
    completedDaysCount,
    dailySummary.completedItems,
    activeDaysCount,
    completedTajweedCount,
    tajweedLessons.length,
    recitationSessionsCount,
    totalGentlePoints,
    completedGoalsCount,
  ]);

  if (currentScreen === 'welcome') {
    return (
      <WelcomeScreen
        onStart={() => setCurrentScreen('home')}
        onNavigate={(screen) => setCurrentScreen(screen)}
      />
    );
  }

  const todayTajweed =
    tajweedLessons.find((l) => !tajweedProgress[l.id]?.passed) ??
    tajweedLessons[0];
  const todayHadithDua =
    hadithEntries.find((e) => e.publishStatus === 'published') ??
    hadithEntries[0] ??
    DEFAULT_DAILY_HADITH_DUA[0];

  return (
    <NavigationShell
      currentScreen={currentScreen}
      onNavigate={(screen) => {
        setCurrentScreen(screen);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
    >
      {currentScreen === 'home' && (
        <HomeScreen
          userName={settings.userName}
          dailyCompletionPct={dailyCompletionPct}
          completedDaysCount={completedDaysCount}
          totalDaysCount={totalDaysCount}
          activePlan={activePlan}
          mistakeQueueCount={mistakeQueue.length}
          completedSessionsCount={completedSessions.length}
          todayTajweed={todayTajweed}
          todayHadithDua={todayHadithDua}
          completedTajweedCount={completedTajweedCount}
          activeDaysCount={activeDaysCount}
          dailyPoints={dailySummary.pointsToday}
          dailyWirdDoneCount={dailySummary.completedItems}
          personalGoalsCompletedCount={completedGoalsCount}
          personalGoalsTotalCount={personalGoals.length}
          encouragementTitle={encouragement.title}
          recitationSessionsCount={recitationSessionsCount}
          onNavigate={setCurrentScreen}
          onSelectTajweedLesson={(id) => setSelectedTajweedId(id)}
          fontSizeClass={fontSizeClass}
        />
      )}

      {currentScreen === 'memorization' && (
        <MemorizationScreen
          plans={plans}
          activePlanId={activePlan?.id ?? ''}
          mistakeQueue={mistakeQueue}
          completedSessions={completedSessions}
          smartMemory={smartMemory}
          onSelectActivePlan={setActivePlanId}
          onCreatePlan={handleCreatePlan}
          onUpdatePlanLevel={handleUpdatePlanLevel}
          onDeletePlan={handleDeletePlan}
          onRecordSession={handleRecordSession}
          onRecordSmartOutcome={handleRecordSmartOutcome}
          onAddMistake={handleAddMistake}
          onResolveMistake={handleResolveMistake}
          fontSizeClass={fontSizeClass}
        />
      )}

      {currentScreen === 'tajweed' && (
        <TajweedScreen
          lessons={tajweedLessons}
          progressMap={tajweedProgress}
          selectedLessonId={selectedTajweedId}
          onSelectLesson={setSelectedTajweedId}
          onMarkPracticeDone={handleMarkTajweedPractice}
          onRecordQuizResult={handleRecordTajweedQuiz}
          onSaveLesson={handleSaveTajweedLesson}
          onDeleteLesson={handleDeleteTajweedLesson}
          onResetCurriculum={handleResetTajweedCurriculum}
          fontSizeClass={fontSizeClass}
        />
      )}

      {currentScreen === 'recitation' && (
        <RecitationScreen
          activePlan={activePlan}
          onLogSession={() => {
            setRecitationSessionsCount((c) => c + 1);
            setDailyCheckin((prev) => ({
              ...prev,
              wirdRecitationDone: true,
            }));
            markTodayActive();
          }}
          sessionsCount={recitationSessionsCount}
          fontSizeClass={fontSizeClass}
        />
      )}

      {currentScreen === 'hadith_dua' && (
        <HadithDuaScreen
          entries={hadithEntries}
          favoriteIds={favoriteHadithDuaIds}
          savedLibraryRecords={savedLibraryRecords}
          onToggleFavorite={handleToggleHadithDuaFavorite}
          onToggleSaveLibraryRecord={handleToggleSaveLibraryRecord}
          onSaveEntry={handleSaveHadithDuaEntry}
          onDeleteEntry={handleDeleteHadithDuaEntry}
          onResetEntries={handleResetHadithDuaEntries}
          fontSizeClass={fontSizeClass}
        />
      )}

      {currentScreen === 'achievements' && (
        <AchievementsScreen
          activeDaysCount={activeDaysCount}
          totalGentlePoints={totalGentlePoints}
          dailyCheckin={dailyCheckin}
          onToggleWirdItem={handleToggleWirdItem}
          onToggleRestDay={handleToggleRestDay}
          dailyCompletionPct={dailyCompletionPct}
          completedTajweedCount={completedTajweedCount}
          totalTajweedCount={tajweedLessons.length}
          recitationSessionsCount={recitationSessionsCount}
          completedSessions={completedSessions}
          tajweedLessons={tajweedLessons}
          tajweedProgress={tajweedProgress}
          weeklyStats={WEEKLY_STATS}
          previousMonthSnapshot={PREVIOUS_MONTH_BASELINE}
          badges={dynamicBadges}
          personalGoals={personalGoals}
          onAddGoal={handleAddPersonalGoal}
          onIncrementGoal={handleIncrementPersonalGoal}
          onDeleteGoal={handleDeletePersonalGoal}
          onResetGoals={handleResetPersonalGoals}
          onNavigate={setCurrentScreen}
        />
      )}

      {currentScreen === 'profile' && (
        <ProfileSettingsScreen
          settings={settings}
          onUpdateSettings={setSettings}
          onNavigate={setCurrentScreen}
        />
      )}
    </NavigationShell>
  );
}
