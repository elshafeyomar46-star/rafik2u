import { HadithCollectionSlug } from '../types';

const HADITH_CACHE_PREFIX = 'rifq_hadith_api_v1_';
const memoryHadithCache = new Map<string, string>();

export const HADITH_COLLECTIONS: {
  slug: HadithCollectionSlug;
  label: string;
}[] = [
  { slug: 'ara-bukhari', label: 'صحيح البخاري' },
  { slug: 'ara-muslim', label: 'صحيح مسلم' },
  { slug: 'ara-abudawud', label: 'سنن أبي داود' },
  { slug: 'ara-tirmidhi', label: 'سنن الترمذي' },
  { slug: 'ara-ibnmajah', label: 'سنن ابن ماجه' },
];

interface FawazHadithSingleResponse {
  hadiths?: {
    hadithnumber?: number;
    text?: string;
  }[];
}

export async function fetchVerifiedHadithText(
  collectionSlug: HadithCollectionSlug,
  hadithNumber: number
): Promise<string> {
  const cacheKey = `${collectionSlug}:${hadithNumber}`;
  if (memoryHadithCache.has(cacheKey)) {
    return memoryHadithCache.get(cacheKey)!;
  }

  try {
    const stored = localStorage.getItem(`${HADITH_CACHE_PREFIX}${cacheKey}`);
    if (stored) {
      memoryHadithCache.set(cacheKey, stored);
      return stored;
    }
  } catch {
    // Ignore storage read errors
  }

  const urls = [
    `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${collectionSlug}/${hadithNumber}.min.json`,
    `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${collectionSlug}/${hadithNumber}.json`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = (await res.json()) as FawazHadithSingleResponse;
      const text = json.hadiths?.[0]?.text?.trim();
      if (text) {
        memoryHadithCache.set(cacheKey, text);
        try {
          localStorage.setItem(`${HADITH_CACHE_PREFIX}${cacheKey}`, text);
        } catch {
          // Ignore storage quota errors
        }
        return text;
      }
    } catch {
      // Try next URL
    }
  }

  throw new Error('تعذر جلب نص الحديث من المصدر الموثوق حالياً.');
}

export interface HadithLibraryQuery {
  book: 'all' | import('../types').HadithBookId;
  chapterId?: number | null;
  narrator?: string;
  topic?: string;
  grade?: string;
  classification?: 'all' | import('../types').HadithRecordClassification;
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchHadithLibrarySummary(): Promise<
  import('../types').HadithLibraryManifest
> {
  const res = await fetch('/api/hadith-library/summary');
  if (!res.ok) {
    throw new Error('تعذر تحميل فهرس المكتبة الحديثية وتقرير الاكتمال.');
  }
  return (await res.json()) as import('../types').HadithLibraryManifest;
}

export async function searchHadithLibraryApi(
  query: HadithLibraryQuery
): Promise<import('../types').HadithLibrarySearchResponse> {
  const params = new URLSearchParams();
  params.set('book', query.book);
  if (query.chapterId !== undefined && query.chapterId !== null) {
    params.set('chapterId', String(query.chapterId));
  }
  if (query.narrator) params.set('narrator', query.narrator);
  if (query.topic) params.set('topic', query.topic);
  if (query.grade) params.set('grade', query.grade);
  if (query.classification) params.set('classification', query.classification);
  if (query.q) params.set('q', query.q);
  params.set('page', String(query.page ?? 1));
  params.set('pageSize', String(query.pageSize ?? 15));

  const res = await fetch(`/api/hadith-library/search?${params.toString()}`);
  if (!res.ok) {
    throw new Error('تعذر جلب الأحاديث من المكتبة الحديثية.');
  }
  return (await res.json()) as import('../types').HadithLibrarySearchResponse;
}

export async function syncHadithLibraryApi(): Promise<
  import('../types').HadithLibraryManifest
> {
  const res = await fetch('/api/hadith-library/sync', { method: 'POST' });
  if (!res.ok) {
    throw new Error('تعذر إعادة المزامنة مع المصادر الرقمية.');
  }
  return (await res.json()) as import('../types').HadithLibraryManifest;
}
