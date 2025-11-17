import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Home, History, User, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: ReactNode;
  userType: 'cliente' | 'conductor';
}

export function MobileLayout({ children, userType }: MobileLayoutProps) {
  const [location] = useLocation();

  const clientTabs = [
    { path: '/client', icon: Home, label: 'Inicio', testId: 'tab-home' },
    { path: '/client/history', icon: History, label: 'Historial', testId: 'tab-history' },
    { path: '/client/profile', icon: User, label: 'Perfil', testId: 'tab-profile' },
    { path: '/client/support', icon: Phone, label: 'Soporte', testId: 'tab-support' },
  ];

  const driverTabs = [
    { path: '/driver', icon: Home, label: 'Inicio', testId: 'tab-home' },
    { path: '/driver/history', icon: History, label: 'Historial', testId: 'tab-history' },
    { path: '/driver/profile', icon: User, label: 'Perfil', testId: 'tab-profile' },
  ];

  const tabs = userType === 'cliente' ? clientTabs : driverTabs;

  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
      
      <nav className="h-16 border-t border-border bg-card flex items-center justify-around px-2 safe-area-inset-bottom">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location === tab.path || location.startsWith(tab.path + '/');
          
          return (
            <Link key={tab.path} href={tab.path}>
              <button
                data-testid={tab.testId}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
