import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  Users,
  Truck,
  Map,
  DollarSign,
  FileText,
  LogOut,
  BarChart3,
  ShieldCheck,
  FolderOpen,
  Shield,
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
import logoUrl from '@assets/Grúa_20251124_024218_0000_1763966543810.png';

interface AdminLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', testId: 'nav-dashboard' },
  { path: '/admin/analytics', icon: BarChart3, label: 'Analytics', testId: 'nav-analytics' },
  { path: '/admin/users', icon: Users, label: 'Usuarios', testId: 'nav-users' },
  { path: '/admin/drivers', icon: Truck, label: 'Conductores', testId: 'nav-drivers' },
  { path: '/admin/services', icon: FileText, label: 'Servicios', testId: 'nav-services' },
  { path: '/admin/pricing', icon: DollarSign, label: 'Tarifas', testId: 'nav-pricing' },
  { path: '/admin/monitoring', icon: Map, label: 'Monitoreo', testId: 'nav-monitoring' },
  { path: '/admin/verifications', icon: ShieldCheck, label: 'Verificaciones', testId: 'nav-verifications' },
  { path: '/admin/documents', icon: FolderOpen, label: 'Documentos', testId: 'nav-documents' },
  { path: '/admin/insurance', icon: Shield, label: 'Aseguradoras', testId: 'nav-insurance' },
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
              Grúa RD Admin
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
            <p className="text-sm font-medium">{user?.nombre} {user?.apellido}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
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

export function AdminLayout({ children }: AdminLayoutProps) {
  const style = {
    '--sidebar-width': '16rem',
    '--sidebar-width-icon': '3rem',
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b border-border">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <h1 className="text-xl font-semibold">Panel Administrativo</h1>
            <div className="w-10" />
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
