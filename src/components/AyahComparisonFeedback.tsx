import React from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Info,
  Keyboard,
  MinusCircle,
  PlusCircle,
  Replace,
} from 'lucide-react';
import {
  AlignedWordComparison,
  CharMistakeDetail,
  CharOpType,
  QuranCharComparisonResult,
} from '../utils/quranDiffEngine';

interface AyahComparisonFeedbackProps {
  comparison: QuranCharComparisonResult;
  userRawInput: string;
}

function getExpectedCharSpanClass(status: CharOpType, isWholeWordMissing: boolean): string {
  if (isWholeWordMissing) {
    return 'text-[#9E2A1C] dark:text-[#FCA5A5] bg-[#B84A39]/15 underline decoration-[#B84A39] decoration-2 underline-offset-4';
  }
  switch (status) {
    case 'substitution':
    case 'deletion':
      return 'text-[#9E2A1C] dark:text-[#FCA5A5] bg-[#B84A39]/15 underline decoration-[#B84A39] decoration-2 underline-offset-4 font-bold';
    case 'transposition':
      return 'text-[#9A5B13] dark:text-[#FCD34D] bg-[#D97706]/15 underline decoration-wavy decoration-[#D97706] decoration-2 underline-offset-4 font-bold';
    case 'keyboard_variant':
      return 'text-[#8A6118] dark:text-[#E8C170] underline decoration-dotted decoration-[#C69749] decoration-2 underline-offset-4';
    default:
      return '';
  }
}

function getUserCharSpanClass(status: CharOpType, isWholeWordExtra: boolean): string {
  if (isWholeWordExtra) {
    return 'text-[#9E2A1C] dark:text-[#FCA5A5] bg-[#B84A39]/15 line-through decoration-[#B84A39] decoration-2';
  }
  switch (status) {
    case 'substitution':
    case 'insertion':
      return 'text-[#9E2A1C] dark:text-[#FCA5A5] bg-[#B84A39]/18 underline decoration-[#B84A39] decoration-2 underline-offset-4 font-bold';
    case 'transposition':
      return 'text-[#9A5B13] dark:text-[#FCD34D] bg-[#D97706]/15 underline decoration-wavy decoration-[#D97706] decoration-2 underline-offset-4 font-bold';
    case 'keyboard_variant':
      return 'text-[#8A6118] dark:text-[#E8C170] underline decoration-dotted decoration-[#C69749] decoration-2 underline-offset-4';
    default:
      return '';
  }
}

function getOpLabelAndIcon(opType: CharMistakeDetail['opType']) {
  switch (opType) {
    case 'substitution':
      return {
        label: 'استبدال حرف',
        Icon: Replace,
        badgeCls:
          'bg-[#B84A39]/12 text-[#9E2A1C] dark:text-[#FCA5A5] border border-[#B84A39]/30',
      };
    case 'deletion':
      return {
        label: 'حذف حرف',
        Icon: MinusCircle,
        badgeCls:
          'bg-[#B84A39]/12 text-[#9E2A1C] dark:text-[#FCA5A5] border border-[#B84A39]/30',
      };
    case 'insertion':
      return {
        label: 'إضافة حرف زائد',
        Icon: PlusCircle,
        badgeCls:
          'bg-[#B84A39]/12 text-[#9E2A1C] dark:text-[#FCA5A5] border border-[#B84A39]/30',
      };
    case 'transposition':
      return {
        label: 'تبديل ترتيب الحروف',
        Icon: ArrowLeftRight,
        badgeCls:
          'bg-[#D97706]/12 text-[#9A5B13] dark:text-[#FCD34D] border border-[#D97706]/35',
      };
    case 'keyboard_variant':
      return {
        label: 'اختلاف كتابي محتمل (لوحة المفاتيح)',
        Icon: Keyboard,
        badgeCls:
          'bg-[#C69749]/15 text-[#8A6118] dark:text-[#E8C170] border border-[#C69749]/40',
      };
  }
}

function getWordChipTone(status: AlignedWordComparison['status']): string {
  switch (status) {
    case 'correct':
    case 'spacing_variant':
      return 'border-[#E6DEC9] dark:border-[#224434] bg-[#F7F3EA]/70 dark:bg-[#0F241A]';
    case 'keyboard_variant':
      return 'border-[#C69749]/45 bg-[#C69749]/8 dark:bg-[#C69749]/10';
    case 'partial_error':
    case 'missing_word':
    case 'extra_word':
      return 'border-[#B84A39]/40 bg-[#B84A39]/6 dark:bg-[#B84A39]/10';
  }
}

