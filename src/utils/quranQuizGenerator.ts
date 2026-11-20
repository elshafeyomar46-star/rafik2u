import {
  VERIFIED_MUTASHABIHAT_GROUPS,
  VerifiedMutashabihGroup,
} from '../data/mutashabihatData';
import { getJuzNumberForSurahAyah } from '../data/quranMetadata';
import {
  DailyScheduleDay,
  MemorizationLevel,
  MemorizationPlan,
  MistakeQueueItem,
  QuranAyah,
  QuizDistributionWeights,
  QuizQuestion,
  QuizQuestionType,
  QuizScopeMode,
  SmartReviewMemory,
} from '../types';
import {
  compareAyahWithCharacterDiff,
  QuranCharComparisonResult,
} from './quranDiffEngine';

const BASMALAH_RAW = 'بسم الله الرحمن الرحيم';

const UTHMANI_ORTHOGRAPHY_EQUIVALENTS: Record<string, string> = {
  الرحمن: 'الرحمان',
  رحمن: 'رحمان',
  الشيطن: 'الشيطان',
  شيطن: 'شيطان',
  سبحن: 'سبحان',
  سبحنه: 'سبحانه',
  ابرهيم: 'ابراهيم',
  اسمعيل: 'اسماعيل',
  اسحق: 'اسحاق',
  هرون: 'هارون',
  سليمن: 'سليمان',
  عمرن: 'عمران',
  الصلحين: 'الصالحين',
  صلحين: 'صالحين',
  الصلحت: 'الصالحات',
  صلحت: 'صالحات',
  الظلمين: 'الظالمين',
  ظلمين: 'ظالمين',
  الكفرين: 'الكافرين',
  الكفرون: 'الكافرون',
  الصلوه: 'الصلاه',
  الزكوه: 'الزكاه',
  الحيوه: 'الحياه',
  الغدوه: 'الغداه',
  مشكوه: 'مشكاه',
  الربوا: 'الربا',
  سموت: 'سماوات',
  السموت: 'السماوات',
  سموته: 'سماواته',
  يايها: 'ياايها',
  هذان: 'هاذان',
  اولئك: 'اوليك',
  اليل: 'الليل',
  لئلا: 'لالا',
  ءامن: 'امن',
  ءامنوا: 'امنوا',
  قرءان: 'قران',
  القرءان: 'القران',
  داوود: 'داود',
};

/**
 * Normalizes Arabic text ONLY for lightweight word matching (never for display).
 * Preserves standalone hamza and distinct Arabic words (never merges مالك/ملك).
 */
export function normalizeArabicForComparison(input: string): string {
  const base = input
    .normalize('NFC')
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/ءا/g, 'ا')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[.,،؛؟!«»﴿﴾():\-–—\u06DD\u06DE]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!base) return '';

  return base
    .split(' ')
    .map((token) => UTHMANI_ORTHOGRAPHY_EQUIVALENTS[token] ?? token)
    .join(' ')
    .trim();
}

export function stripOptionalLeadingBasmalah(
  uthmaniText: string,
  surahNumber: number,
  ayahNumber: number
): string {
  if (surahNumber === 1 || surahNumber === 9 || ayahNumber !== 1) {
    return uthmaniText;
  }
  const words = uthmaniText.trim().split(/\s+/);
  if (words.length > 4) {
    const firstFourNorm = normalizeArabicForComparison(
      words.slice(0, 4).join(' ')
    );
    if (firstFourNorm === normalizeArabicForComparison(BASMALAH_RAW)) {
      return words.slice(4).join(' ').trim();
    }
  }
  return uthmaniText;
}

export function splitDisplayWords(uthmaniText: string): string[] {
  return uthmaniText
    .trim()
    .split(/\s+/)
    .filter((w) => {
      const cleaned = w.replace(/[\u06D6-\u06ED]/g, '').trim();
      return cleaned.length > 0;
    });
}

function deterministicShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = Math.abs(seed) + 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateDailySchedule(
  fromAyah: number,
  toAyah: number,
  ayahsPerDay: number,
  level: MemorizationLevel
): DailyScheduleDay[] {
  const safeFrom = Math.max(1, Math.min(fromAyah, toAyah));
  const safeTo = Math.max(safeFrom, toAyah);
  const step = Math.max(1, ayahsPerDay);
  const overlap = level === 'needs_review' && step >= 3 ? 1 : 0;

  const days: DailyScheduleDay[] = [];
  let cursor = safeFrom;
  let dayIdx = 1;

  while (cursor <= safeTo && dayIdx <= 120) {
    const end = Math.min(safeTo, cursor + step - 1);
    days.push({
      dayNumber: dayIdx,
      fromAyah: cursor,
      toAyah: end,
      completed: false,
    });
    if (end >= safeTo) break;
    cursor = end + 1 - overlap;
    if (cursor <= days[days.length - 1].fromAyah) {
      cursor = end + 1;
    }
    dayIdx += 1;
  }

  return days;
}

function getSurahPosition(
  ayahNum: number,
  totalAyahsInSurah: number
): 'beginning' | 'middle' | 'end' {
  if (totalAyahsInSurah <= 4) {
    if (ayahNum === 1) return 'beginning';
    if (ayahNum === totalAyahsInSurah) return 'end';
    return 'middle';
  }
  const ratio = ayahNum / totalAyahsInSurah;
  if (ratio <= 0.34) return 'beginning';
  if (ratio >= 0.67) return 'end';
  return 'middle';
}

function getLevelAgeLabel(level?: MemorizationLevel): string {
  if (level === 'mastered') return 'محفوظ قديم متقن';
  if (level === 'needs_review') return 'يحتاج مراجعة وتثبيت';
  return 'محفوظ جديد';
}

interface CandidateSlot {
  surahNumber: number;
  surahName: string;
  ayah: QuranAyah;
  allSurahAyahs: QuranAyah[];
  juzNumber: number;
  positionInSurah: 'beginning' | 'middle' | 'end';
  planLevel?: MemorizationLevel;
  priorityScore: number;
}

