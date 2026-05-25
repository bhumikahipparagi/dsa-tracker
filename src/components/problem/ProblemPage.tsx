import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Play, Send, ChevronDown, ChevronUp, Clock,
  Lightbulb, CheckCircle2, XCircle, Plus, Trash2, Save,
  Download, Sparkles, AlertCircle, BookOpen,
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useStore } from '../../store/useStore';
import { SHEET_PROBLEMS } from '../../data/striverSheet';
import { runTestCase } from '../../utils/judge0';
import { analyzeComplexity } from '../../utils/complexityAnalyzer';
import { exportProblemCode } from '../../utils/export';
import { Submission, TestCase, Approach, Verdict } from '../../types';
import { format, parseISO } from 'date-fns';

// ── Verdict badge styles ──────────────────────────────────────────────────────
const VSTYLE: Record<string, string> = {
  accepted:           'text-green-400 bg-green-500/10 border-green-500/30',
  wrong_answer:       'text-red-400 bg-red-500/10 border-red-500/30',
  tle:                'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  mle:                'text-purple-400 bg-purple-500/10 border-purple-500/30',
  runtime_error:      'text-orange-400 bg-orange-500/10 border-orange-500/30',
  compilation_error:  'text-red-400 bg-red-500/10 border-red-500/30',
  pending:            'text-slate-400 bg-slate-500/10 border-slate-500/30',
};
const VLABEL: Record<string, string> = {
  accepted: 'Accepted ✓', wrong_answer: 'Wrong Answer', tle: 'Time Limit Exceeded',
  mle: 'Memory Limit', runtime_error: 'Runtime Error',
  compilation_error: 'Compilation Error', pending: 'Pending',
};
const STATUS_STYLE: Record<string, string> = {
  not_started: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
  attempted:   'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  solved:      'text-green-400 bg-green-500/10 border-green-500/30',
  review:      'text-violet-400 bg-violet-500/10 border-violet-500/30',
  stuck:       'text-red-400 bg-red-500/10 border-red-500/30',
};
const STATUS_EMOJI: Record<string, string> = {
  not_started: '○', attempted: '◑', solved: '✓', review: '↺', stuck: '✕',
};

