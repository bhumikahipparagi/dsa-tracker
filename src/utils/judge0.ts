// ─── Code execution — Judge0 (with API key) or Wandbox (no key needed) ────────

const CPP_LANGUAGE_ID = 54; // C++ 17

export type RunResult = {
  verdict: 'accepted' | 'wrong_answer' | 'tle' | 'mle' | 'runtime_error' | 'compilation_error';
  output: string;
  errorMessage: string;
  executionTimeMs: number;
  memoryKb: number;
  passed: boolean;
};

// ── Wandbox (free, no key required) ──────────────────────────────────────────
async function runOnWandbox(code: string, stdin: string, expectedOutput: string): Promise<RunResult> {
  const res = await fetch('https://wandbox.org/api/compile.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      compiler: 'gcc-head',
      'compiler-option-raw': '-O2 -std=c++17',
      stdin,
    }),
  });

  if (!res.ok) throw new Error(`Wandbox error: ${res.status}`);
  const data = await res.json();

  const compileErr = (data.compiler_error || '').trim();
  const stdout = (data.program_output || '').trim();
  const stderr = (data.program_error || '').trim();
  const exitCode = data.status ?? 0;

  if (compileErr) {
    return {
      verdict: 'compilation_error',
      output: '',
      errorMessage: compileErr,
      executionTimeMs: 0,
      memoryKb: 0,
      passed: false,
    };
  }

  if (exitCode !== 0 && exitCode !== '0') {
    return {
      verdict: 'runtime_error',
      output: stdout,
      errorMessage: stderr,
      executionTimeMs: 0,
      memoryKb: 0,
      passed: false,
    };
  }

  const passed = normalise(stdout) === normalise(expectedOutput);
  return {
    verdict: passed ? 'accepted' : 'wrong_answer',
    output: stdout,
    errorMessage: stderr,
    executionTimeMs: 0,
    memoryKb: 0,
    passed,
  };
}

// ── Judge0 via RapidAPI (requires key) ───────────────────────────────────────
interface Judge0Result {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
}

const decode = (b64: string | null) => {
  if (!b64) return '';
  try { return decodeURIComponent(escape(atob(b64))); } catch { return b64; }
};

async function runOnJudge0(
  apiKey: string,
  apiHost: string,
  code: string,
  stdin: string,
  expectedOutput: string,
): Promise<RunResult> {
  const enc = (s: string) => btoa(unescape(encodeURIComponent(s)));

  const submitRes = await fetch(`https://${apiHost}/submissions?base64_encoded=true&wait=false`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': apiHost,
    },
    body: JSON.stringify({
      language_id: CPP_LANGUAGE_ID,
      source_code: enc(code),
      stdin: enc(stdin),
    }),
  });

  if (!submitRes.ok) throw new Error(`Judge0 submit failed: ${submitRes.status}`);
  const { token } = await submitRes.json();

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 800));
    const pollRes = await fetch(
      `https://${apiHost}/submissions/${token}?base64_encoded=true`,
      { headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': apiHost } },
    );
    const data: Judge0Result = await pollRes.json();
    if (data.status.id <= 2) continue; // queued / processing

    const stdout = decode(data.stdout).trim();
    const stderr = decode(data.stderr);
    const compileOut = decode(data.compile_output);
    const sid = data.status.id;

    let verdict: RunResult['verdict'] = 'accepted';
    if (sid === 6) verdict = 'compilation_error';
    else if (sid === 5) verdict = 'tle';
    else if ([7, 8, 9, 10].includes(sid)) verdict = 'runtime_error';
    else if (sid === 11) verdict = 'mle';
    else if (sid === 3) verdict = normalise(stdout) === normalise(expectedOutput) ? 'accepted' : 'wrong_answer';
    else verdict = 'runtime_error';

    return {
      verdict,
      output: stdout,
      errorMessage: compileOut || stderr,
      executionTimeMs: data.time ? Math.round(parseFloat(data.time) * 1000) : 0,
      memoryKb: data.memory ?? 0,
      passed: verdict === 'accepted',
    };
  }
  throw new Error('Timeout waiting for Judge0 result');
}

// ── Public entry point ────────────────────────────────────────────────────────
export async function runTestCase(
  apiKey: string,
  apiHost: string,
  code: string,
  input: string,
  expectedOutput: string,
): Promise<RunResult> {
  if (apiKey && apiKey.trim().length > 10) {
    return runOnJudge0(apiKey, apiHost, code, input, expectedOutput);
  }
  // No key → use Wandbox (free, no registration)
  return runOnWandbox(code, input, expectedOutput);
}

function normalise(s: string): string {
  return s.trim().replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n+$/, '');
}
