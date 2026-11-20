import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Edit3,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  fetchVerifiedHadithText,
  HADITH_COLLECTIONS,
} from '../services/hadithApi';
import {
  ContentPublishStatus,
  DailyHadithDuaEntry,
  HadithCollectionSlug,
} from '../types';

interface HadithDuaContentManagerProps {
  entries: DailyHadithDuaEntry[];
  onSaveEntry: (entry: DailyHadithDuaEntry, isNew: boolean) => void;
  onDeleteEntry: (id: string) => void;
  onResetDefault: () => void;
  onClose: () => void;
}

export const HadithDuaContentManager: React.FC<
  HadithDuaContentManagerProps
> = ({ entries, onSaveEntry, onDeleteEntry, onResetDefault, onClose }) => {
  const [editing, setEditing] = useState<DailyHadithDuaEntry | null>(null);
  const [isNewMode, setIsNewMode] = useState(false);
  const [fetchingHadith, setFetchingHadith] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const startNewDraft = () => {
    const nextDayNum = entries.length + 1;
    const draft: DailyHadithDuaEntry = {
      id: `day-entry-custom-${Date.now()}`,
      dayNumber: nextDayNum,
      dateLabel: `يوم إضافي ${nextDayNum}`,
      publishStatus: 'pending_review',
      reviewedByNote: 'مسودة قيد المراجعة والتوثيق',
      hadith: {
        collectionSlug: 'ara-bukhari',
        sourceBook: 'صحيح البخاري',
        hadithNumber: 1,
        narrator: '',
        authenticityGrade: '',
        text: '',
        simpleExplanation: '',
      },
      dua: {
        title: '',
        text: '',
        sourceBook: '',
        authenticityGrade: '',
        virtueOrOccasion: '',
        simpleExplanation: '',
        recommendedCount: 1,
      },
      quiz: [
        {
          id: `hdq-custom-${Date.now()}`,
          question: 'سؤال اختبار حول حديث أو دعاء اليوم',
          options: ['الإجابة الصحيحة', 'خيار بديل ١', 'خيار بديل ٢'],
          correctIndex: 0,
          explanation: 'توضيح الإجابة الصحيحة.',
        },
      ],
    };
    setValidationError(null);
    setEditing(draft);
    setIsNewMode(true);
  };

  const handleFetchFromVerifiedApi = async () => {
    if (!editing) return;
    setFetchingHadith(true);
    setValidationError(null);
    try {
      const text = await fetchVerifiedHadithText(
        editing.hadith.collectionSlug,
        editing.hadith.hadithNumber
      );
      const bookObj = HADITH_COLLECTIONS.find(
        (c) => c.slug === editing.hadith.collectionSlug
      );
      setEditing({
        ...editing,
        hadith: {
          ...editing.hadith,
          sourceBook: bookObj?.label ?? editing.hadith.sourceBook,
          text,
        },
      });
    } catch (err) {
      setValidationError(
        err instanceof Error
          ? err.message
          : 'تعذر جلب نص الحديث من المصدر الموثوق.'
      );
    } finally {
      setFetchingHadith(false);
    }
  };

  const handleSave = (publishNow: boolean) => {
    if (!editing) return;

    // Enforce source attribution before publishing
    if (
      !editing.hadith.text.trim() ||
      !editing.hadith.sourceBook.trim() ||
      !editing.hadith.hadithNumber ||
      !editing.hadith.authenticityGrade.trim()
    ) {
      setValidationError(
        'لا يمكن حفظ أو نشر حديث دون نص موثق ومصدر محدد ورقم الحديث ودرجة صحته.'
      );
      return;
    }

    if (!editing.dua.text.trim() || !editing.dua.sourceBook.trim()) {
      setValidationError(
        'يرجى إدخال نص الدعاء وذكر مصدره الموثوق وفضله قبل الحفظ.'
      );
      return;
    }

    const nextStatus: ContentPublishStatus = publishNow
      ? 'published'
      : editing.publishStatus;

    onSaveEntry(
      {
        ...editing,
        publishStatus: nextStatus,
        reviewedByNote:
          nextStatus === 'published'
            ? 'مراجَع ومعتمد للنشر'
            : 'مسودة قيد المراجعة العلمية',
      },
      isNewMode
    );
    setEditing(null);
    setValidationError(null);
  };

  return (
    <section className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#C69749] p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ECE4D4] dark:border-[#214232] pb-4">
        <div>
          <div className="inline-flex items-center gap-2 text-sm font-bold text-[#9C6F21] dark:text-[#D6A954]">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            <span>بوابة المراجعة والتعديل قبل النشر</span>
          </div>
          <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA] mt-1">
            توثيق ومراجعة الأحاديث والأدعية
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={startNewDraft}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#C69749] hover:bg-[#B38538] text-[#133A2A] font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مسودة يوم جديد</span>
          </button>

          <button
            type="button"
            onClick={onResetDefault}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#EFE8D8] dark:bg-[#1B3A2C] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>استعادة المعتمد</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#133A2A] text-[#F7F3EA] text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>إغلاق</span>
          </button>
        </div>
      </div>

      {!editing ? (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="p-4 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] flex flex-wrap items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span className="text-[#9C6F21] dark:text-[#D6A954]">
                    {entry.dateLabel}
                  </span>
                  <span>·</span>
                  <span
                    className={
                      entry.publishStatus === 'published'
                        ? 'text-[#1B6B46] dark:text-[#6EE7B7]'
                        : 'text-[#B84A39] dark:text-[#FCA5A5]'
                    }
                  >
                    {entry.publishStatus === 'published'
                      ? 'منشور ومراجَع'
                      : 'مسودة — لم يُنشر بعد'}
                  </span>
                </div>
                <div className="font-display text-lg font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                  {entry.hadith.sourceBook} ({entry.hadith.hadithNumber}) ·{' '}
                  {entry.dua.title}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {entry.publishStatus === 'pending_review' && (
                  <button
                    type="button"
                    onClick={() =>
                      onSaveEntry(
                        {
                          ...entry,
                          publishStatus: 'published',
                          reviewedByNote: 'تمت المراجعة والاعتماد للنشر',
                        },
                        false
                      )
                    }
                    className="min-h-[40px] px-3.5 rounded-xl bg-[#1B6B46] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>اعتماد ونشر</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setEditing(entry);
                    setIsNewMode(false);
                    setValidationError(null);
                  }}
                  className="min-h-[40px] px-3.5 rounded-xl bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>مراجعة وتعديل</span>
                </button>

                {entries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteEntry(entry.id)}
                    aria-label="حذف اليوم"
                    className="min-h-[40px] min-w-[40px] rounded-xl bg-[#EFE8D8] dark:bg-[#1B3A2C] text-[#B84A39] dark:text-[#FCA5A5] flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {validationError && (
            <div className="p-4 rounded-2xl bg-[#B84A39]/15 border border-[#B84A39] text-sm text-[#B84A39] dark:text-[#FCA5A5] flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Day Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">تسمية اليوم</label>
              <input
                type="text"
                value={editing.dateLabel}
                onChange={(e) =>
                  setEditing({ ...editing, dateLabel: e.target.value })
                }
                className="w-full min-h-[42px] px-3 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">حالة النشر</label>
              <select
                value={editing.publishStatus}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    publishStatus: e.target.value as ContentPublishStatus,
                  })
                }
                className="w-full min-h-[42px] px-3 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-sm"
              >
                <option value="pending_review">مسودة (بانتظار المراجعة)</option>
                <option value="published">معتمد ومنشور</option>
              </select>
            </div>
          </div>

          {/* Hadith Verification & Edit */}
          <div className="p-5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] space-y-4">
            <div className="font-bold text-base text-[#133A2A] dark:text-[#D6A954]">
              بيانات حديث اليوم (مطلوب توثيق المصدر ورقم الحديث)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={editing.hadith.collectionSlug}
                onChange={(e) => {
                  const slug = e.target.value as HadithCollectionSlug;
                  const book = HADITH_COLLECTIONS.find((c) => c.slug === slug);
                  setEditing({
                    ...editing,
                    hadith: {
                      ...editing.hadith,
                      collectionSlug: slug,
                      sourceBook: book?.label ?? editing.hadith.sourceBook,
                    },
                  });
                }}
                className="min-h-[42px] px-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] text-sm"
              >
                {HADITH_COLLECTIONS.map((col) => (
                  <option key={col.slug} value={col.slug}>
                    {col.label}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={1}
                value={editing.hadith.hadithNumber}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    hadith: {
                      ...editing.hadith,
                      hadithNumber: Math.max(1, Number(e.target.value) || 1),
                    },
                  })
                }
                placeholder="رقم الحديث"
                className="min-h-[42px] px-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] text-sm tabular-nums"
              />

              <button
                type="button"
                disabled={fetchingHadith}
                onClick={() => void handleFetchFromVerifiedApi()}
                className="min-h-[42px] px-4 rounded-xl bg-[#133A2A] text-[#F7F3EA] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {fetchingHadith ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>جلب النص من المصدر الموثق</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={editing.hadith.narrator}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    hadith: { ...editing.hadith, narrator: e.target.value },
                  })
                }
                placeholder="اسم الراوي (الصحابي رضي الله عنه)"
                className="min-h-[42px] px-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] text-sm"
              />
              <input
                type="text"
                value={editing.hadith.authenticityGrade}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    hadith: {
                      ...editing.hadith,
                      authenticityGrade: e.target.value,
                    },
                  })
                }
                placeholder="درجة الصحة (مثلاً: صحيح — رواه البخاري)"
                className="min-h-[42px] px-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] text-sm"
              />
            </div>

            <textarea
              rows={3}
              value={editing.hadith.text}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  hadith: { ...editing.hadith, text: e.target.value },
                })
              }
              placeholder="متن الحديث الموثق..."
              className="w-full p-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] font-display text-lg"
            />

            <textarea
              rows={2}
              value={editing.hadith.simpleExplanation}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  hadith: {
                    ...editing.hadith,
                    simpleExplanation: e.target.value,
                  },
                })
              }
              placeholder="شرح مبسط للحديث..."
              className="w-full p-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] text-sm"
            />
          </div>

          {/* Dua Verification & Edit */}
          <div className="p-5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] space-y-4">
            <div className="font-bold text-base text-[#133A2A] dark:text-[#D6A954]">
              بيانات دعاء اليوم (مع المصدر والمناسبة)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={editing.dua.title}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    dua: { ...editing.dua, title: e.target.value },
                  })
                }
                placeholder="عنوان الدعاء"
                className="min-h-[42px] px-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] text-sm"
              />
              <input
                type="text"
                value={editing.dua.sourceBook}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    dua: { ...editing.dua, sourceBook: e.target.value },
                  })
                }
                placeholder="مصدر الدعاء الموثق"
                className="min-h-[42px] px-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] text-sm"
              />
              <input
                type="text"
                value={editing.dua.authenticityGrade}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    dua: { ...editing.dua, authenticityGrade: e.target.value },
                  })
                }
                placeholder="درجة الصحة"
                className="min-h-[42px] px-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] text-sm"
              />
            </div>

            <textarea
              rows={2}
              value={editing.dua.text}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  dua: { ...editing.dua, text: e.target.value },
                })
              }
              placeholder="نص الدعاء المأثور الموثق..."
              className="w-full p-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] font-display text-lg"
            />

            <textarea
              rows={2}
              value={editing.dua.virtueOrOccasion}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  dua: { ...editing.dua, virtueOrOccasion: e.target.value },
                })
              }
              placeholder="فضل الدعاء أو مناسبة استخدامه..."
              className="w-full p-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] text-sm"
            />

            <textarea
              rows={2}
              value={editing.dua.simpleExplanation}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  dua: { ...editing.dua, simpleExplanation: e.target.value },
                })
              }
              placeholder="شرح مبسط لمعنى الدعاء..."
              className="w-full p-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-[#133A2A] text-[#F7F3EA] font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ التعديلات</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave(true)}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-[#C69749] hover:bg-[#B38538] text-[#133A2A] font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>اعتماد ونشر المحتوى</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setValidationError(null);
              }}
              className="min-h-[48px] px-5 py-3 rounded-xl bg-[#EFE8D8] dark:bg-[#1B3A2C] font-semibold text-sm cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
