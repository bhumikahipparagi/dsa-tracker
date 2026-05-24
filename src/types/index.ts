export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type Status = 'not_started' | 'attempted' | 'solved' | 'review' | 'stuck';
export type Approach = 'brute' | 'better' | 'optimal' | null;
export type Verdict = 'accepted' | 'wrong_answer' | 'tle' | 'mle' | 'runtime_error' | 'compilation_error' | 'pending';

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
  label?: string;
}

export interface Hint {
  id: string;
  text: string;
  level: 1 | 2 | 3;
}

export interface HintUsage {
  hintId: string;
  hintIndex: number;
  usedAtSecond: number;
  timestamp: string;
}

export interface Submission {
  id: string;
  timestamp: string;
  code: string;
  verdict: Verdict;
  timeComplexity: string;
  spaceComplexity: string;
  approach: Approach;
  hintsUsedBeforeSubmit: boolean;
  hintsUsedAtMinute: number | null;
  timeSpentSeconds: number;
  executionTimeMs: number;
  memoryKb: number;
  testCasesPassed: number;
  totalTestCases: number;
  output?: string;
  errorMessage?: string;
}

export interface Session {
  startTime: string;
  endTime: string | null;
  durationSeconds: number;
}

export interface ReviewDate {
  dueDate: string;
  completedDate: string | null;
  reviewNumber: 1 | 2 | 3;
}

export interface SheetProblem {
  id: string;
  name: string;
  stepId: number;
  stepName: string;
  divisionId: string;
  divisionName: string;
  difficulty: Difficulty;
  leetcodeUrl?: string;
  gfgUrl?: string;
  youtubeUrl?: string;
  isTheory?: boolean;
  topicTags: string[];
  defaultBoilerplate: string;
  defaultHints: string[];
  defaultDescription: string;
  defaultExamples: { input: string; output: string; explanation?: string }[];
  defaultHiddenTests: { input: string; output: string }[];
}

export interface UserProblem {
  id: string;
  status: Status;
  code: string;
  submissions: Submission[];
  notes: string;
  ahaInput: string;
  approach: Approach;
  bestApproach: string;
  userApproachDescription: string;
  conceptsToStudy: string[];
  hintsUsed: HintUsage[];
  totalTimeSpentSeconds: number;
  sessions: Session[];
  solvedAt: string | null;
  firstAttemptedAt: string | null;
  reviewDates: ReviewDate[];
  customTestCases: TestCase[];
  customDescription: string;
  customBoilerplate: string;
  customHints: string[];
  isTheoryCompleted: boolean;
  timeComplexity: string;
  spaceComplexity: string;
}

export interface ConceptNote {
  id: string;
  title: string;
  content: string;
  pattern: string;
  linkedProblemIds: string[];
  linkedDivisionId: string;
  createdAt: string;
  updatedAt: string;
  source: string;
}

export interface AppSettings {
  judgeApiKey: string;
  judgeApiHost: string;
  theme: 'dark';
  defaultLanguage: 'cpp';
  editorFontSize: number;
  showLineNumbers: boolean;
  autoSave: boolean;
}
