export * from './types';
import type { Calendar, Lesson, SolverOptions, TimetableInput, TimetableResult, SoftWeights, SoftViolation } from './types';
export declare class InputError extends Error { constructor(message: string); }
export declare const DEFAULT_CALENDAR: Calendar;
export declare const DEFAULT_WEIGHTS: SoftWeights;
export declare function validateInput(value: unknown): asserts value is TimetableInput;
export declare function xepThoiKhoaBieu(input: TimetableInput, options?: SolverOptions): TimetableResult;
export declare function checkHardConstraints(input: TimetableInput, lessons: Lesson[]): string[];
export declare function scoreTimetable(input: TimetableInput, lessons: Lesson[], weights?: SoftWeights): { penalty: number; violations: SoftViolation[] };
export declare function parseCsv(text: string): Record<string, string>[];
export interface CsvInput { lop: string; phanCong: string; ban?: string }
export declare function inputFromCsv(files: CsvInput): TimetableInput;
export declare function encodeCsv(rows: (string | number)[][]): string;
export declare function toCsv(input: TimetableInput, result: TimetableResult, groupBy?: 'class' | 'teacher'): string;
export declare function toHtml(input: TimetableInput, result: TimetableResult, title?: string): string;
