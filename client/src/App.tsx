import { Switch, Route, Redirect } from 'wouter';
import { lazy, Suspense, useEffect } from 'react';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/lib/auth';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { EmpresaLayout } from '@/components/layout/EmpresaLayout';
import { InstallPWA, UpdateAvailable, OfflineIndicator } from '@/components/InstallPWA';
import { ThemeProvider } from '@/components/ThemeToggle';
import { initializePreloading, preloadDriverModules } from '@/lib/preload';
import { ServiceRequestProvider } from '@/lib/serviceRequestContext';

initializePreloading();

const Login = lazy(() => import('@/pages/auth/login'));
const OnboardingWizard = lazy(() => import('@/pages/auth/onboarding-wizard'));
const VerifyOTP = lazy(() => import('@/pages/auth/verify-otp'));
const ForgotPassword = lazy(() => import('@/pages/auth/forgot-password'));
const VerifyPending = lazy(() => import('@/pages/auth/verify-pending'));

const ClientHome = lazy(() => import('@/pages/client/home'));
const ClientTracking = lazy(() => import('@/pages/client/tracking'));
const ClientHistory = lazy(() => import('@/pages/client/history'));
const ClientProfile = lazy(() => import('@/pages/client/profile'));

const DriverDashboard = lazy(() => import('@/pages/driver/dashboard'));
const DriverHistory = lazy(() => import('@/pages/driver/history'));
const DriverProfile = lazy(() => import('@/pages/driver/profile'));
const DriverDocumentRenewal = lazy(() => import('@/pages/driver/document-renewal'));
const ExtractionEvaluation = lazy(() => import('@/pages/driver/extraction-evaluation'));

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
const AdminAseguradoras = lazy(() => import('@/pages/admin/aseguradoras'));
const AdminTickets = lazy(() => import('@/pages/admin/tickets'));
const AdminSocios = lazy(() => import('@/pages/admin/socios'));
const AdminEmpresas = lazy(() => import('@/pages/admin/empresas'));
const AdminWallets = lazy(() => import('@/pages/admin/wallets'));
const AdminPaymentFees = lazy(() => import('@/pages/admin/payment-fees'));
const AdminAdministradores = lazy(() => import('@/pages/admin/administradores'));

const SocioDashboard = lazy(() => import('@/pages/socio/dashboard'));

const EmpresaDashboard = lazy(() => import('@/pages/empresa/dashboard'));
const EmpresaSolicitudes = lazy(() => import('@/pages/empresa/solicitudes'));
const EmpresaHistorial = lazy(() => import('@/pages/empresa/historial'));
const EmpresaProyectos = lazy(() => import('@/pages/empresa/proyectos'));
const EmpresaContratos = lazy(() => import('@/pages/empresa/contratos'));
const EmpresaEmpleados = lazy(() => import('@/pages/empresa/empleados'));
const EmpresaConductores = lazy(() => import('@/pages/empresa/conductores'));
const EmpresaFacturacion = lazy(() => import('@/pages/empresa/facturacion'));
const EmpresaPerfil = lazy(() => import('@/pages/empresa/perfil'));

const SupportPage = lazy(() => import('@/pages/support'));

const AseguradoraDashboard = lazy(() => import('@/pages/aseguradora/AseguradoraDashboard'));
const AseguradoraPendientes = lazy(() => import('@/pages/aseguradora/AseguradoraPendientes'));
const AseguradoraAprobados = lazy(() => import('@/pages/aseguradora/AseguradoraAprobados'));
const AseguradoraServicios = lazy(() => import('@/pages/aseguradora/AseguradoraServicios'));
const AseguradoraFacturacion = lazy(() => import('@/pages/aseguradora/AseguradoraFacturacion'));
const AseguradoraReportes = lazy(() => import('@/pages/aseguradora/AseguradoraReportes'));
const AseguradoraPerfil = lazy(() => import('@/pages/aseguradora/AseguradoraPerfil'));

