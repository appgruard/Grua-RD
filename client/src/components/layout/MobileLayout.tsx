import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Home, History, User, Phone, TrendingUp, Wallet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useWalletStatus } from '@/components/wallet';

interface MobileLayoutProps {
  children: ReactNode;
  userType: 'cliente' | 'conductor' | 'socio';
}

interface ServiceWithUnread {
  id: string;
  estado: string;
  estadoNegociacion?: string;
  unreadCount?: number;
}

export function MobileLayout({ children, userType }: MobileLayoutProps) {
  const [location] = useLocation();

  const { data: myServices = [] } = useQuery<ServiceWithUnread[]>({
    queryKey: ['/api/services/my-services'],
    refetchInterval: 30000,
    enabled: userType === 'cliente' || userType === 'conductor',
  });

  const walletStatus = useWalletStatus();
  const hasWalletAlert = userType === 'conductor' && walletStatus.hasAlert;

  const activeServices = myServices.filter(s => 
    ['pendiente', 'aceptado', 'en_progreso', 'en_camino'].includes(s.estado)
  );

  const hasActiveService = activeServices.length > 0;
  const hasNegotiationPending = activeServices.some(s => 
    s.estadoNegociacion === 'confirmado' || s.estadoNegociacion === 'propuesto'
  );

  const getHomeBadgeType = (): 'negotiation' | 'active' | null => {
    if (hasNegotiationPending) return 'negotiation';
    if (hasActiveService) return 'active';
    return null;
  };

  const homeBadgeType = getHomeBadgeType();

  const getProfileBadgeType = (): 'wallet-blocked' | 'wallet-warning' | null => {
    if (!hasWalletAlert) return null;
    if (walletStatus.isBlocked || walletStatus.hasOverdue) return 'wallet-blocked';
    if (walletStatus.hasNearDue) return 'wallet-warning';
    return null;
  };

  const profileBadgeType = getProfileBadgeType();

  const clientTabs = [
    { path: '/client', icon: Home, label: 'Inicio', testId: 'tab-home', badgeType: homeBadgeType },
    { path: '/client/history', icon: History, label: 'Historial', testId: 'tab-history', badgeType: null },
    { path: '/client/profile', icon: User, label: 'Perfil', testId: 'tab-profile', badgeType: null },
    { path: '/client/support', icon: Phone, label: 'Soporte', testId: 'tab-support', badgeType: null },
  ];

  const driverTabs = [
    { path: '/driver', icon: Home, label: 'Inicio', testId: 'tab-home', badgeType: homeBadgeType },
    { path: '/driver/history', icon: History, label: 'Historial', testId: 'tab-history', badgeType: null },
    { path: '/driver/profile', icon: User, label: 'Perfil', testId: 'tab-profile', badgeType: profileBadgeType },
  ];

  const socioTabs = [
    { path: '/socio', icon: TrendingUp, label: 'Dashboard', testId: 'tab-dashboard', badgeType: null },
  ];

  const tabs = userType === 'cliente' ? clientTabs : userType === 'socio' ? socioTabs : driverTabs;

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      <main className="flex-1 min-h-0 overflow-hidden pb-16">
        {children}
      </main>
      
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-border bg-card/95 backdrop-blur-sm flex items-center justify-around px-2 safe-area-inset-bottom">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location === tab.path || location.startsWith(tab.path + '/');
          const showBadge = tab.badgeType && !isActive;
          const getBadgeColor = () => {
            switch (tab.badgeType) {
              case 'negotiation': return 'bg-amber-500';
              case 'wallet-blocked': return 'bg-destructive';
              case 'wallet-warning': return 'bg-amber-500';
              case 'active': return 'bg-primary';
              default: return 'bg-primary';
            }
          };
          const badgeColor = getBadgeColor();
          
          return (
            <Link key={tab.path} href={tab.path}>
              <button
                data-testid={tab.testId}
                className={cn(
                  "relative flex flex-col items-center justify-center px-4 py-2 gap-1 rounded-xl transition-all duration-200",
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <div className="relative">
                  <Icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
                  {showBadge && (
                    <span 
                      className={cn(
                        "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse",
                        badgeColor
                      )}
                      data-testid={
                        tab.badgeType === 'negotiation' ? 'tab-home-negotiation-dot' 
                        : tab.badgeType === 'wallet-blocked' ? 'tab-profile-wallet-blocked-dot'
                        : tab.badgeType === 'wallet-warning' ? 'tab-profile-wallet-warning-dot'
                        : `${tab.testId}-notification-dot`
                      }
                    />
                  )}
                </div>
                <span className={cn("text-xs font-medium", isActive && "font-semibold")}>{tab.label}</span>
              </button>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
