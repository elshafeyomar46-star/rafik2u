/**
 * Quranic Character-Level Diff & Technical Comparison Engine
 *
 * Design principles:
 * 1. Original Uthmani Mushaf text is preserved 100% untouched for display.
 * 2. All comparisons run on a separate technical comparison representation.
 * 3. Missing/differing Tashkeel, spacing differences, Quranic waqf/ornamental
 *    marks, and font differences are NEVER penalized.
 * 4. Two genuinely different Arabic words (e.g., مَلِك vs مَالِك, عِلْم vs عَالِم)
 *    are NEVER falsely equated by blind word-level normalization.
 * 5. Dagger alef (ـٰ / U+0670) expansion is derived contextually from the exact
 *    authentic Uthmani word itself.
 * 6. Within every aligned word, Damerau-Levenshtein character alignment pinpoints:
 *    - substitution (استبدال حرف)
 *    - deletion (حذف حرف)
 *    - insertion (إضافة حرف زائد)
 *    - transposition (تبديل ترتيب الحروف)
 *    - keyboard_variant (اختلاف كتابي محتمل بسبب لوحة المفاتيح)
 */

export type CharOpType =
  | 'match'
  | 'keyboard_variant'
  | 'substitution'
  | 'deletion'
  | 'insertion'
  | 'transposition';

export type WordDiffStatus =
  | 'correct'
  | 'keyboard_variant'
  | 'partial_error'
  | 'missing_word'
  | 'extra_word'
  | 'spacing_variant';

export interface ExpectedCharUnit {
  displayCluster: string;
  baseChar: string;
  positionInWord: number;
  status: CharOpType;
  writtenChar?: string;
  swappedWithChar?: string;
}

export interface UserCharUnit {
  displayCluster: string;
  baseChar: string;
  positionInWord: number;
  status: CharOpType;
  expectedChar?: string;
  swappedWithChar?: string;
}

export interface CharMistakeDetail {
  wordIndex: number;
  expectedWordDisplay: string;
  userWordDisplay: string;
  charPosition: number;
  opType: Exclude<CharOpType, 'match'>;
  expectedChar: string;
  writtenChar: string;
  summaryAr: string;
}

export interface AlignedWordComparison {
  id: string;
  wordIndex: number | null;
  expectedWordDisplay: string;
  userWordDisplay: string;
  status: WordDiffStatus;
  expectedChars: ExpectedCharUnit[];
  userChars: UserCharUnit[];
  charDetails: CharMistakeDetail[];
  keyboardDetails: CharMistakeDetail[];
  spacingNote?: string;
}

export interface QuranCharComparisonResult {
  isMemorizationCorrect: boolean;
  alignedWords: AlignedWordComparison[];
  charDetails: CharMistakeDetail[];
  keyboardVariants: CharMistakeDetail[];
  hasSpacingDifferencesOnly: boolean;
  exactMatchCount: number;
  keyboardVariantWordCount: number;
  errorWordCount: number;
  totalExpectedWords: number;
  firstErrorPosition: number | null;
  explanation: string;
}

// Combining & formatting marks ignored in core letter extraction
const COMBINING_MARK_REGEX = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/;
const QURANIC_NON_LETTER_SYMBOL_REGEX = /[\u06D6-\u06ED\u06DD\u06DE\u0640.,،؛؟!«»﴿﴾():\-–—]/g;

// Only standard Imlaei silent-alef / Uthmani-omitted-alef forms where standard
// Arabic keyboard orthography intentionally omits a pronounced long alef
// present as dagger-alef (\u0670) in Uthmani script.
// Deliberately EXCLUDES pairs like مالك/ملك or عالم/علم or كتاب/كتب so distinct
// Arabic words are NEVER conflated!
const SILENT_ALEF_IMLAEI_VARIANTS: Record<string, string[]> = {
  ذالك: ['ذلك'],
  هذا: ['هاذا'],
  هاذا: ['هذا'],
  هذه: ['هاذه'],
  هاذه: ['هذه'],
  هاذان: ['هذان'],
  هذان: ['هاذان'],
  هاؤلاء: ['هؤلاء'],
  هؤلاء: ['هؤلاء'],
  الرحمان: ['الرحمن'],
  رحمان: ['رحمن'],
  اللاه: ['الله'],
  لاكن: ['لكن'],
  لاكنه: ['لكنه'],
  لاكنهم: ['لكنهم'],
  لاكننا: ['لكننا'],
  الاه: ['اله'],
  الاهنا: ['الهنا'],
  الاهكم: ['الهكم'],
  الاهك: ['الهك'],
  اولائك: ['اولئك', 'أولئك'],
  اولئك: ['أولئك'],
  اولائكم: ['اولئكم', 'أولئكم'],
  سماوات: ['سموات'],
  السماوات: ['السموات'],
  سماواته: ['سمواته'],
  طاها: ['طه'],
  ياسين: ['يس'],
};

interface DisplayCluster {
  raw: string;
  baseChar: string;
  hasDaggerAlef: boolean;
  hasSmallWawAfterWaw: boolean;
  hasSmallYaAfterYa: boolean;
  hasMadAbove: boolean;
}

function isArabicBaseLetter(ch: string): boolean {
  if (!ch) return false;
  if (COMBINING_MARK_REGEX.test(ch)) return false;
  if (ch === '\u0640') return false;
  if (/[.,،؛؟!«»﴿﴾():\-–—\s]/.test(ch)) return false;
  return /[\u0621-\u064A\u0671\u066E-\u06D3]/.test(ch);
}