// ---------- Question Builders for all 11 Question Types ----------

function buildCompleteAyahWriteQuestion(slot: CandidateSlot): QuizQuestion | null {
  const cleanText = stripOptionalLeadingBasmalah(
    slot.ayah.text,
    slot.surahNumber,
    slot.ayah.numberInSurah
  );
  const words = splitDisplayWords(cleanText);
  if (words.length < 4) return null;

  const splitIdx = Math.max(2, Math.floor(words.length * 0.42));
  const startPart = words.slice(0, splitIdx).join(' ');
  const endPart = words.slice(splitIdx).join(' ');
  if (!endPart.trim()) return null;

  return {
    id: `q-caw-${slot.surahNumber}-${slot.ayah.numberInSurah}`,
    type: 'complete_ayah_write',
    difficulty: 'medium',
    difficultyLabel: 'استرجاع كتابي',
    typeLabel: 'كتابة تكملة الآية',
    surahNumber: slot.surahNumber,
    surahName: slot.surahName,
    targetAyahNumber: slot.ayah.numberInSurah,
    juzNumber: slot.juzNumber,
    riwayahLabel: 'رواية حفص عن عاصم',
    positionInSurah: slot.positionInSurah,
    memorizationAgeLabel: getLevelAgeLabel(slot.planLevel),
    promptTitle: `أكمل كتابة الآية رقم (${slot.ayah.numberInSurah}) من ${slot.surahName} من ذاكرتك`,
    promptBody: `${startPart} ...`,
    hintText: `تستأنف الآية بكلمة: «${words[splitIdx] ?? ''}» (بقية الآية ${words.length - splitIdx} كلمات)`,
    correctAnswerText: endPart,
    fullAyahText: cleanText,
  };
}

function buildNextAyahWriteQuestion(slot: CandidateSlot): QuizQuestion | null {
  const nextAyah = slot.allSurahAyahs.find(
    (a) => a.numberInSurah === slot.ayah.numberInSurah + 1
  );
  if (!nextAyah) return null;

  const currentClean = stripOptionalLeadingBasmalah(
    slot.ayah.text,
    slot.surahNumber,
    slot.ayah.numberInSurah
  );
  const nextClean = stripOptionalLeadingBasmalah(
    nextAyah.text,
    slot.surahNumber,
    nextAyah.numberInSurah
  );
  const nextWords = splitDisplayWords(nextClean);

  return {
    id: `q-naw-${slot.surahNumber}-${nextAyah.numberInSurah}`,
    type: 'next_ayah_write',
    difficulty: 'medium',
    difficultyLabel: 'ربط وتسلسل كتابي',
    typeLabel: 'كتابة الآية التالية',
    surahNumber: slot.surahNumber,
    surahName: slot.surahName,
    targetAyahNumber: nextAyah.numberInSurah,
    juzNumber:
      nextAyah.juz ??
      getJuzNumberForSurahAyah(slot.surahNumber, nextAyah.numberInSurah),
    riwayahLabel: 'رواية حفص عن عاصم',
    positionInSurah: slot.positionInSurah,
    memorizationAgeLabel: getLevelAgeLabel(slot.planLevel),
    promptTitle: `اكتب الآية التي تلي الآية رقم (${slot.ayah.numberInSurah}) في ${slot.surahName}`,
    promptBody: currentClean,
    hintText: `تبدأ الآية التالية بـ: «${nextWords.slice(0, 2).join(' ')}»`,
    correctAnswerText: nextClean,
    fullAyahText: nextClean,
    previousAyahText: currentClean,
  };
}

function buildPrevAyahWriteQuestion(slot: CandidateSlot): QuizQuestion | null {
  const prevAyah = slot.allSurahAyahs.find(
    (a) => a.numberInSurah === slot.ayah.numberInSurah - 1
  );
  if (!prevAyah) return null;

  const currentClean = stripOptionalLeadingBasmalah(
    slot.ayah.text,
    slot.surahNumber,
    slot.ayah.numberInSurah
  );
  const prevClean = stripOptionalLeadingBasmalah(
    prevAyah.text,
    slot.surahNumber,
    prevAyah.numberInSurah
  );
  const prevWords = splitDisplayWords(prevClean);

  return {
    id: `q-paw-${slot.surahNumber}-${prevAyah.numberInSurah}`,
    type: 'prev_ayah_write',
    difficulty: 'hard',
    difficultyLabel: 'استرجاع عكسي',
    typeLabel: 'كتابة الآية السابقة',
    surahNumber: slot.surahNumber,
    surahName: slot.surahName,
    targetAyahNumber: prevAyah.numberInSurah,
    juzNumber:
      prevAyah.juz ??
      getJuzNumberForSurahAyah(slot.surahNumber, prevAyah.numberInSurah),
    riwayahLabel: 'رواية حفص عن عاصم',
    positionInSurah: slot.positionInSurah,
    memorizationAgeLabel: getLevelAgeLabel(slot.planLevel),
    promptTitle: `اكتب الآية التي تسبق الآية رقم (${slot.ayah.numberInSurah}) في ${slot.surahName}`,
    promptBody: currentClean,
    hintText: `تبدأ الآية السابقة بـ: «${prevWords.slice(0, 2).join(' ')}»`,
    correctAnswerText: prevClean,
    fullAyahText: prevClean,
  };
}

