import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './components/dashboard/Dashboard';
import SheetPage from './components/sheet/SheetPage';
import ProblemPage from './components/problem/ProblemPage';
import ReviewPage from './components/review/ReviewPage';
import NotesPage from './components/notes/NotesPage';
import SettingsPage from './components/settings/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sheet" element={<SheetPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/problem/:id" element={<ProblemPage />} />
    </Routes>
  );
}