/**
 * Splits a word into display clusters: each base letter paired with all of its
 * trailing combining marks (Tashkeel, Shadda, dagger alef, small Quranic signs).
 */
export function splitWordIntoDisplayClusters(word: string): DisplayCluster[] {
  const nfc = word.normalize('NFC');
  const clusters: DisplayCluster[] = [];

  for (const ch of nfc) {
    if (isArabicBaseLetter(ch)) {
      const normalizedBase = ch === '\u0671' ? 'ا' : ch;
      clusters.push({
        raw: ch,
        baseChar: normalizedBase,
        hasDaggerAlef: false,
        hasSmallWawAfterWaw: false,
        hasSmallYaAfterYa: false,
        hasMadAbove: false,
      });
    } else if (COMBINING_MARK_REGEX.test(ch) && clusters.length > 0) {
      const last = clusters[clusters.length - 1];
      last.raw += ch;
      if (ch === '\u0670') last.hasDaggerAlef = true;
      if (ch === '\u06E5' && last.baseChar === 'و') last.hasSmallWawAfterWaw = true;
      if ((ch === '\u06E6' || ch === '\u06E7') && (last.baseChar === 'ي' || last.baseChar === 'ئ')) {
        last.hasSmallYaAfterYa = true;
      }
      if (ch === '\u0653') last.hasMadAbove = true;
    } else if (!QURANIC_NON_LETTER_SYMBOL_REGEX.test(ch) && ch.trim().length > 0) {
      // Preserve unexpected non-combining symbol as its own token cluster if any
      if (!/[.,،؛؟!«»﴿﴾():\-–—\u0640\u06DD\u06DE]/.test(ch)) {
        clusters.push({
          raw: ch,
          baseChar: ch,
          hasDaggerAlef: false,
          hasSmallWawAfterWaw: false,
          hasSmallYaAfterYa: false,
          hasMadAbove: false,
        });
      }
    }
    QURANIC_NON_LETTER_SYMBOL_REGEX.lastIndex = 0;
  }

  return clusters;
}

interface ComparisonVariant {
  chars: string[];
  clusterIndices: number[];
}

/**
 * Builds valid modern Arabic keyboard / Uthmani orthographic variants strictly
 * from the actual authentic Uthmani clusters of this specific word.
 */
