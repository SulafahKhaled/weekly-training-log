import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2, WifiOff } from 'lucide-react';
import TopBar from './components/TopBar';
import TabBar from './components/TabBar';
import Home from './components/Home';
import DayView from './components/DayView';
import InfoPage from './components/InfoPage';
import LoginScreen from './components/LoginScreen';
import { DAYS, WARMUP_INFO, COOLDOWN_INFO, MOBILITY_INFO } from './data/days';
import { useTodayTotals } from './hooks/useProgress';
import { ProgressProvider, useProgressContext } from './context/ProgressContext';
import { AuthProvider, useAuth } from './context/AuthContext';

const INFO_PAGES = { warmup: WARMUP_INFO, mobility: MOBILITY_INFO, cooldown: COOLDOWN_INFO };

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
    <ProgressProvider>
      <AppShell />
    </ProgressProvider>
  );
}

function AppShell() {
  const [route, setRoute] = useState({ view: 'home', dayId: null });
  const { streak } = useTodayTotals();
  const { error } = useProgressContext();
  const { user, logout } = useAuth();

  function go(view, dayId = null) {
    setRoute({ view, dayId });
    window.scrollTo(0, 0);
  }

  const activeTab = route.view === 'day' ? 'home' : route.view;

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
  }

  return (
    <>
      <div className="bg-glow" />
      <TopBar title={title} subtitle={subtitle} showBack={route.view === 'day'} onBack={() => go('home')} streak={streak} username={user} onLogout={logout} />
      {error && (
        <div className="offline-banner">
          <WifiOff size={13} />
          Can&apos;t reach the server — is it running? Progress won&apos;t save until it&apos;s back.
        </div>
      )}
      <main>
        <AnimatePresence mode="wait">{content}</AnimatePresence>
      </main>
      <TabBar active={activeTab} onSelect={(tab) => go(tab)} />
    </>
  );
}
