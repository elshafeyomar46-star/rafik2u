import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  CalendarCheck,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  HelpCircle,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { FULL_QURAN_DIVERSE_SURAHS } from '../data/quranMetadata';
import { fetchAllSurahs, fetchSurahAyahsUthmani } from '../services/quranApi';
import {
  CompletedSessionRecord,
  DailyScheduleDay,
  MemorizationLevel,
  MemorizationPlan,
  MistakeQueueItem,
  QuranAyah,
  QuizDistributionWeights,
  QuizQuestion,
  QuizScopeMode,
  SmartReviewMemory,
  SurahSummary,
} from '../types';
import {
  analyzeTypedAyahMistake,
  generateDailySchedule,
  generateProgressiveQuiz,
  generateSmartComprehensiveQuiz,
  MemoryCheckAnalysis,
} from '../utils/quranQuizGenerator';
import { isWordMatchingUthmaniWord } from '../utils/quranDiffEngine';
import { AyahComparisonFeedback } from './AyahComparisonFeedback';
import { ComprehensiveQuizSetup } from './ComprehensiveQuizSetup';
import {
  QuestionAttemptOutcome,
  QuizEndReportCard,
} from './QuizEndReportCard';
import { QuizVoiceRecitationInput } from './QuizVoiceRecitationInput';

interface MemorizationScreenProps {
  plans: MemorizationPlan[];
  activePlanId: string;
  mistakeQueue: MistakeQueueItem[];
  completedSessions: CompletedSessionRecord[];
  smartMemory: SmartReviewMemory;
  onSelectActivePlan: (planId: string) => void;
  onCreatePlan: (plan: MemorizationPlan) => void;
  onUpdatePlanLevel: (planId: string, level: MemorizationLevel) => void;
  onDeletePlan: (planId: string) => void;
  onRecordSession: (
    planId: string | null,
    dayNumber: number | null,
    record: CompletedSessionRecord
  ) => void;
  onRecordSmartOutcome: (question: QuizQuestion, isCorrect: boolean) => void;
  onAddMistake: (item: MistakeQueueItem) => void;
  onResolveMistake: (mistakeId: string) => void;
  fontSizeClass: string;
}

type MemorizationSubView =
  | 'schedule'
  | 'comprehensive'
  | 'setup'
  | 'reader'
  | 'quiz';

const LEVEL_META: Record<
  MemorizationLevel,
  { label: string; description: string; badgeClass: string }
> = {
  new: {
    label: 'جديد',
    description: 'حفظ جديد يحتاج تثبيتاً هادئاً وتكراراً مركزاً',
    badgeClass: 'text-[#9C6F21] dark:text-[#D6A954]',
  },
  needs_review: {
    label: 'يحتاج مراجعة',
    description: 'محفوظ سابقاً ويحتاج ربطاً وتداخلاً يومياً لتثبيته',
    badgeClass: 'text-[#B84A39] dark:text-[#FCA5A5]',
  },
  mastered: {
    label: 'متقن',
    description: 'حفظ متين تُجعل له مراجعة دورية سريعة للحفاظ عليه',
    badgeClass: 'text-[#1B6B46] dark:text-[#6EE7B7]',
  },
};

