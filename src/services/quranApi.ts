import { getJuzNumberForSurahAyah } from '../data/quranMetadata';
import { QuranAyah, SurahSummary } from '../types';

const SURAHS_CACHE_KEY = 'rifq_surahs_v1';
const SURAH_AYAHS_CACHE_PREFIX = 'rifq_surah_uthmani_v1_';

interface AlQuranCloudSurahListResponse {
  code: number;
  data: {
    number: number;
    name: string;
    englishName: string;
    numberOfAyahs: number;
    revelationType: string;
  }[];
}

interface AlQuranCloudSurahDetailResponse {
  code: number;
  data: {
    number: number;
    name: string;
    englishName: string;
    numberOfAyahs: number;
    ayahs: {
      number: number;
      numberInSurah: number;
      text: string;
      juz?: number;
      page?: number;
    }[];
  };
}

interface QuranComChaptersResponse {
  chapters: {
    id: number;
    name_arabic: string;
    name_simple: string;
    verses_count: number;
    revelation_place: string;
  }[];
}

interface QuranComVersesResponse {
  verses: {
    id: number;
    verse_key: string;
    text_uthmani: string;
    juz_number?: number;
  }[];
}

const memorySurahCache = new Map<number, QuranAyah[]>();
let memorySurahListCache: SurahSummary[] | null = null;

export async function fetchAllSurahs(): Promise<SurahSummary[]> {
  if (memorySurahListCache) {
    return memorySurahListCache;
  }

  try {
    const cached = localStorage.getItem(SURAHS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as SurahSummary[];
      if (Array.isArray(parsed) && parsed.length === 114) {
        memorySurahListCache = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore storage read errors
  }

  // Primary trusted source: Al-Quran Cloud v1
  try {
    const res = await fetch('https://api.alquran.cloud/v1/surah');
    if (res.ok) {
      const json = (await res.json()) as AlQuranCloudSurahListResponse;
      if (json.code === 200 && Array.isArray(json.data) && json.data.length > 0) {
        const list: SurahSummary[] = json.data.map((s) => ({
          number: s.number,
          name: s.name,
          englishName: s.englishName,
          numberOfAyahs: s.numberOfAyahs,
          revelationType: s.revelationType,
        }));
        memorySurahListCache = list;
        try {
          localStorage.setItem(SURAHS_CACHE_KEY, JSON.stringify(list));
        } catch {
          // Ignore storage quota errors
        }
        return list;
      }
    }
  } catch {
    // Try secondary trusted source
  }

  // Fallback trusted source: Quran.com API v4
  const fallbackRes = await fetch('https://api.quran.com/api/v4/chapters?language=ar');
  if (!fallbackRes.ok) {
    throw new Error('تعذر تحميل قائمة السور من المصدر الموثوق. يرجى التحقق من الاتصال بالإنترنت.');
  }
  const fallbackJson = (await fallbackRes.json()) as QuranComChaptersResponse;
  const list: SurahSummary[] = fallbackJson.chapters.map((c) => ({
    number: c.id,
    name: `سُورَةُ ${c.name_arabic}`,
    englishName: c.name_simple,
    numberOfAyahs: c.verses_count,
    revelationType: c.revelation_place === 'makkah' ? 'Meccan' : 'Medinan',
  }));
  memorySurahListCache = list;
  try {
    localStorage.setItem(SURAHS_CACHE_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage quota errors
  }
  return list;
}

export async function fetchSurahAyahsUthmani(surahNumber: number): Promise<QuranAyah[]> {
  if (memorySurahCache.has(surahNumber)) {
    return memorySurahCache.get(surahNumber)!;
  }

  try {
    const cached = localStorage.getItem(`${SURAH_AYAHS_CACHE_PREFIX}${surahNumber}`);
    if (cached) {
      const parsed = JSON.parse(cached) as QuranAyah[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        memorySurahCache.set(surahNumber, parsed);
        return parsed;
      }
    }
  } catch {
    // Ignore storage read errors
  }

  // Primary trusted source: Al-Quran Cloud Uthmani Edition
  try {
    const res = await fetch(
      `https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`
    );
    if (res.ok) {
      const json = (await res.json()) as AlQuranCloudSurahDetailResponse;
      if (json.code === 200 && json.data && Array.isArray(json.data.ayahs)) {
        const ayahs: QuranAyah[] = json.data.ayahs.map((a) => ({
          number: a.number,
          numberInSurah: a.numberInSurah,
          text: a.text,
          juz: a.juz ?? getJuzNumberForSurahAyah(surahNumber, a.numberInSurah),
          page: a.page,
        }));
        memorySurahCache.set(surahNumber, ayahs);
        try {
          localStorage.setItem(
            `${SURAH_AYAHS_CACHE_PREFIX}${surahNumber}`,
            JSON.stringify(ayahs)
          );
        } catch {
          // Ignore storage quota errors
        }
        return ayahs;
      }
    }
  } catch {
    // Try secondary trusted source
  }

  // Fallback trusted source: Quran.com API v4 Uthmani Script
  const fallbackRes = await fetch(
    `https://api.quran.com/api/v4/verses/by_chapter/${surahNumber}?fields=text_uthmani,juz_number&per_page=300`
  );
  if (!fallbackRes.ok) {
    throw new Error('تعذر تحميل الآيات الكريمة من المصدر الموثوق. يرجى المحاولة مرة أخرى.');
  }
  const fallbackJson = (await fallbackRes.json()) as QuranComVersesResponse;
  const ayahs: QuranAyah[] = fallbackJson.verses.map((v, idx) => {
    const [, ayahPart] = v.verse_key.split(':');
    const ayahNum = Number(ayahPart) || idx + 1;
    return {
      number: v.id,
      numberInSurah: ayahNum,
      text: v.text_uthmani,
      juz: v.juz_number ?? getJuzNumberForSurahAyah(surahNumber, ayahNum),
    };
  });
  memorySurahCache.set(surahNumber, ayahs);
  try {
    localStorage.setItem(
      `${SURAH_AYAHS_CACHE_PREFIX}${surahNumber}`,
      JSON.stringify(ayahs)
    );
  } catch {
    // Ignore storage quota errors
  }
  return ayahs;
}
