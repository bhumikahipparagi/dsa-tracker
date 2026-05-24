import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserProblem, ConceptNote, AppSettings, Session, Submission, HintUsage, ReviewDate } from '../types';

interface StoreState {
  userProblems: Record<string, UserProblem>;
  conceptNotes: ConceptNote[];
  settings: AppSettings;
  completedDivisions: string[];
  activeTimer: { problemId: string; startTime: number } | null;

  // Problem actions
  getOrCreateProblem: (id: string) => UserProblem;
  updateProblem: (id: string, updates: Partial<UserProblem>) => void;
  addSubmission: (id: string, sub: Submission) => void;
  recordHintUsed: (id: string, usage: HintUsage) => void;
  markReviewDates: (id: string) => void;
  completeReview: (id: string, reviewNumber: 1 | 2 | 3) => void;

  // Timer actions
  startTimer: (problemId: string) => void;
  stopTimer: (problemId: string) => number; // returns elapsed seconds

  // Theory / division actions
  toggleDivisionComplete: (divisionId: string) => void;

  // Notes
  addNote: (note: ConceptNote) => void;
  updateNote: (id: string, updates: Partial<ConceptNote>) => void;
  deleteNote: (id: string) => void;

  // Settings
  updateSettings: (s: Partial<AppSettings>) => void;
}

const defaultProblem = (id: string): UserProblem => ({
  id,
  status: 'not_started',
  code: '',
  submissions: [],
  notes: '',
  ahaInput: '',
  approach: null,
  bestApproach: '',
  userApproachDescription: '',
  conceptsToStudy: [],
  hintsUsed: [],
  totalTimeSpentSeconds: 0,
  sessions: [],
  solvedAt: null,
  firstAttemptedAt: null,
  reviewDates: [],
  customTestCases: [],
  customDescription: '',
  customBoilerplate: '',
  customHints: [],
  isTheoryCompleted: false,
  timeComplexity: '',
  spaceComplexity: '',
});

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      userProblems: {},
      conceptNotes: [],
      completedDivisions: [],
      activeTimer: null,
      settings: {
        judgeApiKey: '',
        judgeApiHost: 'judge0-ce.p.rapidapi.com',
        theme: 'dark',
        defaultLanguage: 'cpp',
        editorFontSize: 14,
        showLineNumbers: true,
        autoSave: true,
      },

      getOrCreateProblem: (id) => {
        const existing = get().userProblems[id];
        if (existing) return existing;
        const fresh = defaultProblem(id);
        set((s) => ({ userProblems: { ...s.userProblems, [id]: fresh } }));
        return fresh;
      },

      updateProblem: (id, updates) => {
        set((s) => ({
          userProblems: {
            ...s.userProblems,
            [id]: { ...(s.userProblems[id] ?? defaultProblem(id)), ...updates },
          },
        }));
      },

      addSubmission: (id, sub) => {
        set((s) => {
          const p = s.userProblems[id] ?? defaultProblem(id);
          const subs = [sub, ...p.submissions];
          const isSolved = sub.verdict === 'accepted';
          const now = new Date().toISOString();
          return {
            userProblems: {
              ...s.userProblems,
              [id]: {
                ...p,
                submissions: subs,
                status: isSolved ? 'solved' : p.status === 'not_started' ? 'attempted' : p.status,
                solvedAt: isSolved && !p.solvedAt ? now : p.solvedAt,
                firstAttemptedAt: p.firstAttemptedAt ?? now,
                timeComplexity: sub.timeComplexity || p.timeComplexity,
                spaceComplexity: sub.spaceComplexity || p.spaceComplexity,
              },
            },
          };
        });
      },

      recordHintUsed: (id, usage) => {
        set((s) => {
          const p = s.userProblems[id] ?? defaultProblem(id);
          if (p.hintsUsed.some((h) => h.hintIndex === usage.hintIndex)) return s;
          return {
            userProblems: {
              ...s.userProblems,
              [id]: { ...p, hintsUsed: [...p.hintsUsed, usage] },
            },
          };
        });
      },

      markReviewDates: (id) => {
        set((s) => {
          const p = s.userProblems[id] ?? defaultProblem(id);
          if (p.reviewDates.length > 0) return s;
          const base = p.solvedAt ? new Date(p.solvedAt) : new Date();
          const addDays = (d: Date, n: number) => {
            const r = new Date(d);
            r.setDate(r.getDate() + n);
            return r.toISOString();
          };
          const dates: ReviewDate[] = [
            { dueDate: addDays(base, 3), completedDate: null, reviewNumber: 1 },
            { dueDate: addDays(base, 7), completedDate: null, reviewNumber: 2 },
            { dueDate: addDays(base, 14), completedDate: null, reviewNumber: 3 },
          ];
          return {
            userProblems: {
              ...s.userProblems,
              [id]: { ...p, reviewDates: dates, status: 'review' },
            },
          };
        });
      },

      completeReview: (id, reviewNumber) => {
        set((s) => {
          const p = s.userProblems[id];
          if (!p) return s;
          const dates = p.reviewDates.map((d) =>
            d.reviewNumber === reviewNumber ? { ...d, completedDate: new Date().toISOString() } : d
          );
          const allDone = dates.every((d) => d.completedDate);
          return {
            userProblems: {
              ...s.userProblems,
              [id]: { ...p, reviewDates: dates, status: allDone ? 'solved' : 'review' },
            },
          };
        });
      },

      startTimer: (problemId) => {
        const now = Date.now();
        set({ activeTimer: { problemId, startTime: now } });
        // also ensure firstAttemptedAt is set
        set((s) => {
          const p = s.userProblems[problemId] ?? defaultProblem(problemId);
          if (!p.firstAttemptedAt) {
            return {
              userProblems: {
                ...s.userProblems,
                [problemId]: { ...p, firstAttemptedAt: new Date().toISOString() },
              },
            };
          }
          return s;
        });
      },

      stopTimer: (problemId) => {
        const { activeTimer } = get();
        if (!activeTimer || activeTimer.problemId !== problemId) return 0;
        const elapsed = Math.floor((Date.now() - activeTimer.startTime) / 1000);
        const now = new Date().toISOString();
        set((s) => {
          const p = s.userProblems[problemId] ?? defaultProblem(problemId);
          const session: Session = {
            startTime: new Date(activeTimer.startTime).toISOString(),
            endTime: now,
            durationSeconds: elapsed,
          };
          return {
            activeTimer: null,
            userProblems: {
              ...s.userProblems,
              [problemId]: {
                ...p,
                totalTimeSpentSeconds: p.totalTimeSpentSeconds + elapsed,
                sessions: [...p.sessions, session],
              },
            },
          };
        });
        return elapsed;
      },

      toggleDivisionComplete: (divisionId) => {
        set((s) => ({
          completedDivisions: s.completedDivisions.includes(divisionId)
            ? s.completedDivisions.filter((d) => d !== divisionId)
            : [...s.completedDivisions, divisionId],
        }));
      },

      addNote: (note) => set((s) => ({ conceptNotes: [...s.conceptNotes, note] })),

      updateNote: (id, updates) =>
        set((s) => ({
          conceptNotes: s.conceptNotes.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n)),
        })),

      deleteNote: (id) => set((s) => ({ conceptNotes: s.conceptNotes.filter((n) => n.id !== id) })),

      updateSettings: (s) => set((prev) => ({ settings: { ...prev.settings, ...s } })),
    }),
    {
      name: 'dsa-tracker-v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
