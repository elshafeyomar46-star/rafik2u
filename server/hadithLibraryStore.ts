import fs from 'fs';
import path from 'path';
import type {
  HadithBookAuditStats,
  HadithBookId,
  HadithChapterSummary,
  HadithLibraryManifest,
  HadithLibraryRecord,
  HadithLibrarySearchResponse,
  HadithRecordClassification,
} from '../src/types';

const DATA_DIR = path.resolve(process.cwd(), 'data', 'hadith-library');
const MANIFEST_PATH = path.join(DATA_DIR, 'manifest.json');

const PRIMARY_SOURCE_NAME = 'AhmedBaset/hadith-json (db/by_book/the_9_books)';
const PRIMARY_SOURCE_VERSION = 'AhmedBaset/hadith-json@main';
const SECONDARY_SOURCE_NAME = 'fawazahmed0/hadith-api';
const SECONDARY_SOURCE_VERSION = 'fawazahmed0/hadith-api@1';
const COMBINED_DATASET_VERSION = `${PRIMARY_SOURCE_VERSION} + ${SECONDARY_SOURCE_VERSION}`;

interface BookSourceConfig {
  bookId: HadithBookId;
  bookTitle: string;
  abFile: string;
  fwSlug: string;
  sunnahSlug: string;
  defaultScholar: string;
}

const BOOK_CONFIGS: BookSourceConfig[] = [
  {
    bookId: 'bukhari',
    bookTitle: 'صحيح البخاري',
    abFile: 'bukhari.json',
    fwSlug: 'ara-bukhari',
    sunnahSlug: 'bukhari',
    defaultScholar: 'الإمام محمد بن إسماعيل البخاري (متفق على صحة مسنده)',
  },
  {
    bookId: 'muslim',
    bookTitle: 'صحيح مسلم',
    abFile: 'muslim.json',
    fwSlug: 'ara-muslim',
    sunnahSlug: 'muslim',
    defaultScholar: 'الإمام مسلم بن الحجاج النيسابوري (متفق على صحة مسنده)',
  },
  {
    bookId: 'ibnmajah',
    bookTitle: 'سنن ابن ماجه',
    abFile: 'ibnmajah.json',
    fwSlug: 'ara-ibnmajah',
    sunnahSlug: 'ibnmajah',
    defaultScholar: 'غير محدد في نسخة المصدر',
  },
];

interface RawAbBook {
  chapters: { id: number; bookId: number; arabic: string; english?: string }[];
  hadiths: {
    id: number;
    idInBook: number;
    chapterId: number;
    bookId: number;
    arabic: string;
    english?: { narrator?: string; text?: string };
  }[];
}

interface RawFwBook {
  hadiths: {
    hadithnumber: number;
    arabicnumber?: number;
    text: string;
    grades?: { name: string; grade: string }[];
    reference?: { book: number; hadith: number };
  }[];
}

const SCHOLAR_ARABIC_MAP: Record<string, string> = {
  'Al-Albani': 'الشيخ محمد ناصر الدين الألباني',
  'Muhammad Fouad Abd al-Baqi': 'محمد فؤاد عبد الباقي',
  'Shuaib Al Arnaut': 'الشيخ شعيب الأرناؤوط',
  'Zubair Ali Zai': 'الشيخ زبير علي زئي',
};

