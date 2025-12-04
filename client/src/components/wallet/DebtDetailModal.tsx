import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerDescription,
  DrawerFooter
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CreditCard, 
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle
} from 'lucide-react';

interface PendingDebt {
  id: string;
  servicioId: string | null;
  originalAmount: string;
  remainingAmount: string;
  dueDate: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  daysRemaining: number;
}

interface DebtDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debts: PendingDebt[];
  totalDebt: number;
  onPayDebt: () => void;
}

const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(num);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-DO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const getDebtStatusInfo = (debt: PendingDebt) => {
  if (debt.status === 'overdue' || debt.daysRemaining < 0) {
    return {
      badge: 'destructive' as const,
      label: 'Vencida',
      icon: AlertTriangle,
      color: 'text-destructive',
    };
  }
  if (debt.daysRemaining <= 3) {
    return {
      badge: 'secondary' as const,
      label: debt.daysRemaining === 0 ? 'Vence hoy' : `${debt.daysRemaining} días`,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-500',
    };
  }
  if (debt.status === 'partial') {
    return {
      badge: 'outline' as const,
      label: 'Parcial',
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-500',
    };
  }
  return {
    badge: 'outline' as const,
    label: 'Pendiente',
    icon: Clock,
    color: 'text-muted-foreground',
  };
};

export function DebtDetailModal({ 
  open, 
  onOpenChange, 
  debts, 
  totalDebt,
  onPayDebt 
}: DebtDetailModalProps) {
  const sortedDebts = [...debts].sort((a, b) => a.daysRemaining - b.daysRemaining);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left border-b">
          <DrawerTitle>Detalle de Deudas</DrawerTitle>
          <DrawerDescription>
            Tienes {debts.length} deuda{debts.length !== 1 ? 's' : ''} pendiente{debts.length !== 1 ? 's' : ''}
          </DrawerDescription>
        </DrawerHeader>
        
        <ScrollArea className="flex-1 max-h-[calc(90vh-220px)]">
          <div className="p-4 space-y-4">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-muted-foreground mb-1">Deuda Total</p>
              <p className="text-2xl font-bold text-destructive" data-testid="text-total-debt-modal">
                {formatCurrency(totalDebt)}
              </p>
            </div>

            <div className="space-y-3">
              {sortedDebts.map((debt) => {
                const statusInfo = getDebtStatusInfo(debt);
                const StatusIcon = statusInfo.icon;
                const original = parseFloat(debt.originalAmount);
                const remaining = parseFloat(debt.remainingAmount);
                const paid = original - remaining;
                const progress = (paid / original) * 100;

                return (
                  <div 
                    key={debt.id}
                    className="p-4 rounded-lg border bg-card"
                    data-testid={`debt-detail-${debt.id}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                          <span className="text-sm font-medium">
                            Comisión de servicio
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>Vence: {formatDate(debt.dueDate)}</span>
                        </div>
                      </div>
                      <Badge variant={statusInfo.badge}>
                        {statusInfo.label}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Monto original:</span>
                        <span>{formatCurrency(original)}</span>
                      </div>
                      
                      {debt.status === 'partial' && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Pagado:</span>
                            <span className="text-green-600 dark:text-green-500">
                              {formatCurrency(paid)}
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </>
                      )}
                      
                      <div className="flex justify-between text-sm font-medium pt-2 border-t">
                        <span>Por pagar:</span>
                        <span className="text-destructive">
                          {formatCurrency(remaining)}
                        </span>
                      </div>
                    </div>

                    {debt.servicioId && (
                      <p className="text-xs text-muted-foreground mt-2">
                        ID Servicio: {debt.servicioId.slice(0, 8)}...
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>

        <DrawerFooter className="border-t">
          <Button 
            className="w-full"
            onClick={onPayDebt}
            data-testid="button-pay-debt-modal"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Pagar Deuda
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
