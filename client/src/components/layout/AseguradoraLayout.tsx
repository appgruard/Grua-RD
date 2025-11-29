import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  FileText,
  LogOut,
  BarChart3,
  Building2,
  CheckCircle,
  Clock,
  Receipt,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import logoUrl from '@assets/20251126_144937_0000_1764283370962.png';

interface AseguradoraLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { path: '/aseguradora', icon: LayoutDashboard, label: 'Dashboard', testId: 'nav-dashboard' },
  { path: '/aseguradora/pendientes', icon: Clock, label: 'Pendientes', testId: 'nav-pending' },
  { path: '/aseguradora/aprobados', icon: CheckCircle, label: 'Aprobados', testId: 'nav-approved' },
  { path: '/aseguradora/servicios', icon: FileText, label: 'Todos los Servicios', testId: 'nav-services' },
  { path: '/aseguradora/facturacion', icon: Receipt, label: 'Facturación', testId: 'nav-billing' },
  { path: '/aseguradora/reportes', icon: BarChart3, label: 'Reportes', testId: 'nav-reports' },
  { path: '/aseguradora/perfil', icon: Building2, label: 'Perfil Empresa', testId: 'nav-profile' },
];

function AppSidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <div className="px-4 py-4 flex items-center gap-3">
            <img 
              src={logoUrl} 
              alt="Grúa RD Logo" 
              className="w-12 h-12 object-contain"
            />
            <SidebarGroupLabel className="text-lg font-bold">
              Portal Aseguradora
            </SidebarGroupLabel>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      className={cn(isActive && 'bg-sidebar-accent')}
                      data-testid={item.testId}
                    >
                      <Link href={item.path}>
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 border-t border-sidebar-border">
          <div className="mb-3 px-2">
            <p className="text-sm font-medium" data-testid="text-user-name">{user?.nombre}</p>
            <p className="text-xs text-muted-foreground" data-testid="text-user-email">{user?.email}</p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => logout()}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export function AseguradoraLayout({ children }: AseguradoraLayoutProps) {
  const style = {
    '--sidebar-width': '16rem',
    '--sidebar-width-icon': '3rem',
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-40">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <h1 className="text-xl font-semibold">Portal de Aseguradora</h1>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
