import { UserProblem, ConceptNote } from '../types';
import { SHEET_PROBLEMS } from '../data/striverSheet';

export function exportAllData(
  userProblems: Record<string, UserProblem>,
  conceptNotes: ConceptNote[]
) {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    userProblems,
    conceptNotes,
  };
  downloadJSON(payload, 'dsa-tracker-backup.json');
}

export function exportCSV(userProblems: Record<string, UserProblem>) {
  const rows = [
    ['Problem', 'Step', 'Division', 'Difficulty', 'Status', 'Submissions', 'Best Verdict',
      'Approach', 'Time Complexity', 'Space Complexity', 'Time Spent (min)', 'Solved At', 'Hints Used'],
  ];

  SHEET_PROBLEMS.forEach((p) => {
    const u = userProblems[p.id];
    if (!u || u.status === 'not_started') return;
    const bestVerdict = u.submissions.find((s) => s.verdict === 'accepted')
      ? 'Accepted'
      : u.submissions[0]?.verdict ?? '-';
    rows.push([
      p.name,
      p.stepName,
      p.divisionName,
      p.difficulty,
      u.status,
      String(u.submissions.length),
      bestVerdict,
      u.approach ?? '-',
      u.timeComplexity || '-',
      u.spaceComplexity || '-',
      String(Math.round(u.totalTimeSpentSeconds / 60)),
      u.solvedAt ? new Date(u.solvedAt).toLocaleDateString() : '-',
      String(u.hintsUsed.length),
    ]);
  });

  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  downloadFile(csv, 'dsa-tracker-stats.csv', 'text/csv');
}

export function exportProblemCode(problemName: string, code: string, notes: string) {
  const content = `// Problem: ${problemName}
// Exported: ${new Date().toLocaleString()}

${code}

/*
NOTES:
${notes}
*/
`;
  downloadFile(content, `${problemName.replace(/\s+/g, '-')}.cpp`, 'text/plain');
}

function downloadJSON(data: unknown, filename: string) {
  downloadFile(JSON.stringify(data, null, 2), filename, 'application/json');
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(
  file: File,
  onSuccess: (data: { userProblems: Record<string, UserProblem>; conceptNotes: ConceptNote[] }) => void,
  onError: (e: string) => void
) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target?.result as string);
      if (!parsed.userProblems) throw new Error('Invalid backup file');
      onSuccess({ userProblems: parsed.userProblems, conceptNotes: parsed.conceptNotes ?? [] });
    } catch (e) {
      onError(String(e));
    }
  };
  reader.readAsText(file);
}
