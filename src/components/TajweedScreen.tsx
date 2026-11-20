import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  BookOpenCheck,
  CheckCircle2,
  Compass,
  Edit3,
  GraduationCap,
  Info,
  Layers,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Target,
  Unlock,
} from 'lucide-react';
import {
  computeTajweedAcademyStats,
  TAJWEED_LEVEL_METADATA,
  TAJWEED_UNITS,
} from '../data/tajweedCurriculum';
import { fetchSurahAyahsUthmani } from '../services/quranApi';
import {
  QuranAyah,
  TajweedLesson,
  TajweedLevelNumber,
  TajweedProgressMap,
} from '../types';
import { MutunLibraryView } from './MutunLibraryView';
import { MutunWitnessSection } from './MutunWitnessSection';
import { TajweedContentManager } from './TajweedContentManager';

interface TajweedScreenProps {
  lessons: TajweedLesson[];
  progressMap: TajweedProgressMap;
  selectedLessonId: string;
  onSelectLesson: (id: string) => void;
  onMarkPracticeDone: (lessonId: string) => void;
  onRecordQuizResult: (
    lessonId: string,
    scorePct: number,
    passed: boolean
  ) => void;
  onSaveLesson: (lesson: TajweedLesson, isNew: boolean) => void;
  onDeleteLesson: (lessonId: string) => void;
  onResetCurriculum: () => void;
  fontSizeClass: string;
}

function normalizeArabicToken(text: string): string {
  return text
    .replace(
      /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u06DF\u06E0\u06E1\u06E2\u06E5\u06E6\u06E8\u06EA\u06EB\u06EC\u06ED]/g,
      ''
    )
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .trim();
}

function renderAyahWithHighlight(
  ayahText: string,
  highlightSegment: string
): React.ReactNode {
  const seg = highlightSegment.trim();
  if (!seg) return ayahText;

  const exactIdx = ayahText.indexOf(seg);
  if (exactIdx !== -1) {
    return (
      <>
        {ayahText.slice(0, exactIdx)}
        <mark className="bg-[#C69749]/30 dark:bg-[#C69749]/35 text-[#133A2A] dark:text-[#FFF8E7] px-1 rounded">
          {ayahText.slice(exactIdx, exactIdx + seg.length)}
        </mark>
        {ayahText.slice(exactIdx + seg.length)}
      </>
    );
  }

  const rawParts = ayahText.split(/(\s+)/);
  const wordTokens: { rawIdx: number; norm: string }[] = [];
  rawParts.forEach((part, idx) => {
    if (part.trim()) {
      wordTokens.push({ rawIdx: idx, norm: normalizeArabicToken(part) });
    }
  });

  const targetWords = seg
    .split(/\s+/)
    .map(normalizeArabicToken)
    .filter(Boolean);

  if (targetWords.length === 0 || wordTokens.length === 0) return ayahText;

  for (let start = 0; start <= wordTokens.length - targetWords.length; start++) {
    let allMatch = true;
    for (let offset = 0; offset < targetWords.length; offset++) {
      const aWord = wordTokens[start + offset].norm;
      const tWord = targetWords[offset];
      if (!aWord.includes(tWord) && !tWord.includes(aWord)) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) {
      const firstRaw = wordTokens[start].rawIdx;
      const lastRaw = wordTokens[start + targetWords.length - 1].rawIdx;
      return (
        <>
          {rawParts.slice(0, firstRaw).join('')}
          <mark className="bg-[#C69749]/30 dark:bg-[#C69749]/35 text-[#133A2A] dark:text-[#FFF8E7] px-1 rounded">
            {rawParts.slice(firstRaw, lastRaw + 1).join('')}
          </mark>
          {rawParts.slice(lastRaw + 1).join('')}
        </>
      );
    }
  }

  return ayahText;
}

