import { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Phone, Star, LogOut, Pencil, Camera, Loader2, IdCard, CheckCircle2, AlertCircle, Truck, Lock } from 'lucide-react';
import { useLocation } from 'wouter';
import { queryClient, getApiUrl } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import ClientInsuranceManager from '@/components/ClientInsuranceManager';
import ClientPaymentMethods from '@/components/ClientPaymentMethods';
import { EditProfileModal } from '@/components/EditProfileModal';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { CedulaScanner } from '@/components/CedulaScanner';
import { ThemeSettingsCard } from '@/components/ThemeToggle';
import { PrivacySection } from '@/components/PrivacySection';
import { CancellationHistory } from '@/components/cancellation/CancellationHistory';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ClientProfile() {
  const { user, logout, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [cedulaDialogOpen, setCedulaDialogOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { data: linkedAccounts } = useQuery<{ hasClienteAccount: boolean; hasConductorAccount: boolean }>({
    queryKey: ['/api/auth/linked-accounts'],
    enabled: !!user,
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(getApiUrl('/api/users/profile-photo'), {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al subir la foto');
      }

      return response.json();
    },
    onSuccess: async () => {
      await refreshUser();
      toast({
        title: 'Foto actualizada',
        description: 'Tu foto de perfil ha sido actualizada',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al subir foto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Formato inválido',
          description: 'Solo se permiten imágenes (JPG, PNG)',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Archivo muy grande',
          description: 'El tamaño máximo es 5MB',
          variant: 'destructive',
        });
        return;
      }

      uploadPhotoMutation.mutate(file);
    }
  };

  const handleCedulaScanComplete = async (result: { success: boolean; cedula?: string; verified: boolean }) => {
    if (result.success) {
      await refreshUser();
      setCedulaDialogOpen(false);
      
      if (result.verified) {
        toast({
          title: 'Cédula verificada',
          description: 'Tu identidad ha sido verificada exitosamente',
        });
      } else {
        toast({
          title: 'Cédula escaneada',
          description: 'La cédula fue registrada. La verificación puede tardar unos minutos.',
        });
      }
    }
  };


  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  const isCedulaVerified = user.cedulaVerificada;

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gradient-to-b from-primary/5 to-background px-4 pt-6 pb-6 flex-shrink-0">
        <div className="flex justify-end mb-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setEditModalOpen(true)}
            data-testid="button-edit-profile"
          >
            <Pencil className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </div>
        {user.bloqueadoHasta && new Date(user.bloqueadoHasta) > new Date() && (
          <Alert className="mb-4 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950" data-testid="alert-user-blocked">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-700 dark:text-red-200">
              Tu cuenta está bloqueada hasta {new Date(user.bloqueadoHasta).toLocaleString()} por cancelaciones previas. No puedes solicitar nuevos servicios durante este período.
            </AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
              {user.fotoUrl ? (
                <AvatarImage src={user.fotoUrl} alt="Foto de perfil" />
              ) : null}
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground font-semibold">
                {user.nombre[0]}{user.apellido[0]}
              </AvatarFallback>
            </Avatar>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute bottom-0 right-0 rounded-full shadow-md h-8 w-8"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadPhotoMutation.isPending}
              data-testid="button-change-photo"
            >
              {uploadPhotoMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </Button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              onChange={handlePhotoSelect}
              className="hidden"
              data-testid="input-profile-photo"
            />
          </div>
          <h2 className="text-xl font-bold mt-4" data-testid="text-username">
            {user.nombre} {user.apellido}
          </h2>
          {user.calificacionPromedio && (
            <div className="flex items-center gap-1.5 mt-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                {parseFloat(user.calificacionPromedio as string).toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 pb-8 space-y-4">
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Información Personal
            </h3>
          </div>
          <div className="divide-y divide-border">
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Mail className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Correo electrónico</p>
                <p className="font-medium truncate" data-testid="text-email">{user.email}</p>
              </div>
            </div>

            {user.phone && (
              <div className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <p className="font-medium" data-testid="text-phone">{user.phone}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Tipo de cuenta</p>
                <p className="font-medium capitalize">{user.userType === 'cliente' ? 'Cliente' : user.userType}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Verificación de Identidad
            </h3>
            {isCedulaVerified ? (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Verificada
              </Badge>
            ) : (
              <Badge variant="secondary">
                Pendiente
              </Badge>
            )}
          </div>
          <div className="p-4">
            {isCedulaVerified ? (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <IdCard className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Cédula</p>
                  <p className="font-medium" data-testid="text-cedula">
                    {user.cedula || 'Verificada'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Verifica tu cédula para poder agregar métodos de pago y disfrutar de una experiencia completa.
                  </AlertDescription>
                </Alert>
                
                <Dialog open={cedulaDialogOpen} onOpenChange={setCedulaDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" data-testid="button-verify-cedula">
                      <IdCard className="w-4 h-4 mr-2" />
                      Verificar Cédula
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Verificar Cédula</DialogTitle>
                      <DialogDescription>
                        Escanea tu cédula de identidad para verificar tu identidad
                      </DialogDescription>
                    </DialogHeader>
                    <CedulaScanner
                      title=""
                      description=""
                      required={false}
                      showSkip={false}
                      onScanComplete={handleCedulaScanComplete}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </Card>

        <ClientPaymentMethods />

        <div className="space-y-4">
          <ClientInsuranceManager />
        </div>

        <ThemeSettingsCard />

        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Seguridad
            </h3>
          </div>
          <div className="p-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setChangePasswordOpen(true)}
              data-testid="button-change-password"
            >
              <Lock className="w-4 h-4 mr-2" />
              Cambiar Contraseña
            </Button>
          </div>
        </Card>

        <PrivacySection userType="cliente" />

        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Historial de Cancelaciones
            </h3>
          </div>
          <div className="p-4">
            <CancellationHistory userId={user.id} userType="cliente" />
          </div>
        </Card>

        {!linkedAccounts?.hasConductorAccount && (
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10" data-testid="card-become-driver">
            <div className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold mb-1">¿También quieres ser conductor?</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Crea una cuenta de conductor adicional y comienza a ganar dinero con tu vehículo. Podrás alternar entre ambas cuentas.
                  </p>
                  <Button 
                    onClick={() => setLocation('/onboarding?tipo=conductor')}
                    className="w-full"
                    data-testid="button-become-driver"
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    Crear cuenta de Conductor
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

          <Button
            variant="outline"
            className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </ScrollArea>

      <EditProfileModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        isDriver={false}
        currentPhotoUrl={user.fotoUrl}
      />

      <ChangePasswordModal
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
    </div>
  );
}
