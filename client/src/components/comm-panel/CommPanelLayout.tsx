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
  SidebarFooter
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

export function CommPanelLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useCommPanelAuth();
  const [location] = useLocation();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background">
        <Sidebar>
          <SidebarHeader className="p-4 border-b">
            <div className="flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">Panel de Comunicaciones</span>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.path || 
                  (item.path !== '/admin/communications' && location.startsWith(item.path));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link href={item.path} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t">
            <div className="flex flex-col gap-2">
              <div className="text-sm text-muted-foreground truncate">
                {user?.email}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={logout}
                className="w-full justify-start gap-2"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center gap-4 p-4 border-b bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <h1 className="text-lg font-medium">Grúa RD - Comunicaciones</h1>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
