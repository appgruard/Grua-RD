import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Home, History, User, Phone, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: ReactNode;
  userType: 'cliente' | 'conductor' | 'socio';
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

  const socioTabs = [
    { path: '/socio', icon: TrendingUp, label: 'Dashboard', testId: 'tab-dashboard' },
  ];

  const tabs = userType === 'cliente' ? clientTabs : userType === 'socio' ? socioTabs : driverTabs;

  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      
      <nav className="flex-shrink-0 h-16 border-t border-border bg-card/95 backdrop-blur-sm flex items-center justify-around px-2 safe-area-inset-bottom">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location === tab.path || location.startsWith(tab.path + '/');
          
          return (
            <Link key={tab.path} href={tab.path}>
              <button
                data-testid={tab.testId}
                className={cn(
                  "flex flex-col items-center justify-center px-4 py-2 gap-1 rounded-xl transition-all duration-200",
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
                <span className={cn("text-xs font-medium", isActive && "font-semibold")}>{tab.label}</span>
              </button>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
