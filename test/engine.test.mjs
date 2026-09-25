import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { xepThoiKhoaBieu, checkHardConstraints, validateInput, InputError, scoreTimetable, DEFAULT_WEIGHTS } from '../dist/index.js';
import { benchmarkInput } from '../scripts/benchmark.mjs';

const school = JSON.parse(readFileSync(new URL('../examples/thcs/input.json', import.meta.url), 'utf8'));
const centre = JSON.parse(readFileSync(new URL('../examples/trung-tam/input.json', import.meta.url), 'utf8'));
const tiny = () => ({ classes: [{ id: 'A' }], teachers: [{ id: 'Lan' }], subjects: [{ id: 'Toan', heavy: true, double: true }], assignments: [{ classId: 'A', teacherId: 'Lan', subjectId: 'Toan', periods: 4 }] });

// Independent assertions: do not rely only on the library's verifier.
function assertHard(input, result) {
  assert.equal(result.status, 'success', result.reasons.join('; '));
  const occupiedClasses = new Set(), occupiedTeachers = new Set(), counts = new Map();
  for (const l of result.lessons) {
    const ckey = JSON.stringify([l.classId, l.day, l.period]), tkey = JSON.stringify([l.teacherId, l.day, l.period]);
    assert.ok(!occupiedClasses.has(ckey), 'class collision'); assert.ok(!occupiedTeachers.has(tkey), 'teacher collision');
    occupiedClasses.add(ckey); occupiedTeachers.add(tkey);
    assert.ok((input.calendar?.days ?? [2, 3, 4, 5, 6, 7]).includes(l.day));
    assert.ok((input.calendar?.periods.map(p => p.id) ?? [1, 2, 3, 4, 5]).includes(l.period));
    const t = input.teachers.find(t => t.id === l.teacherId), c = input.classes.find(c => c.id === l.classId);
    assert.ok(t && c);
    assert.ok(!t.unavailable?.some(s => s.day === l.day && s.period === l.period));
    assert.ok(!c.available || c.available.some(s => s.day === l.day && s.period === l.period));
    const key = JSON.stringify([l.classId, l.subjectId, l.teacherId]); counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  assert.equal(result.lessons.length, input.assignments.reduce((sum, a) => sum + a.periods, 0));
  for (const a of input.assignments) assert.equal(counts.get(JSON.stringify([a.classId, a.subjectId, a.teacherId])), a.periods);
  for (const f of input.fixed ?? []) assert.ok(result.lessons.some(l => l.classId === f.classId && l.subjectId === f.subjectId && l.teacherId === f.teacherId && l.day === f.day && l.period === f.period && l.fixed));
  assert.deepEqual(checkHardConstraints(input, result.lessons), []);
  assert.equal(result.penalty, result.violations.reduce((s, v) => s + v.penalty, 0));
  assert.ok(result.penalty <= result.stats.initialPenalty, 'annealing must return best observed schedule');
}

test('THCS 12 lớp: hard constraints hold across 40 seeds, optimization never worsens score', () => {
  for (let seed = 0; seed < 40; seed++) assertHard(school, xepThoiKhoaBieu(school, { seed, maxIterations: 300, timeLimitMs: 3000 }));
});
test('property: 60 generated feasible instances, sparse class availability and teacher bans', () => {
  for (let seed = 0; seed < 60; seed++) {
    const input = { calendar: { days: [2, 4, 6], periods: [1, 2, 3, 4].map(id => ({ id, session: id <= 2 ? 'sang' : 'chieu' })) }, classes: [], teachers: [], subjects: [{ id: 'A', double: true, heavy: true }, { id: 'B' }], assignments: [], fixed: [] };
    const witness = [], counts = new Map();
    for (let c = 0; c < 4; c++) for (let s = 0; s < 12; s++) {
      if ((c * 13 + s * 7 + seed) % 5 === 0) continue;
      const lesson = { classId: `L${c}`, teacherId: `G${(c + s + seed) % 5}`, subjectId: (s + c) % 2 ? 'A' : 'B', day: [2, 4, 6][Math.floor(s / 4)], period: 1 + s % 4 };
      witness.push(lesson);
      const key = JSON.stringify([lesson.classId, lesson.subjectId, lesson.teacherId]); counts.set(key, (counts.get(key) ?? 0) + 1);
      if (s === 0) input.fixed.push(lesson);
    }
    for (let c = 0; c < 4; c++) input.classes.push({ id: `L${c}`, available: witness.filter(l => l.classId === `L${c}`).map(({ day, period }) => ({ day, period })) });
    for (let t = 0; t < 5; t++) input.teachers.push({ id: `G${t}`, unavailable: input.calendar.days.flatMap(day => input.calendar.periods.map(p => ({ day, period: p.id }))).filter(s => !witness.some(l => l.teacherId === `G${t}` && l.day === s.day && l.period === s.period)) });
    input.assignments = [...counts].map(([key, periods]) => { const [classId, subjectId, teacherId] = JSON.parse(key); return { classId, subjectId, teacherId, periods }; });
    assertHard(input, xepThoiKhoaBieu(input, { seed, timeLimitMs: 2000, maxIterations: 50 }));
  }
});
test('target workload 30 classes × 45 teachers × 30 slots, five seeds below 5 seconds', () => {
  const input = benchmarkInput();
  for (const seed of [0, 1, 42, 123, 4294967295]) {
    const result = xepThoiKhoaBieu(input, { seed, timeLimitMs: 5000, maxIterations: 100 });
    assertHard(input, result); assert.ok(result.stats.constructionMs < 5000);
  }
});
test('three evening periods; reproducible result, no mutation', () => {
  const original = structuredClone(centre);
  const a = xepThoiKhoaBieu(centre, { seed: 7, maxIterations: 700 });
  const b = xepThoiKhoaBieu(centre, { seed: 7, maxIterations: 700 });
  assertHard(centre, a); assert.deepEqual(a.lessons, b.lessons); assert.equal(a.penalty, b.penalty); assert.deepEqual(centre, original);
});
test('30 full classes with subject-specialist teachers and multi-period assignments', () => {
  const input = {
    classes: Array.from({ length: 30 }, (_, i) => ({ id: `L${i}` })),
    teachers: Array.from({ length: 45 }, (_, i) => ({ id: `T${i}` })),
    subjects: Array.from({ length: 10 }, (_, i) => ({ id: `M${i}`, double: i < 2, heavy: i < 3 })),
    assignments: [],
  };
  input.assignments = input.classes.flatMap((c, i) => input.subjects.map((s, j) => ({ classId: c.id, subjectId: s.id, teacherId: `T${j < 5 ? j * 5 + i % 5 : 25 + (j - 5) * 4 + i % 4}`, periods: 3 })));
  for (const seed of [0, 1, 2, 42, 100]) assertHard(input, xepThoiKhoaBieu(input, { seed, timeLimitMs: 5000, maxIterations: 300 }));
});
test('teacher overload reports demand and capacity', () => {
  const input = tiny(); input.classes.push({ id: 'B' }); input.assignments[0].periods = 16; input.assignments.push({ ...input.assignments[0], classId: 'B' });
  const r = xepThoiKhoaBieu(input); assert.equal(r.status, 'infeasible'); assert.match(r.reasons.join(' '), /GV Lan.*32.*30/); assert.deepEqual(r.lessons, []);
});
test('class overload, empty availability, incompatible fixed lessons are infeasible', () => {
  const input = tiny(); input.assignments[0].periods = 31; assert.equal(xepThoiKhoaBieu(input).status, 'infeasible');
  const unavailable = tiny(); unavailable.classes[0].available = []; assert.equal(xepThoiKhoaBieu(unavailable).status, 'infeasible');
  const busy = tiny(); busy.fixed = [{ classId: 'A', teacherId: 'Lan', subjectId: 'Toan', day: 2, period: 1 }]; busy.teachers[0].unavailable = [{ day: 2, period: 1 }];
  assert.equal(xepThoiKhoaBieu(busy).status, 'infeasible');
  busy.teachers[0].unavailable = []; busy.fixed.push({ ...busy.fixed[0] }); assert.equal(xepThoiKhoaBieu(busy).status, 'infeasible');
  busy.fixed = Array.from({ length: 5 }, (_, i) => ({ ...busy.fixed[0], period: i + 1 })); assert.equal(xepThoiKhoaBieu(busy).status, 'infeasible');
});
test('matching precheck proves shared teacher bottleneck despite individually sufficient domains', () => {
  const input = tiny(); input.classes = ['A', 'B'].map(id => ({ id, available: [{ day: 2, period: 1 }] })); input.assignments[0].periods = 1; input.assignments.push({ ...input.assignments[0], classId: 'B' });
  const result = xepThoiKhoaBieu(input); assert.equal(result.status, 'infeasible'); assert.match(result.reasons[0], /không đủ ô khác nhau/);
});
test('timeout is never claimed as infeasibility and never returns a partial schedule', () => {
  const result = xepThoiKhoaBieu(school, { timeLimitMs: 0.000001 });
  assert.equal(result.status, 'timeout'); assert.deepEqual(result.lessons, []); assert.equal(result.penalty, null);
});
test('runtime rejects malformed inputs and invalid options', () => {
  for (const value of [null, {}, [], { ...tiny(), subjects: null }, { ...tiny(), calendar: { days: [2, 2], periods: [] } }]) assert.throws(() => validateInput(value), InputError);
  for (const opts of [{ seed: -1 }, { seed: 2 ** 32 }, { seed: 1.5 }, { timeLimitMs: 0 }, { timeLimitMs: Infinity }, { maxRestarts: 0 }, { maxIterations: -1 }, { weights: { double: NaN } }]) assert.throws(() => xepThoiKhoaBieu(tiny(), opts), InputError);
  const invalid = tiny(); invalid.assignments[0].teacherId = 'Missing'; assert.throws(() => validateInput(invalid), /không tồn tại/);
  const duplicate = tiny(); duplicate.assignments.push({ ...duplicate.assignments[0] }); assert.throws(() => validateInput(duplicate), /trùng/);
});
test('all fixed schedule returns success; independent verifier detects tampering', () => {
  const input = tiny(); input.assignments[0].periods = 1; input.fixed = [{ classId: 'A', subjectId: 'Toan', teacherId: 'Lan', day: 2, period: 1 }];
  const r = xepThoiKhoaBieu(input); assertHard(input, r); assert.equal(r.stats.iterations, 0);
  assert.ok(checkHardConstraints(input, []).length); assert.ok(checkHardConstraints(input, [...r.lessons, ...r.lessons]).some(e => /Trùng/.test(e)));
});
test('soft scores have auditable weights; gaps and doubles do not cross sessions', () => {
  const input = tiny(); input.calendar = { days: [2, 3], periods: [1, 2, 3, 4, 5].map(id => ({ id, session: id <= 3 ? 'sang' : 'chieu' })) };
  const base = { classId: 'A', teacherId: 'Lan', subjectId: 'Toan', fixed: false, day: 2 };
  const lessons = [1, 3, 4, 5].map(period => ({ ...base, period }));
  const score = scoreTimetable(input, lessons);
  assert.equal(score.violations.find(v => v.type === 'double').units, 1);
  assert.equal(score.violations.find(v => v.type === 'gaps').units, 1);
  assert.equal(score.violations.find(v => v.type === 'dailyLimit').units, 2);
  assert.equal(score.violations.find(v => v.type === 'spread').units, 4);
  assert.ok(!score.violations.some(v => v.type === 'heavy'));
  assert.equal(score.penalty, 40 + 8 + 3 + 16);
  const zero = Object.fromEntries(Object.keys(DEFAULT_WEIGHTS).map(k => [k, 0]));
  const r = xepThoiKhoaBieu(school, { weights: zero, maxIterations: 100 }); assertHard(school, r); assert.equal(r.penalty, 0);
});
