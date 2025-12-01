import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  CalendarPlus,
  FolderOpen,
  Users,
  FileText,
  Settings,
  LogOut,
  Truck,
  History,
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

interface EmpresaLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { path: '/empresa', icon: LayoutDashboard, label: 'Dashboard', testId: 'nav-empresa-dashboard' },
  { path: '/empresa/solicitudes', icon: CalendarPlus, label: 'Solicitar Servicio', testId: 'nav-empresa-solicitudes' },
  { path: '/empresa/historial', icon: History, label: 'Historial', testId: 'nav-empresa-historial' },
  { path: '/empresa/proyectos', icon: FolderOpen, label: 'Proyectos', testId: 'nav-empresa-proyectos' },
  { path: '/empresa/contratos', icon: FileText, label: 'Contratos', testId: 'nav-empresa-contratos' },
  { path: '/empresa/empleados', icon: Users, label: 'Empleados', testId: 'nav-empresa-empleados' },
  { path: '/empresa/conductores', icon: Truck, label: 'Conductores Asignados', testId: 'nav-empresa-conductores' },
  { path: '/empresa/facturacion', icon: FileText, label: 'Facturación', testId: 'nav-empresa-facturacion' },
  { path: '/empresa/perfil', icon: Settings, label: 'Perfil', testId: 'nav-empresa-perfil' },
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
              Portal Empresas
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
            data-testid="button-empresa-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export function EmpresaLayout({ children }: EmpresaLayoutProps) {
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
            <SidebarTrigger data-testid="button-empresa-sidebar-toggle" />
            <h1 className="text-xl font-semibold">Portal Empresarial</h1>
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