export const AyahComparisonFeedback: React.FC<AyahComparisonFeedbackProps> = ({
  comparison,
  userRawInput,
}) => {
  const {
    alignedWords,
    charDetails,
    keyboardVariants,
    hasSpacingDifferencesOnly,
    exactMatchCount,
    keyboardVariantWordCount,
    totalExpectedWords,
  } = comparison;

  const wordsWithCharErrors = alignedWords.filter(
    (w) =>
      w.status === 'partial_error' ||
      w.status === 'missing_word' ||
      w.status === 'extra_word'
  );

  return (
    <div className="space-y-4">
      {/* Compact Summary Legend & Word Score */}
      <div className="rounded-xl bg-[#FFFDF9] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs sm:text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA] tabular-nums">
            دقة المقارنة الحرفية: {Math.min(exactMatchCount + keyboardVariantWordCount, totalExpectedWords)} من{' '}
            {totalExpectedWords} كلمة موافقة
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#5C665E] dark:text-[#BFB6A4]">
            <span className="inline-flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-[#B84A39]" aria-hidden="true" />
              <span>الحرف المختلف/الناقص محدد باللون الأحمر</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Keyboard className="w-3.5 h-3.5 text-[#9C6F21] dark:text-[#D6A954]" aria-hidden="true" />
              <span>اختلاف لوحة المفاتيح منقّط بالذهبي (دون خصم)</span>
            </span>
          </div>
        </div>

        {/* LINE 1: Verified Uthmani Text (Original, Never Modified) */}
        <div className="rounded-xl bg-[#F7F3EA] dark:bg-[#132B20] border border-[#E6DEC9] dark:border-[#224434] p-4 sm:p-5 space-y-2">
          <div className="text-xs font-bold text-[#9C6F21] dark:text-[#D6A954] flex items-center justify-between gap-2">
            <span>السطر الأول — النص القرآني الصحيح (بالرسم العثماني الموثق)</span>
            <span className="opacity-80">رواية حفص عن عاصم</span>
          </div>

          <p
            dir="rtl"
            className="font-quran text-2xl sm:text-3xl leading-[2.45] text-[#1A2A22] dark:text-[#F7F3EA]"
          >
            {alignedWords
              .filter((w) => w.status !== 'extra_word')
              .map((w, idx) => {
                const isWholeMissing = w.status === 'missing_word';
                // If spacing merged two words, display verbatim expectedWordDisplay
                if (w.status === 'spacing_variant' && w.expectedWordDisplay.includes(' ')) {
                  return (
                    <React.Fragment key={w.id}>
                      {idx > 0 ? ' ' : ''}
                      <span>{w.expectedWordDisplay}</span>
                    </React.Fragment>
                  );
                }

                return (
                  <React.Fragment key={w.id}>
                    {idx > 0 ? ' ' : ''}
                    <span className="inline">
                      {w.expectedChars.length > 0
                        ? w.expectedChars.map((ch, cIdx) => (
                            <span
                              key={`${w.id}-ec-${cIdx}`}
                              className={getExpectedCharSpanClass(
                                ch.status,
                                isWholeMissing
                              )}
                            >
                              {ch.displayCluster}
                            </span>
                          ))
                        : w.expectedWordDisplay}
                    </span>
                  </React.Fragment>
                );
              })}
          </p>
        </div>

        {/* LINE 2: User's Written Answer with Exact Per-Letter Highlighting */}
        <div className="rounded-xl bg-[#FFFDF9] dark:bg-[#0D1E16] border border-[#DFD6C5] dark:border-[#244736] p-4 sm:p-5 space-y-2">
          <div className="text-xs font-bold text-[#133A2A] dark:text-[#D6A954] flex items-center justify-between gap-2">
            <span>السطر الثاني — إجابتك المكتوبة (مقارنة حرفاً بحرف)</span>
            {hasSpacingDifferencesOnly && (
              <span className="inline-flex items-center gap-1 text-[#1B6B46] dark:text-[#6EE7B7]">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>تجاهل تلقائي لاختلاف المسافات</span>
              </span>
            )}
          </div>

          {userRawInput.trim().length === 0 ? (
            <p className="text-sm text-[#6B6254] dark:text-[#BFB6A4] italic">
              (لم تكتب كلمات للمقارنة)
            </p>
          ) : (
            <p
              dir="rtl"
              className="font-quran text-2xl sm:text-3xl leading-[2.45] text-[#1A2A22] dark:text-[#F7F3EA]"
            >
              {alignedWords.map((w, idx) => {
                if (w.status === 'missing_word') {
                  return (
                    <React.Fragment key={w.id}>
                      {idx > 0 ? ' ' : ''}
                      <span
                        title={`كلمة ناقصة: ${w.expectedWordDisplay}`}
                        className="font-ui text-xs sm:text-sm align-middle px-2 py-0.5 rounded-md bg-[#B84A39]/12 text-[#9E2A1C] dark:text-[#FCA5A5] border border-dashed border-[#B84A39]/50"
                      >
                        [نقص: {w.expectedWordDisplay}]
                      </span>
                    </React.Fragment>
                  );
                }

                const isWholeExtra = w.status === 'extra_word';
                return (
                  <React.Fragment key={w.id}>
                    {idx > 0 ? ' ' : ''}
                    <span className="inline">
                      {w.userChars.length > 0 && !w.userWordDisplay.includes(' ')
                        ? w.userChars.map((ch, cIdx) => (
                            <span
                              key={`${w.id}-uc-${cIdx}`}
                              className={getUserCharSpanClass(
                                ch.status,
                                isWholeExtra
                              )}
                            >
                              {ch.displayCluster}
                            </span>
                          ))
                        : w.userWordDisplay}
                    </span>
                  </React.Fragment>
                );
              })}
            </p>
          )}
        </div>
      </div>

      {/* Non-punitive Keyboard Variants Notice */}
      {keyboardVariants.length > 0 && (
        <div className="rounded-xl bg-[#C69749]/10 dark:bg-[#C69749]/12 border border-[#C69749]/40 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#8A6118] dark:text-[#E8C170]">
            <Keyboard className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              ملاحظة كتابية (لوحة المفاتيح) — لم يُخصم أي جزء من التقييم ({keyboardVariants.length}):
            </span>
          </div>
          <ul className="space-y-1 text-xs sm:text-sm text-[#46524B] dark:text-[#E5DDCC] list-disc pr-5">
            {keyboardVariants.map((kv, i) => (
              <li key={`${kv.wordIndex}-${kv.charPosition}-${i}`}>{kv.summaryAr}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed Character-Level Error Analysis for Differing Words */}
      {(wordsWithCharErrors.length > 0 || charDetails.length > 0) && (
        <div className="rounded-xl bg-[#FFFDF9] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]">
            <Info className="w-4 h-4 text-[#B84A39] shrink-0" aria-hidden="true" />
            <span>تفصيل الحروف والكلمات التي تحتاج إلى تصحيح</span>
          </div>

          <div className="space-y-3">
            {wordsWithCharErrors.map((w) => (
              <div
                key={`detail-${w.id}`}
                className={`rounded-xl border p-3.5 space-y-2.5 ${getWordChipTone(w.status)}`}
              >
                {/* Word Pair Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    {w.expectedWordDisplay && (
                      <div>
                        <span className="text-xs text-[#6B6254] dark:text-[#BFB6A4] ml-1.5">
                          الصحيح:
                        </span>
                        <span className="font-quran text-xl text-[#133A2A] dark:text-[#F7F3EA]">
                          {w.expectedWordDisplay}
                        </span>
                      </div>
                    )}
                    {w.userWordDisplay && (
                      <div>
                        <span className="text-xs text-[#6B6254] dark:text-[#BFB6A4] ml-1.5">
                          كتبتَ:
                        </span>
                        <span className="font-quran text-xl text-[#9E2A1C] dark:text-[#FCA5A5]">
                          {w.userWordDisplay}
                        </span>
                      </div>
                    )}
                  </div>
                  {w.wordIndex && (
                    <span className="text-xs font-semibold text-[#6B6254] dark:text-[#BFB6A4] tabular-nums">
                      الكلمة رقم ({w.wordIndex})
                    </span>
                  )}
                </div>

                {/* Isolated Letter-by-Letter Inspection Row for partial_error */}
                {w.status === 'partial_error' && w.expectedChars.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {w.expectedChars.map((ec, ci) => {
                      const isErr =
                        ec.status === 'substitution' ||
                        ec.status === 'deletion' ||
                        ec.status === 'transposition';
                      return (
                        <div
                          key={`${w.id}-tile-${ci}`}
                          className={`min-w-[38px] px-2 py-1 rounded-lg border text-center ${
                            isErr
                              ? 'border-[#B84A39] bg-[#B84A39]/12 text-[#9E2A1C] dark:text-[#FCA5A5]'
                              : ec.status === 'keyboard_variant'
                              ? 'border-[#C69749] bg-[#C69749]/12 text-[#8A6118] dark:text-[#E8C170]'
                              : 'border-[#DFD6C5] dark:border-[#244736] bg-[#FFFDF9] dark:bg-[#132B20] text-[#1A2A22] dark:text-[#F7F3EA]'
                          }`}
                        >
                          <div className="font-quran text-lg leading-normal">
                            {ec.displayCluster}
                          </div>
                          <div className="text-[10px] opacity-75 tabular-nums">
                            {ec.status === 'substitution' && ec.writtenChar
                              ? `بدل: ${ec.writtenChar}`
                              : ec.status === 'deletion'
                              ? 'ناقص'
                              : ec.status === 'transposition'
                              ? 'مبدّل'
                              : ec.positionInWord}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Specific Character Action Rows */}
                <div className="space-y-1.5">
                  {w.charDetails.map((cd, cdIdx) => {
                    const meta = getOpLabelAndIcon(cd.opType);
                    const OpIcon = meta.Icon;
                    return (
                      <div
                        key={`${w.id}-cd-${cdIdx}`}
                        className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#1A2A22] dark:text-[#F7F3EA]"
                      >
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold shrink-0 ${meta.badgeCls}`}
                        >
                          <OpIcon className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{meta.label}</span>
                        </span>
                        <span>{cd.summaryAr}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