function buildWrittenRecitationQuestion(slot: CandidateSlot): QuizQuestion {
  const cleanText = stripOptionalLeadingBasmalah(
    slot.ayah.text,
    slot.surahNumber,
    slot.ayah.numberInSurah
  );
  const words = splitDisplayWords(cleanText);
  return {
    id: `q-wr-${slot.surahNumber}-${slot.ayah.numberInSurah}`,
    type: 'written_recitation',
    difficulty: 'hard',
    difficultyLabel: 'تسميع كتابي كامل',
    typeLabel: 'التسميع الكتابي',
    surahNumber: slot.surahNumber,
    surahName: slot.surahName,
    targetAyahNumber: slot.ayah.numberInSurah,
    juzNumber: slot.juzNumber,
    riwayahLabel: 'رواية حفص عن عاصم',
    positionInSurah: slot.positionInSurah,
    memorizationAgeLabel: getLevelAgeLabel(slot.planLevel),
    promptTitle: `سمّع كتابةً الآية رقم (${slot.ayah.numberInSurah}) من ${slot.surahName}`,
    promptBody: `${slot.surahName} · الآية رقم (${slot.ayah.numberInSurah}) · الجزء (${slot.juzNumber})`,
    hintText: `أول كلمتين في الآية: «${words.slice(0, Math.min(2, words.length)).join(' ')}»`,
    correctAnswerText: cleanText,
    fullAyahText: cleanText,
  };
}

function buildCompletePassageWriteQuestion(
  slot: CandidateSlot
): QuizQuestion | null {
  const next1 = slot.allSurahAyahs.find(
    (a) => a.numberInSurah === slot.ayah.numberInSurah + 1
  );
  const next2 = slot.allSurahAyahs.find(
    (a) => a.numberInSurah === slot.ayah.numberInSurah + 2
  );
  if (!next1 || !next2) return null;

  const startClean = stripOptionalLeadingBasmalah(
    slot.ayah.text,
    slot.surahNumber,
    slot.ayah.numberInSurah
  );
  const n1Clean = stripOptionalLeadingBasmalah(
    next1.text,
    slot.surahNumber,
    next1.numberInSurah
  );
  const n2Clean = stripOptionalLeadingBasmalah(
    next2.text,
    slot.surahNumber,
    next2.numberInSurah
  );
  const targetCombined = `${n1Clean} ${n2Clean}`;
  const firstWords = splitDisplayWords(n1Clean);

  return {
    id: `q-cpw-${slot.surahNumber}-${slot.ayah.numberInSurah}`,
    type: 'complete_passage_write',
    difficulty: 'hard',
    difficultyLabel: 'ربط مقطع قرآني',
    typeLabel: 'إكمال مقطع قرآني',
    surahNumber: slot.surahNumber,
    surahName: slot.surahName,
    targetAyahNumber: next1.numberInSurah,
    endAyahNumber: next2.numberInSurah,
    juzNumber: slot.juzNumber,
    riwayahLabel: 'رواية حفص عن عاصم',
    positionInSurah: slot.positionInSurah,
    memorizationAgeLabel: getLevelAgeLabel(slot.planLevel),
    promptTitle: `أكمل كتابة الآيتين (${next1.numberInSurah} و${next2.numberInSurah}) بعد هذا الموضع من ${slot.surahName}`,
    promptBody: startClean,
    hintText: `تبدأ الآية (${next1.numberInSurah}) بـ: «${firstWords.slice(0, 2).join(' ')}»`,
    correctAnswerText: targetCombined,
    fullAyahText: `(${next1.numberInSurah}) ${n1Clean} ۝ (${next2.numberInSurah}) ${n2Clean}`,
    previousAyahText: startClean,
  };
}

function buildResumeFromStopQuestion(slot: CandidateSlot): QuizQuestion | null {
  const cleanText = stripOptionalLeadingBasmalah(
    slot.ayah.text,
    slot.surahNumber,
    slot.ayah.numberInSurah
  );
  const words = splitDisplayWords(cleanText);
  if (words.length >= 6) {
    const midIdx = Math.floor(words.length / 2);
    const stopSnippet = words.slice(Math.max(0, midIdx - 3), midIdx).join(' ');
    const remaining = words.slice(midIdx).join(' ');
    if (remaining.trim().length > 0) {
      return {
        id: `q-rfs-${slot.surahNumber}-${slot.ayah.numberInSurah}`,
        type: 'resume_from_stop',
        difficulty: 'hard',
        difficultyLabel: 'استئناف من موضع وقف',
        typeLabel: 'أكمل من موضع التوقف',
        surahNumber: slot.surahNumber,
        surahName: slot.surahName,
        targetAyahNumber: slot.ayah.numberInSurah,
        juzNumber: slot.juzNumber,
        riwayahLabel: 'رواية حفص عن عاصم',
        positionInSurah: slot.positionInSurah,
        memorizationAgeLabel: getLevelAgeLabel(slot.planLevel),
        promptTitle: `استكمل كتابة الآية رقم (${slot.ayah.numberInSurah}) من ${slot.surahName} بدءاً من موضع التوقف`,
        promptBody: `... ${stopSnippet} [توقّف هنا]`,
        hintText: `الكلمة التي تلي موضع التوقف مباشرة هي: «${words[midIdx]}»`,
        correctAnswerText: remaining,
        fullAyahText: cleanText,
      };
    }
  }
  return buildNextAyahWriteQuestion(slot);
}

function buildFreeRecitationQuestion(slot: CandidateSlot): QuizQuestion {
  const next1 = slot.allSurahAyahs.find(
    (a) => a.numberInSurah === slot.ayah.numberInSurah + 1
  );
  const a1Clean = stripOptionalLeadingBasmalah(
    slot.ayah.text,
    slot.surahNumber,
    slot.ayah.numberInSurah
  );
  const passageAyahs = next1
    ? [
        a1Clean,
        stripOptionalLeadingBasmalah(
          next1.text,
          slot.surahNumber,
          next1.numberInSurah
        ),
      ]
    : [a1Clean];

  const endNum = next1 ? next1.numberInSurah : slot.ayah.numberInSurah;
  const targetText = passageAyahs.join(' ');
  const fullFormatted = next1
    ? `(${slot.ayah.numberInSurah}) ${a1Clean} ۝ (${next1.numberInSurah}) ${passageAyahs[1]}`
    : a1Clean;

  return {
    id: `q-free-${slot.surahNumber}-${slot.ayah.numberInSurah}-${endNum}`,
    type: 'free_recitation',
    difficulty: 'hard',
    difficultyLabel: 'تسميع حر من الذاكرة',
    typeLabel: 'التسميع الحر',
    surahNumber: slot.surahNumber,
    surahName: slot.surahName,
    targetAyahNumber: slot.ayah.numberInSurah,
    endAyahNumber: endNum,
    juzNumber: slot.juzNumber,
    riwayahLabel: 'رواية حفص عن عاصم',
    positionInSurah: slot.positionInSurah,
    memorizationAgeLabel: getLevelAgeLabel(slot.planLevel),
    promptTitle:
      endNum > slot.ayah.numberInSurah
        ? `التسميع الحر: سمّع من الآية (${slot.ayah.numberInSurah}) إلى (${endNum}) من ${slot.surahName} دون ظهور النص`
        : `التسميع الحر: سمّع الآية (${slot.ayah.numberInSurah}) من ${slot.surahName} دون ظهور النص`,
    promptBody: `${slot.surahName} · الجزء (${slot.juzNumber}) · النطاق المطلوب: (${slot.ayah.numberInSurah}${endNum > slot.ayah.numberInSurah ? ` – ${endNum}` : ''})`,
    hintText: `أول كلمة: «${splitDisplayWords(a1Clean)[0] ?? ''}»`,
    correctAnswerText: targetText,
    fullAyahText: fullFormatted,
  };
}

