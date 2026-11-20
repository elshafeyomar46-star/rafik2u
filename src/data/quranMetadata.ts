export interface JuzBoundary {
  juz: number;
  label: string;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
}

export const JUZ_BOUNDARIES: JuzBoundary[] = [
  { juz: 1, label: 'الجزء ١ (آلم)', startSurah: 1, startAyah: 1, endSurah: 2, endAyah: 141 },
  { juz: 2, label: 'الجزء ٢ (سيقول)', startSurah: 2, startAyah: 142, endSurah: 2, endAyah: 252 },
  { juz: 3, label: 'الجزء ٣ (تلك الرسل)', startSurah: 2, startAyah: 253, endSurah: 3, endAyah: 92 },
  { juz: 4, label: 'الجزء ٤ (لن تنالوا)', startSurah: 3, startAyah: 93, endSurah: 4, endAyah: 23 },
  { juz: 5, label: 'الجزء ٥ (والمحصنات)', startSurah: 4, startAyah: 24, endSurah: 4, endAyah: 147 },
  { juz: 6, label: 'الجزء ٦ (لا يحب الله)', startSurah: 4, startAyah: 148, endSurah: 5, endAyah: 81 },
  { juz: 7, label: 'الجزء ٧ (وإذا سمعوا)', startSurah: 5, startAyah: 82, endSurah: 6, endAyah: 110 },
  { juz: 8, label: 'الجزء ٨ (ولو أننا)', startSurah: 6, startAyah: 111, endSurah: 7, endAyah: 87 },
  { juz: 9, label: 'الجزء ٩ (قال الملأ)', startSurah: 7, startAyah: 88, endSurah: 8, endAyah: 40 },
  { juz: 10, label: 'الجزء ١٠ (واعلموا)', startSurah: 8, startAyah: 41, endSurah: 9, endAyah: 92 },
  { juz: 11, label: 'الجزء ١١ (يعتذرون)', startSurah: 9, startAyah: 93, endSurah: 11, endAyah: 5 },
  { juz: 12, label: 'الجزء ١٢ (وما من دابة)', startSurah: 11, startAyah: 6, endSurah: 12, endAyah: 52 },
  { juz: 13, label: 'الجزء ١٣ (وما أبرئ)', startSurah: 12, startAyah: 53, endSurah: 14, endAyah: 52 },
  { juz: 14, label: 'الجزء ١٤ (ربما)', startSurah: 15, startAyah: 1, endSurah: 16, endAyah: 128 },
  { juz: 15, label: 'الجزء ١٥ (سبحان الذي)', startSurah: 17, startAyah: 1, endSurah: 18, endAyah: 74 },
  { juz: 16, label: 'الجزء ١٦ (قال ألم)', startSurah: 18, startAyah: 75, endSurah: 20, endAyah: 135 },
  { juz: 17, label: 'الجزء ١٧ (اقترب للناس)', startSurah: 21, startAyah: 1, endSurah: 22, endAyah: 78 },
  { juz: 18, label: 'الجزء ١٨ (قد أفلح)', startSurah: 23, startAyah: 1, endSurah: 25, endAyah: 20 },
  { juz: 19, label: 'الجزء ١٩ (وقال الذين)', startSurah: 25, startAyah: 21, endSurah: 27, endAyah: 55 },
  { juz: 20, label: 'الجزء ٢٠ (أمن خلق)', startSurah: 27, startAyah: 56, endSurah: 29, endAyah: 45 },
  { juz: 21, label: 'الجزء ٢١ (اتل ما أوحي)', startSurah: 29, startAyah: 46, endSurah: 33, endAyah: 30 },
  { juz: 22, label: 'الجزء ٢٢ (ومن يقنت)', startSurah: 33, startAyah: 31, endSurah: 36, endAyah: 27 },
  { juz: 23, label: 'الجزء ٢٣ (وما لي)', startSurah: 36, startAyah: 28, endSurah: 39, endAyah: 31 },
  { juz: 24, label: 'الجزء ٢٤ (فمن أظلم)', startSurah: 39, startAyah: 32, endSurah: 41, endAyah: 46 },
  { juz: 25, label: 'الجزء ٢٥ (إليه يرد)', startSurah: 41, startAyah: 47, endSurah: 45, endAyah: 37 },
  { juz: 26, label: 'الجزء ٢٦ (حم)', startSurah: 46, startAyah: 1, endSurah: 51, endAyah: 30 },
  { juz: 27, label: 'الجزء ٢٧ (قال فما خطبكم)', startSurah: 51, startAyah: 31, endSurah: 57, endAyah: 29 },
  { juz: 28, label: 'الجزء ٢٨ (قد سمع الله)', startSurah: 58, startAyah: 1, endSurah: 66, endAyah: 12 },
  { juz: 29, label: 'الجزء ٢٩ (تبارك الذي)', startSurah: 67, startAyah: 1, endSurah: 77, endAyah: 50 },
  { juz: 30, label: 'الجزء ٣٠ (عمّ يتساءلون)', startSurah: 78, startAyah: 1, endSurah: 114, endAyah: 6 },
];

function compareSurahAyah(s1: number, a1: number, s2: number, a2: number): number {
  if (s1 !== s2) return s1 - s2;
  return a1 - a2;
}

export function getJuzNumberForSurahAyah(surahNumber: number, ayahNumber: number): number {
  for (const b of JUZ_BOUNDARIES) {
    if (
      compareSurahAyah(surahNumber, ayahNumber, b.startSurah, b.startAyah) >= 0 &&
      compareSurahAyah(surahNumber, ayahNumber, b.endSurah, b.endAyah) <= 0
    ) {
      return b.juz;
    }
  }
  return 30;
}

export function getJuzRangeForPlan(
  surahNumber: number,
  fromAyah: number,
  toAyah: number
): number[] {
  const startJuz = getJuzNumberForSurahAyah(surahNumber, fromAyah);
  const endJuz = getJuzNumberForSurahAyah(surahNumber, toAyah);
  const result: number[] = [];
  for (let j = startJuz; j <= endJuz; j++) {
    result.push(j);
  }
  return result;
}

// Diverse Surahs spanning distant Juz across the full Mushaf for "اختبار شامل في القرآن كاملًا"
export const FULL_QURAN_DIVERSE_SURAHS: {
  surahNumber: number;
  surahName: string;
  juz: number;
  fromAyah: number;
  toAyah: number;
}[] = [
  { surahNumber: 1, surahName: 'سُورَةُ ٱلْفَاتِحَةِ', juz: 1, fromAyah: 1, toAyah: 7 },
  { surahNumber: 2, surahName: 'سُورَةُ البَقَرَةِ', juz: 3, fromAyah: 255, toAyah: 286 },
  { surahNumber: 18, surahName: 'سُورَةُ الكَهْفِ', juz: 15, fromAyah: 1, toAyah: 20 },
  { surahNumber: 36, surahName: 'سُورَةُ يسٓ', juz: 22, fromAyah: 1, toAyah: 25 },
  { surahNumber: 55, surahName: 'سُورَةُ الرَّحْمَٰن', juz: 27, fromAyah: 1, toAyah: 25 },
  { surahNumber: 67, surahName: 'سُورَةُ المُلْكِ', juz: 29, fromAyah: 1, toAyah: 15 },
  { surahNumber: 87, surahName: 'سُورَةُ الأَعْلَىٰ', juz: 30, fromAyah: 1, toAyah: 19 },
  { surahNumber: 112, surahName: 'سُورَةُ الإِخْلَاصِ', juz: 30, fromAyah: 1, toAyah: 4 },
];
