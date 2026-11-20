import React, { useState } from 'react';
import {
  CheckCircle2,
  Minus,
  Plus,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';
import { GoalCategory, GoalScope, PersonalGoal } from '../types';

interface PersonalGoalsPanelProps {
  goals: PersonalGoal[];
  onAddGoal: (goal: Omit<PersonalGoal, 'id' | 'createdAt' | 'completed'>) => void;
  onIncrementGoal: (goalId: string, delta: number) => void;
  onDeleteGoal: (goalId: string) => void;
  onResetGoals: () => void;
}

const SCOPE_LABELS: Record<GoalScope, string> = {
  daily: 'يومي',
  weekly: 'أسبوعي',
  monthly: 'شهري',
};

const CATEGORY_LABELS: Record<GoalCategory, string> = {
  memorization: 'الحفظ والمراجعة',
  tajweed: 'التجويد',
  recitation: 'التلاوة',
  hadith_dua: 'الأحاديث والأدعية',
  general: 'وِرد عام',
};

export const PersonalGoalsPanel: React.FC<PersonalGoalsPanelProps> = ({
  goals,
  onAddGoal,
  onIncrementGoal,
  onDeleteGoal,
  onResetGoals,
}) => {
  const [scopeFilter, setScopeFilter] = useState<'all' | GoalScope>('all');
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<GoalScope>('daily');
  const [category, setCategory] = useState<GoalCategory>('memorization');
  const [targetCount, setTargetCount] = useState(5);
  const [unitLabel, setUnitLabel] = useState('آيات');
  const [note, setNote] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const filteredGoals =
    scopeFilter === 'all'
      ? goals
      : goals.filter((g) => g.scope === scopeFilter);

  const completedCount = goals.filter((g) => g.completed).length;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedTitle = title.trim();
    if (!cleanedTitle) return;

    onAddGoal({
      title: cleanedTitle,
      scope,
      category,
      targetCount: Math.max(1, targetCount),
      currentCount: 0,
      unitLabel: unitLabel.trim() || 'مرة',
      note: note.trim() || undefined,
    });

    setTitle('');
    setNote('');
    setShowForm(false);
    setFeedbackMsg('أُضيف هدفك الشخصي بنجاح — نسأل الله لك التيسير والبركة.');
    window.setTimeout(() => setFeedbackMsg(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Header & Summary */}
      <section className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-sm font-bold text-[#9C6F21] dark:text-[#D6A954]">
            <Target className="w-4 h-4" aria-hidden="true" />
            <span>نظام الأهداف الشخصية المرن</span>
          </div>
          <h3 className="font-display text-2xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
            صمّم أهدافك بما يناسب وقتك وقدرتك
          </h3>
          <p className="text-sm text-[#46524B] dark:text-[#D8D0C0]">
            أهدافك هنا لتشجيعك ومرافقتك بلطف؛ يمكنك تعديل وتيرتها متى شئت، ولا يضيع أي تقدم أحرزته.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="px-4 py-2.5 rounded-2xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#E5DEC9] dark:border-[#224434] text-sm font-bold tabular-nums text-[#133A2A] dark:text-[#F7F3EA]">
            المكتمل: {completedCount} من {goals.length}
          </div>
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#133A2A] hover:bg-[#1B4D38] dark:bg-[#C69749] dark:hover:bg-[#B38538] text-[#F7F3EA] dark:text-[#133A2A] text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{showForm ? 'إغلاق النموذج' : 'إضافة هدف شخصي'}</span>
          </button>
        </div>
      </section>

      {feedbackMsg && (
        <div className="rounded-2xl bg-[#1B6B46]/12 border border-[#1B6B46]/40 px-5 py-3.5 text-sm font-bold text-[#1B6B46] dark:text-[#6EE7B7] flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Add New Goal Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#C69749] p-6 space-y-5"
        >
          <h4 className="font-display text-xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
            إنشاء هدف شخصي جديد
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label
                htmlFor="goal-title"
                className="block text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]"
              >
                عنوان الهدف
              </label>
              <input
                id="goal-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: مراجعة وجه واحد من سورة البقرة بهدوء"
                className="w-full min-h-[46px] px-4 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-sm text-[#1A2A22] dark:text-[#F7F3EA]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="goal-scope"
                className="block text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]"
              >
                الإطار الزمني
              </label>
              <select
                id="goal-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value as GoalScope)}
                className="w-full min-h-[46px] px-3 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-sm font-semibold"
              >
                <option value="daily">هدف يومي</option>
                <option value="weekly">هدف أسبوعي</option>
                <option value="monthly">هدف شهري</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="goal-category"
                className="block text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]"
              >
                المجال
              </label>
              <select
                id="goal-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as GoalCategory)}
                className="w-full min-h-[46px] px-3 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-sm font-semibold"
              >
                <option value="memorization">الحفظ والمراجعة</option>
                <option value="tajweed">التجويد</option>
                <option value="recitation">التدريب على التلاوة</option>
                <option value="hadith_dua">الأحاديث والأدعية</option>
                <option value="general">وِرد عام</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="goal-target"
                className="block text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]"
              >
                المقدار المستهدف
              </label>
              <input
                id="goal-target"
                type="number"
                min={1}
                max={100}
                value={targetCount}
                onChange={(e) =>
                  setTargetCount(Math.max(1, Number(e.target.value) || 1))
                }
                className="w-full min-h-[46px] px-4 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-sm tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="goal-unit"
                className="block text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]"
              >
                وحدة القياس
              </label>
              <input
                id="goal-unit"
                type="text"
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                placeholder="آيات / جلسات / صفحات / دروس"
                className="w-full min-h-[46px] px-4 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-sm"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label
                htmlFor="goal-note"
                className="block text-sm font-bold text-[#133A2A] dark:text-[#F7F3EA]"
              >
                ملاحظة أو نية مشجعة (اختياري)
              </label>
              <input
                id="goal-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثال: وقت الفجر هو الأنسب لي للتركيز"
                className="w-full min-h-[46px] px-4 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#0F241A] border border-[#DFD6C5] dark:border-[#244736] text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="min-h-[46px] px-6 py-2.5 rounded-xl bg-[#C69749] hover:bg-[#B38538] text-[#133A2A] font-bold text-sm cursor-pointer"
            >
              حفظ الهدف الشخصي
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#EFE8D8] dark:bg-[#1B3A2C] text-sm font-semibold cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* Scope Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#EAE2D2] dark:bg-[#193729]">
          {(
            [
              { id: 'all', label: 'جميع الأهداف' },
              { id: 'daily', label: 'يومية' },
              { id: 'weekly', label: 'أسبوعية' },
              { id: 'monthly', label: 'شهرية' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScopeFilter(tab.id)}
              className={`min-h-[40px] px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                scopeFilter === tab.id
                  ? 'bg-[#133A2A] text-[#F7F3EA] dark:bg-[#C69749] dark:text-[#133A2A]'
                  : 'text-[#46524B] dark:text-[#D8D0C0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onResetGoals}
          className="min-h-[40px] px-3 text-xs font-semibold text-[#6B6254] dark:text-[#BFB6A4] hover:underline cursor-pointer"
        >
          استعادة الأهداف الافتراضية
        </button>
      </div>

      {/* Personal Goal Cards */}
      {filteredGoals.length === 0 ? (
        <div className="rounded-3xl bg-[#FFFDF9] dark:bg-[#132B20] border border-[#DFD6C5] dark:border-[#244736] p-8 text-center text-[#6B6254] dark:text-[#BFB6A4]">
          لا توجد أهداف شخصية ضمن هذا التصنيف بعد. أضف هدفاً بسيطاً يناسب يومك!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGoals.map((goal) => {
            const pct = Math.min(
              100,
              Math.round((goal.currentCount / Math.max(1, goal.targetCount)) * 100)
            );
            return (
              <article
                key={goal.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-colors ${
                  goal.completed
                    ? 'bg-[#FFFDF9] dark:bg-[#132B20] border-[#1B6B46]'
                    : 'bg-[#FFFDF9] dark:bg-[#132B20] border-[#DFD6C5] dark:border-[#244736]'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-[#9C6F21] dark:text-[#D6A954]">
                        هدف {SCOPE_LABELS[goal.scope]} · {CATEGORY_LABELS[goal.category]}
                      </div>
                      <h4 className="font-display text-xl font-bold text-[#133A2A] dark:text-[#F7F3EA]">
                        {goal.title}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteGoal(goal.id)}
                      aria-label={`حذف هدف ${goal.title}`}
                      className="min-h-[40px] min-w-[40px] rounded-xl text-[#8C8373] hover:text-[#B84A39] hover:bg-[#EFE8D8] dark:hover:bg-[#1B3A2C] flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  {goal.note && (
                    <p className="text-sm text-[#46524B] dark:text-[#D8D0C0]">
                      {goal.note}
                    </p>
                  )}

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-bold tabular-nums">
                      <span className="text-[#133A2A] dark:text-[#F7F3EA]">
                        التقدّم: {goal.currentCount} / {goal.targetCount} {goal.unitLabel}
                      </span>
                      <span
                        className={
                          goal.completed
                            ? 'text-[#1B6B46] dark:text-[#6EE7B7]'
                            : 'text-[#9C6F21] dark:text-[#D6A954]'
                        }
                      >
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-[#EFE8D8] dark:bg-[#183528] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          goal.completed
                            ? 'bg-[#1B6B46] dark:bg-[#6EE7B7]'
                            : 'bg-[#C69749]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-[#ECE4D4] dark:border-[#214232] flex flex-wrap items-center justify-between gap-2">
                  {goal.completed ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1B6B46] dark:text-[#6EE7B7]">
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      <span>تم تحقيق الهدف بحمد الله</span>
                    </span>
                  ) : (
                    <span className="text-xs text-[#6B6254] dark:text-[#BFB6A4]">
                      سجّل تقدمك خطوة بخطوة (+٥ نقاط لكل خطوة)
                    </span>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={goal.currentCount <= 0}
                      onClick={() => onIncrementGoal(goal.id, -1)}
                      aria-label="إنقاص خطوة"
                      className="min-h-[42px] min-w-[42px] rounded-xl bg-[#EFE8D8] hover:bg-[#E4DAC4] dark:bg-[#1B3A2C] disabled:opacity-40 flex items-center justify-center cursor-pointer"
                    >
                      <Minus className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onIncrementGoal(goal.id, 1)}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-[#133A2A] hover:bg-[#1B4D38] dark:bg-[#C69749] dark:hover:bg-[#B38538] text-[#F7F3EA] dark:text-[#133A2A] text-sm font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" aria-hidden="true" />
                      <span>إضافة إنجاز</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
