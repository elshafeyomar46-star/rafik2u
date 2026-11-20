import React from 'react';
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  HeartHandshake,
  Mic,
  Sparkles,
} from 'lucide-react';
import {
  DailyHadithDuaEntry,
  MemorizationPlan,
  ScreenId,
  TajweedLesson,
} from '../types';

interface HomeScreenProps {
  userName: string;
  dailyCompletionPct: number;
  completedDaysCount: number;
  totalDaysCount: number;
  activePlan: MemorizationPlan | null;
  mistakeQueueCount: number;
  completedSessionsCount: number;
  todayTajweed: TajweedLesson;
  todayHadithDua: DailyHadithDuaEntry;
  completedTajweedCount: number;
  activeDaysCount: number;
  dailyPoints: number;
  dailyWirdDoneCount: number;
  personalGoalsCompletedCount: number;
  personalGoalsTotalCount: number;
  encouragementTitle: string;
  recitationSessionsCount: number;
  onNavigate: (screen: ScreenId) => void;
  onSelectTajweedLesson: (lessonId: string) => void;
  fontSizeClass: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  userName,
  dailyCompletionPct,
  completedDaysCount,
  totalDaysCount,
  activePlan,
  mistakeQueueCount,
  completedSessionsCount,
  todayTajweed,
  todayHadithDua,
  completedTajweedCount,
  activeDaysCount,
  dailyPoints,
  dailyWirdDoneCount,
  personalGoalsCompletedCount,
  personalGoalsTotalCount,
  encouragementTitle,
  recitationSessionsCount,
  onNavigate,
  onSelectTajweedLesson,
  fontSizeClass,
}) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (dailyCompletionPct / 100) * circumference;

  const nextDay =
    activePlan?.schedule.find((d) => !d.completed) ??
    activePlan?.schedule[0] ??
    null;

  const levelLabel =
    activePlan?.level === 'mastered'
      ? 'متقن'
      : activePlan?.level === 'needs_review'
      ? 'يحتاج مراجعة'
      : 'جديد';

  return (
    <div className="space-y-6">
      {/* 1. Welcome Banner & Daily Goal Progress + Primary CTA */}
      <section className="relative rounded-3xl overflow-hidden bg-[#133A2A] text-[#F7F3EA] border border-[#1E503B]">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="text-sm text-[#D6A954] font-medium">
                رسالة الترحيب ·{' '}
                {new Date().toLocaleDateString('ar-EG', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#FFFDF9] [text-wrap:balance]">
                أهلاً بك يا {userName}، طاب يومك بذكر الله
              </h2>
              <p
                className={`${fontSizeClass} text-[#E5DDCC] max-w-2xl leading-relaxed`}
              >
                جدّد نيتك واجعل لقرآنك وقتاً هادئاً اليوم؛ خطوة ثابتة كل يوم تُثمر حفظاً متيناً وتلاوة مطمئنة.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('memorization')}
                className="min-h-[48px] px-7 py-3 rounded-xl bg-[#C69749] hover:bg-[#B38538] text-[#133A2A] font-bold text-base transition-colors inline-flex items-center gap-3 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>ابدأ المراجعة</span>
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('recitation')}
                className="min-h-[48px] px-5 py-3 rounded-xl bg-[#1B4B37] hover:bg-[#225B44] text-[#F7F3EA] font-medium text-base transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Mic className="w-4 h-4 text-[#D6A954]" aria-hidden="true" />
                <span>التدريب على التلاوة</span>
              </button>
            </div>
          </div>

          {/* Daily Goal Completion Ring Panel */}
          <div className="lg:col-span-4 bg-[#0F2F22] p-6 sm:p-8 flex flex-col items-center justify-center text-center border-t lg:border-t-0 lg:border-r border-[#21523D]">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg
                className="w-28 h-28 -rotate-90"
                viewBox="0 0 96 96"
                aria-hidden="true"
              >
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  fill="none"
                  stroke="#214E3B"
                  strokeWidth="8"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  fill="none"
                  stroke="#D6A954"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold tabular-nums text-[#FFFDF9]">
                  {dailyCompletionPct}%
                </span>
              </div>
            </div>
            <div className="mt-3 font-semibold text-base text-[#FFFDF9]">
              نسبة إنجاز الهدف اليومي
            </div>
            <div className="text-sm text-[#CFC6B4] mt-1 tabular-nums">
              أنجزت {completedDaysCount} من {totalDaysCount} جلسات مجدولة
            </div>
          </div>
        </div>
      </section>

      {/* 2. Wird of the Day & Tajweed Lesson of the Day */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Wird */}
        <article className="lg:col-span-7 rounded-2xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#133A2A] dark:text-[#D6A954]">
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                <span>وِرد اليوم</span>
              </div>
              {activePlan && (
                <span className="text-sm text-[#6B6254] dark:text-[#BFB6A4] tabular-nums">
                  المستوى: {levelLabel} · {activePlan.ayahsPerDay} آيات يومياً
                </span>
              )}
            </div>

            <h3 className="font-display text-2xl font-bold text-[#1A2A22] dark:text-[#F7F3EA]">
              {activePlan && nextDay
                ? `${activePlan.surahName} — اليوم ${nextDay.dayNumber} (الآيات ${nextDay.fromAyah} إلى ${nextDay.toAyah})`
                : 'أنشئ خطتك اليومية لحفظ ومراجعة القرآن'}
            </h3>

            <p
              className={`${fontSizeClass} text-[#46524B] dark:text-[#D8D0C0] leading-relaxed`}
            >
              {mistakeQueueCount > 0
                ? `لديك ${mistakeQueueCount} أسئلة في قائمة المراجعة القادمة لتثبيتها إلى جانب وِرد اليوم بالرسم العثماني الموثق.`
                : 'افتح شاشة الحفظ والمراجعة لقراءة الآيات بالرسم العثماني الموثق وإجراء الاختبار المتدرج.'}
            </p>
          </div>

          <div className="pt-4 border-t border-[#ECE4D4] dark:border-[#214232] flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-[#5C665E] dark:text-[#BFB6A4] inline-flex items-center gap-1.5">
              <CheckCircle2
                className={`w-4 h-4 ${
                  nextDay?.completed
                    ? 'text-[#1B6B46] dark:text-[#6EE7B7]'
                    : 'text-[#A0947E]'
                }`}
                aria-hidden="true"
              />
              <span>
                {nextDay?.completed
                  ? 'تم إنجاز جلسة اليوم'
                  : 'بانتظار إتمام القراءة والاختبار'}
              </span>
            </span>

            <button
              type="button"
              onClick={() => onNavigate('memorization')}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] dark:hover:bg-[#234B39] text-[#133A2A] dark:text-[#F7F3EA] font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              فتح شاشة الحفظ والمراجعة
            </button>
          </div>
        </article>

        {/* Today's Tajweed Lesson */}
        <article className="lg:col-span-5 rounded-2xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#9C6F21] dark:text-[#D6A954]">
                <Compass className="w-4 h-4" aria-hidden="true" />
                <span>درس التجويد اليوم</span>
              </div>
              <span className="text-sm text-[#6B6254] dark:text-[#BFB6A4] tabular-nums">
                {todayTajweed.durationMinutes} دقائق
              </span>
            </div>

            <h3 className="font-display text-2xl font-bold text-[#1A2A22] dark:text-[#F7F3EA]">
              {todayTajweed.title}
            </h3>

            <p
              className={`${fontSizeClass} text-[#46524B] dark:text-[#D8D0C0] leading-relaxed`}
            >
              {todayTajweed.simpleDefinition}
            </p>

            <div className="p-3.5 rounded-xl bg-[#F5EFE3] dark:bg-[#193628] text-sm text-[#1A2A22] dark:text-[#EDE4D3]">
              <span className="font-semibold text-[#133A2A] dark:text-[#D6A954]">
                المحاور الأساسية:{' '}
              </span>
              <span className="font-display text-lg tracking-wider">
                {todayTajweed.lettersOrPoints}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onSelectTajweedLesson(todayTajweed.id);
              onNavigate('tajweed');
            }}
            className="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-[#133A2A] hover:bg-[#1B4D38] dark:bg-[#C69749] dark:hover:bg-[#B38538] text-[#F7F3EA] dark:text-[#133A2A] font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            استعراض الدرس والتطبيق
          </button>
        </article>
      </div>

      {/* 3. Today's Hadith & Today's Dua */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <article className="rounded-2xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 flex flex-col justify-between gap-4">
          <div className="space-y-2.5">
            <div className="text-sm font-semibold text-[#133A2A] dark:text-[#D6A954] tabular-nums">
              حديث اليوم · {todayHadithDua.hadith.sourceBook} (
              {todayHadithDua.hadith.hadithNumber})
            </div>
            <h3 className="font-display text-lg font-bold text-[#1A2A22] dark:text-[#F7F3EA]">
              عن {todayHadithDua.hadith.narrator}
            </h3>
            <p className="font-display text-xl text-[#1A2A22] dark:text-[#F7F3EA] leading-loose">
              {todayHadithDua.hadith.text}
            </p>
            <p
              className={`${fontSizeClass} text-[#46524B] dark:text-[#D8D0C0] leading-relaxed`}
            >
              {todayHadithDua.hadith.simpleExplanation}
            </p>
          </div>
          <div className="pt-3 border-t border-[#ECE4D4] dark:border-[#214232] flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-semibold text-[#1B6B46] dark:text-[#6EE7B7]">
              {todayHadithDua.hadith.authenticityGrade}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('hadith_dua')}
              className="min-h-[44px] px-3 text-sm font-semibold text-[#133A2A] dark:text-[#D6A954] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              قراءة المزيد والاختبار
            </button>
          </div>
        </article>

        <article className="rounded-2xl bg-[#F4EDE0] dark:bg-[#163124] border border-[#DFD6C5] dark:border-[#244736] p-6 flex flex-col justify-between gap-4">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#9C6F21] dark:text-[#D6A954]">
              <HeartHandshake className="w-4 h-4" aria-hidden="true" />
              <span>دعاء اليوم</span>
            </div>
            <h3 className="font-display text-xl font-bold text-[#1A2A22] dark:text-[#F7F3EA]">
              {todayHadithDua.dua.title}
            </h3>
            <p className="font-display text-xl sm:text-2xl text-[#133A2A] dark:text-[#F7F3EA] leading-loose">
              {todayHadithDua.dua.text}
            </p>
            <p
              className={`${fontSizeClass} text-[#46524B] dark:text-[#D8D0C0] leading-relaxed`}
            >
              {todayHadithDua.dua.virtueOrOccasion}
            </p>
          </div>
          <div className="pt-3 border-t border-[#E3D9C6] dark:border-[#244736] flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm text-[#6B6254] dark:text-[#BFB6A4] tabular-nums">
              {todayHadithDua.dua.sourceBook}
              {todayHadithDua.dua.hadithNumber
                ? ` (${todayHadithDua.dua.hadithNumber})`
                : ''}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('hadith_dua')}
              className="min-h-[44px] px-3 text-sm font-semibold text-[#133A2A] dark:text-[#D6A954] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              الأدعية والأيام السابقة
            </button>
          </div>
        </article>
      </div>

      {/* 4. Achievements Summary + Architectural Accent */}
      <section className="rounded-2xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-8 p-6 flex flex-col justify-between gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 text-base font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                  <Award className="w-5 h-5 text-[#C69749]" aria-hidden="true" />
                  <span>التحفيز اليومي وملخص الإنجازات</span>
                </div>
                <p className="text-xs sm:text-sm text-[#46524B] dark:text-[#D8D0C0] mt-1">
                  {encouragementTitle} · الأهداف الشخصية المحققة:{' '}
                  <span className="font-bold tabular-nums">
                    {personalGoalsCompletedCount} / {personalGoalsTotalCount}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('achievements')}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] dark:hover:bg-[#234B39] text-[#133A2A] dark:text-[#F7F3EA] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                التحفيز والتقارير والأهداف
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A]">
                <div className="text-sm text-[#6B6254] dark:text-[#BFB6A4]">
                  النقاط اليومية ووِرد اليوم
                </div>
                <div className="text-2xl font-bold text-[#133A2A] dark:text-[#D6A954] tabular-nums mt-1">
                  +{dailyPoints} نقطة · {dailyWirdDoneCount}/4
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A]">
                <div className="text-sm text-[#6B6254] dark:text-[#BFB6A4]">
                  أيام الرفقة المباركة
                </div>
                <div className="text-2xl font-bold text-[#133A2A] dark:text-[#D6A954] tabular-nums mt-1">
                  {activeDaysCount} أيام · {completedSessionsCount} جلسات
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A]">
                <div className="text-sm text-[#6B6254] dark:text-[#BFB6A4]">
                  التجويد والتدريب
                </div>
                <div className="text-2xl font-bold text-[#133A2A] dark:text-[#D6A954] tabular-nums mt-1">
                  {completedTajweedCount + recitationSessionsCount} إنجاز
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 relative min-h-[160px] bg-[#133A2A]">
            <img
              src="/src/assets/images/rifq_home_banner_1795193077756.jpg"
              alt="فناء معماري هادئ بالحجر البيج وضوء الصباح"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0D271C]/80 via-[#0D271C]/20 to-transparent flex items-end p-5">
              <div className="text-sm text-[#F7F3EA] inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D6A954]" aria-hidden="true" />
                <span>ثبات القليل يبني الحفظ المتين</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