// ── Timer display ─────────────────────────────────────────────────────────────
function TimerDisplay({ seconds, running }: { seconds: number; running: boolean }) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const warn = seconds > 1800; // > 30 min, nudge
  return (
    <span className={`font-mono text-sm tabular-nums transition-colors ${
      running
        ? warn ? 'text-yellow-400' : 'text-violet-300'
        : 'text-slate-500'
    }`}>
      {h > 0 && `${h}:`}{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

// ── Confidence pill for auto-complexity ──────────────────────────────────────
function ConfBadge({ c }: { c: 'high' | 'medium' | 'low' }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ml-1 ${
      c === 'high'   ? 'text-green-400 border-green-500/30 bg-green-500/10' :
      c === 'medium' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
                       'text-slate-500 border-slate-500/20 bg-slate-500/10'
    }`}>{c}</span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProblemPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const problemId = id!;
  const sheetProblem = SHEET_PROBLEMS.find((p) => p.id === problemId);
  const customName = searchParams.get('name');
  const customDesc = searchParams.get('desc') ?? '';
  const customDiff = searchParams.get('diff') ?? 'Medium';

  const {
    getOrCreateProblem, updateProblem, addSubmission,
    recordHintUsed, markReviewDates, startTimer, stopTimer, settings,
  } = useStore();
  const userProblem = useStore((s) => s.userProblems[problemId]) ?? getOrCreateProblem(problemId);

  const name        = sheetProblem?.name ?? customName ?? problemId;
  const description = userProblem.customDescription || (sheetProblem?.defaultDescription ?? customDesc);
  const boilerplate = userProblem.customBoilerplate  || (sheetProblem?.defaultBoilerplate ?? '');
  const hints       = userProblem.customHints.length > 0 ? userProblem.customHints : (sheetProblem?.defaultHints ?? []);
  const examples    = sheetProblem?.defaultExamples ?? [];
  const hiddenTests = sheetProblem?.defaultHiddenTests ?? [];

  // ── Editor state ───────────────────────────────────────────────────────────
  const [code, setCode] = useState(userProblem.code || boilerplate);
  const [activeTab, setActiveTab] = useState<'description' | 'approach' | 'history'>('description');
  const [activeBottomTab, setActiveBottomTab] = useState<'testcases' | 'output'>('testcases');
  const [testResults, setTestResults] = useState<{
    input: string; expected: string; got: string; passed: boolean; error?: string;
  }[]>([]);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hintsOpen, setHintsOpen] = useState<Set<number>>(new Set());
  const [runError, setRunError] = useState('');

  // ── Custom test cases ──────────────────────────────────────────────────────
  const [customTests, setCustomTests] = useState<TestCase[]>(userProblem.customTestCases);
  const [newInput, setNewInput] = useState('');
  const [newExpected, setNewExpected] = useState('');

  // ── Approach / notes state ─────────────────────────────────────────────────
  const [approachVal, setApproachVal]     = useState<Approach>(userProblem.approach);
  const [tcVal, setTcVal]                 = useState(userProblem.timeComplexity);
  const [scVal, setScVal]                 = useState(userProblem.spaceComplexity);
  const [tcManual, setTcManual]           = useState(!!userProblem.timeComplexity);
  const [scManual, setScManual]           = useState(!!userProblem.spaceComplexity);
  const [ahaVal, setAhaVal]               = useState(userProblem.ahaInput);
  const [notesVal, setNotesVal]           = useState(userProblem.notes);
  const [bestApproachVal, setBestApproachVal] = useState(userProblem.bestApproach);
  const [conceptsVal, setConceptsVal]     = useState(userProblem.conceptsToStudy.join(', '));
  const [status, setStatus]               = useState(userProblem.status);

  // ── Auto complexity analysis (debounced) ──────────────────────────────────
  const [complexity, setComplexity] = useState(() => analyzeComplexity(code));
  const analyzeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (analyzeTimer.current) clearTimeout(analyzeTimer.current);
    analyzeTimer.current = window.setTimeout(() => {
      const result = analyzeComplexity(code);
      setComplexity(result);
      // Only auto-fill if user hasn't manually typed something
      if (!tcManual && result.tc) setTcVal(result.tc);
      if (!scManual && result.sc) setScVal(result.sc);
    }, 800);
    return () => { if (analyzeTimer.current) clearTimeout(analyzeTimer.current); };
  }, [code]); // eslint-disable-line

  // ── Timer — auto-start on mount, auto-stop on unmount ─────────────────────
  const [elapsed, setElapsed] = useState(userProblem.totalTimeSpentSeconds);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    startTimer(problemId);
    intervalRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    // Mark first attempted
    if (userProblem.status === 'not_started') {
      updateProblem(problemId, { status: 'attempted', firstAttemptedAt: new Date().toISOString() });
      setStatus('attempted');
    }
    return () => {
      stopTimer(problemId);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [problemId]); // eslint-disable-line

  // ── Auto-save code ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!settings.autoSave) return;
    const t = setTimeout(() => updateProblem(problemId, { code }), 1500);
    return () => clearTimeout(t);
  }, [code, problemId]); // eslint-disable-line

  // ── Save all approach data ─────────────────────────────────────────────────
  const saveAll = useCallback(() => {
    updateProblem(problemId, {
      code,
      approach: approachVal,
      timeComplexity: tcVal,
      spaceComplexity: scVal,
      ahaInput: ahaVal,
      notes: notesVal,
      bestApproach: bestApproachVal,
      conceptsToStudy: conceptsVal.split(',').map((s) => s.trim()).filter(Boolean),
      status,
      customTestCases: customTests,
    });
  }, [problemId, code, approachVal, tcVal, scVal, ahaVal, notesVal, bestApproachVal, conceptsVal, status, customTests, updateProblem]);

  // ── Hints ─────────────────────────────────────────────────────────────────
  const openHint = (idx: number) => {
    setHintsOpen((prev) => { const s = new Set(prev); s.add(idx); return s; });
    if (!userProblem.hintsUsed.some((h) => h.hintIndex === idx)) {
      recordHintUsed(problemId, {
        hintId: `hint-${idx}`,
        hintIndex: idx,
        usedAtSecond: elapsed,
        timestamp: new Date().toISOString(),
      });
    }
  };

  // ── All visible test cases ─────────────────────────────────────────────────
  const allTestCases = useMemo(() => [
    ...examples.map((e, i) => ({ id: `ex-${i}`, input: e.input, expectedOutput: e.output, label: `Example ${i + 1}` })),
    ...customTests,
  ], [examples, customTests]);

  // ── Run / Submit ───────────────────────────────────────────────────────────
  const runCode = async (isSubmit: boolean) => {
    setRunError('');
    const cases = isSubmit
      ? hiddenTests.map((t, i) => ({ id: `h-${i}`, input: t.input, expectedOutput: t.output }))
      : allTestCases;
    if (cases.length === 0) { setRunError('No test cases to run.'); return; }

    isSubmit ? setSubmitting(true) : setRunning(true);
    setActiveBottomTab('output');

    const results: typeof testResults = [];
    for (const tc of cases) {
      try {
        const r = await runTestCase(settings.judgeApiKey, settings.judgeApiHost, code, tc.input, tc.expectedOutput);
        results.push({ input: tc.input, expected: tc.expectedOutput, got: r.output, passed: r.passed, error: r.errorMessage });
      } catch (e) {
        results.push({ input: tc.input, expected: tc.expectedOutput, got: '', passed: false, error: String(e) });
      }
    }

    setTestResults(results);
    isSubmit ? setSubmitting(false) : setRunning(false);

    if (isSubmit) {
      const passed = results.filter((r) => r.passed).length;
      const total  = results.length;
      const verdict: Verdict = passed === total ? 'accepted' : 'wrong_answer';

      const sub: Submission = {
        id: `sub-${Date.now()}`,
        timestamp: new Date().toISOString(),
        code,
        verdict,
        timeComplexity: tcVal,
        spaceComplexity: scVal,
        approach: approachVal,
        hintsUsedBeforeSubmit: userProblem.hintsUsed.length > 0,
        hintsUsedAtMinute: userProblem.hintsUsed[0] ? Math.round(userProblem.hintsUsed[0].usedAtSecond / 60) : null,
        timeSpentSeconds: elapsed,
        executionTimeMs: 0,
        memoryKb: 0,
        testCasesPassed: passed,
        totalTestCases: total,
      };

      addSubmission(problemId, sub);

      // ── AUTO-SOLVE: flip status to solved when all tests pass ──────────────
      if (verdict === 'accepted') {
        setStatus('solved');
        markReviewDates(problemId);
        // persist complexities if auto-detected
        updateProblem(problemId, {
          status: 'solved',
          timeComplexity: tcVal,
          spaceComplexity: scVal,
        });
      }
    }
  };

  // ── Custom test case CRUD ─────────────────────────────────────────────────
  const addCustomTest = () => {
    if (!newInput.trim()) return;
    const tc: TestCase = { id: `ct-${Date.now()}`, input: newInput, expectedOutput: newExpected };
    const updated = [...customTests, tc];
    setCustomTests(updated);
    setNewInput(''); setNewExpected('');
    updateProblem(problemId, { customTestCases: updated });
  };

  const removeCustomTest = (tcId: string) => {
    const updated = customTests.filter((t) => t.id !== tcId);
    setCustomTests(updated);
    updateProblem(problemId, { customTestCases: updated });
  };

  const latestSub = userProblem.submissions[0];
  const diff = sheetProblem?.difficulty ?? customDiff;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-[#0d0d1a] overflow-hidden">

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[#2a2a4e] bg-[#0f0f22] shrink-0">
        <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </button>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <h1 className="text-sm font-semibold text-white truncate">{name}</h1>
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
            diff === 'Easy' ? 'text-green-400 bg-green-500/10' :
            diff === 'Medium' ? 'text-yellow-400 bg-yellow-500/10' :
            'text-red-400 bg-red-500/10'}`}>{diff}</span>

          {/* Status badge — read-only display */}
          <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${STATUS_STYLE[status]}`}>
            {STATUS_EMOJI[status]} {status.replace('_', ' ')}
          </span>

          {latestSub && (
            <span className={`text-xs px-1.5 py-0.5 rounded border shrink-0 ${VSTYLE[latestSub.verdict]}`}>
              {VLABEL[latestSub.verdict]}
            </span>
          )}
        </div>

        {/* ── Auto-running timer (no start/stop button) ── */}
        <div className="flex items-center gap-2 bg-[#141428] border border-[#2a2a4e] rounded-lg px-3 py-1.5 shrink-0">
          <Clock size={13} className="text-violet-400/60" />
          <TimerDisplay seconds={elapsed} running={true} />
        </div>

        {/* ── Manual status: ONLY review & stuck ── */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              const next = status === 'review' ? 'solved' : 'review';
              setStatus(next);
              updateProblem(problemId, { status: next });
            }}
            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
              status === 'review'
                ? 'bg-violet-500/20 border-violet-500 text-violet-300'
                : 'border-[#2a2a4e] text-slate-500 hover:border-violet-500/50 hover:text-violet-400'
            }`}
            title="Toggle Review (for spaced repetition)">
            ↺ Review
          </button>
          <button
            onClick={() => {
              const next = status === 'stuck' ? 'attempted' : 'stuck';
              setStatus(next);
              updateProblem(problemId, { status: next });
            }}
            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
              status === 'stuck'
                ? 'bg-red-500/20 border-red-500 text-red-300'
                : 'border-[#2a2a4e] text-slate-500 hover:border-red-500/50 hover:text-red-400'
            }`}
            title="Mark as stuck">
            ✕ Stuck
          </button>
        </div>

        <button onClick={saveAll}
          className="flex items-center gap-1.5 bg-[#141428] border border-[#2a2a4e] hover:border-violet-500 rounded-lg px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors shrink-0">
          <Save size={13} /> Save
        </button>
        <button onClick={() => exportProblemCode(name, code, notesVal)}
          className="flex items-center gap-1.5 bg-[#141428] border border-[#2a2a4e] rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors shrink-0">
          <Download size={13} />
        </button>
      </div>

      {/* ── Solved celebration banner ───────────────────────────────────────── */}
      {status === 'solved' && userProblem.submissions.length > 0 && userProblem.submissions[0].verdict === 'accepted' && (
        <div className="shrink-0 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 border-b border-green-500/20 px-4 py-2 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-green-400" />
          <span className="text-green-400 text-xs font-medium">
            All test cases passed! Problem marked as Solved ✨ — Spaced repetition review scheduled (+3, +7, +14 days)
          </span>
        </div>
      )}

      {/* ── Main split ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL ──────────────────────────────────────────────────── */}
        <div className="w-[42%] flex flex-col border-r border-[#2a2a4e] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-[#2a2a4e] bg-[#0f0f22] shrink-0">
            {(['description', 'approach', 'history'] as const).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-2.5 text-xs font-medium capitalize transition-colors ${
                  activeTab === t
                    ? 'text-violet-400 border-b-2 border-violet-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}>
                {t === 'history' ? `History (${userProblem.submissions.length})` : t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 text-sm text-slate-300 space-y-4">

            {/* ──── DESCRIPTION TAB ──────────────────────────────────────────── */}
            {activeTab === 'description' && (
              <>
                {description ? (
                  <p className="leading-relaxed text-slate-200 whitespace-pre-wrap text-sm">{description}</p>
                ) : (
                  <textarea
                    value={userProblem.customDescription}
                    onChange={(e) => updateProblem(problemId, { customDescription: e.target.value })}
                    placeholder="Paste the problem description here..."
                    className="w-full bg-[#10101e] border border-[#2a2a4e] rounded-lg p-3 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-violet-500 resize-none min-h-[120px]"
                  />
                )}

                {examples.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Examples</div>
                    {examples.map((ex, i) => (
                      <div key={i} className="bg-[#10101e] border border-[#2a2a4e] rounded-lg p-3 mb-2 font-mono text-xs">
                        <div className="text-slate-500 mb-0.5">Input:</div>
                        <div className="text-slate-200 whitespace-pre-wrap mb-2">{ex.input}</div>
                        <div className="text-slate-500 mb-0.5">Output:</div>
                        <div className="text-green-400 whitespace-pre-wrap">{ex.output}</div>
                        {ex.explanation && <div className="text-slate-500 mt-2 font-sans text-xs">💡 {ex.explanation}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {sheetProblem?.topicTags && (
                  <div className="flex flex-wrap gap-1.5">
                    {sheetProblem.topicTags.map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">{t}</span>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  {sheetProblem?.leetcodeUrl && (
                    <a href={sheetProblem.leetcodeUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-violet-400 hover:underline flex items-center gap-1">
                      <BookOpen size={11} /> LeetCode →
                    </a>
                  )}
                  {sheetProblem?.gfgUrl && (
                    <a href={sheetProblem.gfgUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-green-400 hover:underline flex items-center gap-1">
                      <BookOpen size={11} /> GFG →
                    </a>
                  )}
                </div>

                {hints.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Lightbulb size={12} className="text-yellow-500" />
                      Hints ({userProblem.hintsUsed.length}/{hints.length} used)
                    </div>
                    {hints.map((hint, i) => (
                      <div key={i} className="mb-1.5 border border-[#2a2a4e] rounded-lg overflow-hidden">
                        <button
                          onClick={() => hintsOpen.has(i)
                            ? setHintsOpen((s) => { const n = new Set(s); n.delete(i); return n; })
                            : openHint(i)}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/3 transition-colors">
                          <span className="flex items-center gap-2">
                            <Lightbulb size={12} className={userProblem.hintsUsed.some((h) => h.hintIndex === i) ? 'text-yellow-400' : 'text-slate-600'} />
                            Hint {i + 1}
                            {userProblem.hintsUsed.some((h) => h.hintIndex === i) && (
                              <span className="text-yellow-400/60 text-xs">
                                (at {Math.round(userProblem.hintsUsed.find((h) => h.hintIndex === i)!.usedAtSecond / 60)}m)
                              </span>
                            )}
                          </span>
                          {hintsOpen.has(i) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        {hintsOpen.has(i) && (
                          <div className="px-3 py-2 bg-yellow-500/5 border-t border-[#2a2a4e] text-xs text-yellow-200 leading-relaxed">
                            {hint}
                          </div>
                        )}
                      </div>
                    ))}
                    <input
                      placeholder="Add your own hint... (press Enter)"
                      className="w-full mt-1 bg-[#10101e] border border-[#2a2a4e] rounded px-2 py-1.5 text-xs text-slate-400 placeholder-slate-700 outline-none focus:border-violet-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          updateProblem(problemId, { customHints: [...userProblem.customHints, e.currentTarget.value.trim()] });
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                )}
              </>
            )}

            {/* ──── APPROACH TAB ─────────────────────────────────────────────── */}
            {activeTab === 'approach' && (
              <div className="space-y-4">
                {/* Approach selector */}
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide">Approach Used</label>
                  <div className="flex gap-2 mt-2">
                    {(['brute', 'better', 'optimal'] as const).map((a) => (
                      <button key={a} onClick={() => setApproachVal(a)}
                        className={`flex-1 py-1.5 rounded-xl text-xs border capitalize transition-colors ${
                          approachVal === a
                            ? 'bg-violet-500/20 border-violet-500 text-violet-300'
                            : 'border-[#2a2a4e] text-slate-500 hover:border-[#555]'
                        }`}>{a}</button>
                    ))}
                  </div>
                </div>

                {/* Auto TC/SC */}
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide flex items-center gap-2">
                    Complexity Analysis
                    <span className="flex items-center gap-1 text-violet-400/70">
                      <Sparkles size={10} /> auto-detected
                    </span>
                    <ConfBadge c={complexity.confidence} />
                  </label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">Time</label>
                      <input
                        value={tcVal}
                        onChange={(e) => { setTcVal(e.target.value); setTcManual(true); }}
                        onFocus={() => setTcManual(true)}
                        placeholder="e.g. O(n log n)"
                        className="w-full bg-[#10101e] border border-[#2a2a4e] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">Space</label>
                      <input
                        value={scVal}
                        onChange={(e) => { setScVal(e.target.value); setScManual(true); }}
                        onFocus={() => setScManual(true)}
                        placeholder="e.g. O(n)"
                        className="w-full bg-[#10101e] border border-[#2a2a4e] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500 font-mono"
                      />
                    </div>
                  </div>
                  {complexity.tc && (
                    <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1">
                      <Sparkles size={10} className="text-violet-500/50" />
                      Detected: <span className="text-violet-400/70 font-mono ml-1">{complexity.tc}</span>
                      <span className="mx-1 text-slate-700">·</span>
                      <span className="text-violet-400/70 font-mono">{complexity.sc}</span>
                      <span className="text-slate-600 ml-1">— click fields to override</span>
                    </p>
                  )}
                </div>

                {/* AHA moment */}
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1">
                    💡 AHA Moment — Your Approach
                  </label>
                  <textarea value={ahaVal} onChange={(e) => setAhaVal(e.target.value)} rows={3}
                    placeholder="How would you approach this next time?"
                    className="w-full bg-[#10101e] border border-[#2a2a4e] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500 resize-none" />
                </div>

                {/* Best approach */}
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1">Best Approach (editorial)</label>
                  <textarea value={bestApproachVal} onChange={(e) => setBestApproachVal(e.target.value)} rows={4}
                    placeholder="Paste the optimal explanation..."
                    className="w-full bg-[#10101e] border border-[#2a2a4e] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500 resize-none" />
                </div>

                {/* Concepts */}
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1">Concepts to Study</label>
                  <input value={conceptsVal} onChange={(e) => setConceptsVal(e.target.value)}
                    placeholder="Two Pointers, Sliding Window, ..."
                    className="w-full bg-[#10101e] border border-[#2a2a4e] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500" />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1">Notes</label>
                  <textarea value={notesVal} onChange={(e) => setNotesVal(e.target.value)} rows={4}
                    placeholder="Edge cases, mistakes, observations..."
                    className="w-full bg-[#10101e] border border-[#2a2a4e] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500 resize-none" />
                </div>

                <button onClick={saveAll}
                  className="w-full bg-violet-500 hover:bg-violet-600 text-white py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <Save size={14} /> Save All
                </button>
              </div>
            )}

            {/* ──── HISTORY TAB ──────────────────────────────────────────────── */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                {userProblem.submissions.length === 0 ? (
                  <p className="text-slate-600 text-xs text-center py-8">No submissions yet — submit your solution to see history here.</p>
                ) : (
                  userProblem.submissions.map((sub) => (
                    <div key={sub.id} className={`border rounded-xl p-3 ${VSTYLE[sub.verdict]}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold">{VLABEL[sub.verdict]}</span>
                        <span className="text-xs opacity-60">{format(parseISO(sub.timestamp), 'MMM d, HH:mm')}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs opacity-70">
                        <span>TC: {sub.timeComplexity || '—'}</span>
                        <span>SC: {sub.spaceComplexity || '—'}</span>
                        <span>{sub.testCasesPassed}/{sub.totalTestCases} passed</span>
                        <span>{Math.round(sub.timeSpentSeconds / 60)}m spent</span>
                        <span>{sub.approach || '—'}</span>
                        <span>{sub.hintsUsedBeforeSubmit ? `Hints @ ${sub.hintsUsedAtMinute}m` : 'No hints'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL — Editor ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language="cpp"
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v ?? '')}
              options={{
                fontSize: settings.editorFontSize,
                minimap: { enabled: false },
                lineNumbers: settings.showLineNumbers ? 'on' : 'off',
                scrollBeyondLastLine: false,
                folding: true,
                wordWrap: 'on',
                padding: { top: 12 },
                fontFamily: 'JetBrains Mono, Fira Code, monospace',
                fontLigatures: true,
                cursorBlinking: 'smooth',
                renderLineHighlight: 'line',
                suggestOnTriggerCharacters: true,
                bracketPairColorization: { enabled: true },
              }}
            />
          </div>

          {/* ── Bottom panel ─────────────────────────────────────────────── */}
          <div className="h-48 border-t border-[#2a2a4e] flex flex-col bg-[#0f0f22] shrink-0">
            <div className="flex items-center border-b border-[#2a2a4e] px-3 gap-1 shrink-0">
              {(['testcases', 'output'] as const).map((t) => (
                <button key={t} onClick={() => setActiveBottomTab(t)}
                  className={`py-2 px-3 text-xs capitalize transition-colors ${
                    activeBottomTab === t
                      ? 'text-violet-400 border-b-2 border-violet-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}>
                  {t === 'output'
                    ? `Output (${testResults.filter((r) => r.passed).length}/${testResults.length})`
                    : `Test Cases (${allTestCases.length})`}
                </button>
              ))}
              <div className="flex-1" />

              {/* Run error inline (no alert) */}
              {runError && (
                <span className="text-xs text-red-400 flex items-center gap-1 mr-2">
                  <AlertCircle size={12} />{runError}
                </span>
              )}

              {/* No API key notice — runs on Wandbox automatically */}
              {!settings.judgeApiKey && (
                <span className="text-xs text-slate-600 mr-2 flex items-center gap-1">
                  <Sparkles size={10} className="text-violet-500/40" />
                  Powered by Wandbox
                </span>
              )}

              <button onClick={() => runCode(false)} disabled={running || submitting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#141428] border border-[#2a2a4e] hover:border-green-500 text-green-400 rounded-lg transition-colors disabled:opacity-50">
                <Play size={12} />{running ? 'Running...' : 'Run'}
              </button>
              <button onClick={() => runCode(true)} disabled={running || submitting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors disabled:opacity-50 font-medium">
                <Send size={12} />{submitting ? 'Judging...' : 'Submit'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {/* ── Test cases tab ── */}
              {activeBottomTab === 'testcases' && (
                <div className="space-y-1.5">
                  {allTestCases.length === 0 && (
                    <p className="text-slate-600 text-xs">No test cases — add one below or open a problem with examples.</p>
                  )}
                  {allTestCases.map((tc, i) => (
                    <div key={tc.id} className="flex gap-2 items-start">
                      <div className="flex-1 bg-[#10101e] border border-[#2a2a4e] rounded-lg px-3 py-1.5 font-mono text-xs text-slate-300">
                        <span className="text-slate-600 mr-2">{(tc as any).label ?? `Custom ${i + 1}`}:</span>
                        {tc.input} → <span className="text-green-400">{tc.expectedOutput}</span>
                      </div>
                      {tc.id.startsWith('ct-') && (
                        <button onClick={() => removeCustomTest(tc.id)} className="text-slate-600 hover:text-red-400 mt-1.5 shrink-0">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input value={newInput} onChange={(e) => setNewInput(e.target.value)}
                      placeholder="Input"
                      className="flex-1 bg-[#10101e] border border-[#2a2a4e] rounded px-2 py-1 text-xs font-mono text-slate-300 placeholder-slate-700 outline-none focus:border-violet-500" />
                    <input value={newExpected} onChange={(e) => setNewExpected(e.target.value)}
                      placeholder="Expected output"
                      className="flex-1 bg-[#10101e] border border-[#2a2a4e] rounded px-2 py-1 text-xs font-mono text-slate-300 placeholder-slate-700 outline-none focus:border-violet-500" />
                    <button onClick={addCustomTest} className="text-violet-400 hover:text-violet-300 px-2">
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Output tab ── */}
              {activeBottomTab === 'output' && (
                <div className="space-y-1.5">
                  {testResults.length === 0 ? (
                    <p className="text-slate-600 text-xs">Run or Submit to see output here.</p>
                  ) : (
                    <>
                      {/* Summary bar */}
                      <div className={`text-xs font-semibold px-2 py-1 rounded-lg mb-2 ${
                        testResults.every((r) => r.passed)
                          ? 'text-green-400 bg-green-500/10'
                          : 'text-red-400 bg-red-500/10'
                      }`}>
                        {testResults.filter((r) => r.passed).length}/{testResults.length} test cases passed
                        {testResults.every((r) => r.passed) && ' 🎉'}
                      </div>
                      {testResults.map((r, i) => (
                        <div key={i} className={`flex items-start gap-2 text-xs font-mono p-2 rounded-lg border ${
                          r.passed ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                          {r.passed
                            ? <CheckCircle2 size={13} className="text-green-500 mt-0.5 shrink-0" />
                            : <XCircle size={13} className="text-red-500 mt-0.5 shrink-0" />}
                          <div className="min-w-0 break-all">
                            <span className="text-slate-500">in: </span>
                            <span className="text-slate-300">{r.input}</span>
                            {r.passed ? (
                              <span className="text-green-400 ml-2">→ {r.got} ✓</span>
                            ) : (
                              <>
                                <span className="text-slate-500 ml-2">exp: </span>
                                <span className="text-green-400">{r.expected}</span>
                                <span className="text-slate-500 ml-2">got: </span>
                                <span className="text-red-400">{r.got || r.error}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
