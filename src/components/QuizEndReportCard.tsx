import React from 'react';
import { Award, CheckCircle2, RotateCcw } from 'lucide-react';
import { MemorizationPlan, QuizQuestion } from '../types';

export interface QuestionAttemptOutcome {
  question: QuizQuestion;
  isCorrect: boolean;
}

interface QuizEndReportCardProps {
  outcomes: QuestionAttemptOutcome[];
  plans: MemorizationPlan[];
  sessionSaved: boolean;
  onSaveSession: () => void;
  onRetryMistakesNow: () => void;
  onBackToSchedule: () => void;
}

export const QuizEndReportCard: React.FC<QuizEndReportCardProps> = ({
  outcomes,
  plans,
  sessionSaved,
  onSaveSession,
  onRetryMistakesNow,
  onBackToSchedule,
}) => {
  const totalQuestions = outcomes.length;
  const correctCount = outcomes.filter((o) => o.isCorrect).length;
  const wrongOutcomes = outcomes.filter((o) => !o.isCorrect);
  const scorePct =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const surahsTested = Array.from(
    new Set(outcomes.map((o) => o.question.surahName))
  );
  const juzTested = Array.from(
    new Set(outcomes.map((o) => o.question.juzNumber).filter((j) => j > 0))
  ).sort((a, b) => a - b);

  // Calculate coverage ratio against memorized ayahs across plans
  const totalMemorizedAyahs = plans.reduce(
    (sum, p) => sum + Math.max(0, p.toAyah - p.fromAyah + 1),
    0
  );
  const uniqueTestedAyahKeys = new Set(
    outcomes.map(
      (o) => `${o.question.surahNumber}:${o.question.targetAyahNumber}`
    )
  );
  const memorizedCoveragePct =
    totalMemorizedAyahs > 0
      ? Math.min(
          100,
          Math.round((uniqueTestedAyahKeys.size / totalMemorizedAyahs) * 100)
        )
      : 100;

  const retrievalLevelLabel =
    scorePct >= 85
      ? 'متقن ومستحضر بقوة'
      : scorePct >= 60
      ? 'جيد ويتثبت بالمراجعة الهادئة'
      : 'يحتاج إلى تثبيت إضافي للآيات';

  // Aggregate frequent mistake spots in this quiz
  const spotCounts = new Map<
    string,
    { label: string; count: number; typeLabel: string }
  >();
  for (const w of wrongOutcomes) {
    const key = `${w.question.surahNumber}:${w.question.targetAyahNumber}`;
    const existing = spotCounts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      spotCounts.set(key, {
        label: `${w.question.surahName} · الآية (${w.question.targetAyahNumber}) · الجزء (${w.question.juzNumber})`,
        count: 1,
        typeLabel: w.question.typeLabel,
      });
    }
  }
  const topMistakes = Array.from(spotCounts.values()).sort(
    (a, b) => b.count - a.count
  );

  return (
    <div className="space-y-6 py-2">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <CheckCircle2
          className="w-14 h-14 text-[#C69749] mx-auto"
          aria-hidden="true"
        />
        <h3 className="font-display text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
          تقرير نهاية الاختبار
        </h3>
        <p className="text-sm sm:text-base text-[#46524B] dark:text-[#D8D0C0]">
          مستوى الاسترجاع:{' '}
          <span className="font-bold text-[#133A2A] dark:text-[#D6A954]">
            {retrievalLevelLabel}
          </span>
        </p>
      </div>

      {/* 4 Core KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
        <div className="p-4 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434]">
          <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
            عدد الأسئلة
          </div>
          <div className="text-2xl font-bold text-[#133A2A] dark:text-[#F7F3EA] mt-1">
            {totalQuestions} أسئلة
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434]">
          <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
            الإجابات الصحيحة
          </div>
          <div className="text-2xl font-bold text-[#1B6B46] dark:text-[#6EE7B7] mt-1">
            {correctCount} ({scorePct}%)
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434]">
          <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
            مواضع تحتاج لمراجعة
          </div>
          <div className="text-2xl font-bold text-[#9C6F21] dark:text-[#D6A954] mt-1">
            {wrongOutcomes.length} مواضع
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434]">
          <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
            نسبة تغطية المحفوظات
          </div>
          <div className="text-2xl font-bold text-[#133A2A] dark:text-[#F7F3EA] mt-1">
            {memorizedCoveragePct}%
          </div>
        </div>
      </div>

      {/* Surahs & Juz Tested */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] space-y-2">
          <div className="text-sm font-bold text-[#133A2A] dark:text-[#D6A954]">
            السور التي تم اختبارها ({surahsTested.length})
          </div>
          <p className="text-sm text-[#1A2A22] dark:text-[#F7F3EA] leading-relaxed">
            {surahsTested.join(' · ')}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] space-y-2">
          <div className="text-sm font-bold text-[#133A2A] dark:text-[#D6A954]">
            الأجزاء التي تم اختبارها ({juzTested.length})
          </div>
          <p className="text-sm text-[#1A2A22] dark:text-[#F7F3EA] tabular-nums leading-relaxed">
            {juzTested.map((j) => `الجزء ${j}`).join(' · ')}
          </p>
        </div>
      </div>

      {/* Top Mistake Spots */}
      {topMistakes.length > 0 ? (
        <div className="p-5 rounded-2xl bg-[#F4EDE0] dark:bg-[#173326] border border-[#DFD6C5] dark:border-[#244736] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="font-bold text-base text-[#133A2A] dark:text-[#F7F3EA]">
              أكثر المواضع التي حدث فيها خطأ أو تحتاج لتثبيت
            </div>
            <button
              type="button"
              onClick={onRetryMistakesNow}
              className="text-xs sm:text-sm font-bold text-[#133A2A] dark:text-[#D6A954] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>مراجعة هذه المواضع الآن</span>
            </button>
          </div>
          <ul className="space-y-2 text-sm">
            {topMistakes.map((spot) => (
              <li
                key={spot.label}
                className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#FFFDF9] dark:bg-[#0F241A]"
              >
                <span className="font-bold text-[#1A2A22] dark:text-[#F7F3EA]">
                  {spot.label}
                </span>
                <span className="text-xs text-[#9C6F21] dark:text-[#D6A954]">
                  {spot.typeLabel}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-[#1B6B46]/12 border border-[#1B6B46]/30 text-sm font-bold text-[#1B6B46] dark:text-[#6EE7B7] flex items-center justify-center gap-2">
          <Award className="w-5 h-5" aria-hidden="true" />
          <span>ما شاء الله! أجبت عن جميع المواضع بإتقان دون أخطاء مسجلة في هذه الجلسة.</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onSaveSession}
          disabled={sessionSaved}
          className={`min-h-[48px] px-7 py-3 rounded-xl font-bold text-base transition-colors cursor-pointer ${
            sessionSaved
              ? 'bg-[#1B6B46] text-white'
              : 'bg-[#C69749] hover:bg-[#B38538] text-[#133A2A]'
          }`}
        >
          {sessionSaved ? 'تم تسجيل الإنجاز في سجلك' : 'تسجيل إنجاز الجلسة'}
        </button>

        <button
          type="button"
          onClick={onBackToSchedule}
          className="min-h-[48px] px-6 py-3 rounded-xl bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] text-[#133A2A] dark:text-[#F7F3EA] font-semibold text-base cursor-pointer"
        >
          العودة للجدول والمراجعة
        </button>
      </div>
    </div>
  );
};
