import { useState, useRef } from 'react';
import { Save, Eye, EyeOff, Upload, Download, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { exportAllData, exportCSV, importData } from '../../utils/export';

export default function SettingsPage() {
  const { settings, updateSettings, userProblems, conceptNotes } = useStore();
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [importError, setImportError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleImport = (file: File) => {
    setImportError('');
    importData(file, ({ userProblems: up, conceptNotes: cn }) => {
      // Merge into store
      Object.entries(up).forEach(([id, p]) => useStore.getState().updateProblem(id, p));
      cn.forEach((n) => useStore.getState().addNote(n));
      alert(`Imported ${Object.keys(up).length} problems and ${cn.length} notes.`);
    }, (e) => setImportError(e));
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Configure Judge0 API, editor preferences, and data.</p>
      </div>

      {/* Judge0 API */}
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white">Judge0 API (Code Execution)</h2>
            <p className="text-xs text-slate-500 mt-1">
              Get a free API key from{' '}
              <a href="https://rapidapi.com/judge0-official/api/judge0-ce" target="_blank" rel="noopener noreferrer"
                className="text-orange-400 hover:underline inline-flex items-center gap-0.5">
                RapidAPI <ExternalLink size={10} />
              </a>
              . Free tier: 50 requests/day.
            </p>
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1.5">RapidAPI Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.judgeApiKey}
              onChange={(e) => updateSettings({ judgeApiKey: e.target.value })}
              placeholder="Paste your RapidAPI key here"
              className="w-full bg-[#151515] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-orange-500 pr-10"
            />
            <button onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1.5">API Host</label>
          <input
            value={settings.judgeApiHost}
            onChange={(e) => updateSettings({ judgeApiHost: e.target.value })}
            className="w-full bg-[#151515] border border-[#333] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
          />
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-2">
          <AlertTriangle size={14} className="text-yellow-500 mt-0.5 shrink-0" />
          <p className="text-xs text-yellow-200">
            Your API key is stored only in your browser's localStorage. It never leaves your device.
          </p>
        </div>
      </div>

      {/* Editor */}
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Editor Preferences</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">Font Size</label>
            <input
              type="number" min={10} max={22}
              value={settings.editorFontSize}
              onChange={(e) => updateSettings({ editorFontSize: Number(e.target.value) })}
              className="w-full bg-[#151515] border border-[#333] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">Line Numbers</label>
            <button onClick={() => updateSettings({ showLineNumbers: !settings.showLineNumbers })}
              className={`w-full py-2 rounded-lg text-sm border transition-colors ${
                settings.showLineNumbers ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'border-[#333] text-slate-500'
              }`}>{settings.showLineNumbers ? 'Enabled' : 'Disabled'}</button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-white">Auto-save code</div>
            <div className="text-xs text-slate-500">Saves code 1.5s after you stop typing</div>
          </div>
          <button onClick={() => updateSettings({ autoSave: !settings.autoSave })}
            className={`w-12 h-6 rounded-full transition-colors relative ${settings.autoSave ? 'bg-orange-500' : 'bg-[#333]'}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow ${settings.autoSave ? 'right-0.5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Data management */}
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Data & Export</h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => exportAllData(userProblems, conceptNotes)}
            className="flex items-center gap-2 justify-center px-4 py-2.5 bg-[#151515] border border-[#333] hover:border-orange-500 text-slate-300 hover:text-white rounded-lg text-sm transition-colors">
            <Download size={14} />Export All (JSON)
          </button>
          <button onClick={() => exportCSV(userProblems)}
            className="flex items-center gap-2 justify-center px-4 py-2.5 bg-[#151515] border border-[#333] hover:border-green-500 text-slate-300 hover:text-white rounded-lg text-sm transition-colors">
            <Download size={14} />Export Stats (CSV)
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 justify-center px-4 py-2.5 bg-[#151515] border border-[#333] hover:border-blue-500 text-slate-300 hover:text-white rounded-lg text-sm transition-colors col-span-2">
            <Upload size={14} />Import Backup (JSON)
          </button>
        </div>
        {importError && <p className="text-xs text-red-400">{importError}</p>}
        <input ref={fileRef} type="file" accept=".json" className="hidden"
          onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} />

        <div className="border-t border-[#2a2a2a] pt-4">
          <div className="text-xs text-slate-500 mb-3">
            All data is stored in your browser's localStorage under key <code className="text-orange-400">dsa-tracker-v1</code>.
            Export regularly to avoid data loss on browser clear.
          </div>
          <div className="text-xs text-slate-600">
            Problems: {Object.keys(userProblems).length} · Notes: {conceptNotes.length}
          </div>
        </div>
      </div>

      <button onClick={save}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
        <Save size={14} />
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