const NotFound = lazy(() => import('@/pages/not-found'));
const PrivacyPolicy = lazy(() => import('@/pages/privacy-policy'));

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
  allowedTypes,
  allowPendingVerification = false
}: { 
  children: React.ReactNode; 
  allowedTypes?: string[];
  allowPendingVerification?: boolean;
}) {
  const { user, isLoading, pendingVerificationUser } = useAuth();

  useEffect(() => {
    if (user?.userType === 'conductor') {
      preloadDriverModules();
    }
  }, [user?.userType]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Check for authenticated user or pending verification user
  const currentUser = user || pendingVerificationUser;
  
  if (!currentUser) {
    return <Redirect to="/login" />;
  }

  // Enforce role-based access first (even for pending verification routes)
  if (allowedTypes && !allowedTypes.includes(currentUser.userType)) {
    return <Redirect to="/login" />;
  }

  // If allowPendingVerification is true, skip verification checks
  // This allows access to verification-related pages during the verification flow
  if (allowPendingVerification) {
    return <>{children}</>;
  }

  // For conductors, check if verification is complete using authoritative server data
  if (currentUser.userType === 'conductor') {
    // Either telefonoVerificado OR emailVerificado counts as contact verified
    const contactoVerificado = currentUser.telefonoVerificado || (currentUser as any).emailVerificado;
    // Conductors also need photo verification
    const fotoVerificada = (currentUser as any).fotoVerificada;
    // Additional driver verification checks from conductor data
    const licenciaVerificada = (currentUser as any).conductor?.licenciaVerificada;
    const categoriasConfiguradas = (currentUser as any).conductor?.categoriasConfiguradas;
    const vehiculosRegistrados = (currentUser as any).conductor?.vehiculosRegistrados;
    // Driver needs ALL 6 verification steps completed
    const needsVerification = !currentUser.cedulaVerificada || !contactoVerificado || !fotoVerificada || 
      !licenciaVerificada || !categoriasConfiguradas || !vehiculosRegistrados;
    if (needsVerification) {
      return <Redirect to="/verify-pending" />;
    }
  }

  // For clients, check basic verification
  if (currentUser.userType === 'cliente') {
    const emailVerificado = (currentUser as any).emailVerificado;
    const needsVerification = !currentUser.cedulaVerificada || !emailVerificado;
    if (needsVerification) {
      return <Redirect to="/verify-pending" />;
    }
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
        <Route path="/verify-pending">
          <ProtectedRoute allowPendingVerification={true}>
            <VerifyPending />
          </ProtectedRoute>
        </Route>
        <Route path="/privacy-policy" component={PrivacyPolicy} />
      
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
            <SupportPage />
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
      <Route path="/driver/extraction-evaluation/:id">
        <ProtectedRoute allowedTypes={['conductor']}>
          <ExtractionEvaluation />
        </ProtectedRoute>
      </Route>
      <Route path="/driver/renovar-documentos">
        <ProtectedRoute allowedTypes={['conductor']}>
          <MobileLayout userType="conductor">
            <DriverDocumentRenewal />
          </MobileLayout>
        </ProtectedRoute>
      </Route>
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
      <Route path="/driver/support">
        <ProtectedRoute allowedTypes={['conductor']}>
          <MobileLayout userType="conductor">
            <SupportPage />
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
      <Route path="/admin/aseguradoras">
        <ProtectedRoute allowedTypes={['admin']}>
          <AdminLayout>
            <AdminAseguradoras />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/tickets">
        <ProtectedRoute allowedTypes={['admin']}>
          <AdminLayout>
            <AdminTickets />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/socios">
        <ProtectedRoute allowedTypes={['admin']}>
          <AdminLayout>
            <AdminSocios />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/empresas">
        <ProtectedRoute allowedTypes={['admin']}>
          <AdminLayout>
            <AdminEmpresas />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/wallets">
        <ProtectedRoute allowedTypes={['admin']}>
          <AdminLayout>
            <AdminWallets />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/payment-fees">
        <ProtectedRoute allowedTypes={['admin']}>
          <AdminLayout>
            <AdminPaymentFees />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/administradores">
        <ProtectedRoute allowedTypes={['admin']}>
          <AdminLayout>
            <AdminAdministradores />
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

      {/* Socio/Partner Routes */}
      <Route path="/socio">
        <ProtectedRoute allowedTypes={['socio']}>
          <MobileLayout userType="socio">
            <SocioDashboard />
          </MobileLayout>
        </ProtectedRoute>
      </Route>

      {/* Empresa Routes */}
      <Route path="/empresa/solicitudes">
        <ProtectedRoute allowedTypes={['empresa']}>
          <EmpresaLayout>
            <EmpresaSolicitudes />
          </EmpresaLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/empresa/historial">
        <ProtectedRoute allowedTypes={['empresa']}>
          <EmpresaLayout>
            <EmpresaHistorial />
          </EmpresaLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/empresa/proyectos">
        <ProtectedRoute allowedTypes={['empresa']}>
          <EmpresaLayout>
            <EmpresaProyectos />
          </EmpresaLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/empresa/contratos">
        <ProtectedRoute allowedTypes={['empresa']}>
          <EmpresaLayout>
            <EmpresaContratos />
          </EmpresaLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/empresa/empleados">
        <ProtectedRoute allowedTypes={['empresa']}>
          <EmpresaLayout>
            <EmpresaEmpleados />
          </EmpresaLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/empresa/conductores">
        <ProtectedRoute allowedTypes={['empresa']}>
          <EmpresaLayout>
            <EmpresaConductores />
          </EmpresaLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/empresa/facturacion">
        <ProtectedRoute allowedTypes={['empresa']}>
          <EmpresaLayout>
            <EmpresaFacturacion />
          </EmpresaLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/empresa/perfil">
        <ProtectedRoute allowedTypes={['empresa']}>
          <EmpresaLayout>
            <EmpresaPerfil />
          </EmpresaLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/empresa">
        <ProtectedRoute allowedTypes={['empresa']}>
          <EmpresaLayout>
            <EmpresaDashboard />
          </EmpresaLayout>
        </ProtectedRoute>
      </Route>

      {/* Aseguradora Routes */}
      <Route path="/aseguradora/pendientes">
        <ProtectedRoute allowedTypes={['aseguradora']}>
          <AseguradoraPendientes />
        </ProtectedRoute>
      </Route>
      <Route path="/aseguradora/aprobados">
        <ProtectedRoute allowedTypes={['aseguradora']}>
          <AseguradoraAprobados />
        </ProtectedRoute>
      </Route>
      <Route path="/aseguradora/servicios">
        <ProtectedRoute allowedTypes={['aseguradora']}>
          <AseguradoraServicios />
        </ProtectedRoute>
      </Route>
      <Route path="/aseguradora/facturacion">
        <ProtectedRoute allowedTypes={['aseguradora']}>
          <AseguradoraFacturacion />
        </ProtectedRoute>
      </Route>
      <Route path="/aseguradora/reportes">
        <ProtectedRoute allowedTypes={['aseguradora']}>
          <AseguradoraReportes />
        </ProtectedRoute>
      </Route>
      <Route path="/aseguradora/perfil">
        <ProtectedRoute allowedTypes={['aseguradora']}>
          <AseguradoraPerfil />
        </ProtectedRoute>
      </Route>
      <Route path="/aseguradora">
        <ProtectedRoute allowedTypes={['aseguradora']}>
          <AseguradoraDashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/">
        {user ? (
          user.userType === 'admin' ? (
            <Redirect to="/admin" />
          ) : user.userType === 'conductor' ? (
            <Redirect to="/driver" />
          ) : user.userType === 'aseguradora' ? (
            <Redirect to="/aseguradora" />
          ) : user.userType === 'socio' ? (
            <Redirect to="/socio" />
          ) : user.userType === 'empresa' ? (
            <Redirect to="/empresa" />
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
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ServiceRequestProvider>
            <TooltipProvider>
              <OfflineIndicator />
              <Toaster />
              <Router />
              <InstallPWA />
              <UpdateAvailable />
            </TooltipProvider>
          </ServiceRequestProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
