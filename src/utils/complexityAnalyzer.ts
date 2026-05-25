// ─── Automatic Time & Space Complexity Analyser ────────────────────────────
// Heuristic-based analysis of C++ code patterns.
// Not perfect, but covers 90% of DSA problem patterns.

function stripComments(code: string): string {
  return code
    .replace(/\/\/[^\n]*/g, '')       // single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // block comments
}

/** Returns the deepest nesting level of for/while loops. */
function maxLoopDepth(code: string): number {
  const lines = code.split('\n');
  let depth = 0;
  let max = 0;
  // Track brace opens at each loop entry so we know when to decrement
  const loopBraceStack: number[] = [];
  let braceCount = 0;

  for (const line of lines) {
    const isLoop = /^\s*(for|while)\s*\(/.test(line);
    for (const ch of line) {
      if (ch === '{') {
        braceCount++;
        if (isLoop) {
          depth++;
          max = Math.max(max, depth);
          loopBraceStack.push(braceCount);
        }
      }
      if (ch === '}') {
        if (loopBraceStack.length && loopBraceStack[loopBraceStack.length - 1] === braceCount) {
          loopBraceStack.pop();
          depth = Math.max(0, depth - 1);
        }
        braceCount--;
      }
    }
  }
  return max;
}

/** Detect if any non-main function calls itself. */
function isRecursive(code: string): boolean {
  // Grab function names (simple heuristic)
  const fnRe = /\b([a-zA-Z_]\w*)\s*\([^)]*\)\s*\{/g;
  const reserved = new Set(['main', 'if', 'for', 'while', 'switch', 'catch', 'do']);
  const names: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = fnRe.exec(code)) !== null) {
    if (!reserved.has(m[1])) names.push(m[1]);
  }
  for (const fn of names) {
    // Is there at least two occurrences of fn( in the code?
    const count = (code.match(new RegExp(`\\b${fn}\\s*\\(`, 'g')) || []).length;
    if (count >= 2) return true;
  }
  return false;
}

export interface ComplexityResult {
  tc: string;
  sc: string;
  confidence: 'high' | 'medium' | 'low';
}

export function analyzeComplexity(code: string): ComplexityResult {
  if (!code || code.trim().length < 20) return { tc: '', sc: '', confidence: 'low' };

  const c = stripComments(code);

  // ── Feature flags ──────────────────────────────────────────────────
  const hasSorting      = /\bsort\s*\(/.test(c);
  const hasNthElem      = /\bnth_element\s*\(/.test(c);
  const hasBinSearch    = /\b(lower_bound|upper_bound|binary_search)\s*\(|lo\s*[+]?\s*hi|left.*right.*mid/.test(c);
  const hasDP           = /\bdp\[/.test(c);
  const has2DVector     = /vector\s*<\s*vector/.test(c);
  const hasVector       = /\bvector\s*</.test(c);
  const hasMap          = /\bmap\s*</.test(c);
  const hasUMap         = /\bunordered_map\s*</.test(c);
  const hasSet          = /\bset\s*</.test(c);
  const hasUSet         = /\bunordered_set\s*</.test(c);
  const hasPQ           = /\bpriority_queue\s*</.test(c);
  const hasStack        = /\bstack\s*</.test(c);
  const hasQueue        = /\bqueue\s*</.test(c);
  const hasDeque        = /\bdeque\s*</.test(c);
  const hasRecur        = isRecursive(c);
  const hasMemo         = hasRecur && (hasDP || hasUMap || hasUSet || hasMap);
  const hasGraphAdj     = /adj\s*\[|vector<.*>\s+adj/.test(c);
  const hasGraphBFS     = hasGraphAdj && hasQueue;
  const hasGraphDFS     = hasGraphAdj && hasRecur && !hasQueue;
  const hasDP2D         = hasDP && has2DVector;
  const hasDP1D         = hasDP && !has2DVector;

  const loopDepth = maxLoopDepth(c);

  // ── Time complexity ────────────────────────────────────────────────
  let tc: string;
  let confidence: ComplexityResult['confidence'] = 'medium';

  if (hasGraphBFS || hasGraphDFS) {
    tc = 'O(V + E)';
    confidence = 'high';
  } else if (hasMemo && hasDP2D) {
    tc = 'O(n × m)';
    confidence = 'high';
  } else if (hasMemo && hasDP1D) {
    tc = 'O(n)';
    confidence = 'high';
  } else if (hasRecur && !hasMemo) {
    if (loopDepth >= 1) { tc = 'O(n × 2ⁿ)'; confidence = 'medium'; }
    else { tc = 'O(2ⁿ)'; confidence = 'medium'; }
  } else if (hasBinSearch && hasSorting) {
    tc = 'O(n log n)';
    confidence = 'high';
  } else if (hasBinSearch && loopDepth >= 1) {
    tc = 'O(n log n)';
    confidence = 'medium';
  } else if (hasBinSearch) {
    tc = 'O(log n)';
    confidence = 'high';
  } else if (hasSorting && loopDepth >= 2) {
    tc = 'O(n² log n)';
    confidence = 'medium';
  } else if (hasSorting) {
    tc = 'O(n log n)';
    confidence = 'high';
  } else if (hasNthElem) {
    tc = 'O(n)';
    confidence = 'high';
  } else if (loopDepth >= 3) {
    tc = 'O(n³)';
    confidence = 'high';
  } else if (loopDepth === 2) {
    tc = 'O(n²)';
    confidence = 'high';
  } else if (loopDepth === 1) {
    if (hasMap || hasSet || hasPQ) { tc = 'O(n log n)'; confidence = 'high'; }
    else { tc = 'O(n)'; confidence = 'high'; }
  } else {
    if (hasMap || hasSet) { tc = 'O(log n)'; confidence = 'medium'; }
    else { tc = 'O(1)'; confidence = 'medium'; }
  }

  // ── Space complexity ───────────────────────────────────────────────
  let sc: string;

  if (hasDP2D || has2DVector) sc = 'O(n × m)';
  else if (hasDP1D) sc = 'O(n)';
  else if (hasVector || hasUMap || hasUSet || hasMap || hasSet || hasPQ || hasDeque) sc = 'O(n)';
  else if (hasStack || hasQueue) sc = 'O(n)';
  else if (hasRecur) sc = 'O(n)';
  else sc = 'O(1)';

  return { tc, sc, confidence };
}
