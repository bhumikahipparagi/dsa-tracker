import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Send, ChevronDown, ChevronUp, Clock, Lightbulb, BarChart2,
  CheckCircle2, XCircle, AlertTriangle, Plus, Trash2, Save, Download, Eye, EyeOff, RotateCcw } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useStore } from '../../store/useStore';
import { SHEET_PROBLEMS } from '../../data/striverSheet';
import { runTestCase } from '../../utils/judge0';
import { exportProblemCode } from '../../utils/export';
import { Submission, TestCase, Approach, Verdict } from '../../types';
import { format, parseISO } from 'date-fns';

const VERDICT_STYLE: Record<string, string> = {
  accepted: 'text-green-400 bg-green-500/10 border-green-500/30',
  wrong_answer: 'text-red-400 bg-red-500/10 border-red-500/30',
  tle: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  mle: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  runtime_error: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  compilation_error: 'text-red-400 bg-red-500/10 border-red-500/30',
  pending: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
};
const VERDICT_LABEL: Record<string, string> = {
  accepted: 'Accepted', wrong_answer: 'Wrong Answer', tle: 'Time Limit Exceeded',
  mle: 'Memory Limit', runtime_error: 'Runtime Error', compilation_error: 'Compilation Error',
  pending: 'Pending',
};

