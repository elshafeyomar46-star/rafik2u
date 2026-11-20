import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Compass,
  Heart,
  HeartHandshake,
  Lock,
  Mic,
  Plus,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  AchievementBadge,
  CompletedSessionRecord,
  DailyMotivationCheckin,
  MonthlyComparisonSnapshot,
  PersonalGoal,
  ScreenId,
  SuggestedGoalTemplate,
  TajweedLesson,
  TajweedProgressMap,
  WeeklyDayStat,
} from '../types';
import {
  buildMonthlyReport,
  buildWeeklyReport,
  calculateDailyWirdProgress,
  getGentleEncouragement,
} from '../utils/motivationEngine';
import { PersonalGoalsPanel } from './PersonalGoalsPanel';

interface AchievementsScreenProps {
  activeDaysCount: number;
  totalGentlePoints: number;
  dailyCheckin: DailyMotivationCheckin;
  onToggleWirdItem: (
    key:
      | 'wirdMemorizationDone'
      | 'wirdTajweedDone'
      | 'wirdRecitationDone'
      | 'wirdHadithDuaDone'
  ) => void;
  onToggleRestDay: () => void;
  dailyCompletionPct: number;
  completedTajweedCount: number;
  totalTajweedCount: number;
  recitationSessionsCount: number;
  completedSessions: CompletedSessionRecord[];
  tajweedLessons: TajweedLesson[];
  tajweedProgress: TajweedProgressMap;
  weeklyStats: WeeklyDayStat[];
  previousMonthSnapshot: MonthlyComparisonSnapshot;
  badges: AchievementBadge[];
  personalGoals: PersonalGoal[];
  onAddGoal: (goal: Omit<PersonalGoal, 'id' | 'createdAt' | 'completed'>) => void;
  onIncrementGoal: (goalId: string, delta: number) => void;
  onDeleteGoal: (goalId: string) => void;
  onResetGoals: () => void;
  onNavigate: (screen: ScreenId) => void;
}

