import { Switch, Route, Redirect } from 'wouter';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/lib/auth';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';

import Login from '@/pages/auth/login';
import OnboardingWizard from '@/pages/auth/onboarding-wizard';
import VerifyOTP from '@/pages/auth/verify-otp';
import ForgotPassword from '@/pages/auth/forgot-password';

import ClientHome from '@/pages/client/home';
import ClientTracking from '@/pages/client/tracking';
import ClientHistory from '@/pages/client/history';
import ClientProfile from '@/pages/client/profile';

import DriverDashboard from '@/pages/driver/dashboard';
import DriverHistory from '@/pages/driver/history';
import DriverProfile from '@/pages/driver/profile';

import AdminDashboard from '@/pages/admin/dashboard';
import AdminAnalytics from '@/pages/admin/analytics';
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

function Router() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/onboarding" component={OnboardingWizard} />
      <Route path="/verify-otp" component={VerifyOTP} />
      <Route path="/forgot-password" component={ForgotPassword} />
      
      {/* Client Routes - Most specific first */}
      <Route path="/client/tracking/:id">
        <ProtectedRoute allowedTypes={['cliente']}>
          <MobileLayout userType="cliente">
            <ClientTracking />
          </MobileLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/client/history">
        <ProtectedRoute allowedTypes={['cliente']}>
          <MobileLayout userType="cliente">
            <ClientHistory />
          </MobileLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/client/profile">
        <ProtectedRoute allowedTypes={['cliente']}>
          <MobileLayout userType="cliente">
            <ClientProfile />
          </MobileLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/client/support">
        <ProtectedRoute allowedTypes={['cliente']}>
          <MobileLayout userType="cliente">
            <div className="p-4">
              <h1 className="text-2xl font-bold mb-4">Soporte</h1>
              <p className="text-muted-foreground">
                Para asistencia, contacta al +1 (809) 555-0100
              </p>
            </div>
          </MobileLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/client">
        <ProtectedRoute allowedTypes={['cliente']}>
          <MobileLayout userType="cliente">
            <ClientHome />
          </MobileLayout>
        </ProtectedRoute>
      </Route>

      {/* Driver Routes - Most specific first */}
      <Route path="/driver/history">
        <ProtectedRoute allowedTypes={['conductor']}>
          <MobileLayout userType="conductor">
            <DriverHistory />
          </MobileLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/driver/profile">
        <ProtectedRoute allowedTypes={['conductor']}>
          <MobileLayout userType="conductor">
            <DriverProfile />
          </MobileLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/driver">
        <ProtectedRoute allowedTypes={['conductor']}>
          <MobileLayout userType="conductor">
            <DriverDashboard />
          </MobileLayout>
        </ProtectedRoute>
      </Route>

      {/* Admin Routes - Most specific first */}
      <Route path="/admin/analytics">
        <ProtectedRoute allowedTypes={['admin']}>
          <AdminLayout>
            <AdminAnalytics />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute allowedTypes={['admin']}>
          <AdminLayout>
            <AdminUsers />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/drivers">
        <ProtectedRoute allowedTypes={['admin']}>
          <AdminLayout>
            <AdminDrivers />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/services">
        <ProtectedRoute allowedTypes={['admin']}>
          <AdminLayout>
            <AdminServices />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/pricing">
        <ProtectedRoute allowedTypes={['admin']}>
          <AdminLayout>
            <AdminPricing />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/monitoring">
        <ProtectedRoute allowedTypes={['admin']}>
          <AdminLayout>
            <AdminMonitoring />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute allowedTypes={['admin']}>
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        </ProtectedRoute>
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
