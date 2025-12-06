import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
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
  Building2,
  MessageCircle,
  Handshake,
  Wallet,
  CreditCard,
  UserCog,
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
import { type AdminPermiso } from '@shared/schema';

interface AdminLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', testId: 'nav-dashboard', permiso: 'dashboard' as AdminPermiso },
  { path: '/admin/analytics', icon: BarChart3, label: 'Analytics', testId: 'nav-analytics', permiso: 'analytics' as AdminPermiso },
  { path: '/admin/users', icon: Users, label: 'Usuarios', testId: 'nav-users', permiso: 'usuarios' as AdminPermiso },
  { path: '/admin/drivers', icon: Truck, label: 'Conductores', testId: 'nav-drivers', permiso: 'operadores' as AdminPermiso },
  { path: '/admin/wallets', icon: Wallet, label: 'Billeteras', testId: 'nav-wallets', permiso: 'billeteras' as AdminPermiso },
  { path: '/admin/payment-fees', icon: CreditCard, label: 'Comisiones', testId: 'nav-payment-fees', permiso: 'comisiones_pago' as AdminPermiso },
  { path: '/admin/services', icon: FileText, label: 'Servicios', testId: 'nav-services', permiso: 'servicios' as AdminPermiso },
  { path: '/admin/pricing', icon: DollarSign, label: 'Tarifas', testId: 'nav-pricing', permiso: 'tarifas' as AdminPermiso },
  { path: '/admin/monitoring', icon: Map, label: 'Monitoreo', testId: 'nav-monitoring', permiso: 'monitoreo' as AdminPermiso },
  { path: '/admin/verifications', icon: ShieldCheck, label: 'Verificaciones', testId: 'nav-verifications', permiso: 'verificaciones' as AdminPermiso },
  { path: '/admin/aseguradoras', icon: Building2, label: 'Gestión Aseguradoras', testId: 'nav-aseguradoras', permiso: 'aseguradoras' as AdminPermiso },
  { path: '/admin/tickets', icon: MessageCircle, label: 'Tickets Soporte', testId: 'nav-tickets', permiso: 'tickets' as AdminPermiso },
  { path: '/admin/socios', icon: Handshake, label: 'Socios e Inversores', testId: 'nav-socios', permiso: 'socios' as AdminPermiso },
  { path: '/admin/administradores', icon: UserCog, label: 'Administradores', testId: 'nav-administradores', permiso: 'admin_usuarios' as AdminPermiso },
];

function AppSidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  const { data: permissionsData } = useQuery<{ permisos: AdminPermiso[] }>({
    queryKey: ['/api/admin/me/permissions'],
  });

  const adminPermisos = permissionsData?.permisos || [];
  const hasAllPermissions = adminPermisos.length === 0;

  const filteredMenuItems = hasAllPermissions 
    ? menuItems 
    : menuItems.filter(item => adminPermisos.includes(item.permiso));

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
              {filteredMenuItems.map((item) => {
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
          <header className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-40">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <h1 className="text-xl font-semibold">Panel Administrativo</h1>
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
