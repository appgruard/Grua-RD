import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { getApiUrl } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Shield, Trash2, Database, Eye, Lock, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';

interface PrivacySectionProps {
  userType: 'cliente' | 'conductor';
}

export function PrivacySection({ userType }: PrivacySectionProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { logout } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(getApiUrl('/api/users/me'), {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al eliminar la cuenta');
      }

      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: 'Cuenta eliminada',
        description: 'Tu cuenta ha sido eliminada exitosamente',
      });
      await logout();
      setLocation('/login');
    },
    onError: (error: Error) => {
      // Map known error messages to user-friendly versions
      let userMessage = 'Ocurrió un problema al eliminar tu cuenta. Intenta nuevamente.';
      
      if (error.message.includes('servicios activos') || error.message.includes('servicios pendientes')) {
        userMessage = 'No puedes eliminar tu cuenta mientras tengas servicios en curso. Espera a que se completen.';
      } else if (error.message.includes('balance pendiente') || error.message.includes('balance disponible')) {
        userMessage = 'Tienes dinero en tu cuenta. Retira tu balance antes de eliminar tu cuenta.';
      } else if (error.message.includes('No autenticado')) {
        userMessage = 'Tu sesión ha expirado. Inicia sesión nuevamente.';
      }
      
      toast({
        title: 'No se pudo eliminar la cuenta',
        description: userMessage,
        variant: 'destructive',
      });
      setDeleteDialogOpen(false);
      setConfirmText('');
    },
  });

  const handleDeleteAccount = () => {
    if (confirmText.toLowerCase() !== 'eliminar') {
      toast({
        title: 'Confirmación requerida',
        description: 'Por favor escribe "ELIMINAR" para confirmar',
        variant: 'destructive',
      });
      return;
    }
    deleteAccountMutation.mutate();
  };

  const isOperator = userType === 'conductor';

  return (
    <Card className="overflow-hidden" data-testid="card-privacy">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Privacidad y Datos
          </h3>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="data-collected" className="border-b-0">
            <AccordionTrigger className="hover:no-underline py-3" data-testid="accordion-data-collected">
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Datos que recopilamos</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2 pl-7">
              <p>Recopilamos la siguiente información para brindarte nuestros servicios:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Nombre, apellido y foto de perfil</li>
                <li>Correo electrónico y número de teléfono</li>
                <li>Ubicación durante el uso de la aplicación</li>
                {isOperator ? (
                  <>
                    <li>Número de cédula y licencia de conducir</li>
                    <li>Información del vehículo (placa, marca, modelo)</li>
                    <li>Historial de servicios realizados</li>
                  </>
                ) : (
                  <>
                    <li>Número de cédula (opcional)</li>
                    <li>Historial de servicios solicitados</li>
                    <li>Métodos de pago guardados</li>
                  </>
                )}
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="data-usage" className="border-b-0">
            <AccordionTrigger className="hover:no-underline py-3" data-testid="accordion-data-usage">
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Cómo usamos tus datos</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2 pl-7">
              <p>Utilizamos tu información para:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Conectarte con {isOperator ? 'clientes que necesitan asistencia' : 'operadores de grúa disponibles'}</li>
                <li>Procesar pagos de forma segura</li>
                <li>Mejorar nuestros servicios y experiencia de usuario</li>
                <li>Enviarte notificaciones importantes sobre tus servicios</li>
                <li>Cumplir con requisitos legales y de seguridad</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="data-protection" className="border-b-0">
            <AccordionTrigger className="hover:no-underline py-3" data-testid="accordion-data-protection">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Protección de datos</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2 pl-7">
              <p>Protegemos tu información mediante:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Encriptación de datos en tránsito y en reposo</li>
                <li>Acceso restringido solo a personal autorizado</li>
                <li>Servidores seguros con certificación SSL</li>
                <li>Contraseñas almacenadas de forma segura (hash)</li>
                <li>Auditorías regulares de seguridad</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="data-rights" className="border-b-0">
            <AccordionTrigger className="hover:no-underline py-3" data-testid="accordion-data-rights">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Tus derechos</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2 pl-7">
              <p>Como usuario, tienes derecho a:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Acceder a tus datos personales</li>
                <li>Solicitar la corrección de datos incorrectos</li>
                <li>Eliminar tu cuenta y todos tus datos</li>
                <li>Exportar tus datos en formato legible</li>
                <li>Retirar tu consentimiento en cualquier momento</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="pt-4 border-t border-border">
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                data-testid="button-delete-account"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar mi cuenta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Eliminar cuenta permanentemente
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-4">
                    <p>
                      Esta acción es <strong>irreversible</strong>. Al eliminar tu cuenta:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Se eliminarán todos tus datos personales</li>
                      <li>Perderás acceso a tu historial de servicios</li>
                      {isOperator && <li>Se eliminarán tus documentos y vehículos registrados</li>}
                      <li>No podrás recuperar esta cuenta</li>
                    </ul>
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="confirm-delete" className="text-foreground">
                        Escribe <strong>ELIMINAR</strong> para confirmar:
                      </Label>
                      <Input
                        id="confirm-delete"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="ELIMINAR"
                        data-testid="input-confirm-delete"
                      />
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel 
                  onClick={() => setConfirmText('')}
                  data-testid="button-cancel-delete"
                >
                  Cancelar
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={confirmText.toLowerCase() !== 'eliminar' || deleteAccountMutation.isPending}
                  data-testid="button-confirm-delete"
                >
                  {deleteAccountMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    'Eliminar cuenta'
                  )}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Card>
  );
}
