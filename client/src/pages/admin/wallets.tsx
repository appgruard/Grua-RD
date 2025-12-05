import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Wallet, 
  DollarSign, 
  AlertTriangle, 
  Ban, 
  CheckCircle, 
  Clock, 
  Eye,
  MinusCircle,
  PlusCircle,
  Unlock,
  Loader2,
  TrendingUp,
  TrendingDown,
  Users,
  Filter
} from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface WalletStats {
  totalOperators: number;
  totalBalance: string;
  totalDebt: string;
  operatorsWithDebt: number;
  blockedOperators: number;
}

interface WalletDebt {
  id: number;
  originalAmount: string;
  remainingAmount: string;
  dueDate: string;
  status: string;
  createdAt: string;
}

interface WalletTransaction {
  id: number;
  type: string;
  amount: string;
  description: string;
  createdAt: string;
}

interface OperatorWallet {
  id: number;
  conductorId: number;
  balance: string;
  totalDebt: string;
  totalCashEarnings: string;
  totalCardEarnings: string;
  cashServicesBlocked: boolean;
  createdAt: string;
  updatedAt: string;
  conductorNombre: string;
  conductorEmail: string;
  pendingDebts?: WalletDebt[];
  recentTransactions?: WalletTransaction[];
}

type FilterType = 'all' | 'with_debt' | 'blocked' | 'no_debt';