export const TajweedScreen: React.FC<TajweedScreenProps> = ({
  lessons,
  progressMap,
  selectedLessonId,
  onSelectLesson,
  onMarkPracticeDone,
  onRecordQuizResult,
  onSaveLesson,
  onDeleteLesson,
  onResetCurriculum,
  fontSizeClass,
}) => {
  const [adminMode, setAdminMode] = useState(false);
  const [mutunLibraryOpen, setMutunLibraryOpen] = useState(false);
  const [exploreAllMode, setExploreAllMode] = useState(false);

  const [activeLevel, setActiveLevel] = useState<TajweedLevelNumber>(1);
  const [activeUnitId, setActiveUnitId] = useState<string>('unit-01');
  const [lessonTab, setLessonTab] = useState<'learn' | 'practice' | 'quiz'>(
    'learn'
  );

  // Verified Quranic examples cache keyed by `${surahNumber}:${ayahNumber}`
  const [verifiedVerses, setVerifiedVerses] = useState<Record<string, string>>(
    {}
  );
  const [examplesLoading, setExamplesLoading] = useState(false);

  // Interactive Practice State
  const [practiceChoices, setPracticeChoices] = useState<Record<string, string>>(
    {}
  );

  // Short Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const academyStats = useMemo(
    () => computeTajweedAcademyStats(lessons, progressMap),
    [lessons, progressMap]
  );

  // Level Unlocking Logic: Level N unlocks only if all lessons in Level N-1 passed
  const isLevelPassed = (lvl: TajweedLevelNumber): boolean => {
    const levelLessons = lessons.filter((l) => l.level === lvl);
    if (levelLessons.length === 0) return true;
    return levelLessons.every((l) => progressMap[l.id]?.passed === true);
  };

  const isLevelUnlocked = (lvl: TajweedLevelNumber): boolean => {
    if (exploreAllMode) return true;
    if (lvl === 1) return true;
    return (
      isLevelUnlocked((lvl - 1) as TajweedLevelNumber) &&
      isLevelPassed((lvl - 1) as TajweedLevelNumber)
    );
  };

  const unitsInActiveLevel = useMemo(
    () => TAJWEED_UNITS.filter((u) => u.level === activeLevel),
    [activeLevel]
  );

  const activeUnit = useMemo(() => {
    return (
      unitsInActiveLevel.find((u) => u.id === activeUnitId) ??
      unitsInActiveLevel[0] ??
      TAJWEED_UNITS[0]
    );
  }, [unitsInActiveLevel, activeUnitId]);

  const unitLessons = useMemo(
    () => lessons.filter((l) => l.unitId === activeUnit.id),
    [lessons, activeUnit.id]
  );

  const activeLesson = useMemo(() => {
    const foundInUnit = unitLessons.find((l) => l.id === selectedLessonId);
    return foundInUnit ?? unitLessons[0] ?? lessons[0];
  }, [unitLessons, selectedLessonId, lessons]);

  // Sync activeLevel & activeUnitId if parent directed to a specific lesson (e.g. from HomeScreen)
  useEffect(() => {
    const target = lessons.find((l) => l.id === selectedLessonId);
    if (target && isLevelUnlocked(target.level)) {
      setActiveLevel(target.level);
      setActiveUnitId(target.unitId);
    }
  }, [selectedLessonId, lessons]);

  // Fetch verified Quranic examples for the active lesson (Hafs 'an Asim)
  useEffect(() => {
    if (!activeLesson || activeLesson.exampleRefs.length === 0) return;
    let mounted = true;
    const uniqueSurahs = Array.from(
      new Set(activeLesson.exampleRefs.map((ex) => ex.surahNumber))
    );

    const missing = activeLesson.exampleRefs.some(
      (ex) => !verifiedVerses[`${ex.surahNumber}:${ex.ayahNumber}`]
    );
    if (!missing) return;

    setExamplesLoading(true);
    Promise.all(
      uniqueSurahs.map(async (surahNum) => {
        const ayahs = await fetchSurahAyahsUthmani(surahNum);
        return { surahNum, ayahs };
      })
    )
      .then((results) => {
        if (!mounted) return;
        const additions: Record<string, string> = {};
        results.forEach(({ surahNum, ayahs }) => {
          ayahs.forEach((a: QuranAyah) => {
            additions[`${surahNum}:${a.numberInSurah}`] = a.text;
          });
        });
        setVerifiedVerses((prev) => ({ ...prev, ...additions }));
      })
      .catch(() => {
        // Handled cleanly in UI
      })
      .finally(() => {
        if (mounted) setExamplesLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeLesson?.id, activeLesson?.exampleRefs.length]);

  // Reset drill/quiz UI when changing lesson
  useEffect(() => {
    setPracticeChoices({});
    setQuizAnswers({});
    setQuizSubmitted(false);
    setLessonTab('learn');
  }, [activeLesson?.id]);

  const handleSelectLevel = (lvl: TajweedLevelNumber) => {
    if (!isLevelUnlocked(lvl)) return;
    setActiveLevel(lvl);
    const firstUnit = TAJWEED_UNITS.find((u) => u.level === lvl);
    if (firstUnit) {
      setActiveUnitId(firstUnit.id);
      const firstLesson = lessons.find((l) => l.unitId === firstUnit.id);
      if (firstLesson) {
        onSelectLesson(firstLesson.id);
      }
    }
  };

  const handleSelectUnit = (unitId: string) => {
    setActiveUnitId(unitId);
    const firstLesson = lessons.find((l) => l.unitId === unitId);
    if (firstLesson) {
      onSelectLesson(firstLesson.id);
    }
  };

  const handlePickPractice = (itemId: string, option: string) => {
    setPracticeChoices((prev) => {
      const next = { ...prev, [itemId]: option };
      if (
        activeLesson &&
        activeLesson.practiceItems.every((p) => next[p.id] === p.correctOption)
      ) {
        onMarkPracticeDone(activeLesson.id);
      }
      return next;
    });
  };

  const handleSubmitLessonQuiz = () => {
    if (!activeLesson) return;
    const total = activeLesson.quizQuestions.length || 1;
    const correctCount = activeLesson.quizQuestions.filter(
      (q) => quizAnswers[q.id] === q.correctIndex
    ).length;
    const scorePct = Math.round((correctCount / total) * 100);
    const passingScore =
      TAJWEED_LEVEL_METADATA[activeLesson.level].passingScorePct;
    const passed = scorePct >= passingScore;

    setQuizSubmitted(true);
    onRecordQuizResult(activeLesson.id, scorePct, passed);
  };

  return (
    <div className="space-y-6">
      {/* Academy Header & Top Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
            أكاديمية التجويد المنهجية
          </h2>
          <p className="text-sm text-[#6B6254] dark:text-[#BFB6A4] mt-1 tabular-nums">
            منهج متكامل من ٤ مستويات و١٣ وحدة · مرتبط بمتن تحفة الأطفال والمقدمة الجزرية
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAdminMode(false);
              setMutunLibraryOpen((v) => !v);
            }}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mutunLibraryOpen
                ? 'bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A]'
                : 'bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] text-[#133A2A] dark:text-[#F7F3EA]'
            }`}
          >
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            <span>مكتبة المتون المعتمدة</span>
          </button>

          <button
            type="button"
            onClick={() => setExploreAllMode((v) => !v)}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              exploreAllMode
                ? 'bg-[#1B6B46] text-white'
                : 'bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] text-[#133A2A] dark:text-[#F7F3EA]'
            }`}
          >
            <Compass className="w-4 h-4" aria-hidden="true" />
            <span>
              {exploreAllMode
                ? 'وضع الاستكشاف (جميع الوحدات مفتوحة)'
                : 'المسار المتدرج الملتزم'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMutunLibraryOpen(false);
              setAdminMode((m) => !m);
            }}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              adminMode
                ? 'bg-[#C69749] text-[#133A2A]'
                : 'bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] text-[#133A2A] dark:text-[#F7F3EA]'
            }`}
          >
            <Edit3 className="w-4 h-4" aria-hidden="true" />
            <span>{adminMode ? 'إغلاق إدارة المحتوى' : 'مسؤول المحتوى'}</span>
          </button>
        </div>
      </div>

      {adminMode ? (
        <TajweedContentManager
          lessons={lessons}
          onSaveLesson={onSaveLesson}
          onDeleteLesson={onDeleteLesson}
          onResetDefault={onResetCurriculum}
          onClose={() => setAdminMode(false)}
        />
      ) : mutunLibraryOpen ? (
        <MutunLibraryView
          onClose={() => setMutunLibraryOpen(false)}
          fontSizeClass={fontSizeClass}
        />
      ) : (
        <>
          {/* Academy Mastery Summary Bar */}
          <section
            className="rounded-3xl bg-[#133A2A] dark:bg-[#163628] text-[#F7F3EA] p-5 sm:p-6 space-y-4"
            aria-label="مؤشرات الإنجاز في التجويد"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-[#D6A954]">
                  مستوى المستخدم العام في التجويد
                </div>
                <div className="font-display text-2xl font-bold text-white">
                  {academyStats.userTierLabel}
                </div>
                <div className="text-xs text-[#DFD6C5]">
                  {academyStats.userTierDescription}
                </div>
              </div>

              <div className="rounded-2xl bg-[#1B4A36] dark:bg-[#1F4A37] p-4 space-y-1">
                <div className="text-xs text-[#DFD6C5]">الدروس المنجزة</div>
                <div className="font-display text-2xl font-bold text-[#D6A954] tabular-nums">
                  {academyStats.completedLessons} درساً
                </div>
                <div className="text-xs text-[#BFB6A4] tabular-nums">
                  من أصل {academyStats.totalLessons} درساً
                </div>
              </div>

              <div className="rounded-2xl bg-[#1B4A36] dark:bg-[#1F4A37] p-4 space-y-1">
                <div className="text-xs text-[#DFD6C5]">الدروس المتبقية</div>
                <div className="font-display text-2xl font-bold text-white tabular-nums">
                  {academyStats.remainingLessons} درساً
                </div>
                <div className="text-xs text-[#BFB6A4]">
                  بانتظار الاجتياز العلمي
                </div>
              </div>

              <div className="rounded-2xl bg-[#1B4A36] dark:bg-[#1F4A37] p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#DFD6C5]">نسبة الإتقان الكلية</span>
                  <span className="font-bold text-[#D6A954] tabular-nums">
                    {academyStats.overallMasteryPct}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#0F2C20] overflow-hidden">
                  <div
                    className="h-full bg-[#C69749] transition-all duration-300"
                    style={{ width: `${academyStats.overallMasteryPct}%` }}
                  />
                </div>
                <div className="text-xs text-[#BFB6A4]">
                  توزيع منظم على ١٣ وحدة
                </div>
              </div>
            </div>
          </section>

          {/* Step 1: 4-Level Progressive Ladder */}
          <section className="space-y-2" aria-label="مستويات الأكاديمية">
            <div className="flex items-center gap-2 text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]">
              <GraduationCap className="w-4 h-4 text-[#9C6F21] dark:text-[#D6A954]" aria-hidden="true" />
              <span>١. اختر المستوى التعليمي</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {([1, 2, 3, 4] as TajweedLevelNumber[]).map((lvl) => {
                const meta = TAJWEED_LEVEL_METADATA[lvl];
                const stat = academyStats.levelStats[lvl];
                const unlocked = isLevelUnlocked(lvl);
                const passed = isLevelPassed(lvl);
                const isCurrent = activeLevel === lvl;

                return (
                  <button
                    key={lvl}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => handleSelectLevel(lvl)}
                    className={`rounded-2xl border p-4 text-right transition-colors flex flex-col justify-between gap-2.5 ${
                      !unlocked
                        ? 'bg-[#EFE8D8]/70 dark:bg-[#102219] border-[#DFD6C5] dark:border-[#1E3B2D] opacity-75 cursor-not-allowed'
                        : isCurrent
                        ? 'bg-[#133A2A] text-[#F7F3EA] border-[#133A2A] dark:bg-[#193B2C] dark:border-[#C69749] cursor-pointer'
                        : 'bg-[#FFFDF9] dark:bg-[#132B20] border-[#DFD6C5] dark:border-[#244736] hover:border-[#C69749] cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-bold ${
                          isCurrent
                            ? 'text-[#D6A954]'
                            : unlocked
                            ? 'text-[#9C6F21] dark:text-[#D6A954]'
                            : 'text-[#8C8373]'
                        }`}
                      >
                        المستوى {lvl} · {meta.tierName}
                      </span>
                      {!unlocked ? (
                        <Lock className="w-4 h-4 text-[#8C8373]" aria-hidden="true" />
                      ) : passed ? (
                        <CheckCircle2
                          className="w-4 h-4 text-[#D6A954]"
                          aria-hidden="true"
                        />
                      ) : (
                        <Unlock
                          className={`w-4 h-4 ${
                            isCurrent ? 'text-[#D6A954]' : 'text-[#6B6254]'
                          }`}
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    <div>
                      <div className="font-bold text-sm leading-snug">
                        {meta.title}
                      </div>
                      <div
                        className={`text-xs mt-1 leading-relaxed ${
                          isCurrent
                            ? 'text-[#E5DDCC]'
                            : 'text-[#6B6254] dark:text-[#BFB6A4]'
                        }`}
                      >
                        {meta.subtitle}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div
                        className={`text-xs font-semibold tabular-nums flex items-center justify-between ${
                          isCurrent
                            ? 'text-[#D6A954]'
                            : 'text-[#6B6254] dark:text-[#BFB6A4]'
                        }`}
                      >
                        <span>
                          {unlocked
                            ? `${stat.completed} من ${stat.total} دروس`
                            : `مغلق · اجتز المستوى ${lvl - 1}`}
                        </span>
                        {unlocked && <span>{stat.masteryPct}%</span>}
                      </div>
                      {unlocked && (
                        <div className="w-full h-1.5 rounded-full bg-black/15 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-[#C69749]"
                            style={{ width: `${stat.masteryPct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 2: Units inside Active Level (only 3-4 units shown at a time!) */}
          <section className="space-y-2" aria-label="وحدات المستوى المختار">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                <Layers className="w-4 h-4 text-[#9C6F21] dark:text-[#D6A954]" aria-hidden="true" />
                <span>
                  ٢. وحدات المستوى {activeLevel} ({unitsInActiveLevel.length} وحدات)
                </span>
              </div>
              <span className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
                تظهر وحدات كل مستوى على حدة لتدرّج علمي مريح
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {unitsInActiveLevel.map((unit) => {
                const stat = academyStats.unitStats[unit.id];
                const isSelected = activeUnit.id === unit.id;
                const isRasm = unit.category === 'performance_and_rasm';

                return (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => handleSelectUnit(unit.id)}
                    className={`rounded-2xl border p-4 text-right transition-colors flex flex-col justify-between gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#F4EDE0] dark:bg-[#193B2C] border-[#C69749] text-[#133A2A] dark:text-[#F7F3EA]'
                        : 'bg-[#FFFDF9] dark:bg-[#132B20] border-[#DFD6C5] dark:border-[#244736] hover:border-[#C69749] text-[#1A2A22] dark:text-[#F7F3EA]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs font-bold">
                        <span className="text-[#9C6F21] dark:text-[#D6A954]">
                          {isRasm ? 'مباحث الأداء والرسم' : `الوحدة ${unit.unitNumber}`}
                        </span>
                        <span className="text-[#1B6B46] dark:text-[#6EE7B7] tabular-nums">
                          إتقان {stat?.masteryPct ?? 0}%
                        </span>
                      </div>

                      <div className="font-bold text-sm leading-snug">
                        {unit.title.replace(/^الوحدة\s+[^:]+:\s*/, '')}
                      </div>
                      <p className="text-xs text-[#6B6254] dark:text-[#BFB6A4] leading-relaxed">
                        {unit.subtitle}
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="text-xs font-semibold text-[#5C665E] dark:text-[#D8D0C0] tabular-nums flex items-center justify-between">
                        <span>منجز: {stat?.completed ?? 0}</span>
                        <span>متبقٍّ: {stat?.remaining ?? 0}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#E6DEC9] dark:bg-[#0F241A] overflow-hidden">
                        <div
                          className="h-full bg-[#1B6B46] dark:bg-[#C69749]"
                          style={{ width: `${stat?.masteryPct ?? 0}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Unit 13 Explicit Epistemological Classification Banner */}
          {activeUnit.category === 'performance_and_rasm' &&
            activeUnit.categoryNotice && (
              <div className="rounded-2xl bg-[#F4EDE0] dark:bg-[#193729] border border-[#C69749] p-4 flex items-start gap-3">
                <Info
                  className="w-5 h-5 text-[#9C6F21] dark:text-[#D6A954] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <div className="text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                    تنبيه علمي منهجي: مباحث الأداء القرآني ورسم المصحف
                  </div>
                  <p className="text-xs sm:text-sm text-[#46524B] dark:text-[#D8D0C0] leading-relaxed">
                    {activeUnit.categoryNotice}
                  </p>
                </div>
              </div>
            )}

          {/* Step 3: Focused Unit Lessons List + Active Lesson Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Lessons List in Active Unit */}
            <div className="lg:col-span-4 space-y-3">
              <div className="text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA] px-1">
                ٣. دروس {activeUnit.title.replace(/^الوحدة\s+[^:]+:\s*/, '')} ({unitLessons.length})
              </div>

              {unitLessons.map((lesson, idx) => {
                const isSelected = activeLesson?.id === lesson.id;
                const progress = progressMap[lesson.id];
                const hasMutun = lesson.mutunWitnesses.length > 0;

                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => onSelectLesson(lesson.id)}
                    className={`w-full rounded-2xl border p-4 sm:p-5 text-right transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#133A2A] text-[#F7F3EA] border-[#133A2A] dark:bg-[#193B2C] dark:border-[#C69749]'
                        : 'bg-[#FFFDF9] dark:bg-[#132B20] text-[#1A2A22] dark:text-[#F7F3EA] border-[#DFD6C5] dark:border-[#244736] hover:border-[#C69749]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div
                          className={`text-xs font-medium tabular-nums ${
                            isSelected
                              ? 'text-[#D6A954]'
                              : 'text-[#6B6254] dark:text-[#BFB6A4]'
                          }`}
                        >
                          الدرس {idx + 1} · {lesson.durationMinutes} دقائق ·{' '}
                          {hasMutun
                            ? `${lesson.mutunWitnesses.length === 2 ? 'تحفة + جزرية' : lesson.mutunWitnesses[0].matnName}`
                            : 'مبحث مكمل'}
                        </div>
                        <h3 className="font-display text-xl font-bold leading-snug">
                          {lesson.title}
                        </h3>
                        <div
                          className={`text-xs font-semibold ${
                            progress?.passed
                              ? isSelected
                                ? 'text-[#6EE7B7]'
                                : 'text-[#1B6B46] dark:text-[#6EE7B7]'
                              : isSelected
                              ? 'text-[#CFC6B4]'
                              : 'text-[#8C8373]'
                          }`}
                        >
                          {progress?.passed
                            ? `تم اجتياز الاختبار (${progress.bestScorePct}%)`
                            : 'يتطلب اجتياز الاختبار القصير'}
                        </div>
                      </div>

                      {progress?.passed && (
                        <CheckCircle2 className="w-5 h-5 text-[#D6A954] shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Lesson Workspace */}
            {activeLesson && (
              <section className="lg:col-span-8 rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 sm:p-8 space-y-6">
                {/* Lesson Header + Mode Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ECE4D4] dark:border-[#214232] pb-4">
                  <div className="space-y-1">
                    <div className="inline-flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#1B6B46] dark:text-[#6EE7B7]">
                      <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>
                        {activeLesson.reviewStatus === 'reviewed'
                          ? 'مراجَع علمياً'
                          : 'قيد المراجعة العلمية'}{' '}
                        · الوحدة {activeLesson.unitNumber}: {activeLesson.unitTitle} ·{' '}
                        {activeLesson.scientificReference}
                      </span>
                    </div>
                    <h3 className="font-display text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                      {activeLesson.title}
                    </h3>
                  </div>

                  <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#EAE2D2] dark:bg-[#193729] self-start shrink-0">
                    {[
                      { id: 'learn', label: 'الشرح والمتون والأمثلة' },
                      { id: 'practice', label: 'تدريب تفاعلي' },
                      { id: 'quiz', label: 'اختبار قصير' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setLessonTab(t.id as typeof lessonTab)}
                        className={`min-h-[40px] px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          lessonTab === t.id
                            ? 'bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A]'
                            : 'text-[#46524B] dark:text-[#D8D0C0]'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* TAB 1: Objectives, Definition, Explanation, Mutun Witnesses & Verified Quranic Examples */}
                {lessonTab === 'learn' && (
                  <div className="space-y-6">
                    {/* Learning Objectives */}
                    {activeLesson.learningObjectives &&
                      activeLesson.learningObjectives.length > 0 && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E6DEC9] dark:border-[#224434] space-y-2">
                          <div className="flex items-center gap-2 text-sm font-bold text-[#133A2A] dark:text-[#D6A954]">
                            <Target className="w-4 h-4 text-[#9C6F21] dark:text-[#D6A954]" aria-hidden="true" />
                            <span>أهداف هذا الدرس</span>
                          </div>
                          <ul className="space-y-1.5 text-sm text-[#46524B] dark:text-[#D8D0C0] list-disc list-inside">
                            {activeLesson.learningObjectives.map((obj, idx) => (
                              <li key={idx}>{obj}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {/* Simple Definition */}
                    <div className="p-5 rounded-2xl bg-[#F4EDE0] dark:bg-[#173326] space-y-1.5">
                      <div className="text-sm font-bold text-[#9C6F21] dark:text-[#D6A954]">
                        تعريف بسيط
                      </div>
                      <p
                        className={`${fontSizeClass} text-[#1A2A22] dark:text-[#F7F3EA] leading-relaxed`}
                      >
                        {activeLesson.simpleDefinition}
                      </p>
                    </div>

                    {/* Clear Explanation & Key Letters */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-base text-[#133A2A] dark:text-[#F7F3EA]">
                        الشرح التفصيلي وضوابط الحكم
                      </h4>
                      <p
                        className={`${fontSizeClass} text-[#46524B] dark:text-[#D8D0C0] whitespace-pre-line leading-relaxed`}
                      >
                        {activeLesson.explanation}
                      </p>

                      <div className="p-4 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E6DEC9] dark:border-[#224434]">
                        <div className="text-xs font-bold text-[#9C6F21] dark:text-[#D6A954]">
                          الحروف والمواضع والمقادير الأساسية
                        </div>
                        <div className="font-display text-2xl font-bold text-[#133A2A] dark:text-[#F7F3EA] mt-1">
                          {activeLesson.lettersOrPoints}
                        </div>
                      </div>
                    </div>

                    {/* Verified Mutun Witnesses Section (Strictly separated from Quranic verses) */}
                    <MutunWitnessSection
                      ruleTitle={activeLesson.title}
                      witnesses={activeLesson.mutunWitnesses ?? []}
                      supplementarySource={activeLesson.supplementarySource}
                      fontSizeClass={fontSizeClass}
                    />

                    {/* Verified Quranic Examples (Hafs 'an Asim) */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-bold text-base text-[#133A2A] dark:text-[#F7F3EA]">
                          أمثلة قرآنية موثقة (برواية حفص عن عاصم · الرسم العثماني)
                        </h4>
                        {examplesLoading && (
                          <span className="text-xs text-[#6B6254] inline-flex items-center gap-1">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>جاري جلب الآيات...</span>
                          </span>
                        )}
                      </div>

                      <div className="space-y-3">
                        {activeLesson.exampleRefs.map((ex) => {
                          const ayahText =
                            verifiedVerses[`${ex.surahNumber}:${ex.ayahNumber}`];
                          return (
                            <div
                              key={ex.id}
                              className="p-5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E6DEC9] dark:border-[#224434] space-y-2.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#9C6F21] dark:text-[#D6A954]">
                                <span>
                                  {ex.surahName} · الآية ({ex.ayahNumber})
                                </span>
                                <span>موضع الحكم: «{ex.highlightSegment}»</span>
                              </div>

                              <p className="font-display text-2xl sm:text-3xl leading-loose text-[#1A2A22] dark:text-[#F7F3EA]">
                                {ayahText
                                  ? renderAyahWithHighlight(
                                      ayahText,
                                      ex.highlightSegment
                                    )
                                  : 'جاري تحميل نص الآية الكريمة من المصدر الموثوق...'}
                              </p>

                              <p className="text-sm text-[#46524B] dark:text-[#D8D0C0] leading-relaxed">
                                <span className="font-bold text-[#1B6B46] dark:text-[#6EE7B7]">
                                  وجه التطبيق:{' '}
                                </span>
                                {ex.ruleNote}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setLessonTab('practice')}
                        className="min-h-[48px] px-6 py-3 rounded-xl bg-[#C69749] hover:bg-[#B38538] text-[#133A2A] font-bold text-base inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>انتقل إلى التدريب التفاعلي</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLessonTab('quiz')}
                        className="min-h-[48px] px-5 py-3 rounded-xl bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] text-[#133A2A] dark:text-[#F7F3EA] font-semibold text-sm inline-flex items-center gap-2 cursor-pointer"
                      >
                        <GraduationCap className="w-4 h-4" />
                        <span>الاختبار القصير</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: Interactive Practice */}
                {lessonTab === 'practice' && (
                  <div className="space-y-5">
                    <div className="text-sm text-[#5C665E] dark:text-[#BFB6A4]">
                      أجب عن التمارين التطبيقية التالية للتحقق الفوري من فهمك للحكم:
                    </div>

                    {activeLesson.practiceItems.map((item, idx) => {
                      const picked = practiceChoices[item.id];
                      const isCorrect = picked === item.correctOption;

                      return (
                        <div
                          key={item.id}
                          className="p-5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E6DEC9] dark:border-[#224434] space-y-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-base text-[#133A2A] dark:text-[#F7F3EA]">
                              {idx + 1}. {item.prompt}
                            </span>
                            <span className="font-display text-2xl font-bold text-[#9C6F21] dark:text-[#D6A954]">
                              «{item.targetToken}»
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2.5">
                            {item.options.map((opt) => {
                              const chosen = picked === opt;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => handlePickPractice(item.id, opt)}
                                  className={`min-h-[44px] px-4 py-2 rounded-xl border text-sm font-bold transition-colors cursor-pointer ${
                                    chosen
                                      ? isCorrect
                                        ? 'bg-[#1B6B46] text-white border-[#1B6B46]'
                                        : 'bg-[#B84A39] text-white border-[#B84A39]'
                                      : 'bg-[#FFFDF9] dark:bg-[#132B20] border-[#DFD6C5] dark:border-[#244736] hover:border-[#C69749]'
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>

                          {picked && (
                            <div
                              className={`text-sm font-semibold ${
                                isCorrect
                                  ? 'text-[#1B6B46] dark:text-[#6EE7B7]'
                                  : 'text-[#B84A39] dark:text-[#FCA5A5]'
                              }`}
                            >
                              {isCorrect
                                ? item.feedbackText
                                : 'تأمل القاعدة مرة أخرى واختر الإجابة الصحيحة.'}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setLessonTab('quiz')}
                      className="min-h-[48px] px-7 py-3 rounded-xl bg-[#133A2A] hover:bg-[#1B4D38] dark:bg-[#C69749] text-[#F7F3EA] dark:text-[#133A2A] font-bold text-base inline-flex items-center gap-2 cursor-pointer"
                    >
                      <GraduationCap className="w-5 h-5" />
                      <span>بدء الاختبار القصير لتسجيل الإتقان</span>
                    </button>
                  </div>
                )}

                {/* TAB 3: Short Quiz + Level Progression Gate */}
                {lessonTab === 'quiz' && (
                  <div className="space-y-6">
                    <div className="p-4 rounded-2xl bg-[#F4EDE0] dark:bg-[#173326] text-sm text-[#46524B] dark:text-[#E5DDCC]">
                      يتطلب اجتياز هذا الاختبار القصير الحصول على{' '}
                      <span className="font-bold tabular-nums">
                        {TAJWEED_LEVEL_METADATA[activeLesson.level].passingScorePct}%
                      </span>{' '}
                      فأكثر لإتمام الدرس وفتح المستوى التالي في المسار الملتزم.
                    </div>

                    <div className="space-y-4">
                      {activeLesson.quizQuestions.map((q, qIdx) => {
                        const chosenIdx = quizAnswers[q.id];
                        return (
                          <div
                            key={q.id}
                            className="p-5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E6DEC9] dark:border-[#224434] space-y-3"
                          >
                            <div className="font-bold text-base text-[#133A2A] dark:text-[#F7F3EA]">
                              {qIdx + 1}. {q.question}
                            </div>

                            <div className="space-y-2">
                              {q.options.map((opt, optIdx) => {
                                const isPicked = chosenIdx === optIdx;
                                const isCorrectOpt = optIdx === q.correctIndex;
                                let style =
                                  'bg-[#FFFDF9] dark:bg-[#132B20] border-[#DFD6C5] dark:border-[#244736]';

                                if (quizSubmitted) {
                                  if (isCorrectOpt) {
                                    style =
                                      'bg-[#1B6B46]/15 border-[#1B6B46] text-[#1B6B46] dark:text-[#6EE7B7]';
                                  } else if (isPicked && !isCorrectOpt) {
                                    style =
                                      'bg-[#B84A39]/15 border-[#B84A39] text-[#B84A39] dark:text-[#FCA5A5]';
                                  }
                                } else if (isPicked) {
                                  style =
                                    'bg-[#133A2A] text-[#F7F3EA] border-[#133A2A] dark:bg-[#C69749] dark:text-[#133A2A]';
                                }

                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    disabled={quizSubmitted}
                                    onClick={() =>
                                      setQuizAnswers((prev) => ({
                                        ...prev,
                                        [q.id]: optIdx,
                                      }))
                                    }
                                    className={`w-full min-h-[46px] p-3.5 rounded-xl border text-right text-sm font-semibold transition-colors cursor-pointer ${style}`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>

                            {quizSubmitted && (
                              <div className="text-sm text-[#46524B] dark:text-[#D8D0C0] pt-1">
                                <span className="font-bold text-[#9C6F21] dark:text-[#D6A954]">
                                  التوضيح العلمي:{' '}
                                </span>
                                {q.explanation}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {!quizSubmitted ? (
                      <button
                        type="button"
                        disabled={activeLesson.quizQuestions.some(
                          (q) => quizAnswers[q.id] === undefined
                        )}
                        onClick={handleSubmitLessonQuiz}
                        className="min-h-[48px] px-7 py-3 rounded-xl bg-[#C69749] hover:bg-[#B38538] disabled:opacity-45 disabled:cursor-not-allowed text-[#133A2A] font-bold text-base cursor-pointer"
                      >
                        اعتماد الإجابات وحساب النتيجة
                      </button>
                    ) : (
                      (() => {
                        const total = activeLesson.quizQuestions.length || 1;
                        const correctCount = activeLesson.quizQuestions.filter(
                          (q) => quizAnswers[q.id] === q.correctIndex
                        ).length;
                        const scorePct = Math.round((correctCount / total) * 100);
                        const passed =
                          scorePct >=
                          TAJWEED_LEVEL_METADATA[activeLesson.level]
                            .passingScorePct;
                        const nextLvl = (activeLesson.level +
                          1) as TajweedLevelNumber;
                        const canAdvance =
                          activeLesson.level < 4 && isLevelUnlocked(nextLvl);

                        // Also locate next lesson inside current unit or level
                        const curIdx = unitLessons.findIndex(
                          (l) => l.id === activeLesson.id
                        );
                        const nextLessonInUnit =
                          curIdx >= 0 && curIdx + 1 < unitLessons.length
                            ? unitLessons[curIdx + 1]
                            : null;

                        return (
                          <div
                            className={`p-5 rounded-2xl border space-y-4 ${
                              passed
                                ? 'bg-[#1B6B46]/10 border-[#1B6B46]'
                                : 'bg-[#B84A39]/10 border-[#B84A39]'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {passed ? (
                                <BookOpenCheck className="w-6 h-6 text-[#1B6B46] dark:text-[#6EE7B7] shrink-0" />
                              ) : (
                                <AlertCircle className="w-6 h-6 text-[#B84A39] dark:text-[#FCA5A5] shrink-0" />
                              )}
                              <div className="space-y-1">
                                <div className="font-bold text-lg text-[#133A2A] dark:text-[#F7F3EA] tabular-nums">
                                  نتيجتك: {scorePct}% ({correctCount} من {total})
                                </div>
                                <p className="text-sm text-[#46524B] dark:text-[#E5DDCC]">
                                  {passed
                                    ? canAdvance
                                      ? `مبارك! اجتزت متطلبات المستوى ${activeLesson.level} وتم فتح المستوى ${nextLvl}.`
                                      : 'أحسنت! تم تسجيل إتقانك لهذا الدرس بنجاح في رصيد الأكاديمية.'
                                    : 'لم تبلغ درجة الاجتياز بعد. راجع الشرح والشواهد الشعرية والأمثلة القرآنية ثم أعد الاختبار.'}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                              {!passed && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuizAnswers({});
                                    setQuizSubmitted(false);
                                  }}
                                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#133A2A] text-[#F7F3EA] text-sm font-bold cursor-pointer"
                                >
                                  إعادة الاختبار
                                </button>
                              )}
                              {passed && nextLessonInUnit && (
                                <button
                                  type="button"
                                  onClick={() => onSelectLesson(nextLessonInUnit.id)}
                                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#133A2A] dark:bg-[#C69749] text-[#F7F3EA] dark:text-[#133A2A] text-sm font-bold cursor-pointer"
                                >
                                  الانتقال للدرس التالي: {nextLessonInUnit.title}
                                </button>
                              )}
                              {canAdvance && (
                                <button
                                  type="button"
                                  onClick={() => handleSelectLevel(nextLvl)}
                                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#C69749] text-[#133A2A] text-sm font-bold cursor-pointer"
                                >
                                  الانتقال إلى المستوى {nextLvl}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
};
