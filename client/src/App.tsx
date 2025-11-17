import { Switch, Route, Redirect } from 'wouter';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/lib/auth';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';

import Login from '@/pages/auth/login';
import Register from '@/pages/auth/register';

import ClientHome from '@/pages/client/home';
import ClientTracking from '@/pages/client/tracking';
import ClientHistory from '@/pages/client/history';
import ClientProfile from '@/pages/client/profile';

import DriverDashboard from '@/pages/driver/dashboard';
import DriverHistory from '@/pages/driver/history';
import DriverProfile from '@/pages/driver/profile';

import AdminDashboard from '@/pages/admin/dashboard';
import AdminUsers from '@/pages/admin/users';
import AdminDrivers from '@/pages/admin/drivers';
import AdminServices from '@/pages/admin/services';
import AdminPricing from '@/pages/admin/pricing';
import AdminMonitoring from '@/pages/admin/monitoring';

import NotFound from '@/pages/not-found';

function ProtectedRoute({ 
  children, 
  allowedTypes 
}: { 
  children: React.ReactNode; 
  allowedTypes: string[];
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (!allowedTypes.includes(user.userType)) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function ClientRoutes() {
  return (
    <ProtectedRoute allowedTypes={['cliente']}>
      <MobileLayout userType="cliente">
        <Switch>
          <Route path="/client" component={ClientHome} />
          <Route path="/client/tracking/:id" component={ClientTracking} />
          <Route path="/client/history" component={ClientHistory} />
          <Route path="/client/profile" component={ClientProfile} />
          <Route path="/client/support">
            <div className="p-4">
              <h1 className="text-2xl font-bold mb-4">Soporte</h1>
              <p className="text-muted-foreground">
                Para asistencia, contacta al +1 (809) 555-0100
              </p>
            </div>
          </Route>
        </Switch>
      </MobileLayout>
    </ProtectedRoute>
  );
}

function DriverRoutes() {
  return (
    <ProtectedRoute allowedTypes={['conductor']}>
      <MobileLayout userType="conductor">
        <Switch>
          <Route path="/driver" component={DriverDashboard} />
          <Route path="/driver/history" component={DriverHistory} />
          <Route path="/driver/profile" component={DriverProfile} />
        </Switch>
      </MobileLayout>
    </ProtectedRoute>
  );
}

function AdminRoutes() {
  return (
    <ProtectedRoute allowedTypes={['admin']}>
      <AdminLayout>
        <Switch>
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/admin/drivers" component={AdminDrivers} />
          <Route path="/admin/services" component={AdminServices} />
          <Route path="/admin/pricing" component={AdminPricing} />
          <Route path="/admin/monitoring" component={AdminMonitoring} />
        </Switch>
      </AdminLayout>
    </ProtectedRoute>
  );
}

function Router() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      <Route path="/client/:rest*">
        <ClientRoutes />
      </Route>
      
      <Route path="/driver/:rest*">
        <DriverRoutes />
      </Route>
      
      <Route path="/admin/:rest*">
        <AdminRoutes />
      </Route>

      <Route path="/">
        {user ? (
          user.userType === 'admin' ? (
            <Redirect to="/admin" />
          ) : user.userType === 'conductor' ? (
            <Redirect to="/driver" />
          ) : (
            <Redirect to="/client" />
          )
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