function buildExpectedVariantsFromUthmaniClusters(
  clusters: DisplayCluster[]
): ComparisonVariant[] {
  if (clusters.length === 0) return [{ chars: [], clusterIndices: [] }];

  // Primary contextual expansion: expand Uthmani dagger alef (\u0670) -> 'ا'
  // and و\u0670 (صلوة / زكوة / حيوة) -> 'ا' (or 'وا').
  const primaryChars: string[] = [];
  const primaryClusterIdx: number[] = [];

  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i];

    // Special Uthmani sequence: ء followed by ا (e.g. ءَامَنُوا -> آمنوا / امنوا)
    if (
      c.baseChar === 'ء' &&
      i + 1 < clusters.length &&
      clusters[i + 1].baseChar === 'ا'
    ) {
      primaryChars.push('آ');
      primaryClusterIdx.push(i);
      i += 1; // absorb following ا into the آ cluster
      continue;
    }

    // Special Uthmani sequence: ء with \u0670 (e.g. ءَايَٰتِ -> آيات)
    if (c.baseChar === 'ء' && c.hasDaggerAlef) {
      primaryChars.push('آ');
      primaryClusterIdx.push(i);
      continue;
    }

    // Special Uthmani sequence: و followed by \u0670 (ٱلصَّلَوٰةَ -> الصلاة)
    if (c.baseChar === 'و' && c.hasDaggerAlef) {
      primaryChars.push('ا');
      primaryClusterIdx.push(i);
      continue;
    }

    primaryChars.push(c.baseChar);
    primaryClusterIdx.push(i);

    if (c.hasDaggerAlef && c.baseChar !== 'ى') {
      primaryChars.push('ا');
      primaryClusterIdx.push(i);
    }
    if (c.hasSmallWawAfterWaw) {
      primaryChars.push('و');
      primaryClusterIdx.push(i);
    }
    if (c.hasSmallYaAfterYa) {
      primaryChars.push('ي');
      primaryClusterIdx.push(i);
    }
  }

  const variants: ComparisonVariant[] = [
    { chars: primaryChars, clusterIndices: primaryClusterIdx },
  ];

  // Also include pure Uthmani raw skeleton ONLY if it has \u06E5 (دَاوُۥد -> داود) or و\u0670 (صلوة)
  const hasSmallOrWawDagger = clusters.some(
    (c) =>
      c.hasSmallWawAfterWaw ||
      c.hasSmallYaAfterYa ||
      (c.baseChar === 'و' && c.hasDaggerAlef) ||
      (c.baseChar === 'ء' && c.hasDaggerAlef)
  );
  if (hasSmallOrWawDagger || clusters.some((c, i) => c.baseChar === 'ء' && clusters[i + 1]?.baseChar === 'ا')) {
    const rawChars: string[] = [];
    const rawClusterIdx: number[] = [];
    for (let i = 0; i < clusters.length; i++) {
      rawChars.push(clusters[i].baseChar);
      rawClusterIdx.push(i);
      if (clusters[i].hasDaggerAlef && clusters[i].baseChar !== 'ى') {
        rawChars.push('ا');
        rawClusterIdx.push(i);
      }
    }
    variants.push({ chars: rawChars, clusterIndices: rawClusterIdx });
  }

  // Handle Uthmani single-lam for genuine double-lam Imlaei words (اليل -> الليل, اليلتين -> الليلتين)
  const joinedBare = primaryChars.join('');
  if (joinedBare.startsWith('اليل') || joinedBare.startsWith('وليل')) {
    variants.push({
      chars: [primaryChars[0], 'ل', ...primaryChars.slice(1)],
      clusterIndices: [
        primaryClusterIdx[0],
        primaryClusterIdx[1] ?? 0,
        ...primaryClusterIdx.slice(1),
      ],
    });
  }

  // Handle genuine silent-alef Imlaei words (ذلك, هذا, الرحمن, الله, إله, لكن, سماوات),
  // including with standard proclitic prefixes (و، ف، ب، ل، ك، ول، فل)
  const joinedPrimary = primaryChars.join('').replace(/[أإآ]/g, 'ا');
  const directImlaeiForms = SILENT_ALEF_IMLAEI_VARIANTS[joinedPrimary];
  if (directImlaeiForms) {
    for (const form of directImlaeiForms) {
      const formChars = [...form];
      const mappedIdx = formChars.map((_, idx) =>
        Math.min(clusters.length - 1, Math.floor((idx * clusters.length) / formChars.length))
      );
      variants.push({ chars: formChars, clusterIndices: mappedIdx });
    }
  } else {
    const PREFIX_LIST = ['ول', 'فل', 'وب', 'فب', 'و', 'ف', 'ب', 'ل', 'ك'];
    for (const pfx of PREFIX_LIST) {
      if (joinedPrimary.startsWith(pfx)) {
        const stem = joinedPrimary.slice(pfx.length);
        const stemForms = SILENT_ALEF_IMLAEI_VARIANTS[stem];
        if (stemForms) {
          for (const sf of stemForms) {
            const formChars = [...pfx, ...sf];
            const mappedIdx = formChars.map((_, idx) =>
              Math.min(
                clusters.length - 1,
                Math.floor((idx * clusters.length) / formChars.length)
              )
            );
            variants.push({ chars: formChars, clusterIndices: mappedIdx });
          }
          break;
        }
      }
    }
  }

  // Handle الله specifically (ٱللَّٰه or ٱللَّه -> الله)
  const skeletonKey = clusters.map((c) => c.baseChar).join('');
  if (skeletonKey === 'الله' || skeletonKey === 'لله' || skeletonKey === 'تالله' || skeletonKey === 'بالله') {
    variants.push({
      chars: [...skeletonKey],
      clusterIndices: clusters.map((_, i) => i),
    });
  }

  // Deduplicate identical char variants
  const seen = new Set<string>();
  return variants.filter((v) => {
    const key = v.chars.join('');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Classifies whether two characters differ ONLY due to common Arabic keyboard
 * orthography differences (never different core consonants!).
 */
function isKeyboardVariantChar(
  expectedChar: string,
  userChar: string,
  isAtWordEnd: boolean
): boolean {
  if (expectedChar === userChar) return false;

  // Alef + Hamza forms on top/bottom
  const alefHamzaGroup = new Set(['ا', 'أ', 'إ', 'آ']);
  if (alefHamzaGroup.has(expectedChar) && alefHamzaGroup.has(userChar)) {
    return true;
  }

  // Alef Maqsura vs Ya at end of word (e.g., على / علي, موسى / موسي)
  if (
    isAtWordEnd &&
    ((expectedChar === 'ى' && userChar === 'ي') ||
      (expectedChar === 'ي' && userChar === 'ى'))
  ) {
    return true;
  }

  // Ta Marbuta vs Ha at end of word (e.g., رحمة / رحمه)
  if (
    isAtWordEnd &&
    ((expectedChar === 'ة' && userChar === 'ه') ||
      (expectedChar === 'ه' && userChar === 'ة'))
  ) {
    return true;
  }

  // Hamza seats (ؤ/و, ئ/ي, ء/أ/إ/ؤ/ئ)
  if (
    (expectedChar === 'ؤ' && userChar === 'و') ||
    (expectedChar === 'و' && userChar === 'ؤ') ||
    (expectedChar === 'ئ' && (userChar === 'ي' || userChar === 'ى')) ||
    ((expectedChar === 'ي' || expectedChar === 'ى') && userChar === 'ئ')
  ) {
    return true;
  }
  const hamzaGroup = new Set(['ء', 'أ', 'إ', 'ؤ', 'ئ']);
  if (hamzaGroup.has(expectedChar) && hamzaGroup.has(userChar)) {
    return true;
  }

  return false;
}

interface InternalCharOp {
  op: CharOpType;
  eStart: number;
  eEnd: number;
  uStart: number;
  uEnd: number;
}

interface CharAlignmentResult {
  cost: number;
  ops: InternalCharOp[];
  expectedChars: string[];
  expectedClusterIndices: number[];
}

/**
 * Damerau-Levenshtein (optimal string alignment) between one expected variant
 * and user base characters. Supports match, keyboard_variant, transposition,
 * substitution, deletion, and insertion.
 */
function alignCharSequence(
  eChars: string[],
  eClusterIdx: number[],
  uChars: string[]
): CharAlignmentResult {
  const m = eChars.length;
  const n = uChars.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(Infinity)
  );
  const back: ({
    prevI: number;
    prevJ: number;
    op: CharOpType;
  } | null)[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(null));

  dp[0][0] = 0;

  for (let i = 1; i <= m; i++) {
    dp[i][0] = i;
    back[i][0] = { prevI: i - 1, prevJ: 0, op: 'deletion' };
  }
  for (let j = 1; j <= n; j++) {
    dp[0][j] = j;
    back[0][j] = { prevI: 0, prevJ: j - 1, op: 'insertion' };
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const eCh = eChars[i - 1];
      const uCh = uChars[j - 1];
      const isAtEnd = i === m && j === n;

      // 1. Match / Keyboard variant / Substitution
      let subCost = 1;
      let subOp: CharOpType = 'substitution';
      if (eCh === uCh) {
        subCost = 0;
        subOp = 'match';
      } else if (isKeyboardVariantChar(eCh, uCh, isAtEnd)) {
        subCost = 0.08;
        subOp = 'keyboard_variant';
      }

      if (dp[i - 1][j - 1] + subCost < dp[i][j]) {
        dp[i][j] = dp[i - 1][j - 1] + subCost;
        back[i][j] = { prevI: i - 1, prevJ: j - 1, op: subOp };
      }

      // 2. Deletion
      if (dp[i - 1][j] + 1 < dp[i][j]) {
        dp[i][j] = dp[i - 1][j] + 1;
        back[i][j] = { prevI: i - 1, prevJ: j, op: 'deletion' };
      }

      // 3. Insertion
      if (dp[i][j - 1] + 1 < dp[i][j]) {
        dp[i][j] = dp[i][j - 1] + 1;
        back[i][j] = { prevI: i, prevJ: j - 1, op: 'insertion' };
      }

      // 4. Adjacent Transposition (swapped letter order: ab vs ba)
      if (
        i >= 2 &&
        j >= 2 &&
        eChars[i - 1] === uChars[j - 2] &&
        eChars[i - 2] === uChars[j - 1] &&
        eChars[i - 1] !== eChars[i - 2]
      ) {
        const transCost = 0.9;
        if (dp[i - 2][j - 2] + transCost < dp[i][j]) {
          dp[i][j] = dp[i - 2][j - 2] + transCost;
          back[i][j] = { prevI: i - 2, prevJ: j - 2, op: 'transposition' };
        }
      }
    }
  }

  // Reconstruct ops
  const ops: InternalCharOp[] = [];
  let ci = m;
  let cj = n;
  while (ci > 0 || cj > 0) {
    const step = back[ci][cj];
    if (!step) break;
    ops.push({
      op: step.op,
      eStart: step.prevI,
      eEnd: ci,
      uStart: step.prevJ,
      uEnd: cj,
    });
    ci = step.prevI;
    cj = step.prevJ;
  }
  ops.reverse();

  return {
    cost: dp[m][n],
    ops,
    expectedChars: eChars,
    expectedClusterIndices: eClusterIdx,
  };
}

