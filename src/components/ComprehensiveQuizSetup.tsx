import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Compass,
  Layers,
  Loader2,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import {
  FULL_QURAN_DIVERSE_SURAHS,
  getJuzRangeForPlan,
} from '../data/quranMetadata';
import {
  MemorizationPlan,
  MistakeQueueItem,
  QuizDistributionWeights,
  QuizScopeMode,
  SmartReviewMemory,
} from '../types';

interface ComprehensiveQuizSetupProps {
  plans: MemorizationPlan[];
  smartMemory: SmartReviewMemory;
  mistakeQueue: MistakeQueueItem[];
  isLoadingQuiz: boolean;
  errorMsg: string | null;
  onStartComprehensiveQuiz: (config: {
    scopeMode: QuizScopeMode;
    selectedJuz: number[];
    selectedSurahNumbers: number[];
    specificRange: { surahNumber: number; fromAyah: number; toAyah: number } | null;
    questionCount: number;
    weights: QuizDistributionWeights;
    freeRecitationOnly?: boolean;
  }) => void;
}

const SCOPE_OPTIONS: {
  id: QuizScopeMode;
  title: string;
  desc: string;
}[] = [
  {
    id: 'all_memorized',
    title: '١. مراجعة جميع المحفوظات',
    desc: 'توزيع ذكي على كل السور والأجزاء التي حددتها في خططك',
  },
  {
    id: 'specific_juz',
    title: '٢. مراجعة أجزاء محددة',
    desc: 'اختر أجزاء من محفوظاتك لتركيز المراجعة عليها',
  },
  {
    id: 'specific_surahs',
    title: '٣. مراجعة سور محددة',
    desc: 'حدد سورة أو أكثر من محفوظاتك الحالية',
  },
  {
    id: 'specific_ayahs',
    title: '٤. مراجعة آيات محددة',
    desc: 'نطاق آيات دقيق داخل سورة محفوظة',
  },
  {
    id: 'full_quran',
    title: '٥. اختبار شامل في القرآن كاملًا',
    desc: 'اختبار مفتوح من أجزاء وسور متفرقة في المصحف الشريف',
  },
];

export const ComprehensiveQuizSetup: React.FC<
  ComprehensiveQuizSetupProps
