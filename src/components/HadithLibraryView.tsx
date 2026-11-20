import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Filter,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
  SplitSquareVertical,
} from 'lucide-react';
import { searchHadithLibraryApi } from '../services/hadithApi';
import {
  HadithBookId,
  HadithLibraryManifest,
  HadithLibraryRecord,
  HadithLibrarySearchResponse,
  HadithRecordClassification,
} from '../types';

interface HadithLibraryViewProps {
  manifest: HadithLibraryManifest | null;
  manifestLoading: boolean;
  manifestError: string | null;
  savedLibraryRecords: HadithLibraryRecord[];
  onToggleSaveRecord: (record: HadithLibraryRecord) => void;
  onOpenAuditReport: () => void;
  fontSizeClass: string;
}

export const HadithLibraryView: React.FC<HadithLibraryViewProps> = ({
  manifest,
  manifestLoading,
  manifestError,
  savedLibraryRecords,
  onToggleSaveRecord,
  onOpenAuditReport,
  fontSizeClass,
}) => {
  const [selectedBook, setSelectedBook] = useState<'all' | HadithBookId>('all');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [selectedNarrator, setSelectedNarrator] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [classification, setClassification] = useState<
    'all' | HadithRecordClassification
  >('prophetic_hadith');
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [splitIsnadById, setSplitIsnadById] = useState<Record<string, boolean>>(
    {}
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [results, setResults] = useState<HadithLibrarySearchResponse | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce text/number search input
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
      setPage(1);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // Available chapters depend on the selected book
  const availableChapters = useMemo(() => {
    if (!manifest) return [];
    if (selectedBook !== 'all') {
      return manifest.chaptersByBook[selectedBook] ?? [];
    }
    return [
      ...manifest.chaptersByBook.bukhari,
      ...manifest.chaptersByBook.muslim,
      ...manifest.chaptersByBook.ibnmajah,
    ];
  }, [manifest, selectedBook]);

  // Execute live backend search when filters change
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void searchHadithLibraryApi({
      book: selectedBook,
      chapterId:
        selectedBook !== 'all' && selectedChapterId !== ''
          ? Number(selectedChapterId)
          : null,
      narrator: selectedNarrator,
      topic: selectedTopic,
      grade: selectedGrade,
      classification,
      q: debouncedQuery,
      page,
      pageSize: 12,
    })
      .then((res) => {
        if (!active) return;
        setResults(res);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : 'تعذر تحميل نتائج البحث من المكتبة الحديثية.'
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    selectedBook,
    selectedChapterId,
    selectedNarrator,
    selectedTopic,
    selectedGrade,
    classification,
    debouncedQuery,
    page,
  ]);

  const handleSelectBook = (book: 'all' | HadithBookId) => {
    setSelectedBook(book);
    setSelectedChapterId('');
    setPage(1);
  };

  const handleResetFilters = () => {
    setSelectedBook('all');
    setSelectedChapterId('');
    setSelectedNarrator('');
    setSelectedTopic('');
    setSelectedGrade('');
    setClassification('prophetic_hadith');
    setSearchInput('');
    setDebouncedQuery('');
    setPage(1);
  };

  const handleCopyHadith = async (record: HadithLibraryRecord) => {
    const formatted = `${record.fullArabicText}\n\n— ${record.bookTitle} (${record.chapterName}) · رقم (${record.hadithNumber}) · الدرجة: ${record.authenticityGrade}`;
    try {
      await navigator.clipboard.writeText(formatted);
    } catch {
      // Ignore clipboard unavailability
    }
    setCopiedId(record.id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const savedIdsSet = useMemo(
    () => new Set(savedLibraryRecords.map((r) => r.id)),
    [savedLibraryRecords]
  );

  return (
    <div className="space-y-6">
      {/* Unified Library Stats & Collection Selector */}
      <section className="rounded-3xl bg-[#133A2A] dark:bg-[#163628] text-[#F7F3EA] p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-[#D6A954]">
              المكتبة الحديثية الموحدة · النصوص الأصلية الكاملة
            </div>
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-white">
              صحيح البخاري · صحيح مسلم · سنن ابن ماجه
            </h3>
            <p className="text-xs sm:text-sm text-[#DFD6C5] tabular-nums">
              {manifest
                ? `${manifest.totalImportedCount.toLocaleString('en-US')} سجلاً مستورداً من المصادر الرقمية الموثوقة دون اختصار أو تعديل`
                : manifestLoading
                ? 'جاري تحميل فهرس الكتب...'
                : manifestError ?? ''}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAuditReport}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1B4A36] hover:bg-[#235C44] border border-[#C69749]/40 text-[#D6A954] text-xs sm:text-sm font-bold inline-flex items-center gap-2 self-start cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            <span>تقرير اكتمال المصادر والنسخ</span>
          </button>
        </div>

        {/* Source Books Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {[
            {
              id: 'all' as const,
              label: `جميع الكتب (${
                manifest
                  ? manifest.totalImportedCount.toLocaleString('en-US')
                  : '...'
              })`,
            },
            ...(manifest?.books.map((b) => ({
              id: b.bookId,
              label: `${b.bookTitle} (${b.importedCount.toLocaleString('en-US')})`,
            })) ?? [
              { id: 'bukhari' as const, label: 'صحيح البخاري' },
              { id: 'muslim' as const, label: 'صحيح مسلم' },
              { id: 'ibnmajah' as const, label: 'سنن ابن ماجه' },
            ]),
          ].map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => handleSelectBook(b.id)}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold transition-colors tabular-nums cursor-pointer ${
                selectedBook === b.id
                  ? 'bg-[#C69749] text-[#133A2A]'
                  : 'bg-[#1B4A36] text-[#F7F3EA] hover:bg-[#225841]'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </section>

      {/* Multi-Facet Search & Filtering Deck */}
      <section
        className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-5 sm:p-6 space-y-4"
        aria-label="أدوات البحث والتصفية"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]">
            <Filter className="w-4 h-4 text-[#9C6F21] dark:text-[#D6A954]" />
            <span>تصفية حسب الكتاب، الباب، الراوي، الموضوع، والدرجة</span>
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] text-xs font-bold text-[#133A2A] dark:text-[#F7F3EA] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة ضبط التصفيات</span>
          </button>
        </div>

        {/* Search & Classification Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-6 relative">
            <Search
              className="w-4 h-4 text-[#8C8373] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ابحث بكلمات الحديث (دون الحاجة للتشكيل) أو برقم الحديث (مثل 5027)..."
              className="w-full min-h-[46px] pr-10 pl-4 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-sm text-[#1A2A22] dark:text-[#F7F3EA]"
            />
          </div>

          {/* Separation between Prophetic Hadith and Athar/Intro */}
          <div className="lg:col-span-6 flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#EAE2D2] dark:bg-[#193729]">
            {[
              { id: 'prophetic_hadith' as const, label: 'الأحاديث النبوية المرفوعة' },
              { id: 'athar_or_intro' as const, label: 'الآثار والمقدمة فقط' },
              { id: 'all' as const, label: 'جميع السجلات' },
            ].map((cls) => (
              <button
                key={cls.id}
                type="button"
                onClick={() => {
                  setClassification(cls.id);
                  setPage(1);
                }}
                className={`flex-1 min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  classification === cls.id
                    ? 'bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A]'
                    : 'text-[#46524B] dark:text-[#D8D0C0]'
                }`}
              >
                {cls.label}
              </button>
            ))}
          </div>
        </div>

        {/* Select Filters: Chapter/Book, Narrator, Topic, Grade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Chapter / Book inside Collection */}
          <div>
            <label className="block text-xs font-bold text-[#6B6254] dark:text-[#BFB6A4] mb-1">
              الكتاب / الباب {selectedBook === 'all' ? '(اختر كتاباً أولاً)' : ''}
            </label>
            <select
              disabled={selectedBook === 'all'}
              value={selectedChapterId}
              onChange={(e) => {
                setSelectedChapterId(e.target.value);
                setPage(1);
              }}
              className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-xs sm:text-sm disabled:opacity-55"
            >
              <option value="">جميع الأبواب والكتب</option>
              {selectedBook !== 'all' &&
                availableChapters.map((ch) => (
                  <option key={`${ch.bookId}-${ch.chapterId}`} value={ch.chapterId}>
                    {ch.chapterName} ({ch.count})
                  </option>
                ))}
            </select>
          </div>

          {/* Narrator */}
          <div>
            <label className="block text-xs font-bold text-[#6B6254] dark:text-[#BFB6A4] mb-1">
              الصحابي الراوي
            </label>
            <select
              value={selectedNarrator}
              onChange={(e) => {
                setSelectedNarrator(e.target.value);
                setPage(1);
              }}
              className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-xs sm:text-sm"
            >
              <option value="">جميع الرواة</option>
              {manifest?.topNarrators.map((n) => (
                <option key={n.name} value={n.name}>
                  {n.name} ({n.count})
                </option>
              ))}
            </select>
          </div>

          {/* Topic */}
          <div>
            <label className="block text-xs font-bold text-[#6B6254] dark:text-[#BFB6A4] mb-1">
              الموضوع
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                setPage(1);
              }}
              className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-xs sm:text-sm"
            >
              <option value="">جميع المواضيع</option>
              {manifest?.topics.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} ({t.count})
                </option>
              ))}
            </select>
          </div>

          {/* Grade */}
          <div>
            <label className="block text-xs font-bold text-[#6B6254] dark:text-[#BFB6A4] mb-1">
              درجة الحديث الموثقة
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setPage(1);
              }}
              className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-xs sm:text-sm"
            >
              <option value="">جميع الدرجات</option>
              {manifest?.grades.map((g) => (
                <option key={g.name} value={g.name}>
                  {g.name} ({g.count})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Results Header & Pagination Top */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA] tabular-nums">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#C69749]" />
              <span>جاري البحث في المكتبة الحديثية...</span>
            </span>
          ) : results ? (
            <span>
              إجمالي النتائج المطابقة: {results.total.toLocaleString('en-US')} حديثاً/أثراً · صفحة{' '}
              {results.page} من {results.totalPages}
            </span>
          ) : null}
        </div>

        {results && results.totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] disabled:opacity-40 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق</span>
            </button>
            <button
              type="button"
              disabled={page >= results.totalPages || loading}
              onClick={() => {
                setPage((p) => Math.min(results.totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] disabled:opacity-40 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-2xl bg-[#B84A39]/10 border border-[#B84A39] p-5 flex items-center gap-3 text-sm text-[#B84A39] dark:text-[#FCA5A5]">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && results && results.items.length === 0 && (
        <div className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-10 text-center space-y-3">
          <div className="font-display text-2xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
            لا توجد نتائج مطابقة للتصفيات المختارة
          </div>
          <p className="text-sm text-[#6B6254] dark:text-[#BFB6A4]">
            جرّب تغيير كلمات البحث أو إعادة ضبط تصفيات الراوي والباب والدرجة.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-[#C69749] text-[#133A2A] font-bold text-sm cursor-pointer"
          >
            عرض جميع الأحاديث المرفوعة
          </button>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-4">
        {results?.items.map((record) => {
          const isSaved = savedIdsSet.has(record.id);
          const showSplit = splitIsnadById[record.id] === true && Boolean(record.isnad);

          return (
            <article
              key={record.id}
              className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 sm:p-7 space-y-4"
            >
              {/* Unboxed Header Metadata */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ECE4D4] dark:border-[#214232] pb-3">
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-bold text-[#9C6F21] dark:text-[#D6A954] tabular-nums">
                  <BookOpen className="w-4 h-4 text-[#1B6B46] dark:text-[#6EE7B7]" aria-hidden="true" />
                  <span>{record.bookTitle}</span>
                  <span className="text-[#8C8373]" aria-hidden="true">·</span>
                  <span>{record.chapterName}</span>
                  <span className="text-[#8C8373]" aria-hidden="true">·</span>
                  <span>حديث رقم ({record.hadithNumber})</span>
                  {record.numberInChapter !== null && (
                    <>
                      <span className="text-[#8C8373]" aria-hidden="true">·</span>
                      <span>داخل الباب: {record.numberInChapter}</span>
                    </>
                  )}
                  <span className="text-[#8C8373]" aria-hidden="true">·</span>
                  <span
                    className={
                      record.recordClassification === 'prophetic_hadith'
                        ? 'text-[#1B6B46] dark:text-[#6EE7B7]'
                        : 'text-[#B84A39] dark:text-[#FCA5A5]'
                    }
                  >
                    {record.recordClassification === 'prophetic_hadith'
                      ? 'حديث نبوي مرفوع'
                      : 'أثر / قول في المصدر'}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                  {record.isnad && (
                    <button
                      type="button"
                      onClick={() =>
                        setSplitIsnadById((prev) => ({
                          ...prev,
                          [record.id]: !prev[record.id],
                        }))
                      }
                      className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                        showSplit
                          ? 'bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A]'
                          : 'bg-[#F4EDE0] dark:bg-[#193729] text-[#133A2A] dark:text-[#F7F3EA]'
                      }`}
                    >
                      <SplitSquareVertical className="w-3.5 h-3.5" />
                      <span>{showSplit ? 'عرض النص متصلاً' : 'تمييز السند والمتن'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleCopyHadith(record)}
                    aria-label="نسخ نص الحديث كاملاً"
                    className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-[#EFE8D8] dark:hover:bg-[#1B3A2C] flex items-center justify-center cursor-pointer"
                  >
                    {copiedId === record.id ? (
                      <Check className="w-4 h-4 text-[#1B6B46] dark:text-[#6EE7B7]" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleSaveRecord(record)}
                    aria-label={isSaved ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
                    className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-[#EFE8D8] dark:hover:bg-[#1B3A2C] flex items-center justify-center cursor-pointer"
                  >
                    <Bookmark
                      className={`w-5 h-5 ${
                        isSaved
                          ? 'fill-[#C69749] text-[#C69749]'
                          : 'text-[#6B6254] dark:text-[#BFB6A4]'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Verbatim Arabic Text (Complete & Unaltered) OR Verbatim Isnad/Matn Split */}
              {!showSplit ? (
                <p
                  className={`font-display ${
                    fontSizeClass === 'text-xl'
                      ? 'text-2xl sm:text-3xl'
                      : 'text-xl sm:text-2xl'
                  } text-[#1A2A22] dark:text-[#F7F3EA] leading-loose`}
                >
                  {record.fullArabicText}
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-[#F4EDE0] dark:bg-[#173326] p-4 space-y-1">
                    <div className="text-xs font-bold text-[#9C6F21] dark:text-[#D6A954]">
                      السند كما ورد في المصدر
                    </div>
                    <p className="font-display text-xl leading-relaxed text-[#46524B] dark:text-[#D8D0C0]">
                      {record.isnad}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] p-4 space-y-1">
                    <div className="text-xs font-bold text-[#1B6B46] dark:text-[#6EE7B7]">
                      متن الحديث كما ورد في المصدر
                    </div>
                    <p className="font-display text-2xl leading-loose text-[#133A2A] dark:text-[#F7F3EA]">
                      {record.matn}
                    </p>
                  </div>
                </div>
              )}

              {/* Full 12-Field Scholarly Documentation Block */}
              <div className="rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] p-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-sm">
                <div>
                  <span className="font-bold text-[#9C6F21] dark:text-[#D6A954]">
                    الصحابي الراوي:{' '}
                  </span>
                  <span className="font-semibold text-[#133A2A] dark:text-[#F7F3EA]">
                    {record.companionNarrator}
                  </span>
                </div>

                <div>
                  <span className="font-bold text-[#1B6B46] dark:text-[#6EE7B7]">
                    درجة الحديث:{' '}
                  </span>
                  <span className="font-semibold text-[#133A2A] dark:text-[#F7F3EA]">
                    {record.authenticityGrade}
                  </span>
                </div>

                <div>
                  <span className="font-bold text-[#9C6F21] dark:text-[#D6A954]">
                    الحاكم على الحديث:{' '}
                  </span>
                  <span className="text-[#46524B] dark:text-[#D8D0C0]">
                    {record.gradingScholar}
                  </span>
                </div>

                <div className="tabular-nums">
                  <span className="font-bold text-[#9C6F21] dark:text-[#D6A954]">
                    الترقيم والباب:{' '}
                  </span>
                  <span className="text-[#46524B] dark:text-[#D8D0C0]">
                    رقم ({record.hadithNumber})
                    {record.internationalNumber !== null &&
                    record.internationalNumber !== record.hadithNumber
                      ? ` · الترقيم العالمي (${record.internationalNumber})`
                      : ''}
                    {record.numberInChapter !== null
                      ? ` · رقم داخل الباب (${record.numberInChapter})`
                      : ` · التسلسل في الباب (${record.chapterSequence})`}
                  </span>
                </div>

                <div>
                  <span className="font-bold text-[#9C6F21] dark:text-[#D6A954]">
                    مصدر النص والنسخة:{' '}
                  </span>
                  <span className="text-[#46524B] dark:text-[#D8D0C0]">
                    {record.textSourceName} ({record.datasetVersion})
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[#6B6254] dark:text-[#BFB6A4]">
                    الموضوع: {record.topicCategories.join(' · ')}
                  </span>
                  <a
                    href={record.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1B6B46] dark:text-[#6EE7B7] font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <span>رابط المصدر الأصلي</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Bottom Pagination */}
      {results && results.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-xs sm:text-sm text-[#6B6254] dark:text-[#BFB6A4] tabular-nums">
            صفحة {results.page} من {results.totalPages} (إجمالي{' '}
            {results.total.toLocaleString('en-US')} سجلاً)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] disabled:opacity-40 text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
              <span>الصفحة السابقة</span>
            </button>

            <button
              type="button"
              disabled={page >= results.totalPages || loading}
              onClick={() => {
                setPage((p) => Math.min(results.totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#133A2A] hover:bg-[#1B4D38] dark:bg-[#C69749] text-[#F7F3EA] dark:text-[#133A2A] disabled:opacity-40 text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>الصفحة التالية</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