function buildVoiceRecitationQuestion(slot: CandidateSlot): QuizQuestion {
  const next1 = slot.allSurahAyahs.find(
    (a) => a.numberInSurah === slot.ayah.numberInSurah + 1
  );
  const a1Clean = stripOptionalLeadingBasmalah(
    slot.ayah.text,
    slot.surahNumber,
    slot.ayah.numberInSurah
  );
  const passage = next1
    ? `${a1Clean} ${stripOptionalLeadingBasmalah(next1.text, slot.surahNumber, next1.numberInSurah)}`
    : a1Clean;
  const endNum = next1 ? next1.numberInSurah : slot.ayah.numberInSurah;

  return {
    id: `q-voice-${slot.surahNumber}-${slot.ayah.numberInSurah}-${endNum}`,
    type: 'voice_recitation',
    difficulty: 'medium',
    difficultyLabel: 'تسميع صوتي',
    typeLabel: 'التسميع الصوتي',
    surahNumber: slot.surahNumber,
    surahName: slot.surahName,
    targetAyahNumber: slot.ayah.numberInSurah,
    endAyahNumber: endNum,
    juzNumber: slot.juzNumber,
    riwayahLabel: 'رواية حفص عن عاصم',
    positionInSurah: slot.positionInSurah,
    memorizationAgeLabel: getLevelAgeLabel(slot.planLevel),
    promptTitle:
      endNum > slot.ayah.numberInSurah
        ? `اقرأ بصوتك من الآية (${slot.ayah.numberInSurah}) إلى (${endNum}) من ${slot.surahName}`
        : `اقرأ بصوتك الآية رقم (${slot.ayah.numberInSurah}) من ${slot.surahName}`,
    promptBody: `${slot.surahName} · الآية (${slot.ayah.numberInSurah}${endNum > slot.ayah.numberInSurah ? `–${endNum}` : ''}) · الجزء (${slot.juzNumber}) — سجّل تلاوتك للمقارنة الذكية`,
    hintText: `تبدأ التلاوة بـ: «${splitDisplayWords(a1Clean).slice(0, 2).join(' ')}»`,
    correctAnswerText: passage,
    fullAyahText: next1
      ? `(${slot.ayah.numberInSurah}) ${a1Clean} ۝ (${next1.numberInSurah}) ${stripOptionalLeadingBasmalah(next1.text, slot.surahNumber, next1.numberInSurah)}`
      : a1Clean,
  };
}

function buildOrderAyahsQuestion(slot: CandidateSlot): QuizQuestion | null {
  const idx = slot.allSurahAyahs.findIndex(
    (a) => a.numberInSurah === slot.ayah.numberInSurah
  );
  if (idx < 0) return null;
  const startIdx = Math.max(0, Math.min(idx, slot.allSurahAyahs.length - 3));
  const slice = slot.allSurahAyahs.slice(startIdx, startIdx + 3);
  if (slice.length < 2) return null;

  let shuffled = deterministicShuffle(
    slice.map((a) => ({
      ayahNumber: a.numberInSurah,
      text: stripOptionalLeadingBasmalah(a.text, slot.surahNumber, a.numberInSurah),
    })),
    slot.surahNumber * 41 + slot.ayah.numberInSurah
  );
  if (shuffled.every((item, i) => item.ayahNumber === slice[i].numberInSurah)) {
    shuffled = [shuffled[1], shuffled[0], ...shuffled.slice(2)];
  }

  return {
    id: `q-ord-${slot.surahNumber}-${slice[0].numberInSurah}`,
    type: 'order_ayahs',
    difficulty: 'medium',
    difficultyLabel: 'ترتيب وتسلسل',
    typeLabel: 'ترتيب الآيات',
    surahNumber: slot.surahNumber,
    surahName: slot.surahName,
    targetAyahNumber: slice[0].numberInSurah,
    endAyahNumber: slice[slice.length - 1].numberInSurah,
    juzNumber: slot.juzNumber,
    riwayahLabel: 'رواية حفص عن عاصم',
    positionInSurah: slot.positionInSurah,
    memorizationAgeLabel: getLevelAgeLabel(slot.planLevel),
    promptTitle: `رتّب الآيات التالية حسب تسلسلها الصحيح في ${slot.surahName}`,
    promptBody: `من الآية (${slice[0].numberInSurah}) إلى الآية (${slice[slice.length - 1].numberInSurah})`,
    orderedItems: shuffled,
    correctOrderNumbers: slice.map((a) => a.numberInSurah),
    correctAnswerText: slice.map((a) => a.text).join(' ۝ '),
    fullAyahText: slice
      .map(
        (a) =>
          `(${a.numberInSurah}) ${stripOptionalLeadingBasmalah(a.text, slot.surahNumber, a.numberInSurah)}`
      )
      .join(' — '),
  };
}