> = ({
  plans,
  smartMemory,
  mistakeQueue,
  isLoadingQuiz,
  errorMsg,
  onStartComprehensiveQuiz,
}) => {
  const [scopeMode, setScopeMode] = useState<QuizScopeMode>('all_memorized');
  const [questionCount, setQuestionCount] = useState<number>(8);

  const memorizedJuzList = useMemo(() => {
    const set = new Set<number>();
    for (const p of plans) {
      for (const j of getJuzRangeForPlan(p.surahNumber, p.fromAyah, p.toAyah)) {
        set.add(j);
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [plans]);

  const memorizedSurahs = useMemo(() => {
    const map = new Map<number, { surahNumber: number; surahName: string }>();
    for (const p of plans) {
      map.set(p.surahNumber, {
        surahNumber: p.surahNumber,
        surahName: p.surahName,
      });
    }
    return Array.from(map.values());
  }, [plans]);

  const [selectedJuz, setSelectedJuz] = useState<number[]>(() =>
    memorizedJuzList.slice(0, 2)
  );
  const [selectedSurahNumbers, setSelectedSurahNumbers] = useState<number[]>(
    () => memorizedSurahs.map((s) => s.surahNumber)
  );
  const [specificSurahNumber, setSpecificSurahNumber] = useState<number>(
    plans[0]?.surahNumber ?? 112
  );
  const activeSpecificPlan =
    plans.find((p) => p.surahNumber === specificSurahNumber) ?? plans[0];

  const [specificFromAyah, setSpecificFromAyah] = useState<number>(
    activeSpecificPlan?.fromAyah ?? 1
  );
  const [specificToAyah, setSpecificToAyah] = useState<number>(
    activeSpecificPlan?.toAyah ?? 4
  );

  // Configurable 70 / 20 / 10 default distribution
  const [weights, setWeights] = useState<QuizDistributionWeights>({
    writingPct: 70,
    recitationAndRecallPct: 20,
    mutashabihatChoicePct: 10,
  });

  const masteredAyahsCount = Object.values(smartMemory.ayahStats).filter(
    (s) => s.mastered
  ).length;
  const totalTrackedAyahs = Object.keys(smartMemory.ayahStats).length;

  const toggleJuz = (j: number) => {
    setSelectedJuz((prev) =>
      prev.includes(j) ? prev.filter((x) => x !== j) : [...prev, j]
    );
  };

  const toggleSurah = (sNum: number) => {
    setSelectedSurahNumbers((prev) =>
      prev.includes(sNum) ? prev.filter((x) => x !== sNum) : [...prev, sNum]
    );
  };

  const handlePresetWeights = (
    w: number,
    r: number,
    m: number
  ) => {
    setWeights({
      writingPct: w,
      recitationAndRecallPct: r,
      mutashabihatChoicePct: m,
    });
  };

  return (
    <section className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 sm:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#ECE4D4] dark:border-[#214232] pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-sm font-bold text-[#9C6F21] dark:text-[#D6A954]">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>الاختبار الشامل الذكي · رواية حفص عن عاصم</span>
          </div>
          <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
            مراجعة موزّعة بالكتابة والتسميع من الذاكرة
          </h3>
          <p className="text-sm text-[#46524B] dark:text-[#D8D0C0]">
            يوزّع الأسئلة على أول السور ووسطها وخاتمتها وبين المحفوظ القديم والجديد ومواضع الأخطاء السابقة دون تكرار ممل.
          </p>
        </div>

        {/* Smart Review Memory Stats */}
        <div className="grid grid-cols-3 gap-2.5 shrink-0 text-center tabular-nums">
          <div className="px-3.5 py-2.5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A]">
            <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
              آيات متقنة
            </div>
            <div className="text-lg font-bold text-[#1B6B46] dark:text-[#6EE7B7]">
              {masteredAyahsCount}
            </div>
          </div>
          <div className="px-3.5 py-2.5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A]">
            <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
              مواضع مراجَعة
            </div>
            <div className="text-lg font-bold text-[#133A2A] dark:text-[#F7F3EA]">
              {totalTrackedAyahs}
            </div>
          </div>
          <div className="px-3.5 py-2.5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A]">
            <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
              مواضع تثبيت
            </div>
            <div className="text-lg font-bold text-[#9C6F21] dark:text-[#D6A954]">
              {mistakeQueue.length}
            </div>
          </div>
        </div>
      </div>

      {/* 1. Scope Selection */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]">
          <Layers className="w-4 h-4 text-[#C69749]" aria-hidden="true" />
          <span>أولاً: اختر نطاق المراجعة والاختبار</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {SCOPE_OPTIONS.map((opt) => {
            const active = scopeMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setScopeMode(opt.id)}
                className={`p-4 rounded-2xl border text-right transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#133A2A] text-[#F7F3EA] border-[#133A2A] dark:bg-[#1A4230] dark:border-[#C69749]'
                    : 'bg-[#F7F3EA] dark:bg-[#0F241A] border-[#DFD6C5] dark:border-[#244736]'
                }`}
              >
                <div className="font-bold text-sm">{opt.title}</div>
                <div
                  className={`text-xs mt-1 leading-relaxed ${
                    active
                      ? 'text-[#E5DDCC]'
                      : 'text-[#6B6254] dark:text-[#BFB6A4]'
                  }`}
                >
                  {opt.desc}
                </div>
              </button>
            );
          })}
        </div>

        {/* Conditional Sub-Selectors */}
        {scopeMode === 'specific_juz' && (
          <div className="p-4 rounded-2xl bg-[#F4EDE0] dark:bg-[#173326] space-y-2.5">
            <div className="text-xs sm:text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]">
              اختر الأجزاء من محفوظاتك المسجلة فقط:
            </div>
            {memorizedJuzList.length === 0 ? (
              <p className="text-xs text-[#6B6254]">
                أضف خطة سورة واحدة على الأقل لتحديد الأجزاء المحفوظة.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {memorizedJuzList.map((j) => {
                  const active = selectedJuz.includes(j);
                  return (
                    <button
                      key={j}
                      type="button"
                      onClick={() => toggleJuz(j)}
                      className={`min-h-[40px] px-4 py-1.5 rounded-xl text-sm font-bold tabular-nums cursor-pointer ${
                        active
                          ? 'bg-[#C69749] text-[#133A2A]'
                          : 'bg-[#FFFDF9] dark:bg-[#0F241A] text-[#1A2A22] dark:text-[#E5DDCC]'
                      }`}
                    >
                      الجزء {j}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {scopeMode === 'specific_surahs' && (
          <div className="p-4 rounded-2xl bg-[#F4EDE0] dark:bg-[#173326] space-y-2.5">
            <div className="text-xs sm:text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]">
              اختر السور من محفوظاتك المسجلة:
            </div>
            <div className="flex flex-wrap gap-2">
              {memorizedSurahs.map((s) => {
                const active = selectedSurahNumbers.includes(s.surahNumber);
                return (
                  <button
                    key={s.surahNumber}
                    type="button"
                    onClick={() => toggleSurah(s.surahNumber)}
                    className={`min-h-[42px] px-4 py-1.5 rounded-xl text-sm font-bold cursor-pointer ${
                      active
                        ? 'bg-[#C69749] text-[#133A2A]'
                        : 'bg-[#FFFDF9] dark:bg-[#0F241A] text-[#1A2A22] dark:text-[#E5DDCC]'
                    }`}
                  >
                    {s.surahName}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {scopeMode === 'specific_ayahs' && activeSpecificPlan && (
          <div className="p-4 rounded-2xl bg-[#F4EDE0] dark:bg-[#173326] grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="comp-spec-surah"
                className="block text-xs font-bold mb-1"
              >
                السورة المحفوظة
              </label>
              <select
                id="comp-spec-surah"
                value={specificSurahNumber}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  setSpecificSurahNumber(num);
                  const found = plans.find((p) => p.surahNumber === num);
                  if (found) {
                    setSpecificFromAyah(found.fromAyah);
                    setSpecificToAyah(found.toAyah);
                  }
                }}
                className="w-full min-h-[44px] px-3 rounded-xl bg-[#FFFDF9] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-sm font-bold"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.surahNumber}>
                    {p.surahName} ({p.fromAyah}–{p.toAyah})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="comp-spec-from"
                className="block text-xs font-bold mb-1"
              >
                من الآية
              </label>
              <input
                id="comp-spec-from"
                type="number"
                min={activeSpecificPlan.fromAyah}
                max={activeSpecificPlan.toAyah}
                value={specificFromAyah}
                onChange={(e) =>
                  setSpecificFromAyah(
                    Math.max(
                      activeSpecificPlan.fromAyah,
                      Math.min(activeSpecificPlan.toAyah, Number(e.target.value) || 1)
                    )
                  )
                }
                className="w-full min-h-[44px] px-3 rounded-xl bg-[#FFFDF9] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-sm font-bold tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="comp-spec-to"
                className="block text-xs font-bold mb-1"
              >
                إلى الآية
              </label>
              <input
                id="comp-spec-to"
                type="number"
                min={specificFromAyah}
                max={activeSpecificPlan.toAyah}
                value={specificToAyah}
                onChange={(e) =>
                  setSpecificToAyah(
                    Math.max(
                      specificFromAyah,
                      Math.min(activeSpecificPlan.toAyah, Number(e.target.value) || specificFromAyah)
                    )
                  )
                }
                className="w-full min-h-[44px] px-3 rounded-xl bg-[#FFFDF9] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-sm font-bold tabular-nums"
              />
            </div>
          </div>
        )}

        {scopeMode === 'full_quran' && (
          <div className="p-4 rounded-2xl bg-[#F4EDE0] dark:bg-[#173326] text-xs sm:text-sm text-[#46524B] dark:text-[#D8D0C0]">
            سيشمل الاختبار آيات من سور وأجزاء متباعدة في المصحف الشريف (منها:{' '}
            {FULL_QURAN_DIVERSE_SURAHS.map((s) => `${s.surahName} ج${s.juz}`).join(
              ' · '
            )}
            ) مع مواضع المتشابهات القرآنية الموثقة.
          </div>
        )}
      </div>

      {/* 2. Distribution Weights (70 / 20 / 10) & Question Count */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 border-t border-[#ECE4D4] dark:border-[#214232]">
        <div className="lg:col-span-8 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]">
              <SlidersHorizontal
                className="w-4 h-4 text-[#C69749]"
                aria-hidden="true"
              />
              <span>توزيع أنواع الأسئلة (قابل للتعديل)</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: 'الافتراضي (٧٠ / ٢٠ / ١٠)', w: 70, r: 20, m: 10 },
                { label: 'تركيز كتابي (٨٠ / ١٥ / ٥)', w: 80, r: 15, m: 5 },
                { label: 'تركيز متشابهات (٦٠ / ٢٠ / ٢٠)', w: 60, r: 20, m: 20 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePresetWeights(preset.w, preset.r, preset.m)}
                  className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                    weights.writingPct === preset.w &&
                    weights.recitationAndRecallPct === preset.r
                      ? 'bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A]'
                      : 'bg-[#EFE8D8] dark:bg-[#1B3A2C] text-[#46524B] dark:text-[#D8D0C0]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm tabular-nums">
            <div className="p-3.5 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A]">
              <div className="font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                {weights.writingPct}% كتابة واستكمال من الذاكرة
              </div>
              <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4] mt-0.5">
                تكملة الآية، التالية، السابقة، التسميع الكتابي، المقطع، التوقف
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A]">
              <div className="font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                {weights.recitationAndRecallPct}% تسميع صوتي واسترجاع
              </div>
              <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4] mt-0.5">
                تسميع صوتي، ترتيب آيات، اكتشاف موضع الخطأ
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A]">
              <div className="font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                {weights.mutashabihatChoicePct}% متشابهات وتمييز
              </div>
              <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4] mt-0.5">
                مقارنة آيات موثقة متقاربة البداية أو الخاتمة
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-2">
          <div className="text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]">
            عدد أسئلة الاختبار
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[6, 8, 10, 12].map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => setQuestionCount(cnt)}
                className={`min-h-[44px] rounded-xl font-bold text-sm tabular-nums cursor-pointer ${
                  questionCount === cnt
                    ? 'bg-[#C69749] text-[#133A2A]'
                    : 'bg-[#F7F3EA] dark:bg-[#0F241A] text-[#46524B] dark:text-[#D8D0C0]'
                }`}
              >
                {cnt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-[#B84A39]/10 text-[#B84A39] dark:text-[#FCA5A5] text-sm">
          {errorMsg}
        </div>
      )}

      {/* Launch Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          disabled={isLoadingQuiz}
          onClick={() =>
            onStartComprehensiveQuiz({
              scopeMode,
              selectedJuz,
              selectedSurahNumbers,
              specificRange:
                scopeMode === 'specific_ayahs'
                  ? {
                      surahNumber: specificSurahNumber,
                      fromAyah: specificFromAyah,
                      toAyah: specificToAyah,
                    }
                  : null,
              questionCount,
              weights,
            })
          }
          className="min-h-[48px] px-7 py-3 rounded-xl bg-[#C69749] hover:bg-[#B38538] disabled:opacity-50 text-[#133A2A] font-bold text-base inline-flex items-center gap-2 cursor-pointer"
        >
          {isLoadingQuiz ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Compass className="w-5 h-5" />
          )}
          <span>
            {isLoadingQuiz ? 'جاري تجهيز الأسئلة الموثقة...' : 'بدء الاختبار الذكي المتنوع'}
          </span>
        </button>

        <button
          type="button"
          disabled={isLoadingQuiz}
          onClick={() =>
            onStartComprehensiveQuiz({
              scopeMode,
              selectedJuz,
              selectedSurahNumbers,
              specificRange:
                scopeMode === 'specific_ayahs'
                  ? {
                      surahNumber: specificSurahNumber,
                      fromAyah: specificFromAyah,
                      toAyah: specificToAyah,
                    }
                  : null,
              questionCount: Math.min(5, questionCount),
              weights: {
                writingPct: 100,
                recitationAndRecallPct: 0,
                mutashabihatChoicePct: 0,
              },
              freeRecitationOnly: true,
            })
          }
          className="min-h-[48px] px-5 py-3 rounded-xl bg-[#133A2A] hover:bg-[#1B4D38] dark:bg-[#1B3A2C] text-[#F7F3EA] font-semibold text-sm inline-flex items-center gap-2 cursor-pointer"
        >
          <BookOpen className="w-4 h-4 text-[#D6A954]" />
          <span>جلسة تسميع حر دون ظهور النص</span>
        </button>
      </div>
    </section>
  );
};