type MotivationTab = 'daily' | 'weekly' | 'monthly' | 'goals';

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({
  activeDaysCount,
  totalGentlePoints,
  dailyCheckin,
  onToggleWirdItem,
  onToggleRestDay,
  dailyCompletionPct,
  completedTajweedCount,
  totalTajweedCount,
  recitationSessionsCount,
  completedSessions,
  tajweedLessons,
  tajweedProgress,
  weeklyStats,
  previousMonthSnapshot,
  badges,
  personalGoals,
  onAddGoal,
  onIncrementGoal,
  onDeleteGoal,
  onResetGoals,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<MotivationTab>('daily');
  const [adoptedSuggestionIds, setAdoptedSuggestionIds] = useState<string[]>([]);

  const dailySummary = useMemo(
    () => calculateDailyWirdProgress(dailyCheckin),
    [dailyCheckin]
  );

  const encouragement = useMemo(
    () =>
      getGentleEncouragement({
        completedWirdItems: dailySummary.completedItems,
        restDayTaken: dailyCheckin.restDayTaken,
        totalSessions: completedSessions.length,
      }),
    [dailySummary.completedItems, dailyCheckin.restDayTaken, completedSessions.length]
  );

  const weeklyReport = useMemo(
    () =>
      buildWeeklyReport({
        completedSessions,
        tajweedLessons,
        tajweedProgress,
        weeklyStats,
        personalGoals,
        activeDaysCount,
      }),
    [
      completedSessions,
      tajweedLessons,
      tajweedProgress,
      weeklyStats,
      personalGoals,
      activeDaysCount,
    ]
  );

  const monthlyReport = useMemo(
    () =>
      buildMonthlyReport({
        weeklyReport,
        completedSessions,
        recitationSessionsCount,
        personalGoals,
        totalGentlePoints,
        previousMonth: previousMonthSnapshot,
      }),
    [
      weeklyReport,
      completedSessions,
      recitationSessionsCount,
      personalGoals,
      totalGentlePoints,
      previousMonthSnapshot,
    ]
  );

  const maxMinutes = Math.max(...weeklyStats.map((d) => d.minutes), 30);

  const dailyBadges = badges.filter((b) => b.tier === 'daily');
  const weeklyBadges = badges.filter((b) => b.tier === 'weekly');
  const monthlyBadges = badges.filter((b) => b.tier === 'monthly');

  const handleAdoptSuggestedGoal = (template: SuggestedGoalTemplate) => {
    const alreadyExists = personalGoals.some((g) => g.title === template.title);
    if (!alreadyExists) {
      onAddGoal({
        title: template.title,
        scope: template.scope,
        category: template.category,
        targetCount: template.targetCount,
        currentCount: 0,
        unitLabel: template.unitLabel,
        note: template.reason,
      });
    }
    setAdoptedSuggestionIds((prev) =>
      prev.includes(template.id) ? prev : [...prev, template.id]
    );
  };

  const renderBadgeCard = (badge: AchievementBadge) => (
    <div
      key={badge.id}
      className={`rounded-2xl border p-5 flex items-start justify-between gap-4 ${
        badge.unlocked
          ? 'bg-[#FFFDF9] dark:bg-[#132B20] border-[#C69749]'
          : 'bg-[#F4EDE0] dark:bg-[#10251B] border-[#DFD6C5] dark:border-[#244736] opacity-90'
      }`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {badge.unlocked ? (
            <Award className="w-5 h-5 text-[#C69749] shrink-0" aria-hidden="true" />
          ) : (
            <Lock className="w-4 h-4 text-[#8C8373] shrink-0" aria-hidden="true" />
          )}
          <h4 className="font-bold text-lg text-[#133A2A] dark:text-[#F7F3EA]">
            {badge.title}
          </h4>
        </div>
        <p className="text-sm text-[#46524B] dark:text-[#D8D0C0]">
          {badge.description}
        </p>
      </div>
      <span
        className={`text-sm font-bold tabular-nums whitespace-nowrap shrink-0 ${
          badge.unlocked
            ? 'text-[#1B6B46] dark:text-[#6EE7B7]'
            : 'text-[#6B6254] dark:text-[#BFB6A4]'
        }`}
      >
        {badge.progressLabel}
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header & 4-Section Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
            التحفيز والمتابعة والأهداف
          </h2>
          <p className="text-sm text-[#6B6254] dark:text-[#BFB6A4] mt-1">
            متابعة يومية وأسبوعية وشهرية بروح مشجعة تحفظ إنجازك دون أي عقوبة عند الراحة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#EAE2D2] dark:bg-[#193729] self-start">
          {(
            [
              { id: 'daily', label: 'التحفيز اليومي' },
              { id: 'weekly', label: 'التقرير الأسبوعي' },
              { id: 'monthly', label: 'التقرير الشهري' },
              { id: 'goals', label: `الأهداف الشخصية (${personalGoals.length})` },
            ] as { id: MotivationTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[42px] px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A]'
                  : 'text-[#46524B] dark:text-[#D8D0C0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: DAILY MOTIVATION */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Positive, Non-Punitive Encouragement Banner */}
          <section className="rounded-3xl bg-[#133A2A] text-[#F7F3EA] border border-[#1E503B] p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-sm font-bold text-[#D6A954]">
                <Heart className="w-4 h-4" aria-hidden="true" />
                <span>رسالة رفق اليومية</span>
              </div>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#FFFDF9]">
                {encouragement.title}
              </h3>
              <p className="text-sm sm:text-base text-[#E5DDCC] leading-relaxed">
                {encouragement.body}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onToggleRestDay}
                className={`min-h-[46px] px-5 py-2.5 rounded-xl text-sm font-bold transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  dailyCheckin.restDayTaken
                    ? 'bg-[#C69749] text-[#133A2A]'
                    : 'bg-[#1B4B37] hover:bg-[#225B44] text-[#F7F3EA]'
                }`}
              >
                <Sun className="w-4 h-4" aria-hidden="true" />
                <span>
                  {dailyCheckin.restDayTaken
                    ? 'تم تسجيل يوم راحة هادئ (+١٠ نقاط لطف)'
                    : 'أخذتُ يوم راحة — دون أي خصم'}
                </span>
              </button>
              <span className="text-xs text-[#CFC6B4] text-center">
                تفويت يوم لا ينقص نقاطك ولا يصفر إنجازك
              </span>
            </div>
          </section>

          {/* Daily Points & Daily Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#C69749] p-5 space-y-2">
              <div className="flex items-center justify-between text-sm text-[#9C6F21] dark:text-[#D6A954] font-semibold">
                <span>النقاط اليومية</span>
                <Sparkles className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA] tabular-nums">
                +{dailySummary.pointsToday} نقطة
              </div>
              <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4] tabular-nums">
                الرصيد التراكمي المحفوظ: {totalGentlePoints} نقطة
              </div>
            </div>

            <div className="rounded-2xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-5 space-y-2">
              <div className="flex items-center justify-between text-sm text-[#6B6254] dark:text-[#BFB6A4]">
                <span>إنجاز وِرد اليوم</span>
                <CheckCircle2 className="w-5 h-5 text-[#1B6B46] dark:text-[#6EE7B7]" aria-hidden="true" />
              </div>
              <div className="text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA] tabular-nums">
                {dailySummary.completedItems} / {dailySummary.totalItems}
              </div>
              <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4] tabular-nums">
                نسبة وِرد اليوم: {dailySummary.pct}%
              </div>
            </div>

            <div className="rounded-2xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-5 space-y-2">
              <div className="flex items-center justify-between text-sm text-[#6B6254] dark:text-[#BFB6A4]">
                <span>أيام الرفقة المباركة</span>
                <CalendarDays className="w-5 h-5 text-[#C69749]" aria-hidden="true" />
              </div>
              <div className="text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA] tabular-nums">
                {activeDaysCount} أيام
              </div>
              <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
                رصيد متراكم لا ينقطع بالراحة
              </div>
            </div>

            <div className="rounded-2xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-5 space-y-2">
              <div className="flex items-center justify-between text-sm text-[#6B6254] dark:text-[#BFB6A4]">
                <span>الأهداف الشخصية المنجزة</span>
                <Target className="w-5 h-5 text-[#C69749]" aria-hidden="true" />
              </div>
              <div className="text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA] tabular-nums">
                {personalGoals.filter((g) => g.completed).length} / {personalGoals.length}
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('goals')}
                className="text-xs font-bold text-[#133A2A] dark:text-[#D6A954] hover:underline cursor-pointer"
              >
                إدارة الأهداف الشخصية
              </button>
            </div>
          </div>

          {/* Interactive Daily Wird Checklist */}
          <section className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 sm:p-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                  متابعة إنجاز الورد اليومي
                </h3>
                <p className="text-sm text-[#6B6254] dark:text-[#BFB6A4] mt-0.5">
                  تُحدَّث تلقائياً عند نشاطك في الأقسام، أو يمكنك تسجيل إنجازك يدوياً بنقرة واحدة
                </p>
              </div>
              <span className="text-sm font-bold text-[#1B6B46] dark:text-[#6EE7B7] tabular-nums">
                تقدّم خطة الحفظ: {dailyCompletionPct}%
              </span>
            </div>

            <div className="h-3 w-full rounded-full bg-[#EFE8D8] dark:bg-[#183528] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#133A2A] dark:bg-[#C69749] transition-all duration-300"
                style={{ width: `${dailySummary.pct}%` }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(
                [
                  {
                    key: 'wirdMemorizationDone' as const,
                    title: 'وِرد الحفظ والمراجعة اليومي',
                    desc: 'قراءة الآيات المحددة أو إتمام جلسة المراجعة',
                    points: 30,
                    icon: BookOpen,
                    targetScreen: 'memorization' as ScreenId,
                    actionLabel: 'فتح الحفظ',
                  },
                  {
                    key: 'wirdTajweedDone' as const,
                    title: 'درس أو تطبيق التجويد',
                    desc: 'قراءة حكم تجويدي أو حل تدريبه التفاعلي',
                    points: 25,
                    icon: Compass,
                    targetScreen: 'tajweed' as ScreenId,
                    actionLabel: 'فتح التجويد',
                  },
                  {
                    key: 'wirdRecitationDone' as const,
                    title: 'التدريب على التلاوة',
                    desc: 'تلاوة هادئة ومقارنة صوتية لمقطع من وردك',
                    points: 25,
                    icon: Mic,
                    targetScreen: 'recitation' as ScreenId,
                    actionLabel: 'فتح التلاوة',
                  },
                  {
                    key: 'wirdHadithDuaDone' as const,
                    title: 'حديث ودعاء اليوم',
                    desc: 'قراءة حديث اليوم والدعاء المأثور وتأمل شرحهما',
                    points: 20,
                    icon: HeartHandshake,
                    targetScreen: 'hadith_dua' as ScreenId,
                    actionLabel: 'فتح الأذكار',
                  },
                ]
              ).map((item) => {
                const done = dailyCheckin[item.key];
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-colors ${
                      done
                        ? 'bg-[#F7F3EA] dark:bg-[#0F241A] border-[#1B6B46]'
                        : 'bg-[#FFFDF9] dark:bg-[#152F23] border-[#DFD6C5] dark:border-[#244736]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            done
                              ? 'bg-[#1B6B46] text-[#FFFDF9]'
                              : 'bg-[#EFE8D8] dark:bg-[#1B3A2C] text-[#133A2A] dark:text-[#D6A954]'
                          }`}
                        >
                          <Icon className="w-5 h-5" aria-hidden="true" />
                        </div>
                        <div>
                          <h4 className="font-bold text-base text-[#133A2A] dark:text-[#F7F3EA]">
                            {item.title}
                          </h4>
                          <p className="text-xs sm:text-sm text-[#46524B] dark:text-[#D8D0C0] mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#9C6F21] dark:text-[#D6A954] tabular-nums whitespace-nowrap shrink-0">
                        +{item.points} نقطة
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#ECE4D4] dark:border-[#214232]">
                      <button
                        type="button"
                        onClick={() => onNavigate(item.targetScreen)}
                        className="min-h-[40px] px-3 text-xs font-bold text-[#133A2A] dark:text-[#D6A954] hover:underline cursor-pointer"
                      >
                        {item.actionLabel}
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleWirdItem(item.key)}
                        className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                          done
                            ? 'bg-[#1B6B46] text-[#FFFDF9]'
                            : 'bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] text-[#133A2A] dark:text-[#F7F3EA]'
                        }`}
                      >
                        {done && <Check className="w-4 h-4" aria-hidden="true" />}
                        <span>{done ? 'تم الإنجاز اليوم' : 'تسجيل الإنجاز'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* All Badges Showcase */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-2xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                شارات الإنجاز ({badges.filter((b) => b.unlocked).length} من {badges.length})
              </h3>
              <span className="text-sm text-[#6B6254] dark:text-[#BFB6A4]">
                شارات يومية وأسبوعية وشهرية تُفتح بالتدرج
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dailyBadges.concat(weeklyBadges).map(renderBadgeCard)}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: WEEKLY MOTIVATION REPORT */}
      {activeTab === 'weekly' && (
        <div className="space-y-6">
          {/* Weekly Overview KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-[#133A2A] text-[#F7F3EA] p-6 space-y-2">
              <div className="text-sm text-[#D6A954] font-semibold">
                جلسات الحفظ والمراجعة هذا الأسبوع
              </div>
              <div className="text-3xl font-bold tabular-nums">
                {weeklyReport.memorizationSessionsCount} جلسات
              </div>
              <div className="text-xs text-[#CFC6B4] tabular-nums">
                قراءة: {weeklyReport.readingSessionsCount} · اختبارات:{' '}
                {weeklyReport.quizSessionsCount} · مراجعة أخطاء:{' '}
                {weeklyReport.mistakeReviewCount}
              </div>
            </div>

            <div className="rounded-2xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 space-y-2">
              <div className="text-sm text-[#6B6254] dark:text-[#BFB6A4] font-semibold">
                مستوى التقدم في التجويد
              </div>
              <div className="text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA] tabular-nums">
                {weeklyReport.tajweedOverallPct}%
              </div>
              <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4] tabular-nums">
                اجتزت {weeklyReport.tajweedMasteredCount} من{' '}
                {weeklyReport.tajweedTotalCount} دروس · المرحلة الحالية: المستوى{' '}
                {weeklyReport.currentTajweedLevel}
              </div>
            </div>

            <div className="rounded-2xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#C69749] p-6 space-y-2">
              <div className="text-sm text-[#9C6F21] dark:text-[#D6A954] font-semibold">
                نسبة تحقيق الهدف الأسبوعي
              </div>
              <div className="text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA] tabular-nums">
                {weeklyReport.weeklyGoalPct}%
              </div>
              <div className="text-xs text-[#46524B] dark:text-[#D8D0C0]">
                {weeklyReport.encouragementNote}
              </div>
            </div>
          </div>

          {/* Weekly Bar Chart + Tajweed 4-Level Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-6 rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-2xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                  النشاط الأسبوعي
                </h3>
                <span className="text-sm text-[#6B6254] dark:text-[#BFB6A4] tabular-nums">
                  {weeklyReport.weeklyMinutes} دقيقة · {weeklyReport.weeklyPages} صفحة
                </span>
              </div>

              <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-52 pt-6">
                {weeklyStats.map((day) => {
                  const heightPct = Math.round((day.minutes / maxMinutes) * 100);
                  return (
                    <div
                      key={day.dayLabel}
                      className="h-full flex flex-col items-center justify-end gap-2"
                    >
                      <span className="text-xs font-semibold text-[#6B6254] dark:text-[#BFB6A4] tabular-nums">
                        {day.minutes}د
                      </span>
                      <div className="w-full max-w-[40px] h-32 bg-[#EFE8D8] dark:bg-[#183528] rounded-xl flex items-end overflow-hidden p-1">
                        <div
                          className="w-full rounded-lg bg-[#133A2A] dark:bg-[#C69749] transition-all duration-300"
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-[#1A2A22] dark:text-[#E5DDCC]">
                        {day.dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Tajweed Level Progress */}
            <section className="lg:col-span-6 rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 space-y-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-2xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                  تدرّج مستويات التجويد
                </h3>
                <button
                  type="button"
                  onClick={() => onNavigate('tajweed')}
                  className="text-sm font-bold text-[#133A2A] dark:text-[#D6A954] hover:underline cursor-pointer"
                >
                  متابعة الدروس
                </button>
              </div>

              <div className="space-y-4">
                {weeklyReport.tajweedByLevel.map((lvl) => (
                  <div key={lvl.level} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span className="text-[#133A2A] dark:text-[#F7F3EA]">
                        {lvl.label}
                      </span>
                      <span className="text-[#9C6F21] dark:text-[#D6A954] tabular-nums">
                        {lvl.passed} / {lvl.total} ({lvl.pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-[#EFE8D8] dark:bg-[#183528] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#1B6B46] dark:bg-[#6EE7B7] transition-all duration-300"
                        style={{ width: `${lvl.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Weekly Badges */}
          <section className="space-y-4">
            <h3 className="font-display text-2xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
              شارات الإنجاز الأسبوعية
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weeklyBadges.map(renderBadgeCard)}
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: MONTHLY MOTIVATION REPORT */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* Comprehensive Monthly Summary */}
          <section className="rounded-3xl bg-[#133A2A] text-[#F7F3EA] p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-[#D6A954]">
                  التقرير الشهري الشامل
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#FFFDF9] mt-1">
                  حصاد رفقتك للقرآن هذا الشهر
                </h3>
              </div>
              <div className="text-sm text-[#E5DDCC] tabular-nums">
                مجموع النقاط التحفيزية: {monthlyReport.monthlyPoints} نقطة
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 rounded-2xl bg-[#0F2F22] border border-[#21523D]">
                <div className="text-xs text-[#CFC6B4]">جلسات الحفظ والمراجعة</div>
                <div className="text-2xl font-bold text-[#FFFDF9] tabular-nums mt-1">
                  {monthlyReport.totalSessions}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#0F2F22] border border-[#21523D]">
                <div className="text-xs text-[#CFC6B4]">دقائق الصحبة والتلاوة</div>
                <div className="text-2xl font-bold text-[#FFFDF9] tabular-nums mt-1">
                  {monthlyReport.totalMinutes} د
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#0F2F22] border border-[#21523D]">
                <div className="text-xs text-[#CFC6B4]">دروس التجويد المجتازة</div>
                <div className="text-2xl font-bold text-[#FFFDF9] tabular-nums mt-1">
                  {monthlyReport.tajweedMasteredCount} / {totalTajweedCount}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#0F2F22] border border-[#21523D]">
                <div className="text-xs text-[#CFC6B4]">جلسات التدريب الصوتي</div>
                <div className="text-2xl font-bold text-[#FFFDF9] tabular-nums mt-1">
                  {monthlyReport.recitationSessionsCount}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#0F2F22] border border-[#21523D]">
                <div className="text-xs text-[#CFC6B4]">الأهداف الشخصية المحققة</div>
                <div className="text-2xl font-bold text-[#D6A954] tabular-nums mt-1">
                  {monthlyReport.completedGoalsCount}
                </div>
              </div>
            </div>
          </section>

          {/* Previous Month Comparison */}
          <section className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 sm:p-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 font-display text-2xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                <TrendingUp className="w-5 h-5 text-[#C69749]" aria-hidden="true" />
                <span>مقارنة التقدّم بالشهر السابق</span>
              </div>
              <span className="text-sm text-[#6B6254] dark:text-[#BFB6A4]">
                مقارنة هادئة تساعدك على رؤية نموّك وتحديد وتيرتك المناسبة
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {monthlyReport.comparisons.map((comp) => (
                <div
                  key={comp.id}
                  className="p-5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-base text-[#133A2A] dark:text-[#F7F3EA]">
                      {comp.label}
                    </h4>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        comp.diff >= 0
                          ? 'text-[#1B6B46] dark:text-[#6EE7B7]'
                          : 'text-[#9C6F21] dark:text-[#D6A954]'
                      }`}
                    >
                      {comp.diff > 0 ? `+${comp.diff}` : comp.diff} {comp.unit}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm tabular-nums">
                    <div className="p-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20]">
                      <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
                        الشهر الحالي
                      </div>
                      <div className="text-lg font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                        {comp.currentValue} {comp.unit}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20]">
                      <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
                        {previousMonthSnapshot.previousMonthLabel}
                      </div>
                      <div className="text-lg font-bold text-[#6B6254] dark:text-[#BFB6A4]">
                        {comp.previousValue} {comp.unit}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#46524B] dark:text-[#D8D0C0]">
                    {comp.positiveTakeaway}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* New Monthly Badges */}
          <section className="space-y-4">
            <h3 className="font-display text-2xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
              شارات الإنجاز الشهرية الجديدة
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {monthlyBadges.map(renderBadgeCard)}
            </div>
          </section>

          {/* Suggested Goals for Next Month */}
          <section className="rounded-3xl bg-[#F4EDE0] dark:bg-[#163124] border border-[#DFD6C5] dark:border-[#244736] p-6 sm:p-8 space-y-5">
            <div>
              <h3 className="font-display text-2xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                أهداف مقترحة للشهر القادم
              </h3>
              <p className="text-sm text-[#46524B] dark:text-[#D8D0C0] mt-1">
                مختارة بناءً على مستواك الحالي في التجويد والحفظ؛ اعتمد ما يناسب وقتك بضغطة واحدة
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {monthlyReport.suggestedNextGoals.map((template) => {
                const isAdopted =
                  adoptedSuggestionIds.includes(template.id) ||
                  personalGoals.some((g) => g.title === template.title);
                return (
                  <div
                    key={template.id}
                    className="rounded-2xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-[#9C6F21] dark:text-[#D6A954] tabular-nums">
                        الهدف المستهدف: {template.targetCount} {template.unitLabel}
                      </div>
                      <h4 className="font-bold text-base text-[#133A2A] dark:text-[#F7F3EA]">
                        {template.title}
                      </h4>
                      <p className="text-sm text-[#46524B] dark:text-[#D8D0C0]">
                        {template.reason}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isAdopted}
                      onClick={() => handleAdoptSuggestedGoal(template)}
                      className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                        isAdopted
                          ? 'bg-[#1B6B46]/15 text-[#1B6B46] dark:text-[#6EE7B7]'
                          : 'bg-[#133A2A] hover:bg-[#1B4D38] dark:bg-[#C69749] dark:text-[#133A2A] text-[#F7F3EA]'
                      }`}
                    >
                      {isAdopted ? (
                        <>
                          <Check className="w-4 h-4" aria-hidden="true" />
                          <span>مُضاف إلى أهدافك الشخصية</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" aria-hidden="true" />
                          <span>اعتماد كهدف شخصي للشهر القادم</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: PERSONAL GOALS */}
      {activeTab === 'goals' && (
        <PersonalGoalsPanel
          goals={personalGoals}
          onAddGoal={onAddGoal}
          onIncrementGoal={onIncrementGoal}
          onDeleteGoal={onDeleteGoal}
          onResetGoals={onResetGoals}
        />
      )}
    </div>
  );
};
