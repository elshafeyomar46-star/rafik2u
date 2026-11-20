import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { TAJWEED_UNITS, SUPPLEMENTARY_NOTICE_TEXT } from '../data/tajweedUnitsMeta';
import { fetchAllSurahs, fetchSurahAyahsUthmani } from '../services/quranApi';
import {
  QuranAyah,
  ScientificReviewStatus,
  SurahSummary,
  TajweedExampleRef,
  TajweedLesson,
  TajweedPracticeItem,
  TajweedQuizQuestion,
} from '../types';

interface TajweedContentManagerProps {
  lessons: TajweedLesson[];
  onSaveLesson: (lesson: TajweedLesson, isNew: boolean) => void;
  onDeleteLesson: (lessonId: string) => void;
  onResetDefault: () => void;
  onClose: () => void;
}

export const TajweedContentManager: React.FC<TajweedContentManagerProps> = ({
  lessons,
  onSaveLesson,
  onDeleteLesson,
  onResetDefault,
  onClose,
}) => {
  const [editingLesson, setEditingLesson] = useState<TajweedLesson | null>(null);
  const [isNewMode, setIsNewMode] = useState(false);

  const [surahs, setSurahs] = useState<SurahSummary[]>([]);
  const [previewAyahText, setPreviewAyahText] = useState<string>('');
  const [exSurahNum, setExSurahNum] = useState<number>(112);
  const [exAyahNum, setExAyahNum] = useState<number>(1);
  const [exHighlight, setExHighlight] = useState<string>('');
  const [exRuleNote, setExRuleNote] = useState<string>('');

  useEffect(() => {
    void fetchAllSurahs()
      .then(setSurahs)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    void fetchSurahAyahsUthmani(exSurahNum)
      .then((ayahs: QuranAyah[]) => {
        if (!active) return;
        const found = ayahs.find((a) => a.numberInSurah === exAyahNum);
        setPreviewAyahText(found?.text ?? '');
      })
      .catch(() => {
        if (active) setPreviewAyahText('');
      });
    return () => {
      active = false;
    };
  }, [exSurahNum, exAyahNum]);

  const startNewLesson = () => {
    const defaultUnit = TAJWEED_UNITS[0];
    const blank: TajweedLesson = {
      id: `taj-custom-${Date.now()}`,
      level: defaultUnit.level,
      unitId: defaultUnit.id,
      unitNumber: defaultUnit.unitNumber,
      unitTitle: defaultUnit.title.replace(/^الوحدة\s+[^:]+:\s*/, ''),
      category: defaultUnit.category,
      title: '',
      learningObjectives: ['فهم ضابط الحكم النظري والتدرب على تطبيقه في التلاوة.'],
      simpleDefinition: '',
      explanation: '',
      lettersOrPoints: '',
      scientificReference: 'مرجع علمي قيد الإدخال',
      reviewStatus: 'pending_review',
      durationMinutes: 6,
      mutunWitnesses: [],
      supplementarySource: {
        noticeText: SUPPLEMENTARY_NOTICE_TEXT,
        sourceTitle: 'مبحث مضاف بواسطة مسؤول المحتوى',
        author: 'إدارة المحتوى العلمي',
        topicSummary: 'درس إضافي قيد المراجعة العلمية وربطه بالمصادر المعتمدة.',
      },
      exampleRefs: [],
      practiceItems: [
        {
          id: `pr-${Date.now()}`,
          prompt: 'سؤال التدريب التفاعلي',
          targetToken: 'مثال تطبيقي',
          options: ['خيار ١', 'خيار ٢', 'خيار ٣'],
          correctOption: 'خيار ١',
          feedbackText: 'توضيح الإجابة الصحيحة.',
        },
      ],
      quizQuestions: [
        {
          id: `q-${Date.now()}`,
          question: 'سؤال الاختبار القصير للدرس',
          options: ['الإجابة الصحيحة', 'خيار بديل ١', 'خيار بديل ٢'],
          correctIndex: 0,
          explanation: 'شرح سبب صحة الإجابة من المرجع العلمي.',
        },
      ],
    };
    setEditingLesson(blank);
    setIsNewMode(true);
  };

  const handleAddVerifiedExample = () => {
    if (!editingLesson) return;
    const surahObj = surahs.find((s) => s.number === exSurahNum);
    const newEx: TajweedExampleRef = {
      id: `ex-${Date.now()}`,
      surahNumber: exSurahNum,
      surahName: surahObj?.name ?? `سورة رقم ${exSurahNum}`,
      ayahNumber: exAyahNum,
      highlightSegment: exHighlight.trim() || previewAyahText.slice(0, 24),
      ruleNote: exRuleNote.trim() || 'موضع تطبيق الحكم في الآية الكريمة.',
    };
    setEditingLesson({
      ...editingLesson,
      exampleRefs: [...editingLesson.exampleRefs, newEx],
    });
    setExHighlight('');
    setExRuleNote('');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson || !editingLesson.title.trim()) return;
    onSaveLesson(editingLesson, isNewMode);
    setEditingLesson(null);
  };

  const updatePracticeItem = (
    idx: number,
    patch: Partial<TajweedPracticeItem>
  ) => {
    if (!editingLesson) return;
    const next = [...editingLesson.practiceItems];
    next[idx] = { ...next[idx], ...patch };
    setEditingLesson({ ...editingLesson, practiceItems: next });
  };

  const updateQuizItem = (
    idx: number,
    patch: Partial<TajweedQuizQuestion>
  ) => {
    if (!editingLesson) return;
    const next = [...editingLesson.quizQuestions];
    next[idx] = { ...next[idx], ...patch };
    setEditingLesson({ ...editingLesson, quizQuestions: next });
  };

  return (
    <section className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#C69749] p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ECE4D4] dark:border-[#214232] pb-4">
        <div>
          <div className="inline-flex items-center gap-2 text-sm font-bold text-[#9C6F21] dark:text-[#D6A954]">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            <span>لوحة مسؤول المحتوى التعليمي</span>
          </div>
          <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#133A2A] dark:text-[#F7F3EA] mt-1">
            إدارة وتعديل دروس التجويد والمراجعة العلمية
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={startNewLesson}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#C69749] hover:bg-[#B38538] text-[#133A2A] font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة درس جديد</span>
          </button>

          <button
            type="button"
            onClick={onResetDefault}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] text-[#133A2A] dark:text-[#F7F3EA] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>استعادة المنهج المعتمد</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#133A2A] text-[#F7F3EA] text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>العودة للدروس</span>
          </button>
        </div>
      </div>

      {!editingLesson ? (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="p-4 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] flex flex-wrap items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="text-xs font-semibold text-[#9C6F21] dark:text-[#D6A954]">
                  المستوى {lesson.level} · الوحدة {lesson.unitNumber}: {lesson.unitTitle} ·{' '}
                  {lesson.reviewStatus === 'reviewed'
                    ? 'مراجَع علمياً'
                    : 'بانتظار المراجعة العلمية'}{' '}
                  · {lesson.scientificReference}
                </div>
                <div className="font-display text-xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                  {lesson.title}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingLesson(lesson);
                    setIsNewMode(false);
                  }}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>تعديل</span>
                </button>
                {lessons.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteLesson(lesson.id)}
                    aria-label={`حذف درس ${lesson.title}`}
                    className="min-h-[42px] min-w-[42px] rounded-xl bg-[#EFE8D8] dark:bg-[#1B3A2C] text-[#B84A39] dark:text-[#FCA5A5] flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSaveForm} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1.5">اسم الحكم *</label>
              <input
                type="text"
                required
                value={editingLesson.title}
                onChange={(e) =>
                  setEditingLesson({ ...editingLesson, title: e.target.value })
                }
                placeholder="مثال: أحكام الراء"
                className="w-full min-h-[44px] px-4 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold mb-1.5">الوحدة والمستوى</label>
                <select
                  value={editingLesson.unitId}
                  onChange={(e) => {
                    const unit = TAJWEED_UNITS.find((u) => u.id === e.target.value);
                    if (!unit) return;
                    setEditingLesson({
                      ...editingLesson,
                      unitId: unit.id,
                      unitNumber: unit.unitNumber,
                      unitTitle: unit.title.replace(/^الوحدة\s+[^:]+:\s*/, ''),
                      level: unit.level,
                      category: unit.category,
                    });
                  }}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-sm"
                >
                  {TAJWEED_UNITS.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      م{unit.level} · {unit.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1.5">
                  حالة المراجعة العلمية
                </label>
                <select
                  value={editingLesson.reviewStatus}
                  onChange={(e) =>
                    setEditingLesson({
                      ...editingLesson,
                      reviewStatus: e.target.value as ScientificReviewStatus,
                    })
                  }
                  className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736]"
                >
                  <option value="reviewed">مراجَع علمياً</option>
                  <option value="pending_review">بانتظار المراجعة</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1.5">المرجع العلمي</label>
              <input
                type="text"
                value={editingLesson.scientificReference}
                onChange={(e) =>
                  setEditingLesson({
                    ...editingLesson,
                    scientificReference: e.target.value,
                  })
                }
                className="w-full min-h-[44px] px-4 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736]"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1.5">
                حروف الحكم أو النقاط الأساسية
              </label>
              <input
                type="text"
                value={editingLesson.lettersOrPoints}
                onChange={(e) =>
                  setEditingLesson({
                    ...editingLesson,
                    lettersOrPoints: e.target.value,
                  })
                }
                className="w-full min-h-[44px] px-4 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1.5">أهداف التعلم (هدف في كل سطر)</label>
            <textarea
              rows={2}
              value={(editingLesson.learningObjectives ?? []).join('\n')}
              onChange={(e) =>
                setEditingLesson({
                  ...editingLesson,
                  learningObjectives: e.target.value
                    .split('\n')
                    .map((x) => x.trim())
                    .filter(Boolean),
                })
              }
              className="w-full p-3.5 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736]"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1.5">تعريف بسيط *</label>
            <textarea
              rows={2}
              required
              value={editingLesson.simpleDefinition}
              onChange={(e) =>
                setEditingLesson({
                  ...editingLesson,
                  simpleDefinition: e.target.value,
                })
              }
              className="w-full p-3.5 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736]"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1.5">شرح واضح *</label>
            <textarea
              rows={3}
              required
              value={editingLesson.explanation}
              onChange={(e) =>
                setEditingLesson({
                  ...editingLesson,
                  explanation: e.target.value,
                })
              }
              className="w-full p-3.5 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736]"
            />
          </div>

          {/* Attach Verified Quranic Example from API */}
          <div className="p-5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] space-y-4">
            <div className="font-bold text-base text-[#133A2A] dark:text-[#D6A954]">
              إرفاق مثال قرآني موثق (يُجلب النص مباشرة من المصدر الموثوق)
            </div>

            {editingLesson.exampleRefs.length > 0 && (
              <div className="space-y-2">
                {editingLesson.exampleRefs.map((ex) => (
                  <div
                    key={ex.id}
                    className="p-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] flex items-center justify-between gap-2 text-sm"
                  >
                    <span>
                      {ex.surahName} (آية {ex.ayahNumber}) — {ex.highlightSegment}:{' '}
                      {ex.ruleNote}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingLesson({
                          ...editingLesson,
                          exampleRefs: editingLesson.exampleRefs.filter(
                            (x) => x.id !== ex.id
                          ),
                        })
                      }
                      className="text-[#B84A39] text-xs font-bold cursor-pointer"
                    >
                      إزالة
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <select
                value={exSurahNum}
                onChange={(e) => {
                  setExSurahNum(Number(e.target.value));
                  setExAyahNum(1);
                }}
                className="min-h-[42px] px-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] text-sm"
              >
                {surahs.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.number}. {s.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={1}
                value={exAyahNum}
                onChange={(e) => setExAyahNum(Math.max(1, Number(e.target.value) || 1))}
                placeholder="رقم الآية"
                className="min-h-[42px] px-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] text-sm tabular-nums"
              />

              <input
                type="text"
                value={exHighlight}
                onChange={(e) => setExHighlight(e.target.value)}
                placeholder="الكلمة موضع الحكم"
                className="min-h-[42px] px-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] text-sm"
              />

              <button
                type="button"
                onClick={handleAddVerifiedExample}
                className="min-h-[42px] px-4 rounded-xl bg-[#133A2A] text-[#F7F3EA] text-sm font-bold cursor-pointer"
              >
                إضافة المثال الموثق
              </button>
            </div>

            {previewAyahText && (
              <div className="p-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] font-display text-lg text-[#1A2A22] dark:text-[#F7F3EA]">
                معاينة النص الموثق: {previewAyahText}
              </div>
            )}

            <input
              type="text"
              value={exRuleNote}
              onChange={(e) => setExRuleNote(e.target.value)}
              placeholder="توضيح تطبيق الحكم في هذه الآية..."
              className="w-full min-h-[42px] px-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] text-sm"
            />
          </div>

          {/* Interactive Practice & Quiz Quick Editor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editingLesson.practiceItems[0] && (
              <div className="p-4 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] space-y-2.5">
                <div className="font-bold text-sm text-[#133A2A] dark:text-[#D6A954]">
                  التدريب التفاعلي الأول
                </div>
                <input
                  type="text"
                  value={editingLesson.practiceItems[0].prompt}
                  onChange={(e) =>
                    updatePracticeItem(0, { prompt: e.target.value })
                  }
                  placeholder="نص سؤال التدريب"
                  className="w-full min-h-[40px] px-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] text-sm"
                />
                <input
                  type="text"
                  value={editingLesson.practiceItems[0].options.join(' | ')}
                  onChange={(e) => {
                    const opts = e.target.value
                      .split('|')
                      .map((x) => x.trim())
                      .filter(Boolean);
                    updatePracticeItem(0, {
                      options: opts,
                      correctOption: opts[0] ?? '',
                    });
                  }}
                  placeholder="الخيارات مفصولة بعلامة |"
                  className="w-full min-h-[40px] px-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] text-sm"
                />
                <input
                  type="text"
                  value={editingLesson.practiceItems[0].correctOption}
                  onChange={(e) =>
                    updatePracticeItem(0, { correctOption: e.target.value })
                  }
                  placeholder="الإجابة الصحيحة"
                  className="w-full min-h-[40px] px-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] text-sm"
                />
              </div>
            )}

            {editingLesson.quizQuestions[0] && (
              <div className="p-4 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] space-y-2.5">
                <div className="font-bold text-sm text-[#133A2A] dark:text-[#D6A954]">
                  سؤال الاختبار القصير الأول
                </div>
                <input
                  type="text"
                  value={editingLesson.quizQuestions[0].question}
                  onChange={(e) =>
                    updateQuizItem(0, { question: e.target.value })
                  }
                  placeholder="نص السؤال"
                  className="w-full min-h-[40px] px-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] text-sm"
                />
                <input
                  type="text"
                  value={editingLesson.quizQuestions[0].options.join(' | ')}
                  onChange={(e) =>
                    updateQuizItem(0, {
                      options: e.target.value
                        .split('|')
                        .map((x) => x.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="الخيارات مفصولة بعلامة |"
                  className="w-full min-h-[40px] px-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] text-sm"
                />
                <input
                  type="text"
                  value={editingLesson.quizQuestions[0].explanation}
                  onChange={(e) =>
                    updateQuizItem(0, { explanation: e.target.value })
                  }
                  placeholder="توضيح الإجابة"
                  className="w-full min-h-[40px] px-3 rounded-xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] text-sm"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              className="min-h-[48px] px-7 py-3 rounded-xl bg-[#C69749] hover:bg-[#B38538] text-[#133A2A] font-bold text-base inline-flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ التعديلات في المنهج</span>
            </button>
            <button
              type="button"
              onClick={() => setEditingLesson(null)}
              className="min-h-[48px] px-5 py-3 rounded-xl bg-[#EFE8D8] dark:bg-[#1B3A2C] font-semibold text-sm cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}
    </section>
  );
};
