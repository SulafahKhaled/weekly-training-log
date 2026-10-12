import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2, WifiOff } from 'lucide-react';
import TopBar from './components/TopBar';
import TabBar from './components/TabBar';
import Home from './components/Home';
import DayView from './components/DayView';
import InfoPage from './components/InfoPage';
import LoginScreen from './components/LoginScreen';
import JournalStats from './components/JournalStats';
import LibraryPage from './components/library/LibraryPage';
import PlansPage from './components/plans/PlansPage';
import SettingsPage from './components/settings/SettingsPage';
import ConnectClaude from './components/settings/ConnectClaude';
import MobilityHub from './components/mobility/MobilityHub';
import ProgressTests from './components/mobility/ProgressTests';
import { UndoProvider } from './components/UndoToast';
import { DAYS, WARMUP_INFO, COOLDOWN_INFO } from './data/days';
import { DataProvider, useData } from './context/DataContext';
import { streaks } from './lib/stats';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UiPrefsProvider } from './context/UiPrefsContext';

const INFO_PAGES = { warmup: WARMUP_INFO, cooldown: COOLDOWN_INFO };

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-screen">
        <div className="bg-glow" />
        <Loader2 size={22} className="spin" color="var(--text-faint)" />
      </div>
    );
  }
  if (!user) return <LoginScreen />;

  return (
    <DataProvider>
      <UiPrefsProvider>
        <UndoProvider>
          <AppShell />
        </UndoProvider>
      </UiPrefsProvider>
    </DataProvider>
  );
}

function AppShell() {
  const [route, setRoute] = useState({ view: 'home', dayId: null });
  const { log, date, booting, bootError } = useData();
  const error = bootError || log.error;
  const streak = streaks([...log.items.values()], date).current;
  const { user, logout } = useAuth();

  function go(view, dayId = null) {
    setRoute({ view, dayId });
    window.scrollTo(0, 0);
  }

  const activeTab = ['day', 'library', 'plans', 'settings', 'tests', 'connect'].includes(route.view) ? 'home' : route.view;

  let title = 'الخطة الأسبوعية';
  let subtitle = 'Your 7-day training tracker';
  let content = <Home key="home" onOpenDay={(id) => go('day', id)} onNavigate={go} />;

  if (route.view === 'day') {
    const day = DAYS.find((d) => d.id === route.dayId);
    title = day.nameEn;
    subtitle = day.tag;
    content = <DayView key={`day-${day.id}`} day={day} />;
  } else if (INFO_PAGES[route.view]) {
    const info = INFO_PAGES[route.view];
    title = info.title;
    subtitle = info.ar;
    content = <InfoPage key={route.view} info={info} />;
  } else if (route.view === 'mobility') {
    title = 'Mobility';
    subtitle = 'المرونة والحركة';
    content = <MobilityHub key="mobility" onNavigate={go} />;
  } else if (route.view === 'library') {
    title = 'Exercise library';
    subtitle = 'Every exercise, editable';
    content = <LibraryPage key="library" />;
  } else if (route.view === 'plans') {
    title = 'Plans';
    subtitle = 'Build and switch training plans';
    content = <PlansPage key="plans" />;
  } else if (route.view === 'settings') {
    title = 'Settings & backup';
    subtitle = 'Timing, week, export / import';
    content = <SettingsPage key="settings" />;
  } else if (route.view === 'connect') {
    title = 'Connect Claude';
    subtitle = 'Log by chatting';
    content = <ConnectClaude key="connect" />;
  } else if (route.view === 'tests') {
    title = 'Progress tests';
    subtitle = 'Start · week 4 · week 8 · week 12';
    content = <ProgressTests key="tests" />;
  } else if (route.view === 'journalstats') {
    title = 'Journal & Stats';
    subtitle = 'Look back and see your progress';
    content = <JournalStats key="journalstats" />;
  }

  return (
    <>
      <div className="bg-glow" />
      <TopBar title={title} subtitle={subtitle} showBack={['day', 'library', 'plans', 'settings', 'tests', 'connect'].includes(route.view)} onBack={() => go('home')} streak={streak} username={user} onLogout={logout} />
      {error && (
        <div className="offline-banner">
          <WifiOff size={13} />
          Can&apos;t reach the server — is it running? Progress won&apos;t save until it&apos;s back.
        </div>
      )}
      <main>
        {booting ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Loader2 size={22} className="spin" color="var(--text-faint)" />
          </div>
        ) : (
          <AnimatePresence mode="wait">{content}</AnimatePresence>
        )}
      </main>
      <TabBar active={activeTab} onSelect={(tab) => go(tab)} />
    </>
  );
}
