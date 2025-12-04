import { useQuery } from '@tanstack/react-query';
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerDescription
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  CreditCard, 
  Banknote,
  RefreshCw,
  Settings,
  Wallet
} from 'lucide-react';

interface WalletTransaction {
  id: string;
  type: 'cash_commission' | 'card_payment' | 'debt_payment' | 'direct_payment' | 'withdrawal' | 'adjustment';
  amount: string;
  commissionAmount: string | null;
  description: string | null;
  createdAt: string;
}

interface WalletTransactionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(Math.abs(num));
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-DO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getTransactionInfo = (type: WalletTransaction['type']) => {
  switch (type) {
    case 'cash_commission':
      return {
        icon: Banknote,
        label: 'Comisión efectivo',
        color: 'text-amber-600 dark:text-amber-500',
        bgColor: 'bg-amber-500/10',
        isDebit: true,
      };
    case 'card_payment':
      return {
        icon: CreditCard,
        label: 'Pago con tarjeta',
        color: 'text-green-600 dark:text-green-500',
        bgColor: 'bg-green-500/10',
        isDebit: false,
      };
    case 'debt_payment':
      return {
        icon: RefreshCw,
        label: 'Pago de deuda',
        color: 'text-blue-600 dark:text-blue-500',
        bgColor: 'bg-blue-500/10',
        isDebit: false,
      };
    case 'direct_payment':
      return {
        icon: CreditCard,
        label: 'Pago directo',
        color: 'text-green-600 dark:text-green-500',
        bgColor: 'bg-green-500/10',
        isDebit: false,
      };
    case 'withdrawal':
      return {
        icon: ArrowUpRight,
        label: 'Retiro',
        color: 'text-red-600 dark:text-red-500',
        bgColor: 'bg-red-500/10',
        isDebit: true,
      };
    case 'adjustment':
      return {
        icon: Settings,
        label: 'Ajuste',
        color: 'text-purple-600 dark:text-purple-500',
        bgColor: 'bg-purple-500/10',
        isDebit: false,
      };
    default:
      return {
        icon: Wallet,
        label: 'Transacción',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        isDebit: false,
      };
  }
};

export function WalletTransactionHistory({ open, onOpenChange }: WalletTransactionHistoryProps) {
  const { data: transactions, isLoading, error, refetch } = useQuery<WalletTransaction[]>({
    queryKey: ['/api/wallet/transactions'],
    enabled: open,
  });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left border-b">
          <DrawerTitle>Historial de Transacciones</DrawerTitle>
          <DrawerDescription>
            Todas tus transacciones de billetera
          </DrawerDescription>
        </DrawerHeader>
        
        <ScrollArea className="flex-1 max-h-[calc(90vh-120px)]">
          <div className="p-4 space-y-3">
            {error ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Wallet className="w-12 h-12 mb-4 opacity-50 text-destructive" />
                <p className="text-center mb-2">Error al cargar transacciones</p>
                <button 
                  onClick={() => refetch()}
                  className="text-primary underline text-sm"
                >
                  Reintentar
                </button>
              </div>
            ) : isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              ))
            ) : !transactions || transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Wallet className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-center">No tienes transacciones aún</p>
              </div>
            ) : (
              transactions.map((transaction) => {
                const info = getTransactionInfo(transaction.type);
                const Icon = info.icon;
                const amount = parseFloat(transaction.amount);

                return (
                  <div 
                    key={transaction.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                    data-testid={`transaction-item-${transaction.id}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${info.bgColor}`}>
                      <Icon className={`w-5 h-5 ${info.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{info.label}</p>
                        {transaction.type === 'cash_commission' && (
                          <Badge variant="outline" className="text-xs">20%</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {transaction.description || formatDate(transaction.createdAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold ${
                        info.isDebit || amount < 0
                          ? 'text-red-600 dark:text-red-500' 
                          : 'text-green-600 dark:text-green-500'
                      }`}>
                        {info.isDebit || amount < 0 ? '-' : '+'}{formatCurrency(amount)}
                      </p>
                      {transaction.commissionAmount && (
                        <p className="text-xs text-muted-foreground">
                          Comisión: {formatCurrency(transaction.commissionAmount)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