function buildSpotMistakeQuestion(slot: CandidateSlot): QuizQuestion | null {
  const cleanText = stripOptionalLeadingBasmalah(
    slot.ayah.text,
    slot.surahNumber,
    slot.ayah.numberInSurah
  );
  const words = splitDisplayWords(cleanText);
  if (words.length < 4) return null;

  const targetIdx = Math.min(words.length - 1, Math.max(1, Math.floor(words.length / 2)));
  const correctWord = words[targetIdx];
  const correctNorm = normalizeArabicForComparison(correctWord);

  // Pick a genuine real Quranic word from ANOTHER ayah in the same Surah to simulate a student mix-up
  const otherAyahs = deterministicShuffle(
    slot.allSurahAyahs.filter((a) => a.numberInSurah !== slot.ayah.numberInSurah),
    slot.ayah.numberInSurah * 19
  );
  let replacementWord: string | null = null;
  let replacementSourceAyah = 0;

  for (const other of otherAyahs) {
    const otherClean = stripOptionalLeadingBasmalah(
      other.text,
      slot.surahNumber,
      other.numberInSurah
    );
    const otherWords = splitDisplayWords(otherClean);
    const candidate = otherWords.find((w) => {
      const n = normalizeArabicForComparison(w);
      return n.length >= 3 && n !== correctNorm;
    });
    if (candidate) {
      replacementWord = candidate;
      replacementSourceAyah = other.numberInSurah;
      break;
    }
  }

  if (!replacementWord) return null;

  const practiceTokens = [...words];
  practiceTokens[targetIdx] = replacementWord;

  return {
    id: `q-spot-${slot.surahNumber}-${slot.ayah.numberInSurah}`,
    type: 'spot_mistake',
    difficulty: 'medium',
    difficultyLabel: 'تدقيق واكتشاف الخطأ',
    typeLabel: 'اكتشاف موضع الخطأ',
    surahNumber: slot.surahNumber,
    surahName: slot.surahName,
    targetAyahNumber: slot.ayah.numberInSurah,
    juzNumber: slot.juzNumber,
    riwayahLabel: 'رواية حفص عن عاصم',
    positionInSurah: slot.positionInSurah,
    memorizationAgeLabel: getLevelAgeLabel(slot.planLevel),
    promptTitle: `تمرين تدقيق: خلط طالبٌ لفظاً من موضع آخر أثناء تلاوة الآية (${slot.ayah.numberInSurah}) من ${slot.surahName}`,
    promptBody: `اضغط على الكلمة التي لا توافق الآية رقم (${slot.ayah.numberInSurah}) في سورة ${slot.surahName} ثم اكتب الكلمة الصحيحة:`,
    spotMistake: {
      practiceTokens,
      mistakenTokenIndex: targetIdx,
      mixedUpWord: replacementWord,
      correctWord,
      mixupSourceNote: `دخل لفظ «${replacementWord}» من الآية (${replacementSourceAyah}) خطأً مكان «${correctWord}» في الآية (${slot.ayah.numberInSurah}).`,
    },
    correctAnswerText: correctWord,
    fullAyahText: cleanText,
  };
}

function buildMutashabihatChoiceQuestion(
  slot: CandidateSlot | null,
  group: VerifiedMutashabihGroup | null,
  seed: number,
  allowedSurahSet: Set<number> | null = null
): QuizQuestion | null {
  // Case A: Verified cross-surah / within-surah Mutashabih group
  if (group && group.references.length >= 2) {
    const candidateTargets = allowedSurahSet
      ? group.references.filter((r) => allowedSurahSet.has(r.surahNumber))
      : group.references;
    if (candidateTargets.length > 0) {
      const targetRef = candidateTargets[seed % candidateTargets.length];
      const shuffledRefs = deterministicShuffle(group.references, seed * 17);
    return {
      id: `q-mut-${group.id}-${targetRef.surahNumber}-${targetRef.ayahNumber}`,
      type: 'mutashabihat_review',
      difficulty: 'hard',
      difficultyLabel: 'تمييز المتشابهات',
      typeLabel: 'مراجعة الآيات المتشابهة',
      surahNumber: targetRef.surahNumber,
      surahName: targetRef.label.split('·')[0]?.trim() || 'موضع متشابه',
      targetAyahNumber: targetRef.ayahNumber,
      juzNumber: targetRef.juzNumber,
      riwayahLabel: 'رواية حفص عن عاصم',
      promptTitle: `تمييز المتشابهات: أيّ الآيات الموثقة التالية هي الواردة تحديداً في ${targetRef.label}؟`,
      promptBody: `${group.title} — جميع الخيارات آيات قرآنية صحيحة من مواضع متشابهة في المصحف:`,
      options: shuffledRefs.map((r) => r.verifiedText),
      mutashabihOptions: shuffledRefs,
      mutashabihDifferenceNote: group.differenceNote,
      mutashabihPairId: group.id,
      correctAnswerText: targetRef.verifiedText,
      fullAyahText: targetRef.verifiedText,
    };
    }
  }

  // Case B: Similar openings/endings strictly among authentic ayahs of the user's memorized Surah
  if (!slot) return null;
  const targetClean = stripOptionalLeadingBasmalah(
    slot.ayah.text,
    slot.surahNumber,
    slot.ayah.numberInSurah
  );
  const otherAyahs = deterministicShuffle(
    slot.allSurahAyahs.filter((a) => a.numberInSurah !== slot.ayah.numberInSurah),
    slot.ayah.numberInSurah * 31 + seed
  ).slice(0, 2);

  if (otherAyahs.length === 0) return null;

  const refs = deterministicShuffle(
    [
      {
        label: `${slot.surahName} · الآية ${slot.ayah.numberInSurah}`,
        surahNumber: slot.surahNumber,
        ayahNumber: slot.ayah.numberInSurah,
        juzNumber: slot.juzNumber,
        verifiedText: targetClean,
      },
      ...otherAyahs.map((a) => ({
        label: `${slot.surahName} · الآية ${a.numberInSurah}`,
        surahNumber: slot.surahNumber,
        ayahNumber: a.numberInSurah,
        juzNumber:
          a.juz ?? getJuzNumberForSurahAyah(slot.surahNumber, a.numberInSurah),
        verifiedText: stripOptionalLeadingBasmalah(
          a.text,
          slot.surahNumber,
          a.numberInSurah
        ),
      })),
    ],
    seed * 23
  );

  return {
    id: `q-mut-local-${slot.surahNumber}-${slot.ayah.numberInSurah}`,
    type: 'mutashabihat_review',
    difficulty: 'medium',
    difficultyLabel: 'تمييز المواضع',
    typeLabel: 'مراجعة الآيات المتشابهة',
    surahNumber: slot.surahNumber,
    surahName: slot.surahName,
    targetAyahNumber: slot.ayah.numberInSurah,
    juzNumber: slot.juzNumber,
    riwayahLabel: 'رواية حفص عن عاصم',
    positionInSurah: slot.positionInSurah,
    memorizationAgeLabel: getLevelAgeLabel(slot.planLevel),
    promptTitle: `حدّد الآية الكريمة الواردة في ${slot.surahName} · الآية رقم (${slot.ayah.numberInSurah})`,
    promptBody: 'جميع الخيارات آيات صحيحة وموثقة من السورة، ميّز الموضع المطلوب بدقة:',
    options: refs.map((r) => r.verifiedText),
    mutashabihOptions: refs,
    mutashabihDifferenceNote: `الآية رقم (${slot.ayah.numberInSurah}) في ${slot.surahName} تبدأ بـ«${splitDisplayWords(targetClean).slice(0, 2).join(' ')}» وتُختم بـ«${splitDisplayWords(targetClean).slice(-2).join(' ')}».`,
    correctAnswerText: targetClean,
    fullAyahText: targetClean,
  };
}

