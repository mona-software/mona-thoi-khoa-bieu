import type { Lesson, SoftViolation, SoftWeights, TimetableInput } from './types';
import { calendarOf } from './validation';

export const DEFAULT_WEIGHTS: SoftWeights = { dailyLimit: 20, double: 8, gaps: 3, spread: 4, heavy: 2 };

/** Every violation contributes units * weight. Zero weights still report violations. */
export function scoreTimetable(input: TimetableInput, lessons: Lesson[], weights: SoftWeights = DEFAULT_WEIGHTS): { penalty: number; violations: SoftViolation[] } {
  const calendar = calendarOf(input);
  const periods = new Map(calendar.periods.map((p, i) => [p.id, { ...p, index: i }]));
  const subjects = new Map(input.subjects.map(s => [s.id, s]));
  const grouped = new Map<string, Lesson[]>();
  const teachers = new Map<string, Lesson[]>();
  const violations: SoftViolation[] = [];
  const add = (v: Omit<SoftViolation, 'penalty'>) => { if (v.units > 0) violations.push({ ...v, penalty: v.units * weights[v.type] }); };
  for (const lesson of lessons) {
    const key = JSON.stringify([lesson.classId, lesson.subjectId]);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(lesson);
    const session = periods.get(lesson.period)!.session;
    const tkey = JSON.stringify([lesson.teacherId, lesson.day, session]);
    if (!teachers.has(tkey)) teachers.set(tkey, []);
    teachers.get(tkey)!.push(lesson);
    const subject = subjects.get(lesson.subjectId)!;
    const position = calendar.periods.filter(p => p.session === session).findIndex(p => p.id === lesson.period);
    if (subject.heavy && position >= 3) add({ type: 'heavy', classId: lesson.classId, subjectId: subject.id, day: lesson.day, units: 1, message: `${lesson.classId}: ${subject.name ?? subject.id} ngoài 3 tiết đầu buổi, thứ ${lesson.day}.` });
  }
  for (const group of grouped.values()) {
    const { classId, subjectId } = group[0];
    const subject = subjects.get(subjectId)!;
    const counts = calendar.days.map(day => group.filter(l => l.day === day).length);
    let pairs = 0;
    calendar.days.forEach((day, i) => {
      add({ type: 'dailyLimit', classId, subjectId, day, units: Math.max(0, counts[i] - (subject.maxPerDay ?? 2)), message: `${classId}: ${subject.name ?? subjectId} quá ${subject.maxPerDay ?? 2} tiết/ngày, thứ ${day}.` });
      const dayLessons = group.filter(l => l.day === day).sort((a, b) => periods.get(a.period)!.index - periods.get(b.period)!.index);
      for (let j = 0; j + 1 < dayLessons.length; j++) {
        const a = periods.get(dayLessons[j].period)!;
        const b = periods.get(dayLessons[j + 1].period)!;
        if (b.index === a.index + 1 && a.session === b.session && dayLessons[j].teacherId === dayLessons[j + 1].teacherId) { pairs++; j++; }
      }
    });
    if (subject.double) add({ type: 'double', classId, subjectId, units: Math.max(0, Math.floor(group.length / 2) - pairs), message: `${classId}: ${subject.name ?? subjectId} còn thiếu tiết đôi.` });
    // Convex concentration cost relative to the most even possible distribution.
    const q = Math.floor(group.length / calendar.days.length);
    const r = group.length % calendar.days.length;
    const ideal = r * (q + 1) ** 2 + (calendar.days.length - r) * q ** 2;
    add({ type: 'spread', classId, subjectId, units: (counts.reduce((sum, n) => sum + n * n, 0) - ideal) / 2, message: `${classId}: ${subject.name ?? subjectId} chưa rải đều trong tuần.` });
  }
  for (const group of teachers.values()) {
    const indices = group.map(l => periods.get(l.period)!.index).sort((a, b) => a - b);
    add({ type: 'gaps', teacherId: group[0].teacherId, day: group[0].day, units: indices[indices.length - 1] - indices[0] + 1 - indices.length, message: `GV ${group[0].teacherId} có tiết trống giữa buổi, thứ ${group[0].day}.` });
  }
  return { penalty: violations.reduce((sum, v) => sum + v.penalty, 0), violations };
}
