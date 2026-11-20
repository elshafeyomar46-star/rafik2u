import React, { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Search } from 'lucide-react';
import { VERIFIED_JAZARIYYAH_MATN, VERIFIED_TUHFA_MATN } from '../data/verifiedMutun';
import { MutunId } from '../types';

interface MutunLibraryViewProps {
  onClose: () => void;
  fontSizeClass: string;
}

function normalizeArabicSearch(text: string): string {
  return text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .trim();
}

export const MutunLibraryView: React.FC<MutunLibraryViewProps> = ({
  onClose,
  fontSizeClass,
}) => {
  const [activeMatn, setActiveMatn] = useState<MutunId>('tuhfa');
  const [searchQuery, setSearchQuery] = useState('');

  const doc =
    activeMatn === 'tuhfa' ? VERIFIED_TUHFA_MATN : VERIFIED_JAZARIYYAH_MATN;

  const filteredChapters = useMemo(() => {
    const q = normalizeArabicSearch(searchQuery);
    if (!q) return doc.chapters;
    return doc.chapters
      .map((ch) => ({
        ...ch,
        verses: ch.verses.filter(
          (v) =>
            normalizeArabicSearch(v.sadr).includes(q) ||
            normalizeArabicSearch(v.ajuz).includes(q) ||
            normalizeArabicSearch(ch.title).includes(q) ||
            String(v.verseNumber) === q
        ),
      }))
      .filter((ch) => ch.verses.length > 0);
  }, [doc, searchQuery]);

  return (
    <section className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ECE4D4] dark:border-[#214232] pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#9C6F21] dark:text-[#D6A954]">
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            <span>النصوص المرجعية المعتمدة والمضبوطة بالشكل</span>
          </div>
          <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
            مكتبة المتون العلمية المعتمدة
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#133A2A] hover:bg-[#1B4D38] dark:bg-[#C69749] text-[#F7F3EA] dark:text-[#133A2A] text-sm font-bold inline-flex items-center gap-2 self-start cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
          <span>العودة إلى دروس الأكاديمية</span>
        </button>
      </div>

      {/* Matn Tabs + Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-[#EAE2D2] dark:bg-[#193729] self-start">
          <button
            type="button"
            onClick={() => setActiveMatn('tuhfa')}
            className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
              activeMatn === 'tuhfa'
                ? 'bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A]'
                : 'text-[#46524B] dark:text-[#D8D0C0]'
            }`}
          >
            متن تحفة الأطفال ({VERIFIED_TUHFA_MATN.totalVerses} بيتاً)
          </button>
          <button
            type="button"
            onClick={() => setActiveMatn('jazariyyah')}
            className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
              activeMatn === 'jazariyyah'
                ? 'bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A]'
                : 'text-[#46524B] dark:text-[#D8D0C0]'
            }`}
          >
            المقدمة الجزرية ({VERIFIED_JAZARIYYAH_MATN.totalVerses} بيتاً)
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search
            className="w-4 h-4 text-[#8C8373] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في الأبيات أو الأبواب أو رقم البيت..."
            className="w-full min-h-[44px] pr-10 pl-4 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-sm text-[#1A2A22] dark:text-[#F7F3EA]"
          />
        </div>
      </div>

      {/* Edition Notice */}
      <div className="rounded-2xl bg-[#F4EDE0] dark:bg-[#173326] p-4 space-y-1">
        <div className="font-bold text-base text-[#133A2A] dark:text-[#F7F3EA]">
          {doc.fullTitle}
        </div>
        <div className="text-xs sm:text-sm text-[#6B6254] dark:text-[#BFB6A4]">
          الناظم: {doc.author} · {doc.editionNote}
        </div>
      </div>

      {/* Chapters & Verses */}
      <div className="space-y-6">
        {filteredChapters.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] text-sm text-[#6B6254] dark:text-[#BFB6A4]">
            لا توجد أبيات مطابقة لعبارة البحث المدخلة.
          </div>
        ) : (
          filteredChapters.map((ch) => (
            <div
              key={ch.chapterNumber}
              className="rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E6DEC9] dark:border-[#224434] p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6DEC9] dark:border-[#224434] pb-3">
                <h4 className="font-display text-xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                  الباب ({ch.chapterNumber}): {ch.title}
                </h4>
                <span className="text-xs font-semibold text-[#9C6F21] dark:text-[#D6A954] tabular-nums">
                  {ch.verses.length} أبيات
                </span>
              </div>

              <div className="space-y-3">
                {ch.verses.map((v) => (
                  <div
                    key={v.verseNumber}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-baseline border-b last:border-b-0 border-[#ECE4D4] dark:border-[#1B3A2C] pb-2.5 last:pb-0"
                  >
                    <div className="md:col-span-1 text-xs font-bold text-[#9C6F21] dark:text-[#D6A954] tabular-nums">
                      ({v.verseNumber})
                    </div>
                    <div
                      className={`md:col-span-5 font-display ${
                        fontSizeClass === 'text-xl'
                          ? 'text-2xl'
                          : 'text-xl'
                      } leading-loose text-[#133A2A] dark:text-[#F7F3EA]`}
                    >
                      {v.sadr}
                    </div>
                    <div
                      className={`md:col-span-6 font-display ${
                        fontSizeClass === 'text-xl'
                          ? 'text-2xl'
                          : 'text-xl'
                      } leading-loose text-[#133A2A] dark:text-[#F7F3EA] md:text-left`}
                    >
                      {v.ajuz}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
