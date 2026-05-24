const CPP_LANGUAGE_ID = 54; // C++ 17

interface Judge0Result {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
}

async function submitCode(
  apiKey: string,
  apiHost: string,
  sourceCode: string,
  stdin: string
): Promise<Judge0Result> {
  const encoded = (s: string) => btoa(unescape(encodeURIComponent(s)));

  const submitRes = await fetch(`https://${apiHost}/submissions?base64_encoded=true&wait=false`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': apiHost,
    },
    body: JSON.stringify({
      language_id: CPP_LANGUAGE_ID,
      source_code: encoded(sourceCode),
      stdin: encoded(stdin),
    }),
  });

  if (!submitRes.ok) throw new Error(`Submit failed: ${submitRes.status}`);
  const { token } = await submitRes.json();

  // poll until done
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 800));
    const pollRes = await fetch(
      `https://${apiHost}/submissions/${token}?base64_encoded=true`,
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': apiHost,
        },
      }
    );
    const data: Judge0Result = await pollRes.json();
    if (data.status.id > 2) return data; // not queued/processing
  }
  throw new Error('Timeout waiting for Judge0 result');
}

const decode = (b64: string | null) => {
  if (!b64) return '';
  try { return decodeURIComponent(escape(atob(b64))); } catch { return b64; }
};

export type RunResult = {
  verdict: 'accepted' | 'wrong_answer' | 'tle' | 'mle' | 'runtime_error' | 'compilation_error';
  output: string;
  errorMessage: string;
  executionTimeMs: number;
  memoryKb: number;
  passed: boolean;
};

export async function runTestCase(
  apiKey: string,
  apiHost: string,
  code: string,
  input: string,
  expectedOutput: string
): Promise<RunResult> {
  const result = await submitCode(apiKey, apiHost, code, input);
  const stdout = decode(result.stdout).trim();
  const stderr = decode(result.stderr);
  const compileOut = decode(result.compile_output);
  const statusId = result.status.id;

  let verdict: RunResult['verdict'] = 'accepted';
  if (statusId === 6) verdict = 'compilation_error';
  else if (statusId === 5) verdict = 'tle';
  else if (statusId === 7 || statusId === 8 || statusId === 9 || statusId === 10) verdict = 'runtime_error';
  else if (statusId === 11) verdict = 'mle';
  else if (statusId === 3) {
    verdict = stdout === expectedOutput.trim() ? 'accepted' : 'wrong_answer';
  } else {
    verdict = 'runtime_error';
  }

  return {
    verdict,
    output: stdout,
    errorMessage: compileOut || stderr,
    executionTimeMs: result.time ? Math.round(parseFloat(result.time) * 1000) : 0,
    memoryKb: result.memory ?? 0,
    passed: verdict === 'accepted',
  };
}
