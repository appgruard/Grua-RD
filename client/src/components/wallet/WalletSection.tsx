import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Wallet, 
  CreditCard, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Ban,
  History
} from 'lucide-react';
import { WalletTransactionHistory } from './WalletTransactionHistory';
import { DebtDetailModal } from './DebtDetailModal';
import { PayDebtModal } from './PayDebtModal';

interface WalletData {
  id: string;
  conductorId: string;
  balance: string;
  totalDebt: string;
  cashServicesBlocked: boolean;
  pendingDebts: PendingDebt[];
  recentTransactions: WalletTransaction[];
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

interface WalletTransaction {
  id: string;
  type: 'cash_commission' | 'card_payment' | 'debt_payment' | 'direct_payment' | 'withdrawal' | 'adjustment';
  amount: string;
  commissionAmount: string | null;
  description: string | null;
  createdAt: string;
}

const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(num);
};

const getDebtStatusInfo = (wallet: WalletData) => {
  const totalDebt = parseFloat(wallet.totalDebt);
  const hasOverdue = wallet.pendingDebts.some(d => d.status === 'overdue' || d.daysRemaining < 0);
  const hasNearDue = wallet.pendingDebts.some(d => d.daysRemaining >= 0 && d.daysRemaining <= 3);
  
  if (wallet.cashServicesBlocked) {
    return {
      variant: 'destructive' as const,
      icon: Ban,
      title: 'Servicios en efectivo bloqueados',
      description: 'Tienes deudas vencidas. Paga tu deuda para desbloquear.',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/20',
    };
  }
  
  if (hasOverdue) {
    return {
      variant: 'destructive' as const,
      icon: AlertTriangle,
      title: 'Deuda vencida',
      description: 'Tienes deudas que han superado el plazo de 15 días.',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/20',
    };
  }
  
  if (hasNearDue) {
    return {
      variant: 'default' as const,
      icon: Clock,
      title: 'Deuda próxima a vencer',
      description: 'Tienes deudas que vencen en los próximos 3 días.',
      color: 'text-amber-600 dark:text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
    };
  }
  
  if (totalDebt > 0) {
    return {
      variant: 'default' as const,
      icon: CreditCard,
      title: 'Deuda pendiente',
      description: 'Tienes deudas activas dentro del plazo.',
      color: 'text-blue-600 dark:text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    };
  }
  
  return {
    variant: 'default' as const,
    icon: CheckCircle,
    title: 'Sin deudas',
    description: 'No tienes deudas pendientes.',
    color: 'text-green-600 dark:text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
  };
};

export function WalletSection() {
  const [showHistory, setShowHistory] = useState(false);
  const [showDebtDetail, setShowDebtDetail] = useState(false);
  const [showPayDebt, setShowPayDebt] = useState(false);

  const { data: wallet, isLoading, error, refetch } = useQuery<WalletData>({
    queryKey: ['/api/wallet'],
  });

  if (isLoading) {
    return (
      <Card className="p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
        <Skeleton className="h-12 w-full" />
      </Card>
    );
  }

  if (error || !wallet) {
    return (
      <Card className="p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Mi Billetera</h3>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No se pudo cargar la información de tu billetera.{' '}
            <Button 
              variant="ghost" 
              size="sm"
              className="h-auto p-1 underline"
              onClick={() => refetch()}
            >
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  const balance = parseFloat(wallet.balance);
  const totalDebt = parseFloat(wallet.totalDebt);
  const statusInfo = getDebtStatusInfo(wallet);
  const StatusIcon = statusInfo.icon;

  return (
    <>
      <Card className="p-6 mb-4" data-testid="wallet-section">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Mi Billetera</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(true)}
            data-testid="button-wallet-history"
          >
            <History className="w-4 h-4 mr-2" />
            Historial
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div 
            className="p-4 rounded-lg bg-green-500/10 border border-green-500/20"
            data-testid="wallet-balance-card"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-500" />
              <span className="text-sm text-muted-foreground">Balance</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-500" data-testid="text-wallet-balance">
              {formatCurrency(balance)}
            </p>
          </div>

          <button
            className={`p-4 rounded-lg ${statusInfo.bgColor} border ${statusInfo.borderColor} text-left hover-elevate cursor-pointer`}
            onClick={() => totalDebt > 0 && setShowDebtDetail(true)}
            disabled={totalDebt === 0}
            data-testid="wallet-debt-card"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className={`w-4 h-4 ${statusInfo.color}`} />
              <span className="text-sm text-muted-foreground">Deuda</span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <p className={`text-xl sm:text-2xl font-bold ${statusInfo.color}`} data-testid="text-wallet-debt">
                {formatCurrency(totalDebt)}
              </p>
              {totalDebt > 0 && (
                <ChevronRight className={`w-4 h-4 ${statusInfo.color}`} />
              )}
            </div>
          </button>
        </div>

        {totalDebt > 0 && (
          <Alert 
            variant={statusInfo.variant} 
            className={`mb-4 ${statusInfo.bgColor} border ${statusInfo.borderColor}`}
            data-testid="wallet-status-alert"
          >
            <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
            <AlertDescription className={statusInfo.color}>
              <span className="font-medium">{statusInfo.title}:</span> {statusInfo.description}
            </AlertDescription>
          </Alert>
        )}

        {wallet.pendingDebts.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-sm font-medium text-muted-foreground">Próximos vencimientos:</p>
            {wallet.pendingDebts.slice(0, 2).map((debt) => (
              <div 
                key={debt.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                data-testid={`debt-item-${debt.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {formatCurrency(debt.remainingAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {debt.daysRemaining < 0 
                      ? 'Vencida' 
                      : debt.daysRemaining === 0 
                        ? 'Vence hoy'
                        : `Vence en ${debt.daysRemaining} día${debt.daysRemaining !== 1 ? 's' : ''}`
                    }
                  </p>
                </div>
                <Badge 
                  variant={
                    debt.status === 'overdue' || debt.daysRemaining < 0
                      ? 'destructive'
                      : debt.daysRemaining <= 3
                        ? 'secondary'
                        : 'outline'
                  }
                  className="ml-2 shrink-0"
                >
                  {debt.status === 'partial' ? 'Parcial' : 
                   debt.status === 'overdue' || debt.daysRemaining < 0 ? 'Vencida' : 'Pendiente'}
                </Badge>
              </div>
            ))}
            {wallet.pendingDebts.length > 2 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full"
                onClick={() => setShowDebtDetail(true)}
                data-testid="button-show-all-debts"
              >
                Ver todas ({wallet.pendingDebts.length} deudas)
              </Button>
            )}
          </div>
        )}

        {totalDebt > 0 && (
          <Button 
            className="w-full"
            onClick={() => setShowPayDebt(true)}
            data-testid="button-pay-debt"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Pagar Deuda
          </Button>
        )}

        {totalDebt === 0 && (
          <div className="flex items-center justify-center py-4 text-green-600 dark:text-green-500">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">Sin deudas pendientes</span>
          </div>
        )}
      </Card>

      <WalletTransactionHistory
        open={showHistory}
        onOpenChange={setShowHistory}
      />

      <DebtDetailModal
        open={showDebtDetail}
        onOpenChange={setShowDebtDetail}
        debts={wallet.pendingDebts}
        totalDebt={totalDebt}
        onPayDebt={() => {
          setShowDebtDetail(false);
          setShowPayDebt(true);
        }}
      />

      <PayDebtModal
        open={showPayDebt}
        onOpenChange={setShowPayDebt}
        walletId={wallet.id}
        totalDebt={totalDebt}
        onSuccess={() => refetch()}
      />
    </>
  );
}