function Timer({ seconds }: { seconds: number }) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return (
    <span className="font-mono text-sm text-slate-300">
      {h > 0 && `${h}:`}{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

export default function ProblemPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const problemId = id!;
  const sheetProblem = SHEET_PROBLEMS.find((p) => p.id === problemId);

  // Custom problem from URL params
  const customName = searchParams.get('name');
  const customDesc = searchParams.get('desc') ?? '';
  const customDiff = searchParams.get('diff') ?? 'Medium';

  const { getOrCreateProblem, updateProblem, addSubmission, recordHintUsed, markReviewDates, startTimer, stopTimer, settings } = useStore();
  const userProblem = useStore((s) => s.userProblems[problemId]) ?? getOrCreateProblem(problemId);

  const name = sheetProblem?.name ?? customName ?? problemId;
  const description = userProblem.customDescription || (sheetProblem?.defaultDescription ?? customDesc);
  const boilerplate = userProblem.customBoilerplate || (sheetProblem?.defaultBoilerplate ?? '');
  const hints = userProblem.customHints.length > 0 ? userProblem.customHints : (sheetProblem?.defaultHints ?? []);
  const examples = sheetProblem?.defaultExamples ?? [];
  const hiddenTests = sheetProblem?.defaultHiddenTests ?? [];

  const [code, setCode] = useState(userProblem.code || boilerplate);
  const [activeTab, setActiveTab] = useState<'description' | 'approach' | 'history'>('description');
  const [activeBottomTab, setActiveBottomTab] = useState<'testcases' | 'output'>('testcases');
  const [testResults, setTestResults] = useState<{ input: string; expected: string; got: string; passed: boolean; error?: string }[]>([]);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hintsOpen, setHintsOpen] = useState<Set<number>>(new Set());
  const [showStats, setShowStats] = useState(false);

  // Custom test cases state
  const [customTests, setCustomTests] = useState<TestCase[]>(userProblem.customTestCases);
  const [newInput, setNewInput] = useState('');
  const [newExpected, setNewExpected] = useState('');

  // Approach form
  const [approachVal, setApproachVal] = useState<Approach>(userProblem.approach);
  const [tcVal, setTcVal] = useState(userProblem.timeComplexity);
  const [scVal, setScVal] = useState(userProblem.spaceComplexity);
  const [ahaVal, setAhaVal] = useState(userProblem.ahaInput);
  const [notesVal, setNotesVal] = useState(userProblem.notes);
  const [bestApproachVal, setBestApproachVal] = useState(userProblem.bestApproach);
  const [conceptsVal, setConceptsVal] = useState(userProblem.conceptsToStudy.join(', '));
  const [statusVal, setStatusVal] = useState(userProblem.status);

  // Timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsed, setElapsed] = useState(userProblem.totalTimeSpentSeconds);
  const intervalRef = useRef<number | null>(null);

  const toggleTimer = useCallback(() => {
    if (timerRunning) {
      const added = stopTimer(problemId);
      setElapsed((e) => e + added);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimerRunning(false);
    } else {
      startTimer(problemId);
      setTimerRunning(true);
      intervalRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    }
  }, [timerRunning, problemId, startTimer, stopTimer]);

  // Auto-stop timer on unmount
  useEffect(() => {
    return () => {
      if (timerRunning) {
        stopTimer(problemId);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    };
  }, [timerRunning, problemId, stopTimer]);

  // Auto-save code
  useEffect(() => {
    if (!settings.autoSave) return;
    const t = setTimeout(() => updateProblem(problemId, { code }), 1500);
    return () => clearTimeout(t);
  }, [code, problemId, settings.autoSave, updateProblem]);

  const saveAll = () => {
    updateProblem(problemId, {
      code,
      approach: approachVal,
      timeComplexity: tcVal,
      spaceComplexity: scVal,
      ahaInput: ahaVal,
      notes: notesVal,
      bestApproach: bestApproachVal,
      conceptsToStudy: conceptsVal.split(',').map((s) => s.trim()).filter(Boolean),
      status: statusVal,
      customTestCases: customTests,
    });
  };

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

  const allTestCases = [
    ...examples.map((e, i) => ({ id: `ex-${i}`, input: e.input, expectedOutput: e.output, label: `Example ${i + 1}` })),
    ...customTests,
  ];

  const runCode = async (hidden = false) => {
    if (!settings.judgeApiKey) {
      alert('Add your Judge0 RapidAPI key in Settings first.');
      return;
    }
    const cases = hidden
      ? hiddenTests.map((t, i) => ({ id: `h-${i}`, input: t.input, expectedOutput: t.output }))
      : allTestCases;

    if (cases.length === 0) { alert('Add test cases first.'); return; }
    hidden ? setSubmitting(true) : setRunning(true);
    setActiveBottomTab('output');
    const results = [];
    for (const tc of cases) {
      try {
        const r = await runTestCase(settings.judgeApiKey, settings.judgeApiHost, code, tc.input, tc.expectedOutput);
        results.push({ input: tc.input, expected: tc.expectedOutput, got: r.output, passed: r.passed, error: r.errorMessage });
      } catch (e) {
        results.push({ input: tc.input, expected: tc.expectedOutput, got: '', passed: false, error: String(e) });
      }
    }
    setTestResults(results);
    hidden ? setSubmitting(false) : setRunning(false);

    if (hidden) {
      const passed = results.filter((r) => r.passed).length;
      const verdict: Verdict = passed === results.length ? 'accepted' : 'wrong_answer';
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
        totalTestCases: results.length,
      };
      addSubmission(problemId, sub);
      if (verdict === 'accepted') markReviewDates(problemId);
    }
  };

  const addCustomTest = () => {
    if (!newInput.trim()) return;
    const tc: TestCase = { id: `ct-${Date.now()}`, input: newInput, expectedOutput: newExpected };
    const updated = [...customTests, tc];
    setCustomTests(updated);
    setNewInput('');
    setNewExpected('');
    updateProblem(problemId, { customTestCases: updated });
  };

  const removeCustomTest = (tcId: string) => {
    const updated = customTests.filter((t) => t.id !== tcId);
    setCustomTests(updated);
    updateProblem(problemId, { customTestCases: updated });
  };

  const latestSub = userProblem.submissions[0];

  return (
    <div className="flex flex-col h-screen bg-[#0f0f0f] overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#2a2a2a] bg-[#141414] shrink-0">
        <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-white truncate">{name}</h1>
            {(sheetProblem?.difficulty ?? customDiff) && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                (sheetProblem?.difficulty ?? customDiff) === 'Easy' ? 'text-green-400 bg-green-500/10'
                : (sheetProblem?.difficulty ?? customDiff) === 'Medium' ? 'text-yellow-400 bg-yellow-500/10'
                : 'text-red-400 bg-red-500/10'}`}>
                {sheetProblem?.difficulty ?? customDiff}
              </span>
            )}
            {latestSub && (
              <span className={`text-xs px-1.5 py-0.5 rounded border ${VERDICT_STYLE[latestSub.verdict]}`}>
                {VERDICT_LABEL[latestSub.verdict]}
              </span>
            )}
          </div>
        </div>
        {/* Timer */}
        <div className="flex items-center gap-2 bg-[#1e1e1e] border border-[#333] rounded-lg px-3 py-1.5">
          <Clock size={13} className={timerRunning ? 'text-orange-400' : 'text-slate-500'} />
          <Timer seconds={elapsed} />
          <button onClick={toggleTimer}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${timerRunning ? 'text-red-400 hover:text-red-300' : 'text-orange-400 hover:text-orange-300'}`}>
            {timerRunning ? 'Stop' : 'Start'}
          </button>
        </div>
        {/* Status */}
        <select value={statusVal} onChange={(e) => { setStatusVal(e.target.value as any); }}
          className="bg-[#1e1e1e] border border-[#333] rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-orange-500">
          <option value="not_started">Not Started</option>
          <option value="attempted">Attempted</option>
          <option value="solved">Solved</option>
          <option value="review">Review</option>
          <option value="stuck">Stuck</option>
        </select>
        <button onClick={saveAll}
          className="flex items-center gap-1.5 bg-[#1e1e1e] border border-[#333] hover:border-orange-500 rounded-lg px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors">
          <Save size={13} />Save
        </button>
        <button onClick={() => exportProblemCode(name, code, notesVal)}
          className="flex items-center gap-1.5 bg-[#1e1e1e] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <Download size={13} />
        </button>
      </div>

      {/* Main split */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-[42%] flex flex-col border-r border-[#2a2a2a] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-[#2a2a2a] bg-[#141414] shrink-0">
            {(['description', 'approach', 'history'] as const).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-2.5 text-xs font-medium capitalize transition-colors ${
                  activeTab === t ? 'text-orange-400 border-b-2 border-orange-400' : 'text-slate-500 hover:text-slate-300'
                }`}>{t === 'history' ? `History (${userProblem.submissions.length})` : t}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 text-sm text-slate-300 space-y-4">
            {/* DESCRIPTION TAB */}
            {activeTab === 'description' && (
              <>
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Description</div>
                  {description ? (
                    <p className="leading-relaxed text-slate-200 whitespace-pre-wrap">{description}</p>
                  ) : (
                    <textarea
                      value={userProblem.customDescription}
                      onChange={(e) => updateProblem(problemId, { customDescription: e.target.value })}
                      placeholder="Paste the problem description here..."
                      className="w-full bg-[#151515] border border-[#333] rounded-lg p-3 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-orange-500 resize-none min-h-[120px]"
                    />
                  )}
                </div>

                {examples.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Examples</div>
                    {examples.map((ex, i) => (
                      <div key={i} className="bg-[#151515] border border-[#2a2a2a] rounded-lg p-3 mb-2 font-mono text-xs">
                        <div className="text-slate-500 mb-1">Input:</div>
                        <div className="text-slate-200 whitespace-pre-wrap mb-2">{ex.input}</div>
                        <div className="text-slate-500 mb-1">Output:</div>
                        <div className="text-green-400 whitespace-pre-wrap">{ex.output}</div>
                        {ex.explanation && (
                          <div className="text-slate-500 mt-2 font-sans text-xs">💡 {ex.explanation}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Tags */}
                {sheetProblem?.topicTags && (
                  <div className="flex flex-wrap gap-1.5">
                    {sheetProblem.topicTags.map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">{t}</span>
                    ))}
                  </div>
                )}

                {/* External links */}
                <div className="flex gap-3">
                  {sheetProblem?.leetcodeUrl && (
                    <a href={sheetProblem.leetcodeUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-orange-400 hover:underline">LeetCode →</a>
                  )}
                  {sheetProblem?.gfgUrl && (
                    <a href={sheetProblem.gfgUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-green-400 hover:underline">GFG →</a>
                  )}
                </div>

                {/* Hints */}
                {hints.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Lightbulb size={12} className="text-yellow-500" />
                      Hints ({userProblem.hintsUsed.length}/{hints.length} used)
                    </div>
                    {hints.map((hint, i) => (
                      <div key={i} className="mb-1.5 border border-[#2a2a2a] rounded-lg overflow-hidden">
                        <button
                          onClick={() => hintsOpen.has(i) ? setHintsOpen((s) => { const n = new Set(s); n.delete(i); return n; }) : openHint(i)}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/3 transition-colors"
                        >
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
                          <div className="px-3 py-2 bg-yellow-500/5 border-t border-[#2a2a2a] text-xs text-yellow-200 leading-relaxed">
                            {hint}
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Custom hints */}
                    <div className="mt-1">
                      <input
                        placeholder="Add your own hint..."
                        className="w-full bg-[#151515] border border-[#2a2a2a] rounded px-2 py-1.5 text-xs text-slate-400 placeholder-slate-700 outline-none focus:border-orange-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            updateProblem(problemId, { customHints: [...userProblem.customHints, e.currentTarget.value.trim()] });
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* APPROACH TAB */}
            {activeTab === 'approach' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide">Status</label>
                  <div className="flex gap-2 mt-2">
                    {(['not_started', 'attempted', 'solved', 'review', 'stuck'] as const).map((s) => (
                      <button key={s} onClick={() => setStatusVal(s)}
                        className={`flex-1 py-1.5 rounded-lg text-xs border transition-colors ${
                          statusVal === s ? 'bg-orange-500/20 border-orange-500 text-orange-300' : 'border-[#333] text-slate-500 hover:border-[#444]'
                        }`}>{s.replace('_', ' ')}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide">Approach Used</label>
                  <div className="flex gap-2 mt-2">
                    {(['brute', 'better', 'optimal'] as const).map((a) => (
                      <button key={a} onClick={() => setApproachVal(a)}
                        className={`flex-1 py-1.5 rounded-lg text-xs border capitalize transition-colors ${
                          approachVal === a ? 'bg-orange-500/20 border-orange-500 text-orange-300' : 'border-[#333] text-slate-500 hover:border-[#444]'
                        }`}>{a}</button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1">Time Complexity</label>
                    <input value={tcVal} onChange={(e) => setTcVal(e.target.value)}
                      placeholder="e.g. O(n log n)"
                      className="w-full bg-[#151515] border border-[#333] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-orange-500 font-mono" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1">Space Complexity</label>
                    <input value={scVal} onChange={(e) => setScVal(e.target.value)}
                      placeholder="e.g. O(n)"
                      className="w-full bg-[#151515] border border-[#333] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-orange-500 font-mono" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1">
                    💡 AHA Moment — Your Own Approach
                  </label>
                  <textarea value={ahaVal} onChange={(e) => setAhaVal(e.target.value)} rows={3}
                    placeholder="In your own words, how would you approach this problem next time?"
                    className="w-full bg-[#151515] border border-[#333] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-orange-500 resize-none" />
                </div>

                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1">Best Approach (from internet/editorial)</label>
                  <textarea value={bestApproachVal} onChange={(e) => setBestApproachVal(e.target.value)} rows={4}
                    placeholder="Paste the optimal approach explanation here..."
                    className="w-full bg-[#151515] border border-[#333] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-orange-500 resize-none" />
                </div>

                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1">Concepts to Study</label>
                  <input value={conceptsVal} onChange={(e) => setConceptsVal(e.target.value)}
                    placeholder="Two Pointers, Sliding Window, ..."
                    className="w-full bg-[#151515] border border-[#333] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-orange-500" />
                </div>

                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1">Notes</label>
                  <textarea value={notesVal} onChange={(e) => setNotesVal(e.target.value)} rows={4}
                    placeholder="Extra notes, edge cases, mistakes made..."
                    className="w-full bg-[#151515] border border-[#333] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-orange-500 resize-none" />
                </div>

                <button onClick={saveAll}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <Save size={14} />Save All
                </button>
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                {userProblem.submissions.length === 0 ? (
                  <p className="text-slate-600 text-xs">No submissions yet.</p>
                ) : (
                  userProblem.submissions.map((sub) => (
                    <div key={sub.id} className={`border rounded-lg p-3 ${VERDICT_STYLE[sub.verdict]}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold">{VERDICT_LABEL[sub.verdict]}</span>
                        <span className="text-xs opacity-60">{format(parseISO(sub.timestamp), 'MMM d, HH:mm')}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs opacity-70">
                        <span>TC: {sub.timeComplexity || '-'}</span>
                        <span>SC: {sub.spaceComplexity || '-'}</span>
                        <span>{sub.testCasesPassed}/{sub.totalTestCases} passed</span>
                        <span>{Math.round(sub.timeSpentSeconds / 60)}m spent</span>
                        <span>{sub.approach || '-'}</span>
                        <span>{sub.hintsUsedBeforeSubmit ? `Hints @ ${sub.hintsUsedAtMinute}m` : 'No hints'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL — Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor */}
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
              }}
            />
          </div>

          {/* Bottom panel */}
          <div className="h-48 border-t border-[#2a2a2a] flex flex-col bg-[#141414]">
            {/* Bottom tabs + action buttons */}
            <div className="flex items-center border-b border-[#2a2a2a] px-3 gap-2 shrink-0">
              {(['testcases', 'output'] as const).map((t) => (
                <button key={t} onClick={() => setActiveBottomTab(t)}
                  className={`py-2 px-2 text-xs capitalize transition-colors ${
                    activeBottomTab === t ? 'text-orange-400 border-b-2 border-orange-400' : 'text-slate-500 hover:text-slate-300'
                  }`}>{t === 'output' ? `Output (${testResults.filter((r) => r.passed).length}/${testResults.length})` : 'Test Cases'}</button>
              ))}
              <div className="flex-1" />
              <button onClick={() => runCode(false)} disabled={running}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1e1e1e] border border-[#333] hover:border-green-500 text-green-400 rounded-lg transition-colors disabled:opacity-50">
                <Play size={12} />{running ? 'Running...' : 'Run'}
              </button>
              <button onClick={() => runCode(true)} disabled={submitting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50">
                <Send size={12} />{submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {activeBottomTab === 'testcases' && (
                <div className="space-y-2">
                  {allTestCases.map((tc, i) => (
                    <div key={tc.id} className="flex gap-2 items-start">
                      <div className="flex-1 bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg px-3 py-1.5 font-mono text-xs text-slate-300">
                        <span className="text-slate-600 mr-2">{tc.label ?? `Custom ${i + 1}`}:</span>
                        {tc.input} → <span className="text-green-400">{tc.expectedOutput}</span>
                      </div>
                      {tc.id.startsWith('ct-') && (
                        <button onClick={() => removeCustomTest(tc.id)} className="text-slate-600 hover:text-red-400 mt-1">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2 mt-1">
                    <input value={newInput} onChange={(e) => setNewInput(e.target.value)}
                      placeholder="Input"
                      className="flex-1 bg-[#1e1e1e] border border-[#2a2a2a] rounded px-2 py-1 text-xs font-mono text-slate-300 placeholder-slate-700 outline-none focus:border-orange-500" />
                    <input value={newExpected} onChange={(e) => setNewExpected(e.target.value)}
                      placeholder="Expected output"
                      className="flex-1 bg-[#1e1e1e] border border-[#2a2a2a] rounded px-2 py-1 text-xs font-mono text-slate-300 placeholder-slate-700 outline-none focus:border-orange-500" />
                    <button onClick={addCustomTest}
                      className="text-orange-400 hover:text-orange-300 px-2">
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              )}

              {activeBottomTab === 'output' && (
                <div className="space-y-2">
                  {testResults.length === 0 ? (
                    <p className="text-slate-600 text-xs">Run or Submit to see output.</p>
                  ) : (
                    testResults.map((r, i) => (
                      <div key={i} className={`flex items-start gap-2 text-xs font-mono p-2 rounded border ${
                        r.passed ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                        {r.passed ? <CheckCircle2 size={13} className="text-green-500 mt-0.5 shrink-0" />
                          : <XCircle size={13} className="text-red-500 mt-0.5 shrink-0" />}
                        <div className="min-w-0">
                          <span className="text-slate-500">Input: </span>
                          <span className="text-slate-300">{r.input}</span>
                          {!r.passed && (
                            <>
                              <span className="text-slate-500 ml-2">Expected: </span>
                              <span className="text-green-400">{r.expected}</span>
                              <span className="text-slate-500 ml-2">Got: </span>
                              <span className="text-red-400">{r.got || r.error}</span>
                            </>
                          )}
                          {r.passed && (
                            <span className="text-green-400 ml-2">✓ {r.got}</span>
                          )}
                        </div>
                      </div>
                    ))
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
