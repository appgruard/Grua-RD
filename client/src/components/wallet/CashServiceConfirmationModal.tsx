import { useQuery } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Ban, Clock, CreditCard } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface WalletData {
  id: string;
  conductorId: string;
  balance: string;
  totalDebt: string;
  cashServicesBlocked: boolean;
  pendingDebts: PendingDebt[];
}

interface PendingDebt {
  id: string;
  servicioId: string | null;
  originalAmount: string;
  remainingAmount: string;
  dueDate: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  daysRemaining: number;
}

const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(num);
};

interface CashServiceConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onPayDebt: () => void;
  isLoading?: boolean;
  serviceAmount?: number;
}

export function CashServiceConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  onPayDebt,
  isLoading = false,
  serviceAmount = 0,
}: CashServiceConfirmationModalProps) {
  const { data: wallet, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ['/api/wallet'],
    enabled: open,
  });

  if (!open) {
    return null;
  }

  if (walletLoading || !wallet) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent data-testid="modal-cash-loading">
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Verificando estado de billetera...</p>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  const totalDebt = parseFloat(wallet.totalDebt);
  const hasOverdue = wallet.pendingDebts.some(d => d.status === 'overdue' || d.daysRemaining < 0);
  const hasNearDue = wallet.pendingDebts.some(d => d.daysRemaining >= 0 && d.daysRemaining <= 3);
  const commission = serviceAmount * 0.20;
  const newTotalDebt = totalDebt + commission;

  const nearestDue = wallet.pendingDebts
    .filter(d => d.status !== 'paid' && d.daysRemaining >= 0)
    .sort((a, b) => a.daysRemaining - b.daysRemaining)[0];

  if (wallet.cashServicesBlocked) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent data-testid="modal-cash-blocked">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              Servicios en efectivo bloqueados
            </AlertDialogTitle>
            <AlertDialogDescription>
              No puedes aceptar servicios en efectivo porque tienes deuda vencida.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Alert variant="destructive" className="my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Deuda pendiente: <span className="font-bold">{formatCurrency(totalDebt)}</span>
            </AlertDescription>
          </Alert>

          <p className="text-sm text-muted-foreground">
            Para desbloquear los servicios en efectivo, debes saldar tu deuda pendiente.
          </p>

          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel data-testid="button-cancel-blocked">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={onPayDebt} data-testid="button-pay-debt-blocked">
              <CreditCard className="w-4 h-4 mr-2" />
              Pagar Deuda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="modal-cash-confirmation">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {hasOverdue ? (
              <>
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="text-destructive">Atención: Deuda vencida</span>
              </>
            ) : hasNearDue ? (
              <>
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="text-amber-600">Deuda próxima a vencer</span>
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                Confirmar servicio en efectivo
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {hasOverdue 
              ? 'Tienes deuda vencida. Si continúas acumulando deuda, tus servicios en efectivo serán bloqueados.'
              : hasNearDue
                ? `Tienes deuda que vence ${nearestDue?.daysRemaining === 0 ? 'hoy' : nearestDue?.daysRemaining === 1 ? 'mañana' : `en ${nearestDue?.daysRemaining} días`}.`
                : 'Al aceptar este servicio en efectivo se generará una comisión que se agregará a tu deuda.'
            }
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 my-4">
          {totalDebt > 0 && (
            <Alert className={hasOverdue ? 'border-destructive/50 bg-destructive/10' : hasNearDue ? 'border-amber-500/50 bg-amber-500/10' : ''}>
              <AlertTriangle className={`h-4 w-4 ${hasOverdue ? 'text-destructive' : hasNearDue ? 'text-amber-600' : ''}`} />
              <AlertDescription className={hasOverdue ? 'text-destructive' : hasNearDue ? 'text-amber-700 dark:text-amber-400' : ''}>
                Deuda actual: <span className="font-bold">{formatCurrency(totalDebt)}</span>
              </AlertDescription>
            </Alert>
          )}

          {serviceAmount > 0 && (
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Comisión del servicio (20%):</span>
                <span className="font-medium">+{formatCurrency(commission)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">Nueva deuda total:</span>
                <span className="font-bold text-primary">{formatCurrency(newTotalDebt)}</span>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Tienes 15 días para pagar la comisión. Si no pagas a tiempo, tus servicios en efectivo serán bloqueados.
          </p>
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isLoading} data-testid="button-cancel-confirmation">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            disabled={isLoading}
            data-testid="button-confirm-accept"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Aceptando...
              </>
            ) : (
              'Aceptar Servicio'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function useWalletStatus() {
  const { data: wallet, isLoading, isFetched } = useQuery<WalletData>({
    queryKey: ['/api/wallet'],
    staleTime: 30000,
  });

  const totalDebt = wallet ? parseFloat(wallet.totalDebt) : 0;
  const hasDebt = isFetched && totalDebt > 0;
  const isBlocked = isFetched && (wallet?.cashServicesBlocked ?? false);
  const hasOverdue = isFetched && (wallet?.pendingDebts.some(d => d.status === 'overdue' || d.daysRemaining < 0) ?? false);
  const hasNearDue = isFetched && (wallet?.pendingDebts.some(d => d.daysRemaining >= 0 && d.daysRemaining <= 3) ?? false);

  return {
    wallet,
    isLoading,
    isFetched,
    totalDebt,
    hasDebt,
    isBlocked,
    hasOverdue,
    hasNearDue,
    needsConfirmation: hasDebt || isBlocked,
    hasAlert: isBlocked || hasOverdue || hasNearDue,
  };
}