function alignBestVariantForWordPair(
  expectedUthmaniWord: string,
  userWord: string
): {
  expectedClusters: DisplayCluster[];
  userClusters: DisplayCluster[];
  best: CharAlignmentResult;
} {
  const expectedClusters = splitWordIntoDisplayClusters(expectedUthmaniWord);
  const userClusters = splitWordIntoDisplayClusters(userWord);
  const variants = buildExpectedVariantsFromUthmaniClusters(expectedClusters);
  const uChars = userClusters.map((c) => c.baseChar);

  let best = alignCharSequence(variants[0].chars, variants[0].clusterIndices, uChars);
  for (let vIdx = 1; vIdx < variants.length; vIdx++) {
    const candidate = alignCharSequence(
      variants[vIdx].chars,
      variants[vIdx].clusterIndices,
      uChars
    );
    if (candidate.cost < best.cost) {
      best = candidate;
    }
  }

  return { expectedClusters, userClusters, best };
}

const STATUS_SEVERITY: Record<CharOpType, number> = {
  match: 0,
  keyboard_variant: 1,
  transposition: 2,
  insertion: 3,
  deletion: 4,
  substitution: 5,
};

function buildWordComparisonRecord(
  id: string,
  wordIndex: number,
  expectedUthmaniWord: string,
  userWord: string,
  spacingNote?: string
): AlignedWordComparison {
  const { expectedClusters, userClusters, best } = alignBestVariantForWordPair(
    expectedUthmaniWord,
    userWord
  );

  const expectedClusterStatus: CharOpType[] = expectedClusters.map(() => 'match');
  const expectedWrittenMap: (string | undefined)[] = expectedClusters.map(() => undefined);
  const expectedSwapMap: (string | undefined)[] = expectedClusters.map(() => undefined);

  const userClusterStatus: CharOpType[] = userClusters.map(() => 'match');
  const userExpectedMap: (string | undefined)[] = userClusters.map(() => undefined);
  const userSwapMap: (string | undefined)[] = userClusters.map(() => undefined);

  const charDetails: CharMistakeDetail[] = [];
  const keyboardDetails: CharMistakeDetail[] = [];

  for (const op of best.ops) {
    if (op.op === 'match') continue;

    if (op.op === 'keyboard_variant') {
      const eChar = best.expectedChars[op.eStart] ?? '';
      const uChar = userClusters[op.uStart]?.baseChar ?? '';
      const eClustIdx = best.expectedClusterIndices[op.eStart] ?? op.eStart;
      if (
        expectedClusterStatus[eClustIdx] === 'match' ||
        STATUS_SEVERITY.keyboard_variant > STATUS_SEVERITY[expectedClusterStatus[eClustIdx]]
      ) {
        expectedClusterStatus[eClustIdx] = 'keyboard_variant';
        expectedWrittenMap[eClustIdx] = uChar;
      }
      if (op.uStart < userClusters.length) {
        userClusterStatus[op.uStart] = 'keyboard_variant';
        userExpectedMap[op.uStart] = eChar;
      }
      keyboardDetails.push({
        wordIndex,
        expectedWordDisplay: expectedUthmaniWord,
        userWordDisplay: userWord,
        charPosition: op.eStart + 1,
        opType: 'keyboard_variant',
        expectedChar: eChar,
        writtenChar: uChar,
        summaryAr: `اختلاف كتابي محتمل (لوحة المفاتيح) في كلمة «${expectedUthmaniWord}» عند الحرف رقم (${op.eStart + 1}): كتبت «${uChar}» والهمزة/الرسم الصحيح «${eChar}»`,
      });
    } else if (op.op === 'substitution') {
      const eChar = best.expectedChars[op.eStart] ?? '';
      const uChar = userClusters[op.uStart]?.baseChar ?? '';
      const eClustIdx = best.expectedClusterIndices[op.eStart] ?? op.eStart;
      expectedClusterStatus[eClustIdx] = 'substitution';
      expectedWrittenMap[eClustIdx] = uChar;
      if (op.uStart < userClusters.length) {
        userClusterStatus[op.uStart] = 'substitution';
        userExpectedMap[op.uStart] = eChar;
      }
      charDetails.push({
        wordIndex,
        expectedWordDisplay: expectedUthmaniWord,
        userWordDisplay: userWord,
        charPosition: op.eStart + 1,
        opType: 'substitution',
        expectedChar: eChar,
        writtenChar: uChar,
        summaryAr: `استبدال حرف في كلمة «${expectedUthmaniWord}» (الحرف رقم ${op.eStart + 1}): كتبت «${uChar}» والصواب «${eChar}»`,
      });
    } else if (op.op === 'deletion') {
      const eChar = best.expectedChars[op.eStart] ?? '';
      const eClustIdx = best.expectedClusterIndices[op.eStart] ?? op.eStart;
      if (STATUS_SEVERITY.deletion > STATUS_SEVERITY[expectedClusterStatus[eClustIdx]]) {
        expectedClusterStatus[eClustIdx] = 'deletion';
      }
      charDetails.push({
        wordIndex,
        expectedWordDisplay: expectedUthmaniWord,
        userWordDisplay: userWord,
        charPosition: op.eStart + 1,
        opType: 'deletion',
        expectedChar: eChar,
        writtenChar: '—',
        summaryAr: `حذف حرف في كلمة «${expectedUthmaniWord}» (الحرف رقم ${op.eStart + 1}): سقط حرف «${eChar}»`,
      });
    } else if (op.op === 'insertion') {
      const uChar = userClusters[op.uStart]?.baseChar ?? '';
      if (op.uStart < userClusters.length) {
        userClusterStatus[op.uStart] = 'insertion';
      }
      charDetails.push({
        wordIndex,
        expectedWordDisplay: expectedUthmaniWord,
        userWordDisplay: userWord,
        charPosition: op.uStart + 1,
        opType: 'insertion',
        expectedChar: '—',
        writtenChar: uChar,
        summaryAr: `إضافة حرف زائد في كلمة «${userWord}» (الحرف رقم ${op.uStart + 1}): أضفت «${uChar}» وليس في «${expectedUthmaniWord}»`,
      });
    } else if (op.op === 'transposition') {
      const e1 = best.expectedChars[op.eStart] ?? '';
      const e2 = best.expectedChars[op.eStart + 1] ?? '';
      const u1 = userClusters[op.uStart]?.baseChar ?? '';
      const u2 = userClusters[op.uStart + 1]?.baseChar ?? '';

      const ec1 = best.expectedClusterIndices[op.eStart] ?? op.eStart;
      const ec2 = best.expectedClusterIndices[op.eStart + 1] ?? op.eStart + 1;

      if (STATUS_SEVERITY.transposition > STATUS_SEVERITY[expectedClusterStatus[ec1]]) {
        expectedClusterStatus[ec1] = 'transposition';
        expectedSwapMap[ec1] = `${e1}${e2}`;
      }
      if (STATUS_SEVERITY.transposition > STATUS_SEVERITY[expectedClusterStatus[ec2]]) {
        expectedClusterStatus[ec2] = 'transposition';
        expectedSwapMap[ec2] = `${e1}${e2}`;
      }
      if (op.uStart < userClusters.length) {
        userClusterStatus[op.uStart] = 'transposition';
        userSwapMap[op.uStart] = `${e1}${e2}`;
      }
      if (op.uStart + 1 < userClusters.length) {
        userClusterStatus[op.uStart + 1] = 'transposition';
        userSwapMap[op.uStart + 1] = `${e1}${e2}`;
      }

      charDetails.push({
        wordIndex,
        expectedWordDisplay: expectedUthmaniWord,
        userWordDisplay: userWord,
        charPosition: op.eStart + 1,
        opType: 'transposition',
        expectedChar: `${e1}${e2}`,
        writtenChar: `${u1}${u2}`,
        summaryAr: `تبديل ترتيب الحروف في كلمة «${expectedUthmaniWord}» (الحرفان ${op.eStart + 1} و${op.eStart + 2}): كتبت «${u1}${u2}» والصواب «${e1}${e2}»`,
      });
    }
  }

  let status: WordDiffStatus = 'correct';
  if (charDetails.length > 0) {
    status = 'partial_error';
  } else if (keyboardDetails.length > 0) {
    status = 'keyboard_variant';
  } else if (spacingNote) {
    status = 'spacing_variant';
  }

  return {
    id,
    wordIndex,
    expectedWordDisplay: expectedUthmaniWord,
    userWordDisplay: userWord,
    status,
    expectedChars: expectedClusters.map((c, idx) => ({
      displayCluster: c.raw,
      baseChar: c.baseChar,
      positionInWord: idx + 1,
      status: expectedClusterStatus[idx],
      writtenChar: expectedWrittenMap[idx],
      swappedWithChar: expectedSwapMap[idx],
    })),
    userChars: userClusters.map((c, idx) => ({
      displayCluster: c.raw,
      baseChar: c.baseChar,
      positionInWord: idx + 1,
      status: userClusterStatus[idx],
      expectedChar: userExpectedMap[idx],
      swappedWithChar: userSwapMap[idx],
    })),
    charDetails,
    keyboardDetails,
    spacingNote,
  };
}

