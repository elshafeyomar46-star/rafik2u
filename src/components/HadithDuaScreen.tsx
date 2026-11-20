import React, { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  Edit3,
  GraduationCap,
  HeartHandshake,
  Library,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import {
  fetchHadithLibrarySummary,
  fetchVerifiedHadithText,
  syncHadithLibraryApi,
} from '../services/hadithApi';
import {
  DailyHadithDuaEntry,
  HadithLibraryManifest,
  HadithLibraryRecord,
} from '../types';
import { HadithAuditReportView } from './HadithAuditReportView';
import { HadithDuaContentManager } from './HadithDuaContentManager';
import { HadithLibraryView } from './HadithLibraryView';

interface HadithDuaScreenProps {
  entries: DailyHadithDuaEntry[];
  favoriteIds: string[];
  savedLibraryRecords: HadithLibraryRecord[];
  onToggleFavorite: (favoriteKey: string) => void;
  onToggleSaveLibraryRecord: (record: HadithLibraryRecord) => void;
  onSaveEntry: (entry: DailyHadithDuaEntry, isNew: boolean) => void;
  onDeleteEntry: (id: string) => void;
  onResetEntries: () => void;
  fontSizeClass: string;
}

export const HadithDuaScreen: React.FC<HadithDuaScreenProps> = ({
  entries,
  favoriteIds,
  savedLibraryRecords,
  onToggleFavorite,
  onToggleSaveLibraryRecord,
  onSaveEntry,
  onDeleteEntry,
  onResetEntries,
  fontSizeClass,
}) => {
  const publishedEntries = useMemo(
    () => entries.filter((e) => e.publishStatus === 'published'),
    [entries]
  );

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [viewMode, setViewMode] = useState<
    'library' | 'daily' | 'favorites' | 'audit' | 'review'
  >('library');
  const [liveHadithTexts, setLiveHadithTexts] = useState<
    Record<string, string>
  >({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [duaCounters, setDuaCounters] = useState<Record<string, number>>({});

  // Hadith Library Manifest & Sync State
  const [libraryManifest, setLibraryManifest] =
    useState<HadithLibraryManifest | null>(null);
  const [manifestLoading, setManifestLoading] = useState<boolean>(true);
  const [manifestSyncing, setManifestSyncing] = useState<boolean>(false);
  const [manifestError, setManifestError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setManifestLoading(true);
    void fetchHadithLibrarySummary()
      .then((data) => {
        if (mounted) {
          setLibraryManifest(data);
          setManifestError(null);
        }
      })
      .catch((err) => {
        if (mounted) {
          setManifestError(
            err instanceof Error
              ? err.message
              : 'تعذر تحميل فهرس المكتبة الحديثية.'
          );
        }
      })
      .finally(() => {
        if (mounted) setManifestLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleResyncLibrary = async () => {
    setManifestSyncing(true);
    setManifestError(null);
    try {
      const updated = await syncHadithLibraryApi();
      setLibraryManifest(updated);
    } catch (err) {
      setManifestError(
        err instanceof Error ? err.message : 'تعذر مزامنة المصادر الرقمية.'
      );
    } finally {
      setManifestSyncing(false);
    }
  };

  // Daily Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const safeIndex = Math.min(
    selectedDayIndex,
    Math.max(0, publishedEntries.length - 1)
  );
  const activeEntry = publishedEntries[safeIndex] ?? publishedEntries[0] ?? null;

  // Fetch verified Hadith text from API for active entry
  useEffect(() => {
    if (!activeEntry) return;
    const key = `${activeEntry.hadith.collectionSlug}:${activeEntry.hadith.hadithNumber}`;
    if (liveHadithTexts[key]) return;

    let mounted = true;
    void fetchVerifiedHadithText(
      activeEntry.hadith.collectionSlug,
      activeEntry.hadith.hadithNumber
    )
      .then((text) => {
        if (mounted && text) {
          setLiveHadithTexts((prev) => ({ ...prev, [key]: text }));
        }
      })
      .catch(() => {
        // Verified fallback text from entry.hadith.text remains displayed
      });
    return () => {
      mounted = false;
    };
  }, [activeEntry?.id]);

  // Reset quiz when changing day
  useEffect(() => {
    setQuizAnswers({});
    setQuizSubmitted(false);
  }, [activeEntry?.id]);

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Ignore clipboard failures
    }
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 2000);
  };

  const incrementCounter = (entryId: string, maxCount: number) => {
    setDuaCounters((prev) => {
      const curr = prev[entryId] ?? 0;
      return { ...prev, [entryId]: curr >= maxCount ? 0 : curr + 1 };
    });
  };

  const pendingDraftsCount = entries.filter(
    (e) => e.publishStatus === 'pending_review'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
            المكتبة الحديثية والأدعية اليومية
          </h2>
          <p className="text-sm text-[#6B6254] dark:text-[#BFB6A4] mt-1 tabular-nums">
            صحيح البخاري وصحيح مسلم وسنن ابن ماجه بالنصوص الكاملة الموثّقة · بالإضافة إلى حديث ودعاء اليوم
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#EAE2D2] dark:bg-[#193729] self-start">
          <button
            type="button"
            onClick={() => setViewMode('library')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
              viewMode === 'library'
                ? 'bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A]'
                : 'text-[#46524B] dark:text-[#D8D0C0]'
            }`}
          >
            <Library className="w-4 h-4" />
            <span>
              المكتبة الحديثية
              {libraryManifest
                ? ` (${libraryManifest.totalImportedCount.toLocaleString('en-US')})`
                : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('daily')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'daily'
                ? 'bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A]'
                : 'text-[#46524B] dark:text-[#D8D0C0]'
            }`}
          >
            حديث ودعاء اليوم
          </button>

          <button
            type="button"
            onClick={() => setViewMode('favorites')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
              viewMode === 'favorites'
                ? 'bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A]'
                : 'text-[#46524B] dark:text-[#D8D0C0]'
            }`}
          >
            المفضلة ({favoriteIds.length + savedLibraryRecords.length})
          </button>

          <button
            type="button"
            onClick={() => setViewMode('audit')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'audit'
                ? 'bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A]'
                : 'text-[#46524B] dark:text-[#D8D0C0]'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>تقرير الاكتمال</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('review')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'review'
                ? 'bg-[#C69749] text-[#133A2A]'
                : 'text-[#46524B] dark:text-[#D8D0C0]'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>
              المراجعة قبل النشر
              {pendingDraftsCount > 0 ? ` (${pendingDraftsCount})` : ''}
            </span>
          </button>
        </div>
      </div>

      {/* MODE 0: Comprehensive Unified Hadith Library */}
      {viewMode === 'library' && (
        <HadithLibraryView
          manifest={libraryManifest}
          manifestLoading={manifestLoading}
          manifestError={manifestError}
          savedLibraryRecords={savedLibraryRecords}
          onToggleSaveRecord={onToggleSaveLibraryRecord}
          onOpenAuditReport={() => setViewMode('audit')}
          fontSizeClass={fontSizeClass}
        />
      )}

      {/* MODE: Admin Completeness & Verification Audit Report */}
      {viewMode === 'audit' && (
        <HadithAuditReportView
          manifest={libraryManifest}
          loading={manifestLoading}
          syncing={manifestSyncing}
          error={manifestError}
          onResync={() => void handleResyncLibrary()}
        />
      )}

      {/* MODE 3: Content Review & Edit Panel */}
      {viewMode === 'review' && (
        <HadithDuaContentManager
          entries={entries}
          onSaveEntry={onSaveEntry}
          onDeleteEntry={onDeleteEntry}
          onResetDefault={onResetEntries}
          onClose={() => setViewMode('daily')}
        />
      )}

      {/* MODE 2: Favorites List (Daily Entries + Saved Library Hadiths) */}
      {viewMode === 'favorites' && (
        <div className="space-y-4">
          {favoriteIds.length === 0 && savedLibraryRecords.length === 0 ? (
            <div className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-8 text-center text-[#6B6254] dark:text-[#BFB6A4]">
              لم تحفظ أي حديث أو دعاء في المفضلة بعد. اضغط على أيقونة الحفظ في أي بطاقة من المكتبة أو حديث اليوم لإضافتها هنا.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {savedLibraryRecords.map((rec) => (
                <article
                  key={`fav-lib-${rec.id}`}
                  className="rounded-2xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#9C6F21] dark:text-[#D6A954] tabular-nums">
                      {rec.bookTitle} ({rec.hadithNumber}) · {rec.chapterName}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleSaveLibraryRecord(rec)}
                      aria-label="إزالة من المفضلة"
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                    >
                      <Bookmark className="w-5 h-5 fill-[#C69749] text-[#C69749]" />
                    </button>
                  </div>
                  <p className="font-display text-xl leading-loose text-[#1A2A22] dark:text-[#F7F3EA]">
                    {rec.fullArabicText}
                  </p>
                  <div className="text-xs text-[#1B6B46] dark:text-[#6EE7B7] font-semibold">
                    {rec.companionNarrator} · {rec.authenticityGrade}
                  </div>
                </article>
              ))}

              {publishedEntries.map((entry) => {
                const hadithFavKey = `hadith:${entry.id}`;
                const duaFavKey = `dua:${entry.id}`;
                const showHadith = favoriteIds.includes(hadithFavKey);
                const showDua = favoriteIds.includes(duaFavKey);
                const liveText =
                  liveHadithTexts[
                    `${entry.hadith.collectionSlug}:${entry.hadith.hadithNumber}`
                  ] ?? entry.hadith.text;

                return (
                  <React.Fragment key={entry.id}>
                    {showHadith && (
                      <article className="rounded-2xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#9C6F21] dark:text-[#D6A954]">
                            {entry.hadith.sourceBook} ({entry.hadith.hadithNumber}) ·{' '}
                            {entry.dateLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() => onToggleFavorite(hadithFavKey)}
                            aria-label="إزالة من المفضلة"
                            className="min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                          >
                            <Bookmark className="w-5 h-5 fill-[#C69749] text-[#C69749]" />
                          </button>
                        </div>
                        <p className="font-display text-xl leading-loose text-[#1A2A22] dark:text-[#F7F3EA]">
                          {liveText}
                        </p>
                        <div className="text-xs text-[#1B6B46] dark:text-[#6EE7B7] font-semibold">
                          {entry.hadith.authenticityGrade}
                        </div>
                      </article>
                    )}

                    {showDua && (
                      <article className="rounded-2xl bg-[#F4EDE0] dark:bg-[#163124] border border-[#DFD6C5] dark:border-[#244736] p-6 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#9C6F21] dark:text-[#D6A954]">
                            {entry.dua.title} · {entry.dua.sourceBook}
                          </span>
                          <button
                            type="button"
                            onClick={() => onToggleFavorite(duaFavKey)}
                            aria-label="إزالة من المفضلة"
                            className="min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                          >
                            <Bookmark className="w-5 h-5 fill-[#C69749] text-[#C69749]" />
                          </button>
                        </div>
                        <p className="font-display text-xl leading-loose text-[#133A2A] dark:text-[#F7F3EA]">
                          {entry.dua.text}
                        </p>
                        <div className="text-xs text-[#5C665E] dark:text-[#BFB6A4]">
                          {entry.dua.virtueOrOccasion}
                        </div>
                      </article>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODE 1: Daily Reader with Previous Days Navigator & Simple Quiz */}
      {viewMode === 'daily' && activeEntry && (
        <div className="space-y-6">
          {/* Day Navigator Bar */}
          <section className="rounded-2xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safeIndex >= publishedEntries.length - 1}
                onClick={() => setSelectedDayIndex((i) => i + 1)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] disabled:opacity-40 text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
                <span>اليوم السابق</span>
              </button>

              <button
                type="button"
                disabled={safeIndex <= 0}
                onClick={() => setSelectedDayIndex((i) => Math.max(0, i - 1))}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] disabled:opacity-40 text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>اليوم التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {publishedEntries.map((entry, idx) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedDayIndex(idx)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                    safeIndex === idx
                      ? 'bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A]'
                      : 'bg-[#F7F3EA] dark:bg-[#0F241A] text-[#46524B] dark:text-[#D8D0C0]'
                  }`}
                >
                  {entry.dateLabel}
                </button>
              ))}
            </div>
          </section>

          {/* Hadith of the Day + Dua of the Day */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Hadith Card */}
            {(() => {
              const hadithFavKey = `hadith:${activeEntry.id}`;
              const isFav = favoriteIds.includes(hadithFavKey);
              const apiKey = `${activeEntry.hadith.collectionSlug}:${activeEntry.hadith.hadithNumber}`;
              const displayHadithText =
                liveHadithTexts[apiKey] ?? activeEntry.hadith.text;

              return (
                <article className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 sm:p-7 flex flex-col justify-between gap-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2 border-b border-[#ECE4D4] dark:border-[#214232] pb-3">
                      <div className="inline-flex items-center gap-2 text-sm font-bold text-[#133A2A] dark:text-[#D6A954]">
                        <BookOpen className="w-4 h-4" aria-hidden="true" />
                        <span>حديث اليوم · {activeEntry.dateLabel}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            void handleCopy(
                              hadithFavKey,
                              `${displayHadithText}\n(${activeEntry.hadith.sourceBook} - ${activeEntry.hadith.hadithNumber})`
                            )
                          }
                          aria-label="نسخ الحديث"
                          className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-[#EFE8D8] dark:hover:bg-[#1B3A2C] flex items-center justify-center cursor-pointer"
                        >
                          {copiedKey === hadithFavKey ? (
                            <Check className="w-4 h-4 text-[#1B6B46] dark:text-[#6EE7B7]" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleFavorite(hadithFavKey)}
                          aria-label={
                            isFav ? 'إزالة الحديث من المفضلة' : 'حفظ الحديث في المفضلة'
                          }
                          className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-[#EFE8D8] dark:hover:bg-[#1B3A2C] flex items-center justify-center cursor-pointer"
                        >
                          <Bookmark
                            className={`w-5 h-5 ${
                              isFav
                                ? 'fill-[#C69749] text-[#C69749]'
                                : 'text-[#6B6254] dark:text-[#BFB6A4]'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <p
                      className={`font-display ${
                        fontSizeClass === 'text-xl'
                          ? 'text-2xl sm:text-3xl'
                          : 'text-xl sm:text-2xl'
                      } text-[#1A2A22] dark:text-[#F7F3EA] leading-loose`}
                    >
                      {displayHadithText}
                    </p>

                    {/* Source & Grade Documentation */}
                    <div className="p-4 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] space-y-1.5 text-sm">
                      <div>
                        <span className="font-bold text-[#9C6F21] dark:text-[#D6A954]">
                          المصدر والمرجع:{' '}
                        </span>
                        <span className="font-semibold tabular-nums">
                          {activeEntry.hadith.sourceBook} — رقم (
                          {activeEntry.hadith.hadithNumber})
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-[#9C6F21] dark:text-[#D6A954]">
                          الراوي:{' '}
                        </span>
                        <span>{activeEntry.hadith.narrator}</span>
                      </div>
                      <div>
                        <span className="font-bold text-[#1B6B46] dark:text-[#6EE7B7]">
                          درجة الصحة:{' '}
                        </span>
                        <span>{activeEntry.hadith.authenticityGrade}</span>
                      </div>
                    </div>

                    {/* Simple Explanation */}
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-[#133A2A] dark:text-[#D6A954]">
                        الشرح المبسط
                      </div>
                      <p
                        className={`${fontSizeClass} text-[#46524B] dark:text-[#D8D0C0] leading-relaxed`}
                      >
                        {activeEntry.hadith.simpleExplanation}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#ECE4D4] dark:border-[#214232] flex items-center justify-between text-xs text-[#6B6254] dark:text-[#BFB6A4]">
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#1B6B46] dark:text-[#6EE7B7]" />
                      <span>{activeEntry.reviewedByNote}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(hadithFavKey)}
                      className="font-bold text-[#133A2A] dark:text-[#D6A954] hover:underline cursor-pointer"
                    >
                      {isFav ? 'محفوظ في المفضلة' : 'حفظ في المفضلة'}
                    </button>
                  </div>
                </article>
              );
            })()}

            {/* Dua Card */}
            {(() => {
              const duaFavKey = `dua:${activeEntry.id}`;
              const isFav = favoriteIds.includes(duaFavKey);
              const count = duaCounters[activeEntry.id] ?? 0;

              return (
                <article className="rounded-3xl bg-[#F4EDE0] dark:bg-[#163124] border border-[#DFD6C5] dark:border-[#244736] p-6 sm:p-7 flex flex-col justify-between gap-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2 border-b border-[#E3D9C6] dark:border-[#244736] pb-3">
                      <div className="inline-flex items-center gap-2 text-sm font-bold text-[#9C6F21] dark:text-[#D6A954]">
                        <HeartHandshake className="w-4 h-4" aria-hidden="true" />
                        <span>دعاء اليوم · {activeEntry.dua.title}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            void handleCopy(
                              duaFavKey,
                              `${activeEntry.dua.text}\n(${activeEntry.dua.sourceBook})`
                            )
                          }
                          aria-label="نسخ الدعاء"
                          className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-[#E7DEC9] dark:hover:bg-[#1F4231] flex items-center justify-center cursor-pointer"
                        >
                          {copiedKey === duaFavKey ? (
                            <Check className="w-4 h-4 text-[#1B6B46] dark:text-[#6EE7B7]" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleFavorite(duaFavKey)}
                          aria-label={
                            isFav ? 'إزالة الدعاء من المفضلة' : 'حفظ الدعاء في المفضلة'
                          }
                          className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-[#E7DEC9] dark:hover:bg-[#1F4231] flex items-center justify-center cursor-pointer"
                        >
                          <Bookmark
                            className={`w-5 h-5 ${
                              isFav
                                ? 'fill-[#C69749] text-[#C69749]'
                                : 'text-[#6B6254] dark:text-[#BFB6A4]'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <p
                      className={`font-display ${
                        fontSizeClass === 'text-xl'
                          ? 'text-2xl sm:text-3xl'
                          : 'text-xl sm:text-2xl'
                      } text-[#133A2A] dark:text-[#F7F3EA] leading-loose`}
                    >
                      {activeEntry.dua.text}
                    </p>

                    {/* Dua Source & Virtue/Occasion */}
                    <div className="p-4 rounded-2xl bg-[#FFFDF9] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] space-y-1.5 text-sm">
                      <div>
                        <span className="font-bold text-[#9C6F21] dark:text-[#D6A954]">
                          المصدر الموثق:{' '}
                        </span>
                        <span className="font-semibold tabular-nums">
                          {activeEntry.dua.sourceBook}
                          {activeEntry.dua.hadithNumber
                            ? ` — رقم (${activeEntry.dua.hadithNumber})`
                            : ''}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-[#1B6B46] dark:text-[#6EE7B7]">
                          درجة الصحة:{' '}
                        </span>
                        <span>{activeEntry.dua.authenticityGrade}</span>
                      </div>
                      <div>
                        <span className="font-bold text-[#9C6F21] dark:text-[#D6A954]">
                          فضل الدعاء ومناسبته:{' '}
                        </span>
                        <span>{activeEntry.dua.virtueOrOccasion}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-bold text-[#133A2A] dark:text-[#D6A954]">
                        الشرح المبسط
                      </div>
                      <p
                        className={`${fontSizeClass} text-[#46524B] dark:text-[#D8D0C0] leading-relaxed`}
                      >
                        {activeEntry.dua.simpleExplanation}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E3D9C6] dark:border-[#244736] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          incrementCounter(
                            activeEntry.id,
                            activeEntry.dua.recommendedCount
                          )
                        }
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-[#133A2A] hover:bg-[#1B4D38] dark:bg-[#C69749] dark:text-[#133A2A] text-[#F7F3EA] text-sm font-bold tabular-nums cursor-pointer"
                      >
                        ترديد الدعاء: {count} / {activeEntry.dua.recommendedCount}
                      </button>

                      {count > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDuaCounters((prev) => ({
                              ...prev,
                              [activeEntry.id]: 0,
                            }))
                          }
                          aria-label="تصفير العداد"
                          className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-[#E7DEC9] dark:hover:bg-[#1F4231] flex items-center justify-center cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleFavorite(duaFavKey)}
                      className="text-xs font-bold text-[#133A2A] dark:text-[#D6A954] hover:underline cursor-pointer"
                    >
                      {isFav ? 'محفوظ في المفضلة' : 'حفظ في المفضلة'}
                    </button>
                  </div>
                </article>
              );
            })()}
          </div>

          {/* Simple Comprehension Quiz */}
          {activeEntry.quiz.length > 0 && (
            <section className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 sm:p-8 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECE4D4] dark:border-[#214232] pb-3">
                <div className="inline-flex items-center gap-2 font-bold text-lg text-[#133A2A] dark:text-[#F7F3EA]">
                  <GraduationCap
                    className="w-5 h-5 text-[#C69749]"
                    aria-hidden="true"
                  />
                  <span>اختبار بسيط حول حديث ودعاء {activeEntry.dateLabel}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeEntry.quiz.map((q, qIdx) => {
                  const chosen = quizAnswers[q.id];
                  return (
                    <div
                      key={q.id}
                      className="p-5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] space-y-3"
                    >
                      <div className="font-bold text-base text-[#133A2A] dark:text-[#F7F3EA]">
                        {qIdx + 1}. {q.question}
                      </div>

                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => {
                          const isPicked = chosen === optIdx;
                          const isRight = optIdx === q.correctIndex;
                          let style =
                            'bg-[#FFFDF9] dark:bg-[#132B20] border-[#DFD6C5] dark:border-[#244736]';
                          if (quizSubmitted) {
                            if (isRight) {
                              style =
                                'bg-[#1B6B46]/15 border-[#1B6B46] text-[#1B6B46] dark:text-[#6EE7B7]';
                            } else if (isPicked && !isRight) {
                              style =
                                'bg-[#B84A39]/15 border-[#B84A39] text-[#B84A39] dark:text-[#FCA5A5]';
                            }
                          } else if (isPicked) {
                            style =
                              'bg-[#133A2A] text-[#F7F3EA] border-[#133A2A] dark:bg-[#C69749] dark:text-[#133A2A]';
                          }
                          return (
                            <button
                              key={opt}
                              type="button"
                              disabled={quizSubmitted}
                              onClick={() =>
                                setQuizAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: optIdx,
                                }))
                              }
                              className={`w-full min-h-[44px] p-3 rounded-xl border text-right text-sm font-semibold transition-colors cursor-pointer ${style}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {quizSubmitted && (
                        <div className="text-xs sm:text-sm text-[#46524B] dark:text-[#D8D0C0] pt-1">
                          <span className="font-bold text-[#9C6F21] dark:text-[#D6A954]">
                            التوضيح:{' '}
                          </span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {!quizSubmitted ? (
                  <button
                    type="button"
                    disabled={activeEntry.quiz.some(
                      (q) => quizAnswers[q.id] === undefined
                    )}
                    onClick={() => setQuizSubmitted(true)}
                    className="min-h-[46px] px-6 py-2.5 rounded-xl bg-[#C69749] hover:bg-[#B38538] disabled:opacity-45 text-[#133A2A] font-bold text-sm cursor-pointer"
                  >
                    تحقق من الإجابات
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 font-bold text-sm text-[#1B6B46] dark:text-[#6EE7B7] tabular-nums">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        النتيجة:{' '}
                        {
                          activeEntry.quiz.filter(
                            (q) => quizAnswers[q.id] === q.correctIndex
                          ).length
                        }{' '}
                        من {activeEntry.quiz.length}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setQuizAnswers({});
                        setQuizSubmitted(false);
                      }}
                      className="text-sm font-bold text-[#133A2A] dark:text-[#D6A954] hover:underline cursor-pointer"
                    >
                      إعادة الاختبار
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