// ---------- Daily Schedule Quick Quiz (Upgraded to Memory-First!) ----------

export function generateProgressiveQuiz(
  surahNumber: number,
  surahName: string,
  allSurahAyahs: QuranAyah[],
  fromAyah: number,
  toAyah: number
): QuizQuestion[] {
  const rangeAyahs = allSurahAyahs.filter(
    (a) => a.numberInSurah >= fromAyah && a.numberInSurah <= toAyah
  );
  if (rangeAyahs.length === 0) return [];

  const toSlot = (a: QuranAyah): CandidateSlot => ({
    surahNumber,
    surahName,
    ayah: a,
    allSurahAyahs,
    juzNumber: a.juz ?? getJuzNumberForSurahAyah(surahNumber, a.numberInSurah),
    positionInSurah: getSurahPosition(a.numberInSurah, allSurahAyahs.length),
    priorityScore: 1,
  });

  const questions: QuizQuestion[] = [];
  const firstSlot = toSlot(rangeAyahs[0]);
  const midSlot = toSlot(rangeAyahs[Math.floor(rangeAyahs.length / 2)]);
  const lastSlot = toSlot(rangeAyahs[rangeAyahs.length - 1]);

  // Primarily writing & recall (matching 70 / 20 / 10 philosophy)
  const q1 = buildCompleteAyahWriteQuestion(firstSlot);
  if (q1) questions.push(q1);

  const q2 = buildNextAyahWriteQuestion(firstSlot);
  if (q2) questions.push(q2);

  const q3 = buildOrderAyahsQuestion(midSlot);
  if (q3) questions.push(q3);

  const q4 = buildSpotMistakeQuestion(midSlot);
  if (q4) questions.push(q4);

  const q5 = buildWrittenRecitationQuestion(lastSlot);
  questions.push(q5);

  return questions;
}

// ---------- Multi-Surah / Multi-Juz Smart Diverse Quiz Engine ----------

export interface SmartComprehensiveQuizParams {
  scopeMode: QuizScopeMode;
  plans: MemorizationPlan[];
  ayahsBySurah: Record<number, QuranAyah[]>;
  surahNamesMap: Record<number, string>;
  selectedJuz: number[];
  selectedSurahNumbers: number[];
  specificRange: { surahNumber: number; fromAyah: number; toAyah: number } | null;
  questionCount: number;
  weights: QuizDistributionWeights;
  smartMemory: SmartReviewMemory;
  mistakeQueue: MistakeQueueItem[];
  seed?: number;
}