function splitCleanWordsForComparison(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[.,،؛؟!«»﴿﴾():\-–—\u06DD\u06DE]/g, '').trim())
    .filter((w) => {
      const stripped = w.replace(COMBINING_MARK_REGEX, '').trim();
      return stripped.length > 0;
    });
}

function wordPairCost(expectedUthmani: string, userWord: string): number {
  const { expectedClusters, userClusters, best } = alignBestVariantForWordPair(
    expectedUthmani,
    userWord
  );
  const maxLen = Math.max(expectedClusters.length, userClusters.length, 1);
  return best.cost / maxLen;
}

/**
 * Full word-level + character-level alignment for an entire ayah or passage.
 * Uses DP across expected display words and user display words, supporting:
 * - exact / keyboard_variant word pairing
 * - 1-word-to-2-word split (extra space inside a word or يَٰٓأَيُّهَا -> يا أيها)
 * - 2-word-to-1-word merge (omitted space between two words)
 * - missing words & extra words
 * - Damerau-Levenshtein character diff inside paired words
 */
export function compareAyahWithCharacterDiff(
  userInput: string,
  exactUthmaniAyah: string
): QuranCharComparisonResult {
  const expectedWords = exactUthmaniAyah
    .trim()
    .split(/\s+/)
    .filter((w) => {
      const cleaned = w.replace(/[\u06D6-\u06ED\u06DD\u06DE]/g, '').trim();
      return cleaned.length > 0;
    });

  const userWords = splitCleanWordsForComparison(userInput);

  if (userWords.length === 0) {
    const alignedWords: AlignedWordComparison[] = expectedWords.map((ew, idx) => {
      const clusters = splitWordIntoDisplayClusters(ew);
      return {
        id: `w-miss-${idx}`,
        wordIndex: idx + 1,
        expectedWordDisplay: ew,
        userWordDisplay: '',
        status: 'missing_word',
        expectedChars: clusters.map((c, ci) => ({
          displayCluster: c.raw,
          baseChar: c.baseChar,
          positionInWord: ci + 1,
          status: 'deletion',
        })),
        userChars: [],
        charDetails: [],
        keyboardDetails: [],
      };
    });

    return {
      isMemorizationCorrect: false,
      alignedWords,
      charDetails: [],
      keyboardVariants: [],
      hasSpacingDifferencesOnly: false,
      exactMatchCount: 0,
      keyboardVariantWordCount: 0,
      errorWordCount: expectedWords.length,
      totalExpectedWords: expectedWords.length,
      firstErrorPosition: 1,
      explanation:
        'لم تُكتب أي كلمات في حقل الإجابة. راجع بداية الموضع وحاول استحضاره بهدوء.',
    };
  }

  const E = expectedWords.length;
  const U = userWords.length;

  type WordStepType = 'pair' | 'skip_expected' | 'skip_user' | 'split_user_2' | 'merge_expected_2';
  interface WordBackPtr {
    prevI: number;
    prevJ: number;
    step: WordStepType;
  }

  const dp: number[][] = Array.from({ length: E + 1 }, () =>
    Array(U + 1).fill(Infinity)
  );
  const back: (WordBackPtr | null)[][] = Array.from({ length: E + 1 }, () =>
    Array(U + 1).fill(null)
  );

  dp[0][0] = 0;
  const SKIP_COST = 0.85; // slightly less than 2 separate skips for unrelated tokens

  for (let i = 1; i <= E; i++) {
    dp[i][0] = i * SKIP_COST;
    back[i][0] = { prevI: i - 1, prevJ: 0, step: 'skip_expected' };
  }
  for (let j = 1; j <= U; j++) {
    dp[0][j] = j * SKIP_COST;
    back[0][j] = { prevI: 0, prevJ: j - 1, step: 'skip_user' };
  }

  for (let i = 1; i <= E; i++) {
    for (let j = 1; j <= U; j++) {
      // 1. Standard 1-to-1 word pairing
      const ratio = wordPairCost(expectedWords[i - 1], userWords[j - 1]);
      // Only prefer pairing over skip+skip if words are reasonably related OR ratio < 1.35
      const pairCost = ratio * 1.15;
      if (dp[i - 1][j - 1] + pairCost < dp[i][j]) {
        dp[i][j] = dp[i - 1][j - 1] + pairCost;
        back[i][j] = { prevI: i - 1, prevJ: j - 1, step: 'pair' };
      }

      // 2. Skip expected (missing word in user answer)
      if (dp[i - 1][j] + SKIP_COST < dp[i][j]) {
        dp[i][j] = dp[i - 1][j] + SKIP_COST;
        back[i][j] = { prevI: i - 1, prevJ: j, step: 'skip_expected' };
      }

      // 3. Skip user (extra word in user answer)
      if (dp[i][j - 1] + SKIP_COST < dp[i][j]) {
        dp[i][j] = dp[i][j - 1] + SKIP_COST;
        back[i][j] = { prevI: i, prevJ: j - 1, step: 'skip_user' };
      }

      // 4. 1 expected word == 2 user words joined (e.g. يَٰٓأَيُّهَا vs يا أيها, or accidental space)
      if (j >= 2) {
        const joinedUser = `${userWords[j - 2]}${userWords[j - 1]}`;
        const splitRatio = wordPairCost(expectedWords[i - 1], joinedUser);
        if (splitRatio <= 0.15) {
          const splitCost = splitRatio * 0.5 + 0.02;
          if (dp[i - 1][j - 2] + splitCost < dp[i][j]) {
            dp[i][j] = dp[i - 1][j - 2] + splitCost;
            back[i][j] = { prevI: i - 1, prevJ: j - 2, step: 'split_user_2' };
          }
        }
      }

      // 5. 2 expected words joined == 1 user word (e.g. omitted space between two words)
      if (i >= 2) {
        const joinedExpected = `${expectedWords[i - 2]}${expectedWords[i - 1]}`;
        const mergeRatio = wordPairCost(joinedExpected, userWords[j - 1]);
        if (mergeRatio <= 0.15) {
          const mergeCost = mergeRatio * 0.5 + 0.02;
          if (dp[i - 2][j - 1] + mergeCost < dp[i][j]) {
            dp[i][j] = dp[i - 2][j - 1] + mergeCost;
            back[i][j] = { prevI: i - 2, prevJ: j - 1, step: 'merge_expected_2' };
          }
        }
      }
    }
  }

  // Reconstruct word alignment path
  const steps: { step: WordStepType; iStart: number; iEnd: number; jStart: number; jEnd: number }[] = [];
  let ci = E;
  let cj = U;
  while (ci > 0 || cj > 0) {
    const ptr = back[ci][cj];
    if (!ptr) break;
    steps.push({
      step: ptr.step,
      iStart: ptr.prevI,
      iEnd: ci,
      jStart: ptr.prevJ,
      jEnd: cj,
    });
    ci = ptr.prevI;
    cj = ptr.prevJ;
  }
  steps.reverse();

  const alignedWords: AlignedWordComparison[] = [];
  const allCharDetails: CharMistakeDetail[] = [];
  const allKeyboardVariants: CharMistakeDetail[] = [];
  let exactMatchCount = 0;
  let keyboardVariantWordCount = 0;
  let errorWordCount = 0;
  let firstErrorPosition: number | null = null;
  let hasSpacingVariant = false;

  for (let sIdx = 0; sIdx < steps.length; sIdx++) {
    const st = steps[sIdx];
    if (st.step === 'pair') {
      const ew = expectedWords[st.iStart];
      const uw = userWords[st.jStart];
      const rec = buildWordComparisonRecord(
        `w-${sIdx}`,
        st.iStart + 1,
        ew,
        uw
      );
      alignedWords.push(rec);
      allCharDetails.push(...rec.charDetails);
      allKeyboardVariants.push(...rec.keyboardDetails);

      if (rec.status === 'correct') {
        exactMatchCount += 1;
      } else if (rec.status === 'keyboard_variant') {
        keyboardVariantWordCount += 1;
      } else {
        errorWordCount += 1;
        if (firstErrorPosition === null) firstErrorPosition = st.iStart + 1;
      }
    } else if (st.step === 'split_user_2') {
      const ew = expectedWords[st.iStart];
      const uwSpace = `${userWords[st.jStart]} ${userWords[st.jStart + 1]}`;
      const uwJoined = `${userWords[st.jStart]}${userWords[st.jStart + 1]}`;
      const rec = buildWordComparisonRecord(
        `w-${sIdx}`,
        st.iStart + 1,
        ew,
        uwJoined,
        `فصل كلمة «${ew}» بمسافة («${uwSpace}») — لا يؤثر على صحة الحفظ`
      );
      // Display user's actual spaced text
      rec.userWordDisplay = uwSpace;
      hasSpacingVariant = true;
      alignedWords.push(rec);
      allCharDetails.push(...rec.charDetails);
      allKeyboardVariants.push(...rec.keyboardDetails);
      if (rec.charDetails.length === 0) {
        exactMatchCount += 1;
      } else {
        errorWordCount += 1;
        if (firstErrorPosition === null) firstErrorPosition = st.iStart + 1;
      }
    } else if (st.step === 'merge_expected_2') {
      const ewJoined = `${expectedWords[st.iStart]} ${expectedWords[st.iStart + 1]}`;
      const ewNoSpace = `${expectedWords[st.iStart]}${expectedWords[st.iStart + 1]}`;
      const uw = userWords[st.jStart];
      const rec = buildWordComparisonRecord(
        `w-${sIdx}`,
        st.iStart + 1,
        ewNoSpace,
        uw,
        `دمج كلمتي «${ewJoined}» دون مسافة — لا يؤثر على صحة الحفظ`
      );
      rec.expectedWordDisplay = ewJoined;
      hasSpacingVariant = true;
      alignedWords.push(rec);
      allCharDetails.push(...rec.charDetails);
      allKeyboardVariants.push(...rec.keyboardDetails);
      if (rec.charDetails.length === 0) {
        exactMatchCount += 2;
      } else {
        errorWordCount += 1;
        if (firstErrorPosition === null) firstErrorPosition = st.iStart + 1;
      }
    } else if (st.step === 'skip_expected') {
      const ew = expectedWords[st.iStart];
      const clusters = splitWordIntoDisplayClusters(ew);
      alignedWords.push({
        id: `w-${sIdx}`,
        wordIndex: st.iStart + 1,
        expectedWordDisplay: ew,
        userWordDisplay: '',
        status: 'missing_word',
        expectedChars: clusters.map((c, idx) => ({
          displayCluster: c.raw,
          baseChar: c.baseChar,
          positionInWord: idx + 1,
          status: 'deletion',
        })),
        userChars: [],
        charDetails: [
          {
            wordIndex: st.iStart + 1,
            expectedWordDisplay: ew,
            userWordDisplay: '—',
            charPosition: 1,
            opType: 'deletion',
            expectedChar: ew,
            writtenChar: '—',
            summaryAr: `نقص كلمة رقم (${st.iStart + 1}): سقطت كلمة «${ew}» من الإجابة`,
          },
        ],
        keyboardDetails: [],
      });
      errorWordCount += 1;
      if (firstErrorPosition === null) firstErrorPosition = st.iStart + 1;
    } else if (st.step === 'skip_user') {
      const uw = userWords[st.jStart];
      const clusters = splitWordIntoDisplayClusters(uw);
      alignedWords.push({
        id: `w-${sIdx}`,
        wordIndex: null,
        expectedWordDisplay: '',
        userWordDisplay: uw,
        status: 'extra_word',
        expectedChars: [],
        userChars: clusters.map((c, idx) => ({
          displayCluster: c.raw,
          baseChar: c.baseChar,
          positionInWord: idx + 1,
          status: 'insertion',
        })),
        charDetails: [
          {
            wordIndex: st.iStart + 1,
            expectedWordDisplay: '—',
            userWordDisplay: uw,
            charPosition: 1,
            opType: 'insertion',
            expectedChar: '—',
            writtenChar: uw,
            summaryAr: `كلمة زائدة: أضفت كلمة «${uw}» وليست في هذا الموضع`,
          },
        ],
        keyboardDetails: [],
      });
      errorWordCount += 1;
      if (firstErrorPosition === null) {
        firstErrorPosition = Math.min(expectedWords.length, st.iStart + 1);
      }
    }
  }

  const isMemorizationCorrect = errorWordCount === 0 && allCharDetails.length === 0;

  let explanation = '';
  if (isMemorizationCorrect) {
    if (allKeyboardVariants.length > 0) {
      explanation = `أحسنت! الحفظ صحيح ومطابق للنص القرآني، مع وجود ${allKeyboardVariants.length} اختلاف كتابي محتمل بسبب لوحة المفاتيح (مثل الهمزات أو التاء المربوطة) ولم يُخصم أي جزء من التقييم.`;
    } else {
      explanation =
        'أحسنت! كتبت الكلمات صحيحة ومطابقة للنص القرآني الموثق (دون احتساب فروق التشكيل أو المسافات أو علامات الوقف).';
    }
  } else {
    const firstWordErr = alignedWords.find(
      (w) =>
        w.status === 'partial_error' ||
        w.status === 'missing_word' ||
        w.status === 'extra_word'
    );
    if (firstWordErr?.status === 'missing_word') {
      explanation = `نقص في الموضع رقم (${firstWordErr.wordIndex}): سقطت كلمة «${firstWordErr.expectedWordDisplay}». راجع المقارنة التفصيلية أدناه.`;
    } else if (firstWordErr?.status === 'extra_word') {
      explanation = `توجد كلمة زائدة «${firstWordErr.userWordDisplay}» عن النص الموثق. راجع المقارنة أدناه.`;
    } else if (allCharDetails.length > 0) {
      explanation = allCharDetails[0].summaryAr;
    } else {
      explanation =
        'يوجد اختلاف في بعض الحروف عن النص القرآني الموثق. راجع مواضع الحروف الموضحة أدناه.';
    }
  }

  return {
    isMemorizationCorrect,
    alignedWords,
    charDetails: allCharDetails,
    keyboardVariants: allKeyboardVariants,
    hasSpacingDifferencesOnly: isMemorizationCorrect && hasSpacingVariant,
    exactMatchCount,
    keyboardVariantWordCount,
    errorWordCount,
    totalExpectedWords: expectedWords.length,
    firstErrorPosition,
    explanation,
  };
}

/**
 * Checks whether a single typed word matches a single authentic Uthmani word
 * without conflating distinct Arabic words (used in Spot Mistake & Recitation).
 */
export function isWordMatchingUthmaniWord(
  userWord: string,
  uthmaniWord: string,
  allowKeyboardVariants = true
): boolean {
  const { best } = alignBestVariantForWordPair(uthmaniWord, userWord);
  if (best.cost === 0) return true;
  if (allowKeyboardVariants) {
    return best.ops.every(
      (op) => op.op === 'match' || op.op === 'keyboard_variant'
    );
  }
  return false;
}