export const MemorizationScreen: React.FC<MemorizationScreenProps> = ({
  plans,
  activePlanId,
  mistakeQueue,
  completedSessions,
  smartMemory,
  onSelectActivePlan,
  onCreatePlan,
  onUpdatePlanLevel,
  onDeletePlan,
  onRecordSession,
  onRecordSmartOutcome,
  onAddMistake,
  onResolveMistake,
  fontSizeClass,
}) => {
  const activePlan =
    plans.find((p) => p.id === activePlanId) ?? plans[0] ?? null;

  const [subView, setSubView] = useState<MemorizationSubView>(
    activePlan ? 'schedule' : 'setup'
  );

  // Surahs & Ayahs state from verified API
  const [surahs, setSurahs] = useState<SurahSummary[]>([]);
  const [surahsLoading, setSurahsLoading] = useState(false);
  const [surahsError, setSurahsError] = useState<string | null>(null);

  const [ayahsCache, setAyahsCache] = useState<Record<number, QuranAyah[]>>({});
  const [ayahsLoading, setAyahsLoading] = useState(false);
  const [ayahsError, setAyahsError] = useState<string | null>(null);

  // Plan Setup Form State
  const [surahSearch, setSurahSearch] = useState('');
  const [setupSurahNumber, setSetupSurahNumber] = useState<number>(112); // Al-Ikhlas default or user choice
  const [setupFromAyah, setSetupFromAyah] = useState<number>(1);
  const [setupToAyah, setSetupToAyah] = useState<number>(4);
  const [setupAyahsPerDay, setSetupAyahsPerDay] = useState<number>(2);
  const [setupLevel, setSetupLevel] = useState<MemorizationLevel>('new');

  // Reader State
  const [activeDayNumber, setActiveDayNumber] = useState<number>(1);
  const [hideAllAyahs, setHideAllAyahs] = useState(false);
  const [revealedAyahNumbers, setRevealedAyahNumbers] = useState<number[]>([]);
  const [readingLoggedToast, setReadingLoggedToast] = useState(false);

  // Quiz State
  const [quizMode, setQuizMode] = useState<
    'plan_day' | 'mistake_review' | 'comprehensive_review'
  >('plan_day');
  const [comprehensiveLoading, setComprehensiveLoading] = useState(false);
  const [comprehensiveError, setComprehensiveError] = useState<string | null>(
    null
  );
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [orderList, setOrderList] = useState<
    { ayahNumber: number; text: string }[]
  >([]);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [spotSelectedTokenIdx, setSpotSelectedTokenIdx] = useState<
    number | null
  >(null);
  const [spotCorrectionInput, setSpotCorrectionInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState(false);
  const [mistakeExplanation, setMistakeExplanation] = useState('');
  const [mistakePositionLabel, setMistakePositionLabel] = useState('');
  const [memoryDiff, setMemoryDiff] = useState<MemoryCheckAnalysis | null>(null);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [quizOutcomes, setQuizOutcomes] = useState<QuestionAttemptOutcome[]>(
    []
  );
  const [quizFinished, setQuizFinished] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [activeMistakeIds, setActiveMistakeIds] = useState<string[]>([]);

  // Load 114 Surahs list on mount
  const loadSurahs = async () => {
    setSurahsLoading(true);
    setSurahsError(null);
    try {
      const list = await fetchAllSurahs();
      setSurahs(list);
    } catch (err) {
      setSurahsError(
        err instanceof Error ? err.message : 'تعذر تحميل قائمة السور من المصدر الموثوق.'
      );
    } finally {
      setSurahsLoading(false);
    }
  };

  useEffect(() => {
    void loadSurahs();
  }, []);

  const ensureSurahAyahs = async (surahNumber: number): Promise<QuranAyah[]> => {
    if (ayahsCache[surahNumber]) {
      return ayahsCache[surahNumber];
    }
    setAyahsLoading(true);
    setAyahsError(null);
    try {
      const ayahs = await fetchSurahAyahsUthmani(surahNumber);
      setAyahsCache((prev) => ({ ...prev, [surahNumber]: ayahs }));
      return ayahs;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'تعذر تحميل الآيات الكريمة من المصدر الموثوق.';
      setAyahsError(msg);
      throw err;
    } finally {
      setAyahsLoading(false);
    }
  };

  // Fetch ayahs automatically for setup preview & active plan
  useEffect(() => {
    if (subView === 'setup') {
      void ensureSurahAyahs(setupSurahNumber).catch(() => {});
    }
  }, [subView, setupSurahNumber]);

  useEffect(() => {
    if (activePlan && (subView === 'reader' || subView === 'schedule')) {
      void ensureSurahAyahs(activePlan.surahNumber).catch(() => {});
    }
  }, [activePlan?.surahNumber, subView]);

  const selectedSetupSurah = useMemo(
    () => surahs.find((s) => s.number === setupSurahNumber) ?? null,
    [surahs, setupSurahNumber]
  );

  // Sync range bounds when switching Surah in setup
  const handleSelectSetupSurah = (surah: SurahSummary) => {
    setSetupSurahNumber(surah.number);
    setSetupFromAyah(1);
    const defaultEnd = Math.min(surah.numberOfAyahs, 10);
    setSetupToAyah(defaultEnd);
    setSetupAyahsPerDay(Math.min(defaultEnd, 5));
  };

  const filteredSurahs = useMemo(() => {
    const q = surahSearch.trim();
    if (!q) return surahs;
    return surahs.filter(
      (s) =>
        s.name.includes(q) ||
        s.englishName.toLowerCase().includes(q.toLowerCase()) ||
        String(s.number) === q
    );
  }, [surahs, surahSearch]);

  const previewSchedule = useMemo(
    () =>
      generateDailySchedule(
        setupFromAyah,
        setupToAyah,
        setupAyahsPerDay,
        setupLevel
      ),
    [setupFromAyah, setupToAyah, setupAyahsPerDay, setupLevel]
  );

  const handleCreateNewPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const surahName =
      selectedSetupSurah?.name ?? `سورة رقم ${setupSurahNumber}`;
    const maxAyahs = selectedSetupSurah?.numberOfAyahs ?? setupToAyah;
    const safeFrom = Math.max(1, Math.min(setupFromAyah, maxAyahs));
    const safeTo = Math.max(safeFrom, Math.min(setupToAyah, maxAyahs));
    const schedule = generateDailySchedule(
      safeFrom,
      safeTo,
      setupAyahsPerDay,
      setupLevel
    );

    const newPlan: MemorizationPlan = {
      id: `plan-${Date.now()}`,
      surahNumber: setupSurahNumber,
      surahName,
      fromAyah: safeFrom,
      toAyah: safeTo,
      ayahsPerDay: setupAyahsPerDay,
      level: setupLevel,
      createdAt: new Date().toISOString(),
      schedule,
    };

    try {
      await ensureSurahAyahs(setupSurahNumber);
    } catch {
      // Plan can still be created and will retry fetch when reading
    }

    onCreatePlan(newPlan);
    setActiveDayNumber(1);
    setSubView('schedule');
  };

  const nextScheduledDay: DailyScheduleDay | null = useMemo(() => {
    if (!activePlan) return null;
    return (
      activePlan.schedule.find((d) => !d.completed) ??
      activePlan.schedule[0] ??
      null
    );
  }, [activePlan]);

  const currentReadingDay: DailyScheduleDay | null = useMemo(() => {
    if (!activePlan) return null;
    return (
      activePlan.schedule.find((d) => d.dayNumber === activeDayNumber) ??
      nextScheduledDay
    );
  }, [activePlan, activeDayNumber, nextScheduledDay]);

  const activeSurahAyahs = activePlan ? ayahsCache[activePlan.surahNumber] ?? [] : [];

  const readingAyahs = useMemo(() => {
    if (!currentReadingDay) return [];
    return activeSurahAyahs.filter(
      (a) =>
        a.numberInSurah >= currentReadingDay.fromAyah &&
        a.numberInSurah <= currentReadingDay.toAyah
    );
  }, [activeSurahAyahs, currentReadingDay]);

  const openDayInReader = async (dayNumber: number) => {
    if (!activePlan) return;
    setActiveDayNumber(dayNumber);
    setHideAllAyahs(false);
    setRevealedAyahNumbers([]);
    setReadingLoggedToast(false);
    setSubView('reader');
    try {
      await ensureSurahAyahs(activePlan.surahNumber);
    } catch {
      // Handled by ayahsError state
    }
  };

  const initializeQuestionState = (q: QuizQuestion | undefined) => {
    setSelectedOption('');
    setTypedAnswer('');
    setSpotSelectedTokenIdx(null);
    setSpotCorrectionInput('');
    setShowHint(false);
    setQuizSubmitted(false);
    setIsCurrentCorrect(false);
    setMistakeExplanation('');
    setMistakePositionLabel('');
    setMemoryDiff(null);
    if (q?.type === 'order_ayahs' && q.orderedItems) {
      setOrderList([...q.orderedItems]);
    } else {
      setOrderList([]);
    }
  };

  const startPlanDayQuiz = async (day: DailyScheduleDay) => {
    if (!activePlan) return;
    setActiveDayNumber(day.dayNumber);
    setQuizMode('plan_day');
    setSessionSaved(false);
    setQuizFinished(false);
    setQuizCorrectCount(0);
    setQuizOutcomes([]);
    setActiveMistakeIds([]);

    try {
      const ayahs = await ensureSurahAyahs(activePlan.surahNumber);
      const generated = generateProgressiveQuiz(
        activePlan.surahNumber,
        activePlan.surahName,
        ayahs,
        day.fromAyah,
        day.toAyah
      );
      setQuizQuestions(generated);
      setQuizIndex(0);
      initializeQuestionState(generated[0]);
      setSubView('quiz');
    } catch {
      // Error displayed cleanly in reader/schedule
    }
  };

  const startMistakeReviewQuiz = () => {
    if (mistakeQueue.length === 0) return;
    const questions = mistakeQueue.map((m) => m.question);
    setQuizMode('mistake_review');
    setActiveMistakeIds(mistakeQueue.map((m) => m.id));
    setQuizQuestions(questions);
    setQuizIndex(0);
    setQuizCorrectCount(0);
    setQuizOutcomes([]);
    setQuizFinished(false);
    setSessionSaved(false);
    initializeQuestionState(questions[0]);
    setSubView('quiz');
  };

  const handleStartComprehensiveQuiz = async (config: {
    scopeMode: QuizScopeMode;
    selectedJuz: number[];
    selectedSurahNumbers: number[];
    specificRange: { surahNumber: number; fromAyah: number; toAyah: number } | null;
    questionCount: number;
    weights: QuizDistributionWeights;
    freeRecitationOnly?: boolean;
  }) => {
    setComprehensiveLoading(true);
    setComprehensiveError(null);
    try {
      const targetSurahNumbers =
        config.scopeMode === 'full_quran'
          ? FULL_QURAN_DIVERSE_SURAHS.map((s) => s.surahNumber)
          : Array.from(
              new Set(
                plans
                  .filter((p) => {
                    if (
                      config.scopeMode === 'specific_surahs' &&
                      config.selectedSurahNumbers.length > 0
                    ) {
                      return config.selectedSurahNumbers.includes(p.surahNumber);
                    }
                    if (
                      config.scopeMode === 'specific_ayahs' &&
                      config.specificRange
                    ) {
                      return p.surahNumber === config.specificRange.surahNumber;
                    }
                    return true;
                  })
                  .map((p) => p.surahNumber)
              )
            );

      if (targetSurahNumbers.length === 0) {
        setComprehensiveError(
          'يرجى تحديد سورة واحدة أو جزء واحد على الأقل من محفوظاتك، أو إضافة خطة حفظ أولاً.'
        );
        return;
      }

      const loadedPairs = await Promise.all(
        targetSurahNumbers.map(async (sNum) => {
          const ayahs = await ensureSurahAyahs(sNum);
          return [sNum, ayahs] as const;
        })
      );

      const ayahsBySurah: Record<number, QuranAyah[]> = { ...ayahsCache };
      for (const [sNum, ayahs] of loadedPairs) {
        ayahsBySurah[sNum] = ayahs;
      }

      const surahNamesMap: Record<number, string> = {};
      for (const p of plans) surahNamesMap[p.surahNumber] = p.surahName;
      for (const s of surahs) surahNamesMap[s.number] = s.name;
      for (const s of FULL_QURAN_DIVERSE_SURAHS) {
        if (!surahNamesMap[s.surahNumber]) surahNamesMap[s.surahNumber] = s.surahName;
      }

      let generated = generateSmartComprehensiveQuiz({
        scopeMode: config.scopeMode,
        plans,
        ayahsBySurah,
        surahNamesMap,
        selectedJuz: config.selectedJuz,
        selectedSurahNumbers: config.selectedSurahNumbers,
        specificRange: config.specificRange,
        questionCount: config.questionCount,
        weights: config.weights,
        smartMemory,
        mistakeQueue,
      });

      if (config.freeRecitationOnly) {
        // Ensure free recitation questions focus purely on recall without text visible
        generated = generated.map((q) => ({
          ...q,
          type: 'free_recitation',
          typeLabel: 'التسميع الحر',
          difficultyLabel: 'تسميع حر من الذاكرة',
          promptTitle: `التسميع الحر: سمّع الآية (${q.targetAyahNumber}) من ${q.surahName} دون ظهور النص`,
          promptBody: `${q.surahName} · الجزء (${q.juzNumber}) · الآية (${q.targetAyahNumber})`,
          correctAnswerText: q.fullAyahText,
        }));
      }

      if (generated.length === 0) {
        setComprehensiveError(
          'لم يُعثر على آيات ضمن النطاق المحدد. تأكد من تطابق الأجزاء أو السور المختارة مع خطط حفظك.'
        );
        return;
      }

      setQuizMode('comprehensive_review');
      setQuizQuestions(generated);
      setQuizIndex(0);
      setQuizCorrectCount(0);
      setQuizOutcomes([]);
      setQuizFinished(false);
      setSessionSaved(false);
      setActiveMistakeIds([]);
      initializeQuestionState(generated[0]);
      setSubView('quiz');
    } catch {
      setComprehensiveError(
        'تعذر جلب الآيات الموثقة لبعض السور. يرجى التحقق من الاتصال والمحاولة مجدداً.'
      );
    } finally {
      setComprehensiveLoading(false);
    }
  };

  const currentQuestion = quizQuestions[quizIndex];

  const moveOrderItem = (index: number, direction: -1 | 1) => {
    if (quizSubmitted) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= orderList.length) return;
    setOrderList((prev) => {
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const isTypedQuestionType = (type: QuizQuestion['type']) =>
    type === 'complete_ayah_write' ||
    type === 'next_ayah_write' ||
    type === 'prev_ayah_write' ||
    type === 'written_recitation' ||
    type === 'complete_passage_write' ||
    type === 'free_recitation' ||
    type === 'resume_from_stop' ||
    type === 'write_from_memory';

  const isChoiceQuestionType = (type: QuizQuestion['type']) =>
    type === 'mutashabihat_review' ||
    type === 'multiple_choice' ||
    type === 'complete_ayah' ||
    type === 'next_ayah';

  const recordOutcomeAndMistake = (
    q: QuizQuestion,
    correct: boolean,
    explanation: string
  ) => {
    onRecordSmartOutcome(q, correct);
    setQuizOutcomes((prev) => {
      const filtered = prev.filter((o) => o.question.id !== q.id);
      return [...filtered, { question: q, isCorrect: correct }];
    });

    if (correct) {
      setQuizCorrectCount((c) => c + 1);
      if (quizMode === 'mistake_review' && activeMistakeIds[quizIndex]) {
        onResolveMistake(activeMistakeIds[quizIndex]);
      }
    } else {
      onAddMistake({
        id: `mistake-${q.id}`,
        surahNumber: q.surahNumber,
        surahName: q.surahName,
        targetAyahNumber: q.targetAyahNumber,
        juzNumber: q.juzNumber,
        questionType: q.type,
        questionTypeLabel: q.typeLabel,
        errorSummary: explanation,
        question: q,
        addedAt: new Date().toISOString(),
        attempts: 1,
      });
    }
  };

  const handleSubmitQuizAnswer = () => {
    if (!currentQuestion || quizSubmitted) return;

    let correct = false;
    let positionLabel = '';
    let explanation = '';

    if (isChoiceQuestionType(currentQuestion.type)) {
      correct = selectedOption === currentQuestion.correctAnswerText;
      if (!correct) {
        positionLabel = `موضع التمييز: ${currentQuestion.surahName} · الآية (${currentQuestion.targetAyahNumber})`;
        explanation =
          currentQuestion.mutashabihDifferenceNote ??
          `النص الصحيح الموافق لهذا الموضع هو: «${currentQuestion.correctAnswerText}».`;
      }
    } else if (currentQuestion.type === 'order_ayahs') {
      const expected = currentQuestion.correctOrderNumbers ?? [];
      const userOrder = orderList.map((item) => item.ayahNumber);
      correct =
        expected.length === userOrder.length &&
        expected.every((num, idx) => num === userOrder[idx]);

      if (!correct) {
        const firstWrongIdx = expected.findIndex(
          (num, idx) => num !== userOrder[idx]
        );
        const expectedAyahNum = expected[firstWrongIdx];
        const placedAyahNum = userOrder[firstWrongIdx];
        positionLabel = `موضع الخطأ: الترتيب رقم (${firstWrongIdx + 1})`;
        explanation = `في الموضع رقم (${firstWrongIdx + 1}) وضعت الآية رقم (${placedAyahNum})، بينما الصحيح أن تأتي الآية رقم (${expectedAyahNum}) أولاً حسب ترتيب السورة.`;
      }
    } else if (currentQuestion.type === 'spot_mistake' && currentQuestion.spotMistake) {
      const sm = currentQuestion.spotMistake;
      const idxMatch = spotSelectedTokenIdx === sm.mistakenTokenIndex;
      const wordMatch = isWordMatchingUthmaniWord(
        spotCorrectionInput,
        sm.correctWord,
        true
      );
      correct = idxMatch && wordMatch;
      if (!correct) {
        positionLabel = `موضع الاختلاف في الكلمة رقم (${sm.mistakenTokenIndex + 1})`;
        explanation = `${sm.mixupSourceNote} الكلمة الصحيحة هي: «${sm.correctWord}».`;
      }
    } else if (isTypedQuestionType(currentQuestion.type)) {
      const analysis = analyzeTypedAyahMistake(
        typedAnswer,
        currentQuestion.correctAnswerText
      );
      setMemoryDiff(analysis);
      correct = analysis.isCorrect;
      if (!correct) {
        positionLabel = analysis.firstErrorPosition
          ? `موضع الخطأ: الكلمة رقم (${analysis.firstErrorPosition}) من ${currentQuestion.surahName} (${currentQuestion.targetAyahNumber})`
          : `موضع الخطأ: ${currentQuestion.surahName} (${currentQuestion.targetAyahNumber})`;
        explanation = analysis.explanation;
      }
    }

    setIsCurrentCorrect(correct);
    setMistakePositionLabel(positionLabel);
    setMistakeExplanation(explanation);
    setQuizSubmitted(true);
    recordOutcomeAndMistake(currentQuestion, correct, explanation);
  };

  const handleCompleteVoiceEvaluation = (
    isCorrect: boolean,
    summaryNote: string
  ) => {
    if (!currentQuestion || quizSubmitted) return;
    setIsCurrentCorrect(isCorrect);
    setMistakePositionLabel(
      isCorrect
        ? 'تم تأكيد التسميع الصوتي'
        : `موضع يحتاج تثبيتاً: ${currentQuestion.surahName} (${currentQuestion.targetAyahNumber})`
    );
    setMistakeExplanation(summaryNote);
    setQuizSubmitted(true);
    recordOutcomeAndMistake(currentQuestion, isCorrect, summaryNote);
  };

  const handleRetryCurrentQuestion = () => {
    if (!currentQuestion) return;
    // Allow user to retry answering immediately without double-counting prior attempt
    if (isCurrentCorrect) {
      setQuizCorrectCount((c) => Math.max(0, c - 1));
    }
    setQuizSubmitted(false);
    setIsCurrentCorrect(false);
    setMistakePositionLabel('');
    setMistakeExplanation('');
    setMemoryDiff(null);
  };

  const handleNextQuestion = () => {
    if (quizIndex + 1 < quizQuestions.length) {
      const nextIdx = quizIndex + 1;
      setQuizIndex(nextIdx);
      initializeQuestionState(quizQuestions[nextIdx]);
    } else {
      setQuizFinished(true);
    }
  };

  const handleSaveQuizCompletion = () => {
    if (sessionSaved) return;
    const total = quizQuestions.length || 1;
    const scorePct = Math.round((quizCorrectCount / total) * 100);
    const surahsTested = Array.from(
      new Set(quizQuestions.map((q) => q.surahName))
    );
    const juzTested = Array.from(
      new Set(quizQuestions.map((q) => q.juzNumber).filter((j) => j > 0))
    ).sort((a, b) => a - b);

    if (quizMode === 'plan_day' && activePlan && currentReadingDay) {
      onRecordSession(activePlan.id, currentReadingDay.dayNumber, {
        id: `sess-${Date.now()}`,
        surahName: activePlan.surahName,
        surahNumber: activePlan.surahNumber,
        fromAyah: currentReadingDay.fromAyah,
        toAyah: currentReadingDay.toAyah,
        scorePct,
        totalQuestions: total,
        correctQuestions: quizCorrectCount,
        completedAt: new Date().toISOString(),
        mode: 'quiz',
        surahsTested,
        juzTested,
      });
    } else {
      onRecordSession(null, null, {
        id: `sess-${Date.now()}`,
        surahName:
          quizMode === 'comprehensive_review'
            ? `مراجعة ذكية (${surahsTested.length} سور)`
            : 'مراجعة الأخطاء السابقة',
        surahNumber: quizQuestions[0]?.surahNumber ?? 1,
        fromAyah: quizQuestions[0]?.targetAyahNumber ?? 1,
        toAyah:
          quizQuestions[quizQuestions.length - 1]?.targetAyahNumber ?? 1,
        scorePct,
        totalQuestions: total,
        correctQuestions: quizCorrectCount,
        completedAt: new Date().toISOString(),
        mode:
          quizMode === 'comprehensive_review'
            ? 'comprehensive_review'
            : 'mistake_review',
        surahsTested,
        juzTested,
      });
    }
    setSessionSaved(true);
  };

  const handleLogReadingSession = () => {
    if (!activePlan || !currentReadingDay) return;
    onRecordSession(activePlan.id, currentReadingDay.dayNumber, {
      id: `sess-${Date.now()}`,
      surahName: activePlan.surahName,
      surahNumber: activePlan.surahNumber,
      fromAyah: currentReadingDay.fromAyah,
      toAyah: currentReadingDay.toAyah,
      scorePct: 100,
      totalQuestions: 0,
      correctQuestions: 0,
      completedAt: new Date().toISOString(),
      mode: 'reading',
    });
    setReadingLoggedToast(true);
    window.setTimeout(() => setReadingLoggedToast(false), 3000);
  };

  const setupPreviewAyahs = useMemo(() => {
    const list = ayahsCache[setupSurahNumber] ?? [];
    return list.filter(
      (a) => a.numberInSurah >= setupFromAyah && a.numberInSurah <= setupToAyah
    );
  }, [ayahsCache, setupSurahNumber, setupFromAyah, setupToAyah]);

  return (
    <div className="space-y-6">
      {/* Header & Top Navigation Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
            حفظ ومراجعة القرآن الكريم
          </h2>
          <p className="text-sm text-[#6B6254] dark:text-[#BFB6A4] mt-1">
            نصوص قرآنية موثقة بالرسم العثماني والتشكيل الكامل · خطط مراجعة يومية واختبارات متدرجة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#EAE2D2] dark:bg-[#193729] self-start">
          {[
            { id: 'schedule', label: 'الجدول اليومي' },
            { id: 'comprehensive', label: 'الاختبار الشامل الذكي' },
            { id: 'setup', label: 'خطة جديدة' },
            { id: 'reader', label: 'القراءة والتسميع' },
            { id: 'quiz', label: 'الاختبار الحالي' },
          ].map((tab) => {
            const disabled =
              (tab.id === 'reader' && !activePlan) ||
              (tab.id === 'quiz' && quizQuestions.length === 0 && !activePlan);
            return (
              <button
                key={tab.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (
                    tab.id === 'quiz' &&
                    quizQuestions.length === 0 &&
                    nextScheduledDay
                  ) {
                    void startPlanDayQuiz(nextScheduledDay);
                  } else {
                    setSubView(tab.id as MemorizationSubView);
                  }
                }}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                  subView === tab.id
                    ? 'bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A]'
                    : 'text-[#46524B] dark:text-[#D8D0C0]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW 1B: SMART COMPREHENSIVE QUIZ CONFIGURATOR */}
      {subView === 'comprehensive' && (
        <ComprehensiveQuizSetup
          plans={plans}
          smartMemory={smartMemory}
          mistakeQueue={mistakeQueue}
          isLoadingQuiz={comprehensiveLoading}
          errorMsg={comprehensiveError}
          onStartComprehensiveQuiz={handleStartComprehensiveQuiz}
        />
      )}

      {/* VIEW 1: SCHEDULE & MISTAKE QUEUE */}
      {subView === 'schedule' && (
        <div className="space-y-6">
          {/* Active Plans Switcher + New Plan CTA */}
          {plans.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelectActivePlan(p.id);
                      setActiveDayNumber(1);
                    }}
                    className={`min-h-[44px] px-4 py-2 rounded-xl border text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activePlan?.id === p.id
                        ? 'bg-[#133A2A] text-[#F7F3EA] border-[#133A2A] dark:bg-[#C69749] dark:text-[#133A2A]'
                        : 'bg-[#FFFDF9] dark:bg-[#132B20] border-[#DFD6C5] dark:border-[#244736] text-[#1A2A22] dark:text-[#F7F3EA]'
                    }`}
                  >
                    {p.surahName} ({p.fromAyah}–{p.toAyah})
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setSubView('setup')}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] dark:hover:bg-[#234B39] text-[#133A2A] dark:text-[#F7F3EA] text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>إضافة خطة سورة جديدة</span>
              </button>
            </div>
          )}

          {!activePlan ? (
            <section className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-8 text-center space-y-4">
              <BookOpen className="w-10 h-10 text-[#C69749] mx-auto" aria-hidden="true" />
              <h3 className="font-display text-2xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                لم تنشئ جدول حفظ ومراجعة بعد
              </h3>
              <p className="text-base text-[#5C665E] dark:text-[#BFB6A4] max-w-md mx-auto">
                اختر السورة والآيات التي تريد حفظها أو مراجعتها وحدد مستواك لإنشاء جدول مراجعة يومي منظم.
              </p>
              <button
                type="button"
                onClick={() => setSubView('setup')}
                className="min-h-[48px] px-7 py-3 rounded-xl bg-[#C69749] hover:bg-[#B38538] text-[#133A2A] font-bold text-base cursor-pointer"
              >
                إنشاء خطة جديدة الآن
              </button>
            </section>
          ) : (
            <>
              {/* Active Plan Overview & Today's Session Card */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <section className="lg:col-span-7 rounded-3xl bg-[#133A2A] text-[#F7F3EA] p-6 sm:p-7 flex flex-col justify-between gap-5">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#D6A954]">
                        الخطة النشطة · {activePlan.ayahsPerDay} آيات يومياً
                      </span>
                      <span className="text-xs text-[#CFC6B4] tabular-nums">
                        من الآية {activePlan.fromAyah} إلى الآية {activePlan.toAyah}
                      </span>
                    </div>

                    <h3 className="font-display text-3xl font-bold text-[#FFFDF9]">
                      {activePlan.surahName}
                    </h3>

                    {nextScheduledDay && (
                      <div className="p-4 rounded-2xl bg-[#1A4B37] space-y-1">
                        <div className="text-sm text-[#D6A954] font-semibold tabular-nums">
                          {nextScheduledDay.completed
                            ? 'أتممت جميع أيام الجدول!'
                            : `مهمة اليوم (اليوم ${nextScheduledDay.dayNumber})`}
                        </div>
                        <div className="text-lg font-bold text-[#FFFDF9] tabular-nums">
                          الآيات من ({nextScheduledDay.fromAyah}) إلى ({nextScheduledDay.toAyah})
                        </div>
                      </div>
                    )}
                  </div>

                  {nextScheduledDay && (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void openDayInReader(nextScheduledDay.dayNumber)}
                        className="min-h-[48px] px-6 py-3 rounded-xl bg-[#C69749] hover:bg-[#B38538] text-[#133A2A] font-bold text-sm sm:text-base transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <BookOpen className="w-4 h-4" aria-hidden="true" />
                        <span>قراءة ومراجعة الآيات</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void startPlanDayQuiz(nextScheduledDay)}
                        className="min-h-[48px] px-6 py-3 rounded-xl bg-[#1F563F] hover:bg-[#27684D] text-[#FFFDF9] font-semibold text-sm sm:text-base transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <GraduationCap className="w-4 h-4 text-[#D6A954]" aria-hidden="true" />
                        <span>بدء الاختبار المتدرج</span>
                      </button>
                    </div>
                  )}
                </section>

                {/* Level Switcher & Plan Progress */}
                <section className="lg:col-span-5 rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 flex flex-col justify-between gap-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-base text-[#133A2A] dark:text-[#F7F3EA]">
                        مستوى الحفظ الحالي
                      </h4>
                      {plans.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeletePlan(activePlan.id)}
                          aria-label="حذف الخطة"
                          className="min-h-[40px] min-w-[40px] rounded-xl text-[#8C8373] hover:text-[#B84A39] flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {(['new', 'needs_review', 'mastered'] as MemorizationLevel[]).map(
                        (lvl) => {
                          const active = activePlan.level === lvl;
                          return (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => onUpdatePlanLevel(activePlan.id, lvl)}
                              className={`min-h-[44px] px-2 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                                active
                                  ? 'bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A]'
                                  : 'bg-[#F4EDE0] dark:bg-[#173326] text-[#46524B] dark:text-[#D8D0C0]'
                              }`}
                            >
                              {LEVEL_META[lvl].label}
                            </button>
                          );
                        }
                      )}
                    </div>

                    <p className="text-sm text-[#5C665E] dark:text-[#BFB6A4]">
                      {LEVEL_META[activePlan.level].description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#ECE4D4] dark:border-[#214232] flex items-center justify-between text-sm">
                    <span className="text-[#6B6254] dark:text-[#BFB6A4]">تقدّم الجدول</span>
                    <span className="font-bold text-[#133A2A] dark:text-[#D6A954] tabular-nums">
                      {activePlan.schedule.filter((d) => d.completed).length} من{' '}
                      {activePlan.schedule.length} أيام
                    </span>
                  </div>
                </section>
              </div>

              {/* Daily Schedule Grid */}
              <section className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 font-bold text-lg text-[#133A2A] dark:text-[#F7F3EA]">
                    <CalendarCheck className="w-5 h-5 text-[#C69749]" aria-hidden="true" />
                    <span>جدول المراجعة اليومي</span>
                  </div>
                  <span className="text-sm text-[#6B6254] dark:text-[#BFB6A4] tabular-nums">
                    {activePlan.schedule.length} جلسات مجدولة
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activePlan.schedule.map((day) => (
                    <div
                      key={day.dayNumber}
                      className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 ${
                        day.completed
                          ? 'bg-[#F4EDE0] dark:bg-[#163325] border-[#C69749]/60'
                          : 'bg-[#FBF8F2] dark:bg-[#0F241A] border-[#E5DEC9] dark:border-[#224434]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-base text-[#133A2A] dark:text-[#F7F3EA] tabular-nums">
                          اليوم {day.dayNumber}
                        </span>
                        <span
                          className={`text-xs font-bold inline-flex items-center gap-1 ${
                            day.completed
                              ? 'text-[#1B6B46] dark:text-[#6EE7B7]'
                              : 'text-[#9C6F21] dark:text-[#D6A954]'
                          }`}
                        >
                          {day.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                          <span>
                            {day.completed
                              ? day.lastScorePct !== undefined
                                ? `مكتمل (${day.lastScorePct}%)`
                                : 'مكتمل'
                              : 'مجدول'}
                          </span>
                        </span>
                      </div>

                      <div className="text-sm text-[#46524B] dark:text-[#D8D0C0] tabular-nums">
                        الآيات: {day.fromAyah} – {day.toAyah}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => void openDayInReader(day.dayNumber)}
                          className="flex-1 min-h-[40px] px-3 rounded-xl bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] dark:hover:bg-[#234B39] text-[#133A2A] dark:text-[#F7F3EA] text-xs font-bold cursor-pointer"
                        >
                          القراءة
                        </button>
                        <button
                          type="button"
                          onClick={() => void startPlanDayQuiz(day)}
                          className="flex-1 min-h-[40px] px-3 rounded-xl bg-[#133A2A] hover:bg-[#1B4D38] dark:bg-[#C69749] dark:hover:bg-[#B38538] text-[#F7F3EA] dark:text-[#133A2A] text-xs font-bold cursor-pointer"
                        >
                          اختبار
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Mistake Review Queue (قائمة المراجعة القادمة) */}
          <section className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                  قائمة المراجعة القادمة (الأخطاء)
                </h3>
                <p className="text-sm text-[#6B6254] dark:text-[#BFB6A4] mt-0.5">
                  تُضاف الأسئلة التي أخطأت فيها تلقائياً لتثبيتها في مراجعتك التالية
                </p>
              </div>

              {mistakeQueue.length > 0 && (
                <button
                  type="button"
                  onClick={startMistakeReviewQuiz}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#C69749] hover:bg-[#B38538] text-[#133A2A] font-bold text-sm inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                  <span>مراجعة الأخطاء الآن ({mistakeQueue.length})</span>
                </button>
              )}
            </div>

            {mistakeQueue.length === 0 ? (
              <div className="p-5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] text-sm text-[#5C665E] dark:text-[#BFB6A4]">
                لا توجد أخطاء معلّقة في قائمة المراجعة القادمة حالياً. كل خطأ في الاختبار سيظهر هنا مع شرحه لإعادة التثبيت.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mistakeQueue.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#9C6F21] dark:text-[#D6A954]">
                        <span>
                          {item.surahName} · الآية ({item.targetAyahNumber})
                        </span>
                        <span>{item.questionTypeLabel}</span>
                      </div>
                      <p className="text-sm text-[#1A2A22] dark:text-[#F7F3EA]">
                        {item.errorSummary}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#E6DEC9] dark:border-[#224434]">
                      <span className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
                        تُزال تلقائياً عند الإجابة الصحيحة
                      </span>
                      <button
                        type="button"
                        onClick={() => onResolveMistake(item.id)}
                        className="text-xs font-semibold text-[#6B6254] hover:text-[#133A2A] dark:text-[#BFB6A4] cursor-pointer"
                      >
                        تجاوز
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Completed Sessions Log */}
          {completedSessions.length > 0 && (
            <section className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 space-y-3">
              <h3 className="font-display text-xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                سجل الإنجازات الأخيرة
              </h3>
              <div className="divide-y divide-[#ECE4D4] dark:divide-[#214232]">
                {completedSessions.slice(0, 5).map((sess) => (
                  <div
                    key={sess.id}
                    className="py-3 flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <div>
                      <span className="font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                        {sess.surahName}
                      </span>{' '}
                      <span className="text-[#6B6254] dark:text-[#BFB6A4] tabular-nums">
                        (الآيات {sess.fromAyah}–{sess.toAyah})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 tabular-nums">
                      <span className="text-[#1B6B46] dark:text-[#6EE7B7] font-bold">
                        {sess.mode === 'reading'
                          ? 'مراجعة مقروءة'
                          : `النتيجة: ${sess.scorePct}%`}
                      </span>
                      <span className="text-xs text-[#8C8373]">
                        {new Date(sess.completedAt).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* VIEW 2: SETUP NEW MEMORIZATION PLAN */}
      {subView === 'setup' && (
        <form
          onSubmit={handleCreateNewPlan}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* Left Form Controls (Right in RTL) */}
          <section className="lg:col-span-7 rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 space-y-6">
            <div className="space-y-3">
              <h3 className="font-display text-2xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                ١. اختيار السورة
              </h3>

              <div className="relative">
                <Search
                  className="w-4 h-4 text-[#7C7260] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={surahSearch}
                  onChange={(e) => setSurahSearch(e.target.value)}
                  placeholder="ابحث باسم السورة أو رقمها (مثلاً: الكهف، الملك، 112)..."
                  className="w-full min-h-[44px] pr-10 pl-4 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-sm text-[#1A2A22] dark:text-[#F7F3EA]"
                />
              </div>

              {surahsLoading ? (
                <div className="p-4 text-sm text-[#6B6254] flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تحميل قائمة السور الموثقة...</span>
                </div>
              ) : surahsError ? (
                <div className="p-4 rounded-xl bg-[#B84A39]/10 text-[#B84A39] dark:text-[#FCA5A5] text-sm flex items-center justify-between gap-2">
                  <span>{surahsError}</span>
                  <button
                    type="button"
                    onClick={() => void loadSurahs()}
                    className="underline font-bold cursor-pointer"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-2xl border border-[#E5DEC9] dark:border-[#224434] divide-y divide-[#EFE8D8] dark:divide-[#1E3B2D]">
                  {filteredSurahs.map((s) => {
                    const selected = s.number === setupSurahNumber;
                    return (
                      <button
                        key={s.number}
                        type="button"
                        onClick={() => handleSelectSetupSurah(s)}
                        className={`w-full min-h-[46px] px-4 py-2.5 text-right flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A]'
                            : 'hover:bg-[#F7F3EA] dark:hover:bg-[#173326]'
                        }`}
                      >
                        <span className="font-display text-lg font-bold">
                          <span className="tabular-nums opacity-75 ml-2">{s.number}.</span>
                          {s.name}
                        </span>
                        <span className="text-xs tabular-nums opacity-80">
                          {s.numberOfAyahs} آية
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Ayah Range & 3. Daily Count */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#ECE4D4] dark:border-[#214232]">
              <div>
                <label
                  htmlFor="from-ayah"
                  className="block text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA] mb-1.5"
                >
                  من الآية
                </label>
                <input
                  id="from-ayah"
                  type="number"
                  min={1}
                  max={selectedSetupSurah?.numberOfAyahs ?? 286}
                  value={setupFromAyah}
                  onChange={(e) => {
                    const v = Math.max(1, Number(e.target.value) || 1);
                    setSetupFromAyah(v);
                    if (v > setupToAyah) setSetupToAyah(v);
                  }}
                  className="w-full min-h-[46px] px-3 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] tabular-nums font-bold"
                />
              </div>

              <div>
                <label
                  htmlFor="to-ayah"
                  className="block text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA] mb-1.5"
                >
                  إلى الآية
                </label>
                <input
                  id="to-ayah"
                  type="number"
                  min={setupFromAyah}
                  max={selectedSetupSurah?.numberOfAyahs ?? 286}
                  value={setupToAyah}
                  onChange={(e) => {
                    const max = selectedSetupSurah?.numberOfAyahs ?? 286;
                    const v = Math.min(max, Math.max(setupFromAyah, Number(e.target.value) || setupFromAyah));
                    setSetupToAyah(v);
                  }}
                  className="w-full min-h-[46px] px-3 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] tabular-nums font-bold"
                />
              </div>

              <div>
                <label
                  htmlFor="ayahs-per-day"
                  className="block text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA] mb-1.5"
                >
                  آيات يومياً
                </label>
                <input
                  id="ayahs-per-day"
                  type="number"
                  min={1}
                  max={50}
                  value={setupAyahsPerDay}
                  onChange={(e) =>
                    setSetupAyahsPerDay(Math.max(1, Math.min(50, Number(e.target.value) || 1)))
                  }
                  className="w-full min-h-[46px] px-3 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] tabular-nums font-bold"
                />
              </div>
            </div>

            {/* 4. Memorization Level */}
            <div className="space-y-3 pt-2 border-t border-[#ECE4D4] dark:border-[#214232]">
              <div className="text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                ٤. مستوى الحفظ الحالي لهذا المقطع
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['new', 'needs_review', 'mastered'] as MemorizationLevel[]).map(
                  (lvl) => {
                    const active = setupLevel === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSetupLevel(lvl)}
                        className={`p-4 rounded-2xl border text-right transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#133A2A] text-[#F7F3EA] border-[#133A2A] dark:bg-[#193B2C] dark:border-[#C69749]'
                            : 'bg-[#F7F3EA] dark:bg-[#0F241A] border-[#DFD6C5] dark:border-[#244736]'
                        }`}
                      >
                        <div className="font-bold text-base">
                          {LEVEL_META[lvl].label}
                        </div>
                        <div
                          className={`text-xs mt-1 ${
                            active
                              ? 'text-[#E5DDCC]'
                              : 'text-[#6B6254] dark:text-[#BFB6A4]'
                          }`}
                        >
                          {LEVEL_META[lvl].description}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <button
              type="submit"
              className="min-h-[48px] w-full px-6 py-3 rounded-xl bg-[#C69749] hover:bg-[#B38538] text-[#133A2A] font-bold text-base transition-colors cursor-pointer"
            >
              إنشاء جدول المراجعة اليومي ({previewSchedule.length} أيام)
            </button>
          </section>

          {/* Verified Ayah Text Preview */}
          <section className="lg:col-span-5 rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-[#ECE4D4] dark:border-[#214232] pb-3">
              <h3 className="font-display text-xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                معاينة النص القرآني الموثق
              </h3>
              <span className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
                الرسم العثماني
              </span>
            </div>

            {ayahsLoading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-sm text-[#6B6254]">
                <Loader2 className="w-5 h-5 animate-spin text-[#C69749]" />
                <span>جاري جلب الآيات الكريمة من المصدر الموثوق...</span>
              </div>
            ) : ayahsError ? (
              <div className="p-4 rounded-xl bg-[#B84A39]/10 text-[#B84A39] dark:text-[#FCA5A5] text-sm space-y-2">
                <p>{ayahsError}</p>
                <button
                  type="button"
                  onClick={() => void ensureSurahAyahs(setupSurahNumber)}
                  className="underline font-bold cursor-pointer"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-3 pl-1">
                {setupPreviewAyahs.slice(0, 12).map((ayah) => (
                  <div
                    key={ayah.number}
                    dir="rtl"
                    className="p-4 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] font-quran text-xl sm:text-2xl leading-[2.4] text-[#1A2A22] dark:text-[#F7F3EA]"
                  >
                    {ayah.text}{' '}
                    <span className="text-[#9C6F21] dark:text-[#D6A954] text-base tabular-nums">
                      ﴿{ayah.numberInSurah}﴾
                    </span>
                  </div>
                ))}
                {setupPreviewAyahs.length > 12 && (
                  <div className="text-xs text-center text-[#6B6254] dark:text-[#BFB6A4]">
                    يعرض أول ١٢ آية من النطاق المختار ({setupPreviewAyahs.length} آية إجمالاً)
                  </div>
                )}
              </div>
            )}
          </section>
        </form>
      )}

      {/* VIEW 3: VERIFIED READER & RECITATION PRACTICE */}
      {subView === 'reader' && activePlan && currentReadingDay && (
        <section className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ECE4D4] dark:border-[#214232] pb-4">
            <div>
              <div className="text-sm font-semibold text-[#9C6F21] dark:text-[#D6A954] tabular-nums">
                اليوم {currentReadingDay.dayNumber} · الآيات ({currentReadingDay.fromAyah} –{' '}
                {currentReadingDay.toAyah}) · مستوى الحفظ:{' '}
                {LEVEL_META[activePlan.level].label}
              </div>
              <h3 className="font-display text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA] mt-1">
                {activePlan.surahName}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => {
                setHideAllAyahs((h) => !h);
                setRevealedAyahNumbers([]);
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] dark:hover:bg-[#234B39] text-[#133A2A] dark:text-[#F7F3EA] text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {hideAllAyahs ? (
                <>
                  <Eye className="w-4 h-4" />
                  <span>إظهار جميع الآيات</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>إخفاء النص للتسميع</span>
                </>
              )}
            </button>
          </div>

          {ayahsLoading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-base text-[#6B6254]">
              <Loader2 className="w-5 h-5 animate-spin text-[#C69749]" />
              <span>جاري تحميل الآيات الكريمة بالرسم العثماني...</span>
            </div>
          ) : ayahsError ? (
            <div className="p-6 rounded-2xl bg-[#B84A39]/10 text-[#B84A39] dark:text-[#FCA5A5] space-y-3">
              <p>{ayahsError}</p>
              <button
                type="button"
                onClick={() => void ensureSurahAyahs(activePlan.surahNumber)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#133A2A] text-white text-sm font-bold cursor-pointer"
              >
                إعادة التحميل
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {readingAyahs.map((ayah) => {
                const isHidden =
                  hideAllAyahs && !revealedAyahNumbers.includes(ayah.numberInSurah);
                return (
                  <div
                    key={ayah.number}
                    onClick={() => {
                      if (isHidden) {
                        setRevealedAyahNumbers((prev) => [
                          ...prev,
                          ayah.numberInSurah,
                        ]);
                      }
                    }}
                    className={`p-5 rounded-2xl border transition-colors ${
                      isHidden
                        ? 'bg-[#EFE8D8] dark:bg-[#173326] border-dashed border-[#C69749] cursor-pointer'
                        : 'bg-[#F7F3EA] dark:bg-[#0F241A] border-[#E6DEC9] dark:border-[#224434]'
                    }`}
                  >
                    {isHidden ? (
                      <div className="flex items-center justify-between text-sm text-[#6B6254] dark:text-[#D6A954]">
                        <span className="font-bold tabular-nums">
                          الآية رقم ({ayah.numberInSurah}) — مخفية للتسميع
                        </span>
                        <span>اضغط للكشف والتحقق</span>
                      </div>
                    ) : (
                      <p
                        dir="rtl"
                        className={`font-quran ${
                          fontSizeClass === 'text-xl'
                            ? 'text-3xl leading-[2.5]'
                            : fontSizeClass === 'text-lg'
                            ? 'text-2xl leading-[2.4]'
                            : 'text-xl leading-[2.3]'
                        } text-[#1A2A22] dark:text-[#F7F3EA]`}
                      >
                        {ayah.text}{' '}
                        <span className="text-[#9C6F21] dark:text-[#D6A954] text-lg tabular-nums">
                          ﴿{ayah.numberInSurah}﴾
                        </span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Bar */}
          <div className="pt-4 border-t border-[#ECE4D4] dark:border-[#214232] flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void startPlanDayQuiz(currentReadingDay)}
                className="min-h-[48px] px-6 py-3 rounded-xl bg-[#C69749] hover:bg-[#B38538] text-[#133A2A] font-bold text-base inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <GraduationCap className="w-5 h-5" aria-hidden="true" />
                <span>بدء الاختبار المتدرج لهذا المقطع</span>
              </button>

              <button
                type="button"
                onClick={handleLogReadingSession}
                className="min-h-[48px] px-5 py-3 rounded-xl bg-[#133A2A] hover:bg-[#1B4D38] dark:bg-[#1F563F] text-[#F7F3EA] font-semibold text-sm inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>تسجيل إتمام القراءة</span>
              </button>
            </div>

            {readingLoggedToast && (
              <span className="text-sm font-bold text-[#1B6B46] dark:text-[#6EE7B7]">
                تم تسجيل إنجازك في جدول اليوم بنجاح
              </span>
            )}
          </div>
        </section>
      )}

      {/* VIEW 4: MEMORY-FIRST 11-TYPE QUIZ ENGINE + END REPORT */}
      {subView === 'quiz' && (
        <section className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 sm:p-8 space-y-6">
          {quizQuestions.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-base text-[#5C665E] dark:text-[#BFB6A4]">
                اختر مقطعاً من الجدول اليومي أو ابدأ الاختبار الشامل الذكي الموزّع على محفوظاتك.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setSubView('comprehensive')}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#C69749] text-[#133A2A] font-bold text-sm cursor-pointer"
                >
                  إعداد الاختبار الشامل الذكي
                </button>
                <button
                  type="button"
                  onClick={() => setSubView('schedule')}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#133A2A] text-[#F7F3EA] font-bold text-sm cursor-pointer"
                >
                  العودة إلى الجدول
                </button>
              </div>
            </div>
          ) : quizFinished ? (
            <QuizEndReportCard
              outcomes={quizOutcomes}
              plans={plans}
              sessionSaved={sessionSaved}
              onSaveSession={handleSaveQuizCompletion}
              onRetryMistakesNow={startMistakeReviewQuiz}
              onBackToSchedule={() => setSubView('schedule')}
            />
          ) : (
            currentQuestion && (
              <div className="space-y-6">
                {/* Quiz Progress Header with Surah, Ayah, Juz & Riwayah */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECE4D4] dark:border-[#214232] pb-4">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-[#9C6F21] dark:text-[#D6A954] tabular-nums">
                      {currentQuestion.surahName} · الآية ({currentQuestion.targetAyahNumber}
                      {currentQuestion.endAyahNumber &&
                      currentQuestion.endAyahNumber > currentQuestion.targetAyahNumber
                        ? `–${currentQuestion.endAyahNumber}`
                        : ''}
                      ) · الجزء ({currentQuestion.juzNumber}) · السؤال {quizIndex + 1} من{' '}
                      {quizQuestions.length}
                    </div>
                    <div className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
                      النوع: {currentQuestion.typeLabel} ·{' '}
                      {currentQuestion.riwayahLabel ?? 'رواية حفص عن عاصم'}
                      {currentQuestion.memorizationAgeLabel
                        ? ` · ${currentQuestion.memorizationAgeLabel}`
                        : ''}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-36 h-2 rounded-full bg-[#EFE8D8] dark:bg-[#193729] overflow-hidden">
                    <div
                      className="h-full bg-[#C69749] transition-all duration-300"
                      style={{
                        width: `${Math.round(
                          ((quizIndex + 1) / quizQuestions.length) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Question Prompt */}
                <div className="space-y-3">
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                    {currentQuestion.promptTitle}
                  </h3>
                  <div
                    dir="rtl"
                    className="p-5 sm:p-6 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E6DEC9] dark:border-[#224434] font-quran text-2xl sm:text-3xl leading-[2.45] text-[#1A2A22] dark:text-[#F7F3EA]"
                  >
                    {currentQuestion.promptBody}
                  </div>
                </div>

                {/* A. Mutashabihat & Discrimination Choice (Only authentic verses) */}
                {isChoiceQuestionType(currentQuestion.type) &&
                  currentQuestion.options && (
                    <div className="space-y-3">
                      {currentQuestion.options.map((opt, optIdx) => {
                        const isPicked = selectedOption === opt;
                        const isCorrectOpt =
                          opt === currentQuestion.correctAnswerText;
                        const refMeta =
                          currentQuestion.mutashabihOptions?.[optIdx];
                        let cardStyle =
                          'bg-[#FFFDF9] dark:bg-[#152E22] border-[#DFD6C5] dark:border-[#244736] hover:border-[#C69749]';

                        if (quizSubmitted) {
                          if (isCorrectOpt) {
                            cardStyle =
                              'bg-[#1B6B46]/15 border-[#1B6B46] text-[#133A2A] dark:text-[#6EE7B7]';
                          } else if (isPicked && !isCorrectOpt) {
                            cardStyle =
                              'bg-[#B84A39]/15 border-[#B84A39] text-[#B84A39] dark:text-[#FCA5A5]';
                          }
                        } else if (isPicked) {
                          cardStyle =
                            'bg-[#133A2A] text-[#F7F3EA] border-[#133A2A] dark:bg-[#C69749] dark:text-[#133A2A]';
                        }

                        return (
                          <button
                            key={opt}
                            type="button"
                            disabled={quizSubmitted}
                            onClick={() => setSelectedOption(opt)}
                            className={`w-full min-h-[54px] p-4 rounded-2xl border text-right font-quran text-xl sm:text-2xl leading-[2.35] transition-colors cursor-pointer ${cardStyle}`}
                          >
                            <div>{opt}</div>
                            {quizSubmitted && refMeta && (
                              <div className="text-xs font-sans font-bold opacity-80 mt-1.5">
                                المرجع الموثق: {refMeta.label} · الجزء {refMeta.juzNumber}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                {/* B. Order Ayahs */}
                {currentQuestion.type === 'order_ayahs' && (
                  <div className="space-y-3">
                    <div className="text-sm text-[#6B6254] dark:text-[#BFB6A4]">
                      استخدم أسهم الصعود والنزول لترتيب الآيات من الأولى إلى الأخيرة:
                    </div>
                    {orderList.map((item, idx) => {
                      const expectedNum =
                        currentQuestion.correctOrderNumbers?.[idx];
                      const isPosCorrect =
                        quizSubmitted && expectedNum === item.ayahNumber;
                      const isPosWrong =
                        quizSubmitted && expectedNum !== item.ayahNumber;

                      return (
                        <div
                          key={item.ayahNumber}
                          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                            isPosCorrect
                              ? 'bg-[#1B6B46]/15 border-[#1B6B46]'
                              : isPosWrong
                              ? 'bg-[#B84A39]/15 border-[#B84A39]'
                              : 'bg-[#F7F3EA] dark:bg-[#0F241A] border-[#DFD6C5] dark:border-[#244736]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="w-7 h-7 rounded-lg bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A] text-sm font-bold flex items-center justify-center shrink-0 tabular-nums mt-1">
                              {idx + 1}
                            </span>
                            <span
                              dir="rtl"
                              className="font-quran text-xl sm:text-2xl leading-[2.35]"
                            >
                              {item.text}
                            </span>
                          </div>

                          {!quizSubmitted && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveOrderItem(idx, -1)}
                                aria-label="تحريك للأعلى"
                                className="min-h-[44px] min-w-[44px] rounded-xl bg-[#EFE8D8] dark:bg-[#1B3A2C] flex items-center justify-center disabled:opacity-35 cursor-pointer"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === orderList.length - 1}
                                onClick={() => moveOrderItem(idx, 1)}
                                aria-label="تحريك للأسفل"
                                className="min-h-[44px] min-w-[44px] rounded-xl bg-[#EFE8D8] dark:bg-[#1B3A2C] flex items-center justify-center disabled:opacity-35 cursor-pointer"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* C. Spot Mistake Exercise (Identify mixed-up token & write right word) */}
                {currentQuestion.type === 'spot_mistake' &&
                  currentQuestion.spotMistake && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-[#F4EDE0] dark:bg-[#173326] space-y-3">
                        <div className="text-xs sm:text-sm font-bold text-[#9C6F21] dark:text-[#D6A954]">
                          نص تلاوة للمراجعة والتدقيق — ١) اضغط على الكلمة غير الموافقة للسورة:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {currentQuestion.spotMistake.practiceTokens.map(
                            (tok, idx) => {
                              const picked = spotSelectedTokenIdx === idx;
                              const isActualWrong =
                                idx ===
                                currentQuestion.spotMistake!.mistakenTokenIndex;
                              let btnCls =
                                'bg-[#FFFDF9] dark:bg-[#0F241A] border-[#DFD6C5] dark:border-[#244736]';
                              if (quizSubmitted) {
                                if (isActualWrong) {
                                  btnCls =
                                    'bg-[#B84A39]/20 border-[#B84A39] text-[#B84A39] dark:text-[#FCA5A5]';
                                }
                              } else if (picked) {
                                btnCls =
                                  'bg-[#133A2A] text-[#F7F3EA] border-[#133A2A] dark:bg-[#C69749] dark:text-[#133A2A]';
                              }
                              return (
                                <button
                                  key={`${tok}-${idx}`}
                                  type="button"
                                  disabled={quizSubmitted}
                                  onClick={() => setSpotSelectedTokenIdx(idx)}
                                  className={`min-h-[44px] px-3 py-1.5 rounded-xl border font-quran text-xl sm:text-2xl leading-[2.1] cursor-pointer ${btnCls}`}
                                >
                                  {tok}
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="spot-correction-input"
                          className="block text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]"
                        >
                          ٢) اكتب الكلمة الصحيحة التي توافق موضع {currentQuestion.surahName}:
                        </label>
                        <input
                          id="spot-correction-input"
                          type="text"
                          disabled={quizSubmitted}
                          value={spotCorrectionInput}
                          onChange={(e) => setSpotCorrectionInput(e.target.value)}
                          dir="rtl"
                          autoComplete="off"
                          spellCheck={false}
                          placeholder="اكتب الكلمة الصحيحة هنا..."
                          className="w-full min-h-[50px] px-4 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] font-quran text-2xl leading-[2.2]"
                        />
                      </div>
                    </div>
                  )}

                {/* D. Voice Recitation (In-Quiz Audio + Gemini Analysis) */}
                {currentQuestion.type === 'voice_recitation' && (
                  <QuizVoiceRecitationInput
                    surahName={currentQuestion.surahName}
                    fromAyah={currentQuestion.targetAyahNumber}
                    toAyah={
                      currentQuestion.endAyahNumber ??
                      currentQuestion.targetAyahNumber
                    }
                    referenceText={currentQuestion.correctAnswerText}
                    quizSubmitted={quizSubmitted}
                    onCompleteEvaluation={handleCompleteVoiceEvaluation}
                  />
                )}

                {/* E. All Writing & Recall from Memory Types */}
                {isTypedQuestionType(currentQuestion.type) && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label
                        htmlFor="memory-textarea"
                        className="text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]"
                      >
                        اكتب الإجابة من الذاكرة (بدون التزام بالتشكيل أو المسافات الزائدة أو علامات الوقف):
                      </label>
                      {currentQuestion.hintText && (
                        <button
                          type="button"
                          onClick={() => setShowHint((h) => !h)}
                          className="min-h-[36px] text-xs font-semibold text-[#9C6F21] dark:text-[#D6A954] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <HelpCircle className="w-4 h-4" />
                          <span>{showHint ? 'إخفاء التلميح' : 'تلميح بداية الموضع'}</span>
                        </button>
                      )}
                    </div>

                    {showHint && currentQuestion.hintText && (
                      <div
                        dir="rtl"
                        className="p-3.5 rounded-xl bg-[#F4EDE0] dark:bg-[#173326] font-quran text-xl leading-[2.3] text-[#133A2A] dark:text-[#D6A954]"
                      >
                        {currentQuestion.hintText}
                      </div>
                    )}

                    <textarea
                      id="memory-textarea"
                      dir="rtl"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      rows={
                        currentQuestion.correctAnswerText.split(/\s+/).length > 22
                          ? 6
                          : currentQuestion.type === 'complete_passage_write' ||
                            currentQuestion.type === 'free_recitation'
                          ? 5
                          : 4
                      }
                      disabled={quizSubmitted}
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      placeholder="اكتب الآيات الكريمة من ذاكرتك بلوحة المفاتيح العربية (لا يلزم إدخال الحركات والتشكيل)..."
                      className="w-full p-4 sm:p-5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] font-quran text-2xl sm:text-[26px] leading-[2.3] text-[#1A2A22] dark:text-[#F7F3EA] focus:outline-2 focus:outline-[#C69749] resize-y disabled:opacity-90"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B6254] dark:text-[#BFB6A4]">
                      <span className="tabular-nums">
                        الكلمات المكتوبة:{' '}
                        {typedAnswer.trim()
                          ? typedAnswer.trim().split(/\s+/).length
                          : 0}{' '}
                        كلمة
                        {!quizSubmitted && ' · يمكنك مراجعة كتابتك وتعديلها قبل الاعتماد'}
                      </span>
                      {!quizSubmitted && typedAnswer.trim().length > 0 && (
                        <button
                          type="button"
                          onClick={() => setTypedAnswer('')}
                          className="font-semibold text-[#9C6F21] dark:text-[#D6A954] hover:underline cursor-pointer"
                        >
                          مسح النص
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Grading Feedback, Word-by-Word Analysis, Retry & Verified Uthmani Text */}
                {quizSubmitted && (
                  <div
                    className={`rounded-2xl p-5 border space-y-4 ${
                      isCurrentCorrect
                        ? 'bg-[#1B6B46]/10 border-[#1B6B46]'
                        : 'bg-[#B84A39]/10 border-[#B84A39]'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        {isCurrentCorrect ? (
                          <CheckCircle2 className="w-6 h-6 text-[#1B6B46] dark:text-[#6EE7B7] shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-6 h-6 text-[#B84A39] dark:text-[#FCA5A5] shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-1.5">
                          <div className="font-bold text-base text-[#133A2A] dark:text-[#F7F3EA]">
                            {isCurrentCorrect
                              ? 'إجابة صحيحة! أحسنت وبارك الله في حفظك.'
                              : mistakePositionLabel || 'إجابة تحتاج لمراجعة'}
                          </div>

                          {!isCurrentCorrect && (
                            <p className="text-sm text-[#46524B] dark:text-[#E5DDCC]">
                              {mistakeExplanation}
                            </p>
                          )}

                          {isCurrentCorrect &&
                            currentQuestion.mutashabihDifferenceNote && (
                              <p className="text-xs sm:text-sm text-[#1B6B46] dark:text-[#6EE7B7]">
                                {currentQuestion.mutashabihDifferenceNote}
                              </p>
                            )}
                        </div>
                      </div>

                      {!isCurrentCorrect &&
                        currentQuestion.type !== 'voice_recitation' && (
                          <button
                            type="button"
                            onClick={handleRetryCurrentQuestion}
                            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] text-[#133A2A] dark:text-[#F7F3EA] text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>إعادة المحاولة</span>
                          </button>
                        )}
                    </div>

                    {/* Character-by-character & Word-by-word Comparison for Typed Questions */}
                    {isTypedQuestionType(currentQuestion.type) && memoryDiff && (
                      <AyahComparisonFeedback
                        comparison={memoryDiff.charComparison}
                        userRawInput={typedAnswer}
                      />
                    )}

                    {/* Exact Verified Full Ayah Reference (shown for non-typed questions or when full context differs from prompt answer) */}
                    {(!isTypedQuestionType(currentQuestion.type) ||
                      currentQuestion.fullAyahText !==
                        currentQuestion.correctAnswerText) && (
                      <div className="p-4 rounded-xl bg-[#FFFDF9] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] space-y-1">
                        <div className="text-xs font-bold text-[#9C6F21] dark:text-[#D6A954]">
                          النص القرآني الموثق كاملاً بالتشكيل ({currentQuestion.surahName} · آية{' '}
                          {currentQuestion.targetAyahNumber}):
                        </div>
                        <p
                          dir="rtl"
                          className="font-quran text-2xl sm:text-3xl leading-[2.45] text-[#1A2A22] dark:text-[#F7F3EA]"
                        >
                          {currentQuestion.fullAyahText}
                        </p>
                      </div>
                    )}

                    {!isCurrentCorrect && (
                      <div className="text-xs font-bold text-[#9C6F21] dark:text-[#D6A954] flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>
                          تمت إضافة هذا الموضع تلقائياً إلى جدول المراجعة القادمة والذاكرة الذكية
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Quiz Bottom Action Button */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  {!quizSubmitted ? (
                    currentQuestion.type !== 'voice_recitation' ? (
                      <button
                        type="button"
                        disabled={
                          isChoiceQuestionType(currentQuestion.type)
                            ? !selectedOption
                            : isTypedQuestionType(currentQuestion.type)
                            ? !typedAnswer.trim()
                            : currentQuestion.type === 'spot_mistake'
                            ? spotSelectedTokenIdx === null ||
                              !spotCorrectionInput.trim()
                            : false
                        }
                        onClick={handleSubmitQuizAnswer}
                        className="min-h-[48px] px-7 py-3 rounded-xl bg-[#C69749] hover:bg-[#B38538] disabled:opacity-45 disabled:cursor-not-allowed text-[#133A2A] font-bold text-base cursor-pointer"
                      >
                        تحقق من الإجابة
                      </button>
                    ) : (
                      <span className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
                        سجّل تلاوتك ثم اختر نتيجة التقييم أعلاه للمتابعة
                      </span>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      className="min-h-[48px] px-7 py-3 rounded-xl bg-[#133A2A] hover:bg-[#1B4D38] dark:bg-[#C69749] text-[#F7F3EA] dark:text-[#133A2A] font-bold text-base cursor-pointer"
                    >
                      {quizIndex + 1 < quizQuestions.length
                        ? 'السؤال التالي'
                        : 'عرض تقرير نهاية الاختبار'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSubView('schedule')}
                    className="min-h-[44px] px-4 text-sm font-semibold text-[#6B6254] dark:text-[#BFB6A4] hover:underline cursor-pointer"
                  >
                    إنهاء والعودة للجدول
                  </button>
                </div>
              </div>
            )
          )}
        </section>
      )}
    </div>
  );
};