export function generateSmartComprehensiveQuiz(
  params: SmartComprehensiveQuizParams
): QuizQuestion[] {
  const {
    scopeMode,
    plans,
    ayahsBySurah,
    surahNamesMap,
    selectedJuz,
    selectedSurahNumbers,
    specificRange,
    questionCount,
    weights,
    smartMemory,
    mistakeQueue,
    seed = Date.now(),
  } = params;

  const recentSet = new Set(smartMemory.recentQuestionIds);
  const mistakeKeyCounts = new Map<string, number>();
  for (const m of mistakeQueue) {
    const key = `${m.surahNumber}:${m.targetAyahNumber}`;
    mistakeKeyCounts.set(key, (mistakeKeyCounts.get(key) ?? 0) + m.attempts);
  }

  // 1. Collect eligible slots strictly respecting memorized scope (unless full_quran)
  const rawSlots: CandidateSlot[] = [];

  if (scopeMode === 'full_quran') {
    for (const [sNumStr, ayahs] of Object.entries(ayahsBySurah)) {
      const sNum = Number(sNumStr);
      if (!ayahs || ayahs.length === 0) continue;
      const sName = surahNamesMap[sNum] ?? `سورة ${sNum}`;
      // Sample beginning, middle, and end ayahs from each loaded Surah
      const sampleIndices = Array.from(
        new Set([
          0,
          Math.floor(ayahs.length * 0.25),
          Math.floor(ayahs.length * 0.5),
          Math.floor(ayahs.length * 0.75),
          ayahs.length - 1,
        ])
      );
      for (const idx of sampleIndices) {
        const a = ayahs[idx];
        if (!a) continue;
        const juz = a.juz ?? getJuzNumberForSurahAyah(sNum, a.numberInSurah);
        const key = `${sNum}:${a.numberInSurah}`;
        const stat = smartMemory.ayahStats[key];
        const mCount = (mistakeKeyCounts.get(key) ?? 0) + (stat?.mistakeCount ?? 0);
        rawSlots.push({
          surahNumber: sNum,
          surahName: sName,
          ayah: a,
          allSurahAyahs: ayahs,
          juzNumber: juz,
          positionInSurah: getSurahPosition(a.numberInSurah, ayahs.length),
          priorityScore: 10 + mCount * 8 - (stat?.correctCount ?? 0),
        });
      }
    }
  } else {
    // Strictly inside user's memorized plans
    const allowedPlans = plans.filter((p) => {
      if (scopeMode === 'specific_surahs' && selectedSurahNumbers.length > 0) {
        return selectedSurahNumbers.includes(p.surahNumber);
      }
      if (scopeMode === 'specific_ayahs' && specificRange) {
        return p.surahNumber === specificRange.surahNumber;
      }
      return true;
    });

    for (const plan of allowedPlans) {
      const allAyahs = ayahsBySurah[plan.surahNumber];
      if (!allAyahs || allAyahs.length === 0) continue;

      const fromBound =
        scopeMode === 'specific_ayahs' && specificRange
          ? Math.max(plan.fromAyah, specificRange.fromAyah)
          : plan.fromAyah;
      const toBound =
        scopeMode === 'specific_ayahs' && specificRange
          ? Math.min(plan.toAyah, specificRange.toAyah)
          : plan.toAyah;

      for (const ayah of allAyahs) {
        if (ayah.numberInSurah < fromBound || ayah.numberInSurah > toBound) {
          continue;
        }
        const juz =
          ayah.juz ?? getJuzNumberForSurahAyah(plan.surahNumber, ayah.numberInSurah);
        if (
          scopeMode === 'specific_juz' &&
          selectedJuz.length > 0 &&
          !selectedJuz.includes(juz)
        ) {
          continue;
        }

        const key = `${plan.surahNumber}:${ayah.numberInSurah}`;
        const stat = smartMemory.ayahStats[key];
        const mCount = (mistakeKeyCounts.get(key) ?? 0) + (stat?.mistakeCount ?? 0);
        const daysSinceReview = stat?.lastReviewedAt
          ? (Date.now() - new Date(stat.lastReviewedAt).getTime()) /
            (1000 * 60 * 60 * 24)
          : 14;
        const levelBoost =
          plan.level === 'needs_review' ? 6 : plan.level === 'new' ? 4 : 2;

        rawSlots.push({
          surahNumber: plan.surahNumber,
          surahName: plan.surahName,
          ayah,
          allSurahAyahs: allAyahs,
          juzNumber: juz,
          positionInSurah: getSurahPosition(ayah.numberInSurah, allAyahs.length),
          planLevel: plan.level,
          priorityScore:
            mCount * 10 +
            Math.min(10, daysSinceReview) +
            levelBoost -
            (stat?.mastered ? 3 : 0),
        });
      }
    }
  }

  if (rawSlots.length === 0) return [];

  // 2. Round-robin diversify across Surahs, Juz, and Surah positions (scattered, non-consecutive)
  const bySurah = new Map<number, CandidateSlot[]>();
  for (const s of rawSlots) {
    const arr = bySurah.get(s.surahNumber) ?? [];
    arr.push(s);
    bySurah.set(s.surahNumber, arr);
  }

  // Sort each Surah's slots by priority + deterministic scattered shuffle across positions
  for (const [sNum, arr] of bySurah.entries()) {
    const shuffled = deterministicShuffle(arr, seed + sNum * 13);
    shuffled.sort((a, b) => b.priorityScore - a.priorityScore);
    bySurah.set(sNum, shuffled);
  }

  const diversePool: CandidateSlot[] = [];
  const surahQueues = deterministicShuffle(Array.from(bySurah.values()), seed);
  let stillHasItems = true;
  while (stillHasItems && diversePool.length < Math.max(questionCount * 3, 24)) {
    stillHasItems = false;
    for (const q of surahQueues) {
      if (q.length > 0) {
        const picked = q.shift()!;
        diversePool.push(picked);
        stillHasItems = true;
      }
    }
  }

  // 3. Determine bucket targets based on configurable weights (70% write / 20% recitation+recall / 10% mutashabihat)
  const totalWeight = Math.max(
    1,
    weights.writingPct + weights.recitationAndRecallPct + weights.mutashabihatChoicePct
  );
  let mutCount =
    weights.mutashabihatChoicePct > 0
      ? Math.max(1, Math.round((questionCount * weights.mutashabihatChoicePct) / totalWeight))
      : 0;
  let recallCount =
    weights.recitationAndRecallPct > 0
      ? Math.max(1, Math.round((questionCount * weights.recitationAndRecallPct) / totalWeight))
      : 0;
  let writeCount = Math.max(1, questionCount - mutCount - recallCount);
  while (writeCount + recallCount + mutCount > questionCount) {
    if (writeCount > 1) writeCount -= 1;
    else if (recallCount > 0) recallCount -= 1;
    else mutCount -= 1;
  }

  const writingTypes: QuizQuestionType[] = [
    'complete_ayah_write',
    'next_ayah_write',
    'written_recitation',
    'resume_from_stop',
    'prev_ayah_write',
    'complete_passage_write',
    'free_recitation',
  ];
  const recallTypes: QuizQuestionType[] = [
    'voice_recitation',
    'spot_mistake',
    'order_ayahs',
  ];

  // Eligible Mutashabihat groups matching memorized Surahs (or all if full_quran)
  const memorizedSurahSet = new Set(diversePool.map((s) => s.surahNumber));
  const eligibleMutGroups = VERIFIED_MUTASHABIHAT_GROUPS.filter(
    (g) =>
      scopeMode === 'full_quran' ||
      g.references.some((r) => memorizedSurahSet.has(r.surahNumber))
  );

  const generated: QuizQuestion[] = [];
  const usedIds = new Set<string>();
  const usedAyahKeys = new Set<string>();

  const tryCreateForType = (
    slot: CandidateSlot,
    type: QuizQuestionType,
    idxSeed: number
  ): QuizQuestion | null => {
    switch (type) {
      case 'complete_ayah_write':
        return buildCompleteAyahWriteQuestion(slot);
      case 'next_ayah_write':
        return buildNextAyahWriteQuestion(slot);
      case 'prev_ayah_write':
        return buildPrevAyahWriteQuestion(slot);
      case 'written_recitation':
        return buildWrittenRecitationQuestion(slot);
      case 'complete_passage_write':
        return buildCompletePassageWriteQuestion(slot);
      case 'free_recitation':
        return buildFreeRecitationQuestion(slot);
      case 'resume_from_stop':
        return buildResumeFromStopQuestion(slot);
      case 'order_ayahs':
        return buildOrderAyahsQuestion(slot);
      case 'voice_recitation':
        return buildVoiceRecitationQuestion(slot);
      case 'spot_mistake':
        return buildSpotMistakeQuestion(slot);
      case 'mutashabihat_review': {
        const group =
          eligibleMutGroups.length > 0
            ? eligibleMutGroups[idxSeed % eligibleMutGroups.length]
            : null;
        return buildMutashabihatChoiceQuestion(
          slot,
          group,
          idxSeed + seed,
          scopeMode === 'full_quran' ? null : memorizedSurahSet
        );
      }
      default:
        return buildWrittenRecitationQuestion(slot);
    }
  };

  const pickNextQuestion = (
    preferredTypes: QuizQuestionType[],
    stepIndex: number
  ): QuizQuestion | null => {
    // Prefer slots whose ayahs haven't been used yet in this quiz AND weren't recently asked
    const orderedSlots = [
      ...diversePool.filter(
        (s) => !usedAyahKeys.has(`${s.surahNumber}:${s.ayah.numberInSurah}`)
      ),
      ...diversePool,
    ];

    for (let pass = 0; pass < 2; pass++) {
      for (const slot of orderedSlots) {
        for (let tOffset = 0; tOffset < preferredTypes.length; tOffset++) {
          const t = preferredTypes[(stepIndex + tOffset) % preferredTypes.length];
          const q = tryCreateForType(slot, t, stepIndex + tOffset);
          if (!q) continue;
          if (usedIds.has(q.id)) continue;
          if (pass === 0 && recentSet.has(q.id)) continue; // Avoid repeating identical questions on first pass
          usedIds.add(q.id);
          usedAyahKeys.add(`${q.surahNumber}:${q.targetAyahNumber}`);
          return q;
        }
      }
    }
    return null;
  };

  // Interleave Writing (70%), Recitation/Recall (20%), Mutashabihat (10%) gracefully
  let wRemaining = writeCount;
  let rRemaining = recallCount;
  let mRemaining = mutCount;
  let step = 0;

  while (generated.length < questionCount && step < questionCount * 3) {
    let bucket: 'write' | 'recall' | 'mut' = 'write';
    if (mRemaining > 0 && generated.length === Math.floor(questionCount * 0.6)) {
      bucket = 'mut';
    } else if (rRemaining > 0 && step % 4 === 2) {
      bucket = 'recall';
    } else if (wRemaining > 0) {
      bucket = 'write';
    } else if (rRemaining > 0) {
      bucket = 'recall';
    } else if (mRemaining > 0) {
      bucket = 'mut';
    } else {
      break;
    }

    let q: QuizQuestion | null = null;
    if (bucket === 'write') {
      q = pickNextQuestion(writingTypes, step);
      wRemaining = Math.max(0, wRemaining - 1);
    } else if (bucket === 'recall') {
      q = pickNextQuestion(recallTypes, step);
      rRemaining = Math.max(0, rRemaining - 1);
    } else {
      q = pickNextQuestion(['mutashabihat_review'], step);
      mRemaining = Math.max(0, mRemaining - 1);
    }

    if (q) {
      generated.push(q);
    } else if (bucket !== 'write') {
      const fallbackWrite = pickNextQuestion(writingTypes, step + 1);
      if (fallbackWrite) generated.push(fallbackWrite);
    }
    step += 1;
  }

  return generated;
}