const SAHABAH_ENG_TO_AR: [RegExp, string][] = [
  [/abu hurair?a/i, 'أبو هريرة رضي الله عنه'],
  [/aisha|`'aisha|a'isha/i, 'عائشة أم المؤمنين رضي الله عنها'],
  [/ibn '?umar|abdullah bin '?umar|abdallah bin '?umar/i, 'عبد الله بن عمر رضي الله عنهما'],
  [/ibn '?abbas|abdullah bin '?abbas|abdallah bin '?abbas/i, 'عبد الله بن عباس رضي الله عنهما'],
  [/anas( bin malik)?/i, 'أنس بن مالك رضي الله عنه'],
  [/umar bin al-?khattab|'?umar b\. khattab/i, 'عمر بن الخطاب رضي الله عنه'],
  [/jabir( bin '?abdullah)?/i, 'جابر بن عبد الله رضي الله عنهما'],
  [/abu sa'?id al-?khudri/i, 'أبو سعيد الخدري رضي الله عنه'],
  [/abu musa( al-?ash'?ari)?/i, 'أبو موسى الأشعري رضي الله عنه'],
  [/ibn mas'?ud|abdullah bin mas'?ud/i, 'عبد الله بن مسعود رضي الله عنه'],
  [/sahl bin sa'?d/i, 'سهل بن سعد الساعدي رضي الله عنه'],
  [/al-?bara'?/i, 'البراء بن عازب رضي الله عنه'],
  [/uthman( bin '?affan)?/i, 'عثمان بن عفان رضي الله عنه'],
  [/\b'?ali\b( bin abi talib)?/i, 'علي بن أبي طالب رضي الله عنه'],
  [/umm salama/i, 'أم سلمة رضي الله عنها'],
  [/umm '?atiya/i, 'أم عطية الأنصارية رضي الله عنها'],
  [/umm habiba/i, 'أم حبيبة رضي الله عنها'],
  [/asma'? bint abi bakr/i, 'أسماء بنت أبي بكر رضي الله عنهما'],
  [/hafsa/i, 'حفصة أم المؤمنين رضي الله عنها'],
  [/abu bakr( as-?siddiq)?/i, 'أبو بكر الصديق رضي الله عنه'],
  [/abu dharr/i, 'أبو ذر الغفاري رضي الله عنه'],
  [/mu'?adh bin jabal/i, 'معاذ بن جبل رضي الله عنه'],
  [/hudhaifa/i, 'حذيفة بن اليمان رضي الله عنه'],
  [/abu ayyub/i, 'أبو أيوب الأنصاري رضي الله عنه'],
  [/abu mas'?ud/i, 'أبو مسعود البدري رضي الله عنه'],
  [/abu qatada/i, 'أبو قتادة الأنصاري رضي الله عنه'],
  [/abu darda|abu al-?darda/i, 'أبو الدرداء رضي الله عنه'],
  [/ubayy bin ka'?b/i, 'أُبيّ بن كعب رضي الله عنه'],
  [/zaid bin thabit/i, 'زيد بن ثابت رضي الله عنه'],
  [/zaid bin khalid/i, 'زيد بن خالد الجهني رضي الله عنه'],
  [/zaid bin arqam/i, 'زيد بن أرقم رضي الله عنه'],
  [/sa'?d bin abi waqqas/i, 'سعد بن أبي وقاص رضي الله عنه'],
  [/talha( bin '?ubaidullah)?/i, 'طلحة بن عبيد الله رضي الله عنه'],
  [/az-?zubair|al-?zubair/i, 'الزبير بن العوام رضي الله عنه'],
  [/abdur-?rahman bin '?auf/i, 'عبد الرحمن بن عوف رضي الله عنه'],
  [/imran bin husain/i, 'عمران بن حصين رضي الله عنه'],
  [/jarir( bin '?abdullah)?/i, 'جرير بن عبد الله البجلي رضي الله عنه'],
  [/mu'?awiya/i, 'معاوية بن أبي سفيان رضي الله عنهما'],
  [/amr bin al-?'?as/i, 'عمرو بن العاص رضي الله عنه'],
  [/abdullah bin '?amr/i, 'عبد الله بن عمرو بن العاص رضي الله عنهما'],
  [/nu'?man bin bashir/i, 'النعمان بن بشير رضي الله عنهما'],
  [/samura bin jundub/i, 'سمرة بن جندب رضي الله عنه'],
  [/salman( al-?farsi)?/i, 'سلمان الفارسي رضي الله عنه'],
  [/bilal/i, 'بلال بن رباح رضي الله عنه'],
  [/suhaib/i, 'صهيب الرومي رضي الله عنه'],
  [/khabbab/i, 'خباب بن الأرت رضي الله عنه'],
  [/thawban/i, 'ثوبان رضي الله عنه'],
  [/uqba bin '?amir/i, 'عقبة بن عامر الجهني رضي الله عنه'],
  [/wa'?il bin hujr/i, 'وائل بن حجر رضي الله عنه'],
  [/safina/i, 'سفينة مولى رسول الله ﷺ'],
  [/al-?mughira bin shu'?ba/i, 'المغيرة بن شعبة رضي الله عنه'],
  [/al-?abbas/i, 'العباس بن عبد المطلب رضي الله عنه'],
  [/al-?hasan bin '?ali/i, 'الحسن بن علي رضي الله عنهما'],
  [/al-?husain bin '?ali/i, 'الحسين بن علي رضي الله عنهما'],
  [/ammar bin yasir/i, 'عمار بن ياسر رضي الله عنه'],
  [/abu talha/i, 'أبو طلحة الأنصاري رضي الله عنه'],
  [/ubada bin as-?samit/i, 'عبادة بن الصامت رضي الله عنه'],
  [/abu shuraih/i, 'أبو شريح الخزاعي رضي الله عنه'],
  [/abu humaid/i, 'أبو حميد الساعدي رضي الله عنه'],
  [/ma'?qil bin yasar/i, 'معقل بن يسار رضي الله عنه'],
  [/buraida/i, 'بريدة بن الحصيب الأسلمي رضي الله عنه'],
  [/naw?was bin sam'?an/i, 'النواس بن سمعان رضي الله عنه'],
  [/irbad bin sariya/i, 'العرباض بن سارية رضي الله عنه'],
  [/shaddad bin aws/i, 'شداد بن أوس رضي الله عنه'],
  [/ka'?b bin malik/i, 'كعب بن مالك رضي الله عنه'],
  [/hakim bin hizam/i, 'حكيم بن حزام رضي الله عنه'],
  [/salama bin al-?akwa/i, 'سلمة بن الأكوع رضي الله عنه'],
  [/usama bin zaid/i, 'أسامة بن زيد رضي الله عنهما'],
  [/al-?miqdam/i, 'المقدام بن معديكرب رضي الله عنه'],
  [/tamim ad-?dari/i, 'تميم الداري رضي الله عنه'],
  [/abu umama/i, 'أبو أمامة الباهلي رضي الله عنه'],
  [/adi bin hatim/i, 'عدي بن حاتم رضي الله عنه'],
  [/abu barza/i, 'أبو برزة الأسلمي رضي الله عنه'],
  [/jundub/i, 'جندب بن عبد الله رضي الله عنه'],
  [/fadala bin '?ubaid/i, 'فضالة بن عبيد رضي الله عنه'],
  [/tariq bin shihab/i, 'طارق بن شهاب رضي الله عنه'],
];

export function stripArabicDiacritics(input: string): string {
  return (input || '')
    .replace(
      /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u06DF\u06E0\u06E1]/g,
      ''
    )
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

function buildStripWithIndexMap(original: string): {
  stripped: string;
  origIndices: number[];
} {
  let stripped = '';
  const origIndices: number[] = [];
  for (let i = 0; i < original.length; i++) {
    const ch = original[i];
    if (/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u200F\u200E]/.test(ch)) {
      continue;
    }
    stripped += ch;
    origIndices.push(i);
  }
  return { stripped, origIndices };
}

function splitIsnadAndMatnVerbatim(fullText: string): {
  isnad: string | null;
  matn: string;
} {
  const { stripped, origIndices } = buildStripWithIndexMap(fullText);

  const markerRegex =
    /(?:رَسُولُ|رَسُولَ|رسول|النَّبِيُّ|النَّبِيَّ|النَّبِيِّ|النبي|نَبِيُّ|نبي)[\s\S]{0,60}?(?:صَلَّى اللّهُ عَلَيْهِ وَسَلَّمَ|صلى الله عليه وسلم|عَلَيْهِ السَّلاَمُ|عليه السلام)[\sـ\-،:]{0,25}(?:قَالَ|يَقُولُ|فَقَالَ|أَنَّهُ|قال|يقول|فقال|انه|كان)?\s*[:،]?\s*/;
  const m = stripped.match(markerRegex);
  if (m && m.index !== undefined) {
    const endStripIdx = m.index + m[0].length;
    if (endStripIdx < origIndices.length) {
      const splitOrigIdx = origIndices[endStripIdx];
      // Snap forward past whitespace / quotation lead-in gaps without trimming content
      if (splitOrigIdx > 12 && splitOrigIdx < fullText.length - 8) {
        return {
          isnad: fullText.slice(0, splitOrigIdx).trim(),
          matn: fullText.slice(splitOrigIdx).trim(),
        };
      }
    }
  }

  const quoteIdx = fullText.search(/[«"]/);
  if (quoteIdx > 18 && quoteIdx < fullText.length - 12) {
    return {
      isnad: fullText.slice(0, quoteIdx).trim(),
      matn: fullText.slice(quoteIdx).trim(),
    };
  }

  return { isnad: null, matn: fullText };
}

function extractCompanionNarrator(
  fullText: string,
  engNarrator: string | undefined,
  classification: HadithRecordClassification
): string {
  if (classification === 'athar_or_intro') {
    if (engNarrator && engNarrator.trim()) {
      for (const [rx, arName] of SAHABAH_ENG_TO_AR) {
        if (rx.test(engNarrator)) return `${arName} (موقوف/أثر)`;
      }
    }
    return 'أثر / قول في المصدر (غير مرفوع)';
  }

  if (engNarrator && engNarrator.trim()) {
    for (const [rx, arName] of SAHABAH_ENG_TO_AR) {
      if (rx.test(engNarrator)) {
        return arName;
      }
    }
  }

  // Fallback: extract companion name directly from Arabic text prior to prophetic attribution
  const { stripped } = buildStripWithIndexMap(fullText);
  const prophetIdx = stripped.search(
    /(?:رسول الله|النبي|نبي الله|صلى الله عليه وسلم)/
  );
  if (prophetIdx > 8) {
    const pre = stripped.slice(0, prophetIdx);
    const matches = Array.from(
      pre.matchAll(/(?:عن|أن|سمعت|سمع)\s+([^\n،:]{3,42}?)(?=\s*(?:رضي الله|قال|يقول|أنه|عن|أن|سأل|،|:|$))/g)
    );
    if (matches.length > 0) {
      const candidate = matches[matches.length - 1][1]
        .replace(/\s+(رضي الله عنه|رضي الله عنها|رضي الله عنهما|ـ|،|:).*$/g, '')
        .trim();
      if (
        candidate.length >= 3 &&
        candidate.length <= 42 &&
        !/^(أبيه|أمه|جده|رجل|امرأة|رسول الله|النبي)$/.test(candidate)
      ) {
        const normCand = stripArabicDiacritics(candidate);
        if (normCand === 'ابن عباس' || normCand === 'عبد الله بن عباس')
          return 'عبد الله بن عباس رضي الله عنهما';
        if (normCand === 'ابن عمر' || normCand === 'عبد الله بن عمر')
          return 'عبد الله بن عمر رضي الله عنهما';
        if (normCand === 'ابي هريره' || normCand === 'ابو هريره')
          return 'أبو هريرة رضي الله عنه';
        if (normCand === 'عائشه') return 'عائشة أم المؤمنين رضي الله عنها';
        if (normCand === 'انس' || normCand === 'انس بن مالك')
          return 'أنس بن مالك رضي الله عنه';
        if (normCand === 'جابر' || normCand === 'جابر بن عبد الله')
          return 'جابر بن عبد الله رضي الله عنهما';
        if (normCand === 'ابي سعيد' || normCand === 'ابي سعيد الخدري')
          return 'أبو سعيد الخدري رضي الله عنه';
        if (normCand === 'ابي موسي' || normCand === 'ابو موسي')
          return 'أبو موسى الأشعري رضي الله عنه';
        if (normCand === 'ابن مسعود' || normCand === 'عبد الله بن مسعود')
          return 'عبد الله بن مسعود رضي الله عنه';
        return candidate;
      }
    }
  }

  return 'غير محدد في السند المقتضب';
}

function classifyRecord(
  bookId: HadithBookId,
  chapterId: number,
  fullText: string,
  engNarrator: string | undefined
): HadithRecordClassification {
  const clean = stripArabicDiacritics(fullText);
  const hasProphetMention =
    /(رسول الله|النبي|صلي الله عليه وسلم|نبي الله)/.test(clean);

  if (bookId === 'muslim' && chapterId === 0) {
    return hasProphetMention ? 'prophetic_hadith' : 'athar_or_intro';
  }

  if (hasProphetMention) {
    return 'prophetic_hadith';
  }

  // Continuation chains in Bukhari/Muslim referencing the immediate prior prophetic hadith
  if (
    /(بهذا الاسناد|بمثله|نحوه|بذلك|كقصه|مثل حديث)/.test(clean) ||
    (engNarrator && /marfu|prophet|allah's messenger|same chain/i.test(engNarrator))
  ) {
    return 'prophetic_hadith';
  }

  return 'athar_or_intro';
}

function classifyTopics(chapterName: string): string[] {
  const ch = stripArabicDiacritics(chapterName);
  const topics: string[] = [];

  if (/(ايمان|توحيد|قدر|وحي|اعتصام)/.test(ch)) topics.push('العقيدة والإيمان والتوحيد');
  if (/(علم|سنه|مقدمه)/.test(ch)) topics.push('العلم والسنة');
  if (/(طهاره|وضوء|غسل|حيض|تيمم)/.test(ch)) topics.push('الطهارة والوضوء');
  if (/(صلاه|مواقيت|اذان|جمعه|عيد|مساجد|استسقاء|كسوف|وتر|تهجد|سجود|جنائز)/.test(ch))
    topics.push('الصلاة والجنائز');
  if (/(زكاه|صدقه)/.test(ch)) topics.push('الزكاة والصدقات');
  if (/(صوم|صيام|ليله القدر|اعتكاف|تراويح)/.test(ch)) topics.push('الصيام والاعتكاف');
  if (/(حج|عمره|اضاحي|صيد|ذبائح|عقيقه)/.test(ch)) topics.push('الحج والأضاحي والذبائح');
  if (/(قران|تفسير|فضائل القران)/.test(ch)) topics.push('القرآن الكريم والتفسير');
  if (/(دعوات|دعاء|ذكر|استغفار|توبه)/.test(ch)) topics.push('الذكر والدعاء والتوبة');
  if (/(ادب|بر|صله|لباس|طعام|اطعمه|اشربه|طب|مرضي|استئذان)/.test(ch))
    topics.push('الآداب والأخلاق والطب');
  if (/(بيوع|سلم|شفعه|اجاره|حوالات|وكاله|مزارعه|مساقاه|لقطه|مظالم|شركه|رهن|عتق|هبه|وصايا|فرائض|نفقات|قضاء|احكام|شهادات|صلح|شروط|تجاره)/.test(ch))
    topics.push('المعاملات والأحكام والفرائض');
  if (/(نكاح|طلاق|رضاع|لعان)/.test(ch)) topics.push('الأسرة والنكاح');
  if (/(جهاد|سير|مغازي|مناقب|فضائل الصحابه|انبياء|اماره)/.test(ch))
    topics.push('السيرة والمغازي والفضائل');
  if (/(حدود|ديات|محاربين|ايمان ونذور|كفارات|حيل|اكراه)/.test(ch))
    topics.push('الحدود والديات والأيمان');
  if (/(رقاق|فتن|قيامه|تعبير|رؤيا|جنه|نار|زهد)/.test(ch))
    topics.push('الرقاق والفتن والآخرة');

  if (topics.length === 0) topics.push('أبواب عامة');
  return topics;
}

function translateGradeTerm(rawGrade: string): string {
  const g = rawGrade.trim();
  const lower = g.toLowerCase();
  if (lower === 'sahih') return 'صحيح';
  if (lower === 'sahih muslim') return 'صحيح (على شرط مسلم)';
  if (lower === 'sahih bukhari') return 'صحيح (على شرط البخاري)';
  if (lower === 'hasan') return 'حسن';
  if (lower === 'hasan sahih') return 'حسن صحيح';
  if (lower === "da'if" || lower === 'daif') return 'ضعيف';
  if (lower === 'daif jiddan' || lower === "da'if jiddan") return 'ضعيف جداً';
  if (lower === "mawdu'" || lower === 'mawdu') return 'موضوع';
  if (lower === 'munkar') return 'منكر';
  if (lower === 'maqbul') return 'مقبول';
  return g;
}

function prefixKey(text: string): string {
  return stripArabicDiacritics(text)
    .replace(/[^\u0621-\u064A0-9]/g, '')
    .slice(0, 48);
}

interface LoadedStore {
  manifest: HadithLibraryManifest;
  byBook: Record<HadithBookId, HadithLibraryRecord[]>;
  allRecords: HadithLibraryRecord[];
  byId: Map<string, HadithLibraryRecord>;
}

let cachedStore: LoadedStore | null = null;
let syncPromise: Promise<LoadedStore> | null = null;

function buildStoreFromLoaded(
  manifest: HadithLibraryManifest,
  byBook: Record<HadithBookId, HadithLibraryRecord[]>
): LoadedStore {
  const allRecords = [
    ...byBook.bukhari,
    ...byBook.muslim,
    ...byBook.ibnmajah,
  ];
  const byId = new Map<string, HadithLibraryRecord>();
  for (const rec of allRecords) {
    byId.set(rec.id, rec);
  }
  return { manifest, byBook, allRecords, byId };
}

export async function importAndBuildHadithLibrary(): Promise<LoadedStore> {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const importedAt = new Date().toISOString();
  const byBook: Record<HadithBookId, HadithLibraryRecord[]> = {
    bukhari: [],
    muslim: [],
    ibnmajah: [],
  };
  const bookAudits: HadithBookAuditStats[] = [];
  const chaptersByBook: Record<HadithBookId, HadithChapterSummary[]> = {
    bukhari: [],
    muslim: [],
    ibnmajah: [],
  };

  for (const cfg of BOOK_CONFIGS) {
    const primaryUrl = `https://cdn.jsdelivr.net/gh/AhmedBaset/hadith-json@main/db/by_book/the_9_books/${cfg.abFile}`;
    const secondaryUrl = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${cfg.fwSlug}.min.json`;

    const [abRes, fwRes] = await Promise.all([
      fetch(primaryUrl),
      fetch(secondaryUrl),
    ]);
    if (!abRes.ok) {
      throw new Error(`فشل استيراد المصدر الأساسي لكتاب ${cfg.bookTitle}`);
    }
    const abData = (await abRes.json()) as RawAbBook;
    const fwData: RawFwBook = fwRes.ok
      ? ((await fwRes.json()) as RawFwBook)
      : { hadiths: [] };

    const chapterMap = new Map<number, string>();
    for (const ch of abData.chapters) {
      chapterMap.set(ch.id, ch.arabic.trim());
    }

    // Index fawazahmed0 non-empty entries by text prefix for reliable cross-referencing
    const fwPrefixMap = new Map<
      string,
      RawFwBook['hadiths'][number][]
    >();
    const fwByNum = new Map<number, RawFwBook['hadiths'][number]>();
    const emptyNumbersSecondary: number[] = [];

    for (const fwH of fwData.hadiths) {
      fwByNum.set(fwH.hadithnumber, fwH);
      if (!fwH.text || !fwH.text.trim()) {
        emptyNumbersSecondary.push(fwH.hadithnumber);
        continue;
      }
      const key = prefixKey(fwH.text);
      if (key.length >= 12) {
        const list = fwPrefixMap.get(key) ?? [];
        list.push(fwH);
        fwPrefixMap.set(key, list);
      }
    }

    const chapterSeqCounter = new Map<number, number>();
    const chapterCountMap = new Map<number, number>();
    let emptyOrMissingInPrimary = 0;
    let matchedWithSecondaryCount = 0;
    let ungradedCount = 0;
    let propheticHadithCount = 0;
    let atharOrIntroCount = 0;

    const records: HadithLibraryRecord[] = [];

    for (const abH of abData.hadiths) {
      const rawText = abH.arabic;
      if (!rawText || !rawText.trim()) {
        emptyOrMissingInPrimary++;
        continue;
      }

      const chapId = abH.chapterId;
      const chapName = chapterMap.get(chapId) ?? `باب رقم ${chapId}`;
      const seq = (chapterSeqCounter.get(chapId) ?? 0) + 1;
      chapterSeqCounter.set(chapId, seq);
      chapterCountMap.set(chapId, seq);

      // Cross-reference with fawazahmed0 entry
      const abKey = prefixKey(rawText);
      const candidates = fwPrefixMap.get(abKey);
      let fwMatch: RawFwBook['hadiths'][number] | undefined = candidates?.[0];
      if (!fwMatch) {
        const direct = fwByNum.get(abH.idInBook);
        if (
          direct &&
          direct.text &&
          prefixKey(direct.text).slice(0, 18) === abKey.slice(0, 18)
        ) {
          fwMatch = direct;
        }
      }
      if (fwMatch) {
        matchedWithSecondaryCount++;
      }

      const internationalNumber = fwMatch?.hadithnumber ?? null;
      const numberInChapter =
        fwMatch?.reference?.hadith && fwMatch.reference.hadith > 0
          ? fwMatch.reference.hadith
          : null;

      const classification = classifyRecord(
        cfg.bookId,
        chapId,
        rawText,
        abH.english?.narrator
      );
      if (classification === 'prophetic_hadith') {
        propheticHadithCount++;
      } else {
        atharOrIntroCount++;
      }

      const { isnad, matn } = splitIsnadAndMatnVerbatim(rawText);
      const companionNarrator = extractCompanionNarrator(
        rawText,
        abH.english?.narrator,
        classification
      );

      let authenticityGrade = '';
      let gradingScholar = '';

      if (cfg.bookId === 'bukhari' || cfg.bookId === 'muslim') {
        if (classification === 'athar_or_intro') {
          authenticityGrade =
            cfg.bookId === 'muslim' && chapId === 0
              ? 'أثر / قول في مقدمة مسلم (غير مرفوع)'
              : 'أثر / موقوف في المصدر';
          gradingScholar =
            cfg.bookId === 'muslim' && chapId === 0
              ? 'مقدمة صحيح مسلم — أقوال الأئمة والرواة'
              : 'موثق في الكتاب الأصلي (موقوف/أثر)';
        } else {
          authenticityGrade = `صحيح (في ${cfg.bookTitle})`;
          gradingScholar = cfg.defaultScholar;
        }
      } else {
        // Ibn Majah: rely strictly on documented grades in fawazahmed0
        const fwGrades = fwMatch?.grades ?? [];
        if (fwGrades.length > 0) {
          const primaryGradeObj =
            fwGrades.find((g) => g.name === 'Al-Albani') ?? fwGrades[0];
          const translatedMain = translateGradeTerm(primaryGradeObj.grade);
          const allSame = fwGrades.every(
            (g) =>
              translateGradeTerm(g.grade) === translatedMain
          );
          authenticityGrade = allSame
            ? translatedMain
            : fwGrades
                .map(
                  (g) =>
                    `${translateGradeTerm(g.grade)} (${SCHOLAR_ARABIC_MAP[g.name] ?? g.name})`
                )
                .join(' · ');
          gradingScholar = fwGrades
            .map((g) => SCHOLAR_ARABIC_MAP[g.name] ?? g.name)
            .join(' · ');
        } else {
          authenticityGrade = 'غير موثقة الدرجة في نسخة المصدر';
          gradingScholar = 'غير محدد في نسخة المصدر';
          ungradedCount++;
        }
      }

      const displayNumber =
        cfg.bookId === 'ibnmajah' && internationalNumber !== null
          ? internationalNumber
          : abH.idInBook;

      records.push({
        id: `${cfg.bookId}:${abH.idInBook}`,
        bookId: cfg.bookId,
        bookTitle: cfg.bookTitle,
        chapterId: chapId,
        chapterName: chapName,
        chapterSequence: seq,
        hadithNumber: displayNumber,
        internationalNumber,
        numberInChapter,
        fullArabicText: rawText,
        isnad,
        matn,
        companionNarrator,
        authenticityGrade,
        gradingScholar,
        recordClassification: classification,
        topicCategories: classifyTopics(chapName),
        sourceUrl: `https://sunnah.com/${cfg.sunnahSlug}:${internationalNumber ?? abH.idInBook}`,
        textSourceName: PRIMARY_SOURCE_NAME,
        datasetVersion: COMBINED_DATASET_VERSION,
      });
    }

    byBook[cfg.bookId] = records;

    // Preserve logical chapter order (put id=0 مقدمة first if present)
    const orderedChapters = [...abData.chapters].sort((a, b) => a.id - b.id);
    chaptersByBook[cfg.bookId] = orderedChapters.map((ch) => ({
      bookId: cfg.bookId,
      chapterId: ch.id,
      chapterName: ch.arabic.trim(),
      count: chapterCountMap.get(ch.id) ?? 0,
    }));

    const expectedPrimary = abData.hadiths.length;
    const expectedSecondary = fwData.hadiths.length;
    const secondaryNonEmptyCount =
      expectedSecondary - emptyNumbersSecondary.length;

    let completenessStatus: HadithBookAuditStats['completenessStatus'] =
      'complete_primary_verified';
    let statusNote = '';

    if (records.length < expectedPrimary || emptyOrMissingInPrimary > 0) {
      completenessStatus = 'incomplete';
      statusNote = `يوجد نقص في النسخة الأساسية: تم استيراد ${records.length} من أصل ${expectedPrimary} سجل.`;
    } else if (emptyNumbersSecondary.length > 0 || ungradedCount > 0) {
      completenessStatus = 'complete_primary_with_secondary_gaps';
      const parts: string[] = [
        `تم استيراد جميع السجلات المتوفرة في النسخة الأساسية (${records.length} / ${expectedPrimary}) دون حذف أو اختصار.`,
      ];
      if (emptyNumbersSecondary.length > 0) {
        parts.push(
          `تنبيه المطابقة مع النسخة المساندة (دار السلام/fawazahmed0): يوجد ${emptyNumbersSecondary.length} رقماً فارغ النص في النسخة المساندة من أصل ${expectedSecondary}.`
        );
      }
      if (ungradedCount > 0) {
        parts.push(
          `يوجد ${ungradedCount} سجل لم يرد لها حكم درجة صريح في النسخة المساندة.`
        );
      }
      statusNote = parts.join(' ');
    } else {
      statusNote = `مكتمل ومتحقق من المصدرين (${records.length} / ${expectedPrimary}).`;
    }

    bookAudits.push({
      bookId: cfg.bookId,
      bookTitle: cfg.bookTitle,
      primarySourceName: PRIMARY_SOURCE_NAME,
      primarySourceUrl: primaryUrl,
      primarySourceVersion: PRIMARY_SOURCE_VERSION,
      expectedCountPrimary: expectedPrimary,
      importedCount: records.length,
      emptyOrMissingInPrimary,
      secondarySourceName: SECONDARY_SOURCE_NAME,
      secondarySourceUrl: secondaryUrl,
      secondarySourceVersion: SECONDARY_SOURCE_VERSION,
      expectedCountSecondary: expectedSecondary,
      secondaryNonEmptyCount,
      secondaryEmptyCount: emptyNumbersSecondary.length,
      emptyNumbersSecondarySample: emptyNumbersSecondary.slice(0, 25),
      matchedWithSecondaryCount,
      ungradedCount,
      propheticHadithCount,
      atharOrIntroCount,
      completenessStatus,
      statusNote,
    });

    fs.writeFileSync(
      path.join(DATA_DIR, `${cfg.bookId}.json`),
      JSON.stringify(records)
    );
  }

  // Compute aggregated facets for UI filters
  const narratorFreq = new Map<string, number>();
  const topicFreq = new Map<string, number>();
  const gradeFreq = new Map<string, number>();
  let totalPropheticCount = 0;
  let totalAtharOrIntroCount = 0;

  for (const list of Object.values(byBook)) {
    for (const r of list) {
      if (r.recordClassification === 'prophetic_hadith') {
        totalPropheticCount++;
      } else {
        totalAtharOrIntroCount++;
      }
      narratorFreq.set(
        r.companionNarrator,
        (narratorFreq.get(r.companionNarrator) ?? 0) + 1
      );
      for (const t of r.topicCategories) {
        topicFreq.set(t, (topicFreq.get(t) ?? 0) + 1);
      }
      // Simplified base grade bucket for clean filtering
      let simpleGrade = r.authenticityGrade;
      if (simpleGrade.startsWith('صحيح (في ')) {
        simpleGrade = r.authenticityGrade;
      } else if (simpleGrade.startsWith('أثر /')) {
        simpleGrade = 'أثر / قول في المصدر (غير مرفوع)';
      } else if (simpleGrade.startsWith('غير موثقة')) {
        simpleGrade = 'غير موثقة الدرجة في نسخة المصدر';
      } else if (/^صحيح/.test(simpleGrade)) {
        simpleGrade = 'صحيح';
      } else if (/^حسن/.test(simpleGrade)) {
        simpleGrade = 'حسن';
      } else if (/^ضعيف/.test(simpleGrade)) {
        simpleGrade = 'ضعيف';
      } else if (/^موضوع/.test(simpleGrade)) {
        simpleGrade = 'موضوع';
      } else {
        simpleGrade = simpleGrade.split(' · ')[0];
      }
      gradeFreq.set(simpleGrade, (gradeFreq.get(simpleGrade) ?? 0) + 1);
    }
  }

  const topNarrators = Array.from(narratorFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 80)
    .map(([name, count]) => ({ name, count }));

  const topics = Array.from(topicFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const grades = Array.from(gradeFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([name, count]) => ({ name, count }));

  const manifest: HadithLibraryManifest = {
    importedAt,
    datasetVersion: COMBINED_DATASET_VERSION,
    totalImportedCount:
      byBook.bukhari.length + byBook.muslim.length + byBook.ibnmajah.length,
    totalPropheticCount,
    totalAtharOrIntroCount,
    books: bookAudits,
    chaptersByBook,
    topNarrators,
    topics,
    grades,
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  cachedStore = buildStoreFromLoaded(manifest, byBook);
  return cachedStore;
}

export async function ensureHadithLibraryLoaded(): Promise<LoadedStore> {
  if (cachedStore) return cachedStore;

  if (
    fs.existsSync(MANIFEST_PATH) &&
    fs.existsSync(path.join(DATA_DIR, 'bukhari.json')) &&
    fs.existsSync(path.join(DATA_DIR, 'muslim.json')) &&
    fs.existsSync(path.join(DATA_DIR, 'ibnmajah.json'))
  ) {
    try {
      const manifest = JSON.parse(
        fs.readFileSync(MANIFEST_PATH, 'utf-8')
      ) as HadithLibraryManifest;
      const byBook: Record<HadithBookId, HadithLibraryRecord[]> = {
        bukhari: JSON.parse(
          fs.readFileSync(path.join(DATA_DIR, 'bukhari.json'), 'utf-8')
        ) as HadithLibraryRecord[],
        muslim: JSON.parse(
          fs.readFileSync(path.join(DATA_DIR, 'muslim.json'), 'utf-8')
        ) as HadithLibraryRecord[],
        ibnmajah: JSON.parse(
          fs.readFileSync(path.join(DATA_DIR, 'ibnmajah.json'), 'utf-8')
        ) as HadithLibraryRecord[],
      };
      cachedStore = buildStoreFromLoaded(manifest, byBook);
      return cachedStore;
    } catch {
      // Fall through to fresh import if local cache is corrupt
    }
  }

  if (!syncPromise) {
    syncPromise = importAndBuildHadithLibrary().finally(() => {
      syncPromise = null;
    });
  }
  return syncPromise;
}

export interface HadithSearchParams {
  book?: 'all' | HadithBookId;
  chapterId?: number | null;
  narrator?: string;
  topic?: string;
  grade?: string;
  classification?: 'all' | HadithRecordClassification;
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function searchHadithLibrary(
  params: HadithSearchParams
): Promise<HadithLibrarySearchResponse> {
  const store = await ensureHadithLibraryLoaded();
  const book = params.book ?? 'all';
  const sourceList =
    book === 'all' ? store.allRecords : store.byBook[book] ?? [];

  const qRaw = (params.q ?? '').trim();
  const qNorm = stripArabicDiacritics(qRaw);
  const qNum = /^\d+$/.test(qRaw) ? Number(qRaw) : null;
  const narratorFilter = (params.narrator ?? '').trim();
  const topicFilter = (params.topic ?? '').trim();
  const gradeFilter = (params.grade ?? '').trim();
  const classification = params.classification ?? 'all';
  const chapterId =
    params.chapterId !== undefined && params.chapterId !== null
      ? Number(params.chapterId)
      : null;

  const filtered: HadithLibraryRecord[] = [];

  for (const r of sourceList) {
    if (classification !== 'all' && r.recordClassification !== classification) {
      continue;
    }
    if (chapterId !== null && !Number.isNaN(chapterId) && r.chapterId !== chapterId) {
      continue;
    }
    if (narratorFilter && r.companionNarrator !== narratorFilter) {
      continue;
    }
    if (topicFilter && !r.topicCategories.includes(topicFilter)) {
      continue;
    }
    if (gradeFilter) {
      if (gradeFilter === 'أثر / قول في المصدر (غير مرفوع)') {
        if (!r.authenticityGrade.startsWith('أثر /')) continue;
      } else if (gradeFilter === 'صحيح') {
        if (!/^صحيح/.test(r.authenticityGrade)) continue;
      } else if (!r.authenticityGrade.includes(gradeFilter)) {
        continue;
      }
    }
    if (qRaw) {
      if (qNum !== null) {
        if (
          r.hadithNumber !== qNum &&
          r.internationalNumber !== qNum &&
          r.numberInChapter !== qNum
        ) {
          continue;
        }
      } else {
        const hay = stripArabicDiacritics(
          `${r.fullArabicText} ${r.chapterName} ${r.companionNarrator}`
        );
        if (!hay.includes(qNorm)) {
          continue;
        }
      }
    }
    filtered.push(r);
  }

  const pageSize = Math.min(50, Math.max(5, Number(params.pageSize) || 15));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(totalPages, Math.max(1, Number(params.page) || 1));
  const start = (page - 1) * pageSize;

  return {
    total,
    page,
    pageSize,
    totalPages,
    items: filtered.slice(start, start + pageSize),
  };
}

export async function getHadithById(
  id: string
): Promise<HadithLibraryRecord | null> {
  const store = await ensureHadithLibraryLoaded();
  return store.byId.get(id) ?? null;
}

export async function forceResyncHadithLibrary(): Promise<HadithLibraryManifest> {
  syncPromise = importAndBuildHadithLibrary().finally(() => {
    syncPromise = null;
  });
  const store = await syncPromise;
  return store.manifest;
}
