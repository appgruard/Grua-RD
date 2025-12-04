import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Ban, 
  Clock, 
  CreditCard,
  X
} from 'lucide-react';
import { useState } from 'react';

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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

interface WalletAlertBannerProps {
  className?: string;
}

export function WalletAlertBanner({ className }: WalletAlertBannerProps) {
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  const { data: wallet, isLoading } = useQuery<WalletData>({
    queryKey: ['/api/wallet'],
    refetchInterval: 60000,
    staleTime: 30000,
  });

  if (isLoading || !wallet || dismissed) {
    return null;
  }

  const totalDebt = parseFloat(wallet.totalDebt);
  const hasOverdue = wallet.pendingDebts.some(d => d.status === 'overdue' || d.daysRemaining < 0);
  const hasNearDue = wallet.pendingDebts.some(d => d.daysRemaining >= 0 && d.daysRemaining <= 3);
  const nearestDue = wallet.pendingDebts
    .filter(d => d.status !== 'paid' && d.daysRemaining >= 0)
    .sort((a, b) => a.daysRemaining - b.daysRemaining)[0];

  if (wallet.cashServicesBlocked) {
    return (
      <div className={className} data-testid="wallet-alert-banner-blocked">
        <Alert className="border-destructive/50 bg-destructive/10 rounded-none sm:rounded-lg mx-0 sm:mx-3 mt-0 sm:mt-3">
          <div className="flex items-start gap-3">
            <Ban className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <AlertDescription className="text-destructive">
                <span className="font-semibold">Servicios en efectivo bloqueados.</span>{' '}
                Tienes {formatCurrency(totalDebt)} en deuda vencida.
              </AlertDescription>
            </div>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => setLocation('/driver/profile')}
              className="flex-shrink-0"
              data-testid="button-pay-now-blocked"
            >
              <CreditCard className="w-4 h-4 mr-1" />
              Pagar
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (hasOverdue) {
    return (
      <div className={className} data-testid="wallet-alert-banner-overdue">
        <Alert className="border-destructive/50 bg-destructive/10 rounded-none sm:rounded-lg mx-0 sm:mx-3 mt-0 sm:mt-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <AlertDescription className="text-destructive">
                <span className="font-semibold">Deuda vencida.</span>{' '}
                Paga {formatCurrency(totalDebt)} para evitar el bloqueo de servicios.
              </AlertDescription>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => setLocation('/driver/profile')}
                data-testid="button-pay-now-overdue"
              >
                Pagar
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setDismissed(true)}
                data-testid="button-dismiss-overdue"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  if (hasNearDue && nearestDue) {
    const daysText = nearestDue.daysRemaining === 0 
      ? 'vence hoy' 
      : nearestDue.daysRemaining === 1 
        ? 'vence mañana'
        : `vence en ${nearestDue.daysRemaining} días`;

    return (
      <div className={className} data-testid="wallet-alert-banner-near-due">
        <Alert className="border-amber-500/50 bg-amber-500/10 rounded-none sm:rounded-lg mx-0 sm:mx-3 mt-0 sm:mt-3">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                <span className="font-semibold">Deuda próxima a vencer.</span>{' '}
                {formatCurrency(nearestDue.remainingAmount)} {daysText}.
              </AlertDescription>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button 
                size="sm"
                onClick={() => setLocation('/driver/profile')}
                data-testid="button-pay-now-near-due"
              >
                Pagar
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setDismissed(true)}
                data-testid="button-dismiss-near-due"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  return null;
}
