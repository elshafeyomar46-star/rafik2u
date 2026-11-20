import React from 'react';
import { BookMarked, BookOpen, ScrollText } from 'lucide-react';
import { SUPPLEMENTARY_NOTICE_TEXT } from '../data/tajweedUnitsMeta';
import { MutunWitness, SupplementaryScholarSource } from '../types';

interface MutunWitnessSectionProps {
  ruleTitle: string;
  witnesses: MutunWitness[];
  supplementarySource?: SupplementaryScholarSource;
  fontSizeClass: string;
}

function stripDiacriticsForMatch(input: string): string {
  return input
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderHemistichWithHighlight(text: string, phrase: string): React.ReactNode {
  const cleanPhrase = phrase.trim();
  if (!cleanPhrase) return text;

  // Direct substring match first
  const exactIdx = text.indexOf(cleanPhrase);
  if (exactIdx !== -1) {
    return (
      <>
        {text.slice(0, exactIdx)}
        <mark className="bg-[#C69749]/30 dark:bg-[#C69749]/35 text-[#133A2A] dark:text-[#FFF8E7] px-1 rounded">
          {text.slice(exactIdx, exactIdx + cleanPhrase.length)}
        </mark>
        {text.slice(exactIdx + cleanPhrase.length)}
      </>
    );
  }

  // Normalized token span match (preserves original Tashkeel of the Matn verbatim)
  const rawTokens = text.split(/(\s+)/);
  const wordTokens: { rawIdx: number; norm: string }[] = [];
  rawTokens.forEach((tok, idx) => {
    if (tok.trim()) {
      wordTokens.push({ rawIdx: idx, norm: stripDiacriticsForMatch(tok) });
    }
  });

  const phraseWords = stripDiacriticsForMatch(cleanPhrase)
    .split(' ')
    .filter(Boolean);

  if (phraseWords.length === 0 || wordTokens.length === 0) return text;

  for (let start = 0; start <= wordTokens.length - phraseWords.length; start++) {
    let matched = true;
    for (let k = 0; k < phraseWords.length; k++) {
      if (!wordTokens[start + k].norm.includes(phraseWords[k]) && !phraseWords[k].includes(wordTokens[start + k].norm)) {
        matched = false;
        break;
      }
    }
    if (matched) {
      const startRawIdx = wordTokens[start].rawIdx;
      const endRawIdx = wordTokens[start + phraseWords.length - 1].rawIdx;
      const before = rawTokens.slice(0, startRawIdx).join('');
      const target = rawTokens.slice(startRawIdx, endRawIdx + 1).join('');
      const after = rawTokens.slice(endRawIdx + 1).join('');
      return (
        <>
          {before}
          <mark className="bg-[#C69749]/30 dark:bg-[#C69749]/35 text-[#133A2A] dark:text-[#FFF8E7] px-1 rounded">
            {target}
          </mark>
          {after}
        </>
      );
    }
  }

  return text;
}

export const MutunWitnessSection: React.FC<MutunWitnessSectionProps> = ({
  ruleTitle,
  witnesses,
  supplementarySource,
  fontSizeClass,
}) => {
  if (!witnesses || witnesses.length === 0) {
    return (
      <section className="space-y-3" aria-label="الشواهد من المتون العلمية">
        <div className="flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-[#9C6F21] dark:text-[#D6A954]" aria-hidden="true" />
          <h4 className="font-bold text-base text-[#133A2A] dark:text-[#F7F3EA]">
            الشاهد من المتون العلمية المعتمدة
          </h4>
        </div>

        <div className="rounded-2xl bg-[#F4EDE0] dark:bg-[#173326] border border-[#DFD6C5] dark:border-[#244736] p-5 space-y-3">
          <div className="flex items-start gap-2.5">
            <BookOpen className="w-5 h-5 text-[#9C6F21] dark:text-[#D6A954] shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1.5">
              <p className="font-bold text-sm sm:text-base text-[#133A2A] dark:text-[#F7F3EA]">
                {supplementarySource?.noticeText || SUPPLEMENTARY_NOTICE_TEXT}
              </p>
              {supplementarySource && (
                <div className="text-sm text-[#46524B] dark:text-[#D8D0C0] space-y-1 pt-1">
                  <div className="font-semibold text-[#1B6B46] dark:text-[#6EE7B7]">
                    المرجع العلمي الموثوق: {supplementarySource.sourceTitle} · {supplementarySource.author}
                  </div>
                  <p className="leading-relaxed">{supplementarySource.topicSummary}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3" aria-label="الشواهد من المتون العلمية">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-[#9C6F21] dark:text-[#D6A954]" aria-hidden="true" />
          <h4 className="font-bold text-base text-[#133A2A] dark:text-[#F7F3EA]">
            الشواهد الشعرية من المتون المعتمدة
          </h4>
        </div>
        <span className="text-xs font-semibold text-[#6B6254] dark:text-[#BFB6A4] tabular-nums">
          {witnesses.length === 2
            ? 'شاهد مزدوج: تحفة الأطفال والمقدمة الجزرية'
            : witnesses[0].matnName}
        </span>
      </div>

      <div className="space-y-4">
        {witnesses.map((w) => (
          <article
            key={w.id}
            className="rounded-2xl bg-[#F4EDE0] dark:bg-[#173326] border border-[#DFD6C5] dark:border-[#244736] p-5 space-y-4"
          >
            {/* Metadata row — clean inline separator */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5DCC9] dark:border-[#244736] pb-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-[#9C6F21] dark:text-[#D6A954]">
                  الحكم: {ruleTitle}
                </div>
                <div className="text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA] flex flex-wrap items-center gap-1.5">
                  <BookMarked className="w-4 h-4 text-[#1B6B46] dark:text-[#6EE7B7]" aria-hidden="true" />
                  <span>{w.matnName}</span>
                  <span className="text-[#8C8373]" aria-hidden="true">·</span>
                  <span>
                    الباب ({w.chapterNumber}): {w.chapterTitle}
                  </span>
                </div>
              </div>

              <div className="text-xs font-bold text-[#1B6B46] dark:text-[#6EE7B7] tabular-nums">
                {w.verseIndicesLabel}
              </div>
            </div>

            {/* Verified Poetry Verses with full Tashkeel */}
            <div className="space-y-3 rounded-xl bg-[#FFFDF9] dark:bg-[#0F241A] border border-[#E6DEC9] dark:border-[#224434] p-4">
              {w.verses.map((v) => (
                <div
                  key={v.verseNumber}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-baseline border-b last:border-b-0 border-[#F0E9D8] dark:border-[#1B3A2C] pb-2.5 last:pb-0"
                >
                  <div className="md:col-span-1 text-xs font-bold text-[#9C6F21] dark:text-[#D6A954] tabular-nums">
                    ({v.verseNumber})
                  </div>
                  <div className="md:col-span-5 font-display text-xl sm:text-2xl leading-loose text-[#133A2A] dark:text-[#F7F3EA]">
                    {renderHemistichWithHighlight(v.sadr, w.highlightedPhrase)}
                  </div>
                  <div className="md:col-span-6 font-display text-xl sm:text-2xl leading-loose text-[#133A2A] dark:text-[#F7F3EA] md:text-left">
                    {renderHemistichWithHighlight(v.ajuz, w.highlightedPhrase)}
                  </div>
                </div>
              ))}
            </div>

            {/* Highlighted Phrase & Simple Explanation */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-[#9C6F21] dark:text-[#D6A954]">
                موضع الدلالة في الشاهد: «{w.highlightedPhrase}»
              </div>
              <p className={`${fontSizeClass} text-[#46524B] dark:text-[#D8D0C0] leading-relaxed`}>
                {w.simpleExplanation}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
