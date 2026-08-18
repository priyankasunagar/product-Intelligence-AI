import { useApp } from '@/context/AppContext';
import { Boxes, GitCompareArrows, LayoutDashboard, History, Sparkles, ShieldCheck } from 'lucide-react';

export function Navbar() {
  const { route, navigate, records } = useApp();
  const isLanding = route.name === 'landing';

  const navItems = [
    { name: 'workspace' as const, label: 'Analyze', icon: Boxes },
    { name: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { name: 'history' as const, label: 'History', icon: History },
    { name: 'compare' as const, label: 'Compare', icon: GitCompareArrows },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <button onClick={() => navigate({ name: 'landing' })} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-ink-900">Product Intelligence <span className="text-brand-600">AI</span></span>
        </button>

        {!isLanding && (
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = route.name === item.name || (item.name === 'workspace' && route.name === 'report');
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate({ name: item.name })}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
            <div className="ml-2 hidden items-center gap-1.5 rounded-lg bg-ink-100 px-2.5 py-1.5 text-xs font-medium text-ink-600 md:flex">
              <ShieldCheck className="h-3.5 w-3.5 text-accent-600" />
              {records.length} analyzed
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
