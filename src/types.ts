export interface Slot { day: number; period: number }
export interface Period { id: number; label?: string; session: string }
export interface Calendar { days: number[]; periods: Period[] }
export interface SchoolClass { id: string; name?: string; available?: Slot[] }
export interface Teacher { id: string; name?: string; unavailable?: Slot[] }
export interface Subject { id: string; name?: string; double?: boolean; heavy?: boolean; maxPerDay?: number }
export interface Assignment { classId: string; subjectId: string; teacherId: string; periods: number }
export interface FixedLesson extends Slot { classId: string; subjectId: string; teacherId: string }
export interface TimetableInput {
  calendar?: Calendar;
  classes: SchoolClass[];
  teachers: Teacher[];
  subjects: Subject[];
  assignments: Assignment[];
  fixed?: FixedLesson[];
}
export interface SoftWeights { dailyLimit: number; double: number; gaps: number; spread: number; heavy: number }
export interface SolverOptions {
  seed?: number;
  timeLimitMs?: number;
  maxIterations?: number;
  maxRestarts?: number;
  weights?: Partial<SoftWeights>;
}
export interface Lesson extends FixedLesson { fixed: boolean }
export interface SoftViolation {
  type: keyof SoftWeights;
  classId?: string;
  teacherId?: string;
  subjectId?: string;
  day?: number;
  units: number;
  penalty: number;
  message: string;
}
export interface SolverStats {
  seed: number; elapsedMs: number; constructionMs: number;
  restarts: number; iterations: number; initialPenalty: number | null;
}
export interface TimetableResult {
  status: 'success' | 'infeasible' | 'timeout' | 'search_exhausted';
  lessons: Lesson[];
  penalty: number | null;
  violations: SoftViolation[];
  reasons: string[];
  stats: SolverStats;
}
