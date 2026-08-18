import { AppProvider, useApp } from '@/context/AppContext';
import { Navbar } from '@/components/Navbar';
import { LandingPage } from '@/pages/LandingPage';
import { WorkspacePage } from '@/pages/WorkspacePage';
import { ReportPage } from '@/pages/ReportPage';
import { ComparePage } from '@/pages/ComparePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { HistoryPage } from '@/pages/HistoryPage';

function Router() {
  const { route } = useApp();

  if (route.name === 'landing') {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />
      <main>
        {route.name === 'workspace' && <WorkspacePage />}
        {route.name === 'report' && <ReportPage id={route.id} />}
        {route.name === 'compare' && <ComparePage />}
        {route.name === 'dashboard' && <DashboardPage />}
        {route.name === 'history' && <HistoryPage />}
      </main>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}

export default App;
