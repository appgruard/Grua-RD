import { Switch, Route, Redirect } from 'wouter';
import { lazy, Suspense } from 'react';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/lib/auth';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';

const Login = lazy(() => import('@/pages/auth/login'));
const OnboardingWizard = lazy(() => import('@/pages/auth/onboarding-wizard'));
const VerifyOTP = lazy(() => import('@/pages/auth/verify-otp'));
const ForgotPassword = lazy(() => import('@/pages/auth/forgot-password'));

const ClientHome = lazy(() => import('@/pages/client/home'));
const ClientTracking = lazy(() => import('@/pages/client/tracking'));
const ClientHistory = lazy(() => import('@/pages/client/history'));
const ClientProfile = lazy(() => import('@/pages/client/profile'));

const DriverDashboard = lazy(() => import('@/pages/driver/dashboard'));
const DriverHistory = lazy(() => import('@/pages/driver/history'));
const DriverProfile = lazy(() => import('@/pages/driver/profile'));

const AdminDashboard = lazy(() => import('@/pages/admin/dashboard'));
const AdminAnalytics = lazy(() => import('@/pages/admin/analytics'));
const AdminUsers = lazy(() => import('@/pages/admin/users'));
const AdminDrivers = lazy(() => import('@/pages/admin/drivers'));
const AdminServices = lazy(() => import('@/pages/admin/services'));
const AdminPricing = lazy(() => import('@/pages/admin/pricing'));
const AdminMonitoring = lazy(() => import('@/pages/admin/monitoring'));
const AdminVerifications = lazy(() => import('@/pages/admin/verifications'));
const AdminDocuments = lazy(() => import('@/pages/admin/documents'));
const AdminInsurance = lazy(() => import('@/pages/admin/insurance'));

const NotFound = lazy(() => import('@/pages/not-found'));

function LoadingFallback() {
  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    </div>
  );
}

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
    <Suspense fallback={<LoadingFallback />}>
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
      <Route path="/admin/verifications">
        <ProtectedRoute allowedTypes={['admin']}>
          <AdminLayout>
            <AdminVerifications />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/documents">
        <ProtectedRoute allowedTypes={['admin']}>
          <AdminLayout>
            <AdminDocuments />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/insurance">
        <ProtectedRoute allowedTypes={['admin']}>
          <AdminLayout>
            <AdminInsurance />
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
    </Suspense>
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