// ---------- Precision Character-Level & Word-Level Typed Answer Grading ----------

export interface WordDiffResult {
  word: string;
  status: 'correct' | 'wrong' | 'missing';
}

export interface MemoryCheckAnalysis {
  isCorrect: boolean;
  correctWordsCount: number;
  totalExpectedWords: number;
  wordDiffs: WordDiffResult[];
  firstErrorPosition: number | null;
  explanation: string;
  charComparison: QuranCharComparisonResult;
}

export function analyzeTypedAyahMistake(
  userInput: string,
  exactUthmaniAyah: string
): MemoryCheckAnalysis {
  const charComparison = compareAyahWithCharacterDiff(
    userInput,
    exactUthmaniAyah
  );

  const wordDiffs: WordDiffResult[] = charComparison.alignedWords
    .filter((w) => w.status !== 'extra_word')
    .map((w) => ({
      word: w.expectedWordDisplay,
      status:
        w.status === 'correct' ||
        w.status === 'keyboard_variant' ||
        w.status === 'spacing_variant'
          ? 'correct'
          : w.status === 'missing_word'
          ? 'missing'
          : 'wrong',
    }));

  const correctWordsCount =
    charComparison.exactMatchCount + charComparison.keyboardVariantWordCount;

  return {
    isCorrect: charComparison.isMemorizationCorrect,
    correctWordsCount: Math.min(
      correctWordsCount,
      charComparison.totalExpectedWords
    ),
    totalExpectedWords: charComparison.totalExpectedWords,
    wordDiffs,
    firstErrorPosition: charComparison.firstErrorPosition,
    explanation: charComparison.explanation,
    charComparison,
  };
}
