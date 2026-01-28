import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useCommPanelAuth } from '@/contexts/CommPanelAuthContext';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
  useSidebar
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Mail, 
  FileText, 
  Bell, 
  Send,
  LogOut,
  Megaphone
} from 'lucide-react';

const menuItems = [
  { path: '/admin/communications', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/communications/composer', label: 'Enviar Email', icon: Send },
  { path: '/admin/communications/templates', label: 'Plantillas', icon: FileText },
  { path: '/admin/communications/announcements', label: 'Anuncios', icon: Megaphone },
  { path: '/admin/communications/push', label: 'Push Notifications', icon: Bell },
];

function SidebarNav() {
  const { user, logout } = useCommPanelAuth();
  const [location] = useLocation();
  const { setOpenMobile } = useSidebar();

  const handleNavClick = () => {
    // Close mobile sidebar on navigation
    setOpenMobile(false);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary flex-shrink-0" />
          <span className="font-semibold text-base lg:text-lg truncate">Panel Comunicaciones</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => {
            const isActive = location === item.path || 
              (item.path !== '/admin/communications' && location.startsWith(item.path));
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton 
                  asChild 
                  data-active={isActive}
                  className={isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}
                >
                  <Link 
                    href={item.path} 
                    className="flex items-center gap-3"
                    onClick={handleNavClick}
                    data-testid={`nav-${item.path.split('/').pop()}`}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-3 lg:p-4 border-t">
        <div className="flex flex-col gap-2">
          <div className="text-xs lg:text-sm text-muted-foreground truncate">
            {user?.email}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={logout}
            className="w-full justify-start gap-2"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Cerrar sesión</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function CommPanelLayout({ children }: { children: ReactNode }) {
  const style = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider 
      style={style as React.CSSProperties}
      defaultOpen={true}
    >
      <div className="flex h-screen w-full bg-background">
        <SidebarNav />
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <header className="flex items-center gap-2 sm:gap-4 p-2 sm:p-4 border-b bg-background sticky top-0 z-10">
            <SidebarTrigger data-testid="button-sidebar-toggle" className="flex-shrink-0" />
            <h1 className="text-sm sm:text-lg font-medium truncate">Grúa RD - Comunicaciones</h1>
          </header>
          <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
