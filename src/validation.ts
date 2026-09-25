import type { Calendar, Slot, TimetableInput } from './types';

export const DEFAULT_CALENDAR: Calendar = {
  days: [2, 3, 4, 5, 6, 7],
  periods: Array.from({ length: 5 }, (_, i) => ({ id: i + 1, session: 'sang' })),
};
export class InputError extends Error {
  constructor(message: string) { super(message); this.name = 'InputError'; }
}
export function calendarOf(input: TimetableInput): Calendar { return input.calendar ?? DEFAULT_CALENDAR; }
export function slotKey(slot: Slot): string { return `${slot.day}:${slot.period}`; }
export function assignmentKey(a: { classId: string; subjectId: string; teacherId: string }): string {
  return JSON.stringify([a.classId, a.subjectId, a.teacherId]);
}
function assert(ok: unknown, message: string): asserts ok { if (!ok) throw new InputError(message); }
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function id(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function positive(value: unknown): value is number { return Number.isSafeInteger(value) && (value as number) > 0; }

/** Validate at runtime too: JSON/CSV callers do not have TypeScript's guarantees. */
export function validateInput(value: unknown): asserts value is TimetableInput {
  assert(record(value), 'Input phải là một object JSON.');
  for (const field of ['classes', 'teachers', 'subjects', 'assignments']) {
    assert(Array.isArray(value[field]) && (value[field] as unknown[]).length > 0, `${field} phải là mảng không rỗng.`);
  }
  const input = value as unknown as TimetableInput;
  const calendar = calendarOf(input);
  assert(record(calendar), 'calendar phải là object.');
  assert(Array.isArray(calendar.days) && calendar.days.length > 0 && calendar.days.every(d => Number.isInteger(d) && d >= 2 && d <= 8), 'calendar.days phải chứa thứ 2–8 (8 = Chủ nhật).');
  assert(new Set(calendar.days).size === calendar.days.length, 'calendar.days có thứ bị trùng.');
  assert(Array.isArray(calendar.periods) && calendar.periods.length > 0, 'calendar.periods không được rỗng.');
  const sessions = new Set<string>();
  let previousSession = '';
  for (const p of calendar.periods) {
    assert(record(p) && positive(p.id) && id(p.session), 'Mỗi tiết cần id nguyên dương và session.');
    assert(p.label === undefined || id(p.label), 'Nhãn tiết phải là chuỗi không rỗng.');
    if (p.session !== previousSession) {
      assert(!sessions.has(p.session), 'Các tiết cùng session phải liên tiếp trong calendar.periods.');
      sessions.add(p.session); previousSession = p.session;
    }
  }
  assert(new Set(calendar.periods.map(p => p.id)).size === calendar.periods.length, 'Mã tiết bị trùng.');
  const validSlots = new Set(calendar.days.flatMap(day => calendar.periods.map(p => slotKey({ day, period: p.id }))));
  const checkSlots = (slots: unknown, field: string) => {
    assert(Array.isArray(slots), `${field} phải là mảng ô thời gian.`);
    const seen = new Set<string>();
    for (const slot of slots) {
      assert(record(slot) && Number.isInteger(slot.day) && Number.isInteger(slot.period) && validSlots.has(slotKey(slot as unknown as Slot)), `${field} chứa ô ngoài lịch.`);
      const key = slotKey(slot as unknown as Slot);
      assert(!seen.has(key), `${field} chứa ô trùng.`); seen.add(key);
    }
  };
  for (const field of ['classes', 'teachers', 'subjects'] as const) {
    const seen = new Set<string>();
    for (const item of input[field]) {
      assert(record(item) && id(item.id), `${field}: id phải là chuỗi không rỗng.`);
      assert(!seen.has(item.id), `${field}: id trùng ${item.id}.`); seen.add(item.id);
      assert(item.name === undefined || id(item.name), `${field}: name phải là chuỗi không rỗng.`);
    }
  }
  for (const c of input.classes) if (c.available !== undefined) checkSlots(c.available, `Lớp ${c.id}.available`);
  for (const t of input.teachers) if (t.unavailable !== undefined) checkSlots(t.unavailable, `GV ${t.id}.unavailable`);
  for (const s of input.subjects) {
    assert(s.maxPerDay === undefined || positive(s.maxPerDay), `Môn ${s.id}: maxPerDay phải nguyên dương.`);
    assert(s.double === undefined || typeof s.double === 'boolean', `Môn ${s.id}: double phải là boolean.`);
    assert(s.heavy === undefined || typeof s.heavy === 'boolean', `Môn ${s.id}: heavy phải là boolean.`);
  }
  const classes = new Set(input.classes.map(c => c.id));
  const teachers = new Set(input.teachers.map(t => t.id));
  const subjects = new Set(input.subjects.map(s => s.id));
  const seenAssignments = new Set<string>();
  const checkReferences = (a: unknown) => {
    assert(record(a) && classes.has(a.classId as string) && teachers.has(a.teacherId as string) && subjects.has(a.subjectId as string), 'Phân công/tiết cố định tham chiếu lớp, môn hoặc GV không tồn tại.');
  };
  for (const a of input.assignments) {
    checkReferences(a);
    assert(positive(a.periods), 'so_tiet/periods phải là số nguyên dương.');
    const key = assignmentKey(a);
    assert(!seenAssignments.has(key), 'Phân công trùng bộ lớp/môn/GV; hãy gộp số tiết.'); seenAssignments.add(key);
  }
  if (input.fixed !== undefined) {
    assert(Array.isArray(input.fixed), 'fixed phải là mảng.');
    for (const f of input.fixed) {
      checkReferences(f); checkSlots([f], 'fixed');
      assert(seenAssignments.has(assignmentKey(f)), 'Tiết cố định phải thuộc một phân công.');
    }
  }
}