export default function AdminWallets() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedWallet, setSelectedWallet] = useState<OperatorWallet | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adjustmentDrawerOpen, setAdjustmentDrawerOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'add_balance' | 'subtract_balance' | 'add_debt' | 'subtract_debt'>('subtract_debt');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const { data: stats, isLoading: statsLoading } = useQuery<WalletStats>({
    queryKey: ['/api/admin/wallets-stats'],
  });

  const { data: wallets, isLoading: walletsLoading } = useQuery<OperatorWallet[]>({
    queryKey: ['/api/admin/wallets'],
  });

  const { data: walletDetails, isLoading: detailsLoading } = useQuery<OperatorWallet>({
    queryKey: ['/api/admin/wallets', selectedWallet?.conductorId],
    enabled: !!selectedWallet?.conductorId && drawerOpen,
  });

  const adjustMutation = useMutation({
    mutationFn: async (data: { walletId: number; adjustmentType: string; amount: number; reason: string }) => {
      const res = await apiRequest('POST', `/api/admin/wallets/${data.walletId}/adjust`, {
        adjustmentType: data.adjustmentType,
        amount: data.amount,
        reason: data.reason,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al realizar el ajuste');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wallets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wallets-stats'] });
      if (selectedWallet) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/wallets', selectedWallet.conductorId] });
      }
      toast({ title: 'Ajuste realizado', description: 'La billetera ha sido actualizada correctamente' });
      setAdjustmentDrawerOpen(false);
      setAdjustmentAmount('');
      setAdjustmentReason('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (walletId: number) => {
      const res = await apiRequest('POST', `/api/admin/wallets/${walletId}/unblock`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al desbloquear');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wallets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wallets-stats'] });
      if (selectedWallet) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/wallets', selectedWallet.conductorId] });
      }
      toast({ title: 'Servicios desbloqueados', description: 'El operador puede aceptar servicios en efectivo' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const filteredWallets = wallets?.filter(wallet => {
    const matchesSearch = 
      wallet.conductorNombre.toLowerCase().includes(search.toLowerCase()) ||
      wallet.conductorEmail.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;
    
    const debt = parseFloat(wallet.totalDebt);
    
    switch (filter) {
      case 'with_debt':
        return debt > 0;
      case 'blocked':
        return wallet.cashServicesBlocked;
      case 'no_debt':
        return debt === 0;
      default:
        return true;
    }
  });

  const handleViewDetails = (wallet: OperatorWallet) => {
    setSelectedWallet(wallet);
    setDrawerOpen(true);
  };

  const handleAdjustment = () => {
    if (!selectedWallet || !adjustmentAmount || !adjustmentReason) {
      toast({ title: 'Error', description: 'Complete todos los campos', variant: 'destructive' });
      return;
    }
    
    adjustMutation.mutate({
      walletId: selectedWallet.id,
      adjustmentType,
      amount: parseFloat(adjustmentAmount),
      reason: adjustmentReason,
    });
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `RD$ ${num.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getDebtStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>;
      case 'partial':
        return <Badge variant="outline" className="border-amber-500 text-amber-500"><TrendingDown className="w-3 h-3 mr-1" /> Parcial</Badge>;
      case 'paid':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Pagada</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Vencida</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'cash_commission':
        return <DollarSign className="w-4 h-4 text-amber-500" />;
      case 'card_payment':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'debt_payment':
        return <MinusCircle className="w-4 h-4 text-blue-500" />;
      case 'direct_payment':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'adjustment':
        return <PlusCircle className="w-4 h-4 text-purple-500" />;
      default:
        return <DollarSign className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'cash_commission':
        return 'Comisión efectivo';
      case 'card_payment':
        return 'Pago con tarjeta';
      case 'debt_payment':
        return 'Pago de deuda';
      case 'direct_payment':
        return 'Pago directo';
      case 'adjustment':
        return 'Ajuste admin';
      case 'withdrawal':
        return 'Retiro';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl md:text-3xl font-bold">Billeteras de Operadores</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <Card className="p-4" data-testid="stat-total-operators">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Operadores</p>
              <p className="text-xl md:text-2xl font-bold">
                {statsLoading ? '-' : stats?.totalOperators || 0}
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4" data-testid="stat-total-balance">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Balance Total</p>
              <p className="text-lg md:text-xl font-bold truncate">
                {statsLoading ? '-' : formatCurrency(stats?.totalBalance || '0')}
              </p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4" data-testid="stat-total-debt">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Deuda Total</p>
              <p className="text-lg md:text-xl font-bold text-destructive truncate">
                {statsLoading ? '-' : formatCurrency(stats?.totalDebt || '0')}
              </p>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4" data-testid="stat-with-debt">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Con Deuda</p>
              <p className="text-xl md:text-2xl font-bold text-amber-600">
                {statsLoading ? '-' : stats?.operatorsWithDebt || 0}
              </p>
            </div>
            <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4" data-testid="stat-blocked">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Bloqueados</p>
              <p className="text-xl md:text-2xl font-bold text-destructive">
                {statsLoading ? '-' : stats?.blockedOperators || 0}
              </p>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
              <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-wallets"
            />
          </div>
          <Select value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-filter">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="with_debt">Con deuda</SelectItem>
              <SelectItem value="blocked">Bloqueados</SelectItem>
              <SelectItem value="no_debt">Sin deuda</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Operador</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Efectivo</TableHead>
              <TableHead className="text-right">Tarjeta</TableHead>
              <TableHead className="text-right">Deuda</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {walletsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <div className="h-6 bg-muted rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredWallets && filteredWallets.length > 0 ? (
              filteredWallets.map((wallet) => {
                const debt = parseFloat(wallet.totalDebt);
                const balance = parseFloat(wallet.balance);
                
                return (
                  <TableRow key={wallet.id} data-testid={`wallet-row-${wallet.id}`}>
                    <TableCell data-testid={`cell-operator-${wallet.id}`}>
                      <div>
                        <p className="font-medium" data-testid={`text-name-${wallet.id}`}>{wallet.conductorNombre}</p>
                        <p className="text-sm text-muted-foreground" data-testid={`text-email-${wallet.id}`}>{wallet.conductorEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right" data-testid={`cell-balance-${wallet.id}`}>
                      <span className={balance > 0 ? 'text-green-600 font-medium' : ''} data-testid={`text-balance-${wallet.id}`}>
                        {formatCurrency(wallet.balance)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" data-testid={`cell-cash-earnings-${wallet.id}`}>
                      <span className="text-amber-600 font-medium" data-testid={`text-cash-earnings-${wallet.id}`}>
                        {formatCurrency(wallet.totalCashEarnings || '0')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" data-testid={`cell-card-earnings-${wallet.id}`}>
                      <span className="text-blue-600 font-medium" data-testid={`text-card-earnings-${wallet.id}`}>
                        {formatCurrency(wallet.totalCardEarnings || '0')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" data-testid={`cell-debt-${wallet.id}`}>
                      <span className={debt > 0 ? 'text-destructive font-medium' : ''} data-testid={`text-debt-${wallet.id}`}>
                        {formatCurrency(wallet.totalDebt)}
                      </span>
                    </TableCell>
                    <TableCell data-testid={`cell-status-${wallet.id}`}>
                      <div className="flex flex-wrap gap-1">
                        {wallet.cashServicesBlocked ? (
                          <Badge variant="destructive" data-testid={`badge-blocked-${wallet.id}`}>
                            <Ban className="w-3 h-3 mr-1" />
                            Bloqueado
                          </Badge>
                        ) : debt > 0 ? (
                          <Badge variant="outline" className="border-amber-500 text-amber-600" data-testid={`badge-debt-${wallet.id}`}>
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Con deuda
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-600" data-testid={`badge-ok-${wallet.id}`}>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Al día
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(wallet)}
                          data-testid={`button-view-wallet-${wallet.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {wallet.cashServicesBlocked && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => unblockMutation.mutate(wallet.id)}
                            disabled={unblockMutation.isPending}
                            data-testid={`button-unblock-${wallet.id}`}
                          >
                            {unblockMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Unlock className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Wallet className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No se encontraron billeteras</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Detalles de Billetera</DrawerTitle>
            <DrawerDescription>
              {selectedWallet?.conductorNombre} - {selectedWallet?.conductorEmail}
            </DrawerDescription>
          </DrawerHeader>
          
          <ScrollArea className="px-4 max-h-[60vh]">
            {detailsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : walletDetails ? (
              <div className="space-y-6 pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4" data-testid="detail-card-balance">
                    <p className="text-sm text-muted-foreground">Balance</p>
                    <p className="text-xl font-bold text-green-600" data-testid="detail-text-balance">
                      {formatCurrency(walletDetails.balance)}
                    </p>
                  </Card>
                  <Card className="p-4" data-testid="detail-card-debt">
                    <p className="text-sm text-muted-foreground">Deuda Total</p>
                    <p className="text-xl font-bold text-destructive" data-testid="detail-text-debt">
                      {formatCurrency(walletDetails.totalDebt)}
                    </p>
                  </Card>
                  <Card className="p-4" data-testid="detail-card-cash-earnings">
                    <p className="text-sm text-muted-foreground">Ganancia Efectivo</p>
                    <p className="text-xl font-bold text-amber-600" data-testid="detail-text-cash-earnings">
                      {formatCurrency(walletDetails.totalCashEarnings || '0')}
                    </p>
                  </Card>
                  <Card className="p-4" data-testid="detail-card-card-earnings">
                    <p className="text-sm text-muted-foreground">Ganancia Tarjeta</p>
                    <p className="text-xl font-bold text-blue-600" data-testid="detail-text-card-earnings">
                      {formatCurrency(walletDetails.totalCardEarnings || '0')}
                    </p>
                  </Card>
                </div>

                {walletDetails.cashServicesBlocked && (
                  <Alert variant="destructive" data-testid="detail-alert-blocked">
                    <Ban className="h-4 w-4" />
                    <AlertDescription>
                      Este operador tiene los servicios en efectivo bloqueados por deuda vencida.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setAdjustmentDrawerOpen(true)}
                    className="flex-1"
                    data-testid="button-open-adjustment"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Realizar Ajuste
                  </Button>
                  {walletDetails.cashServicesBlocked && (
                    <Button
                      variant="outline"
                      onClick={() => unblockMutation.mutate(walletDetails.id)}
                      disabled={unblockMutation.isPending}
                      data-testid="button-unblock-details"
                    >
                      {unblockMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Unlock className="w-4 h-4 mr-2" />
                      )}
                      Desbloquear
                    </Button>
                  )}
                </div>

                <Separator />

                {walletDetails.pendingDebts && walletDetails.pendingDebts.length > 0 && (
                  <div data-testid="section-pending-debts">
                    <h4 className="font-semibold mb-3">Deudas Pendientes</h4>
                    <div className="space-y-2">
                      {walletDetails.pendingDebts.map((debt) => (
                        <Card key={debt.id} className="p-3" data-testid={`card-debt-${debt.id}`}>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <p className="font-medium" data-testid={`text-debt-remaining-${debt.id}`}>{formatCurrency(debt.remainingAmount)}</p>
                              <p className="text-xs text-muted-foreground" data-testid={`text-debt-original-${debt.id}`}>
                                Original: {formatCurrency(debt.originalAmount)}
                              </p>
                              <p className="text-xs text-muted-foreground" data-testid={`text-debt-due-${debt.id}`}>
                                Vence: {format(new Date(debt.dueDate), "d 'de' MMMM, yyyy", { locale: es })}
                              </p>
                            </div>
                            {getDebtStatusBadge(debt.status)}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {walletDetails.recentTransactions && walletDetails.recentTransactions.length > 0 && (
                  <div data-testid="section-transactions">
                    <h4 className="font-semibold mb-3">Transacciones Recientes</h4>
                    <div className="space-y-2">
                      {walletDetails.recentTransactions.map((transaction) => (
                        <Card key={transaction.id} className="p-3" data-testid={`card-transaction-${transaction.id}`}>
                          <div className="flex items-center gap-3">
                            {getTransactionIcon(transaction.type)}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm" data-testid={`text-transaction-type-${transaction.id}`}>{getTransactionLabel(transaction.type)}</p>
                              <p className="text-xs text-muted-foreground truncate" data-testid={`text-transaction-desc-${transaction.id}`}>
                                {transaction.description}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium" data-testid={`text-transaction-amount-${transaction.id}`}>{formatCurrency(transaction.amount)}</p>
                              <p className="text-xs text-muted-foreground" data-testid={`text-transaction-date-${transaction.id}`}>
                                {format(new Date(transaction.createdAt), 'dd/MM/yy HH:mm')}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </ScrollArea>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" data-testid="button-close-drawer">Cerrar</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer open={adjustmentDrawerOpen} onOpenChange={setAdjustmentDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Realizar Ajuste de Billetera</DrawerTitle>
            <DrawerDescription>
              {selectedWallet?.conductorNombre}
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="px-4 space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Ajuste</Label>
              <Select value={adjustmentType} onValueChange={(value) => setAdjustmentType(value as typeof adjustmentType)}>
                <SelectTrigger data-testid="select-adjustment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add_balance">Agregar balance</SelectItem>
                  <SelectItem value="subtract_balance">Restar balance</SelectItem>
                  <SelectItem value="add_debt">Agregar deuda</SelectItem>
                  <SelectItem value="subtract_debt">Reducir deuda</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Monto (RD$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                data-testid="input-adjustment-amount"
              />
            </div>

            <div className="space-y-2">
              <Label>Razón del Ajuste</Label>
              <Textarea
                placeholder="Describa el motivo del ajuste..."
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                rows={3}
                data-testid="input-adjustment-reason"
              />
            </div>
          </div>

          <DrawerFooter>
            <Button
              onClick={handleAdjustment}
              disabled={adjustMutation.isPending || !adjustmentAmount || !adjustmentReason}
              data-testid="button-confirm-adjustment"
            >
              {adjustMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Confirmar Ajuste
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" data-testid="button-cancel-adjustment">Cancelar</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
