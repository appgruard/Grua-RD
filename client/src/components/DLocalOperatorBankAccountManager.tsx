import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, Plus, Trash2, Loader2, CheckCircle, Banknote, 
  Calendar, Clock, ArrowDownCircle, AlertCircle, History 
} from 'lucide-react';

interface BankAccount {
  id: string;
  nombreTitular: string;
  cedula: string;
  banco: string;
  tipoCuenta: 'ahorro' | 'corriente';
  numeroCuenta: string;
  estado: 'pendiente' | 'verificada' | 'rechazada';
}

interface DRBank {
  code: string;
  name: string;
}

interface Withdrawal {
  id: string;
  monto: string;
  montoNeto: string;
  comision: string | null;
  tipoRetiro: 'programado' | 'inmediato';
  estado: 'pendiente' | 'procesando' | 'completado' | 'fallido';
  createdAt: string;
  procesadoAt: string | null;
}

interface NextPayoutInfo {
  nextPayoutDate: string;
  nextPayoutFormatted: string;
  scheduledDays: string[];
  immediateWithdrawalCommission: number;
  balanceDisponible: string;
  balancePendiente: string;
}

export default function DLocalOperatorBankAccountManager() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [nombreTitular, setNombreTitular] = useState('');
  const [cedula, setCedula] = useState('');
  const [banco, setBanco] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState<'ahorro' | 'corriente'>('ahorro');
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalType, setWithdrawalType] = useState<'programado' | 'inmediato'>('programado');

  const { data: bankAccount, isLoading } = useQuery<BankAccount | null>({
    queryKey: ['/api/drivers/bank-account'],
  });

  const { data: banks, isLoading: isLoadingBanks } = useQuery<DRBank[]>({
    queryKey: ['/api/drivers/banks'],
  });

  const { data: payoutStatus } = useQuery({
    queryKey: ['/api/drivers/payout-account-status'],
    enabled: !!bankAccount,
  });

  const { data: nextPayout } = useQuery<NextPayoutInfo>({
    queryKey: ['/api/drivers/next-payout'],
    enabled: !!bankAccount,
  });

  const { data: withdrawalHistory } = useQuery<{ withdrawals: Withdrawal[]; total: number }>({
    queryKey: ['/api/drivers/withdrawal-history'],
    enabled: !!bankAccount,
  });

  const addBankAccountMutation = useMutation({
    mutationFn: async (data: { nombreTitular: string; cedula: string; banco: string; tipoCuenta: string; numeroCuenta: string }) => {
      return apiRequest('/api/drivers/bank-account', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/bank-account'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/payout-account-status'] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: 'Cuenta bancaria registrada',
        description: 'Tu cuenta será verificada en breve. Podrás solicitar retiros una vez verificada.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error al registrar cuenta',
        description: error.message || 'No se pudo registrar la cuenta bancaria',
        variant: 'destructive',
      });
    },
  });

  const deleteBankAccountMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/drivers/bank-account', {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/bank-account'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/payout-account-status'] });
      toast({
        title: 'Cuenta eliminada',
        description: 'Tu cuenta bancaria ha sido eliminada.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error al eliminar cuenta',
        description: error.message || 'No se pudo eliminar la cuenta',
        variant: 'destructive',
      });
    },
  });

  const scheduledWithdrawalMutation = useMutation({
    mutationFn: async (amount: string) => {
      return apiRequest('/api/drivers/request-withdrawal', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/payout-account-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/withdrawal-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/next-payout'] });
      setWithdrawalDialogOpen(false);
      setWithdrawalAmount('');
      toast({
        title: 'Retiro solicitado',
        description: 'Tu retiro será procesado en el próximo pago programado.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error en el retiro',
        description: error.message || 'No se pudo procesar el retiro',
        variant: 'destructive',
      });
    },
  });

  const immediateWithdrawalMutation = useMutation({
    mutationFn: async (amount: string) => {
      return apiRequest('/api/drivers/immediate-withdrawal', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/payout-account-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/withdrawal-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/next-payout'] });
      setWithdrawalDialogOpen(false);
      setWithdrawalAmount('');
      toast({
        title: 'Retiro procesado',
        description: `Recibirás RD$${data.netAmount?.toFixed(2) || parseFloat(withdrawalAmount) - 100} hoy (comisión: RD$100)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error en el retiro',
        description: error.message || 'No se pudo procesar el retiro inmediato',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setNombreTitular('');
    setCedula('');
    setBanco('');
    setTipoCuenta('ahorro');
    setNumeroCuenta('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nombreTitular || !cedula || !banco || !numeroCuenta) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor completa todos los campos',
        variant: 'destructive',
      });
      return;
    }

    if (!/^\d{11}$/.test(cedula.replace(/\D/g, ''))) {
      toast({
        title: 'Cédula inválida',
        description: 'La cédula debe tener 11 dígitos',
        variant: 'destructive',
      });
      return;
    }

    if (numeroCuenta.length < 5) {
      toast({
        title: 'Número de cuenta inválido',
        description: 'El número de cuenta debe tener al menos 5 dígitos',
        variant: 'destructive',
      });
      return;
    }

    addBankAccountMutation.mutate({
      nombreTitular,
      cedula,
      banco,
      tipoCuenta,
      numeroCuenta,
    });
  };

  const isWithdrawalFormValid = (): boolean => {
    const amount = parseFloat(withdrawalAmount);
    const balance = parseFloat(payoutStatus?.balanceDisponible || '0');
    const minAmount = 500;
    const commission = nextPayout?.immediateWithdrawalCommission || 100;

    if (!withdrawalAmount || isNaN(amount) || amount <= 0) return false;
    if (amount < minAmount) return false;
    if (amount > balance) return false;
    if (withdrawalType === 'inmediato' && amount <= commission) return false;

    return true;
  };

  const handleWithdrawal = () => {
    const amount = parseFloat(withdrawalAmount);
    const balance = parseFloat(payoutStatus?.balanceDisponible || '0');
    const minAmount = 500;
    const commission = nextPayout?.immediateWithdrawalCommission || 100;

    if (!withdrawalAmount || isNaN(amount) || amount <= 0) {
      toast({
        title: 'Monto inválido',
        description: 'Por favor ingresa un monto válido',
        variant: 'destructive',
      });
      return;
    }

    if (amount < minAmount) {
      toast({
        title: 'Monto mínimo',
        description: `El monto mínimo de retiro es RD$${minAmount}`,
        variant: 'destructive',
      });
      return;
    }

    if (amount > balance) {
      toast({
        title: 'Balance insuficiente',
        description: `Tu balance disponible es RD$${balance.toFixed(2)}`,
        variant: 'destructive',
      });
      return;
    }

    if (withdrawalType === 'inmediato' && amount <= commission) {
      toast({
        title: 'Monto insuficiente',
        description: `El monto debe ser mayor a la comisión de RD$${commission}`,
        variant: 'destructive',
      });
      return;
    }

    if (withdrawalType === 'programado') {
      scheduledWithdrawalMutation.mutate(withdrawalAmount);
    } else {
      immediateWithdrawalMutation.mutate(withdrawalAmount);
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'verificada':
        return <Badge className="bg-green-600">Verificada</Badge>;
      case 'pendiente':
        return <Badge variant="secondary">Pendiente de verificación</Badge>;
      case 'rechazada':
        return <Badge variant="destructive">Rechazada</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const getWithdrawalStatusBadge = (estado: string) => {
    switch (estado) {
      case 'completado':
        return <Badge className="bg-green-600">Completado</Badge>;
      case 'procesando':
        return <Badge variant="secondary">Procesando</Badge>;
      case 'pendiente':
        return <Badge variant="outline">Pendiente</Badge>;
      case 'fallido':
        return <Badge variant="destructive">Fallido</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg">Cuenta Bancaria</CardTitle>
            <CardDescription>Gestiona tu cuenta para recibir retiros</CardDescription>
          </div>
          {!bankAccount && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-bank-account">
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Registrar Cuenta Bancaria</DialogTitle>
                  <DialogDescription>
                    Proporciona los datos de tu cuenta bancaria dominicana para recibir retiros.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombreTitular">Nombre del Titular</Label>
                    <Input
                      id="nombreTitular"
                      placeholder="Tu nombre completo"
                      value={nombreTitular}
                      onChange={(e) => setNombreTitular(e.target.value)}
                      data-testid="input-titular-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cedula">Cédula (11 dígitos)</Label>
                    <Input
                      id="cedula"
                      placeholder="00000000000"
                      value={cedula}
                      onChange={(e) => setCedula(e.target.value.replace(/\D/g, '').substring(0, 11))}
                      maxLength={11}
                      data-testid="input-cedula"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="banco">Banco</Label>
                    <Select value={banco} onValueChange={setBanco}>
                      <SelectTrigger id="banco" data-testid="select-bank">
                        <SelectValue placeholder="Selecciona tu banco" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingBanks ? (
                          <SelectItem value="loading" disabled>
                            Cargando...
                          </SelectItem>
                        ) : (
                          banks?.map((bank) => (
                            <SelectItem key={bank.code} value={bank.code}>
                              {bank.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipoCuenta">Tipo de Cuenta</Label>
                    <Select value={tipoCuenta} onValueChange={(value: any) => setTipoCuenta(value)}>
                      <SelectTrigger id="tipoCuenta" data-testid="select-account-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ahorro">Cuenta de Ahorro</SelectItem>
                        <SelectItem value="corriente">Cuenta Corriente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numeroCuenta">Número de Cuenta</Label>
                    <Input
                      id="numeroCuenta"
                      placeholder="Tu número de cuenta"
                      value={numeroCuenta}
                      onChange={(e) => setNumeroCuenta(e.target.value)}
                      data-testid="input-account-number"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={addBankAccountMutation.isPending}
                    data-testid="button-submit-bank-account"
                  >
                    {addBankAccountMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      'Registrar Cuenta'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {!bankAccount ? (
            <div className="text-center py-6">
              <Banknote className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">
                No tienes cuenta bancaria registrada
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Agrega tu cuenta para solicitar retiros de tus ganancias
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 border rounded-md space-y-3" data-testid="card-bank-account">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Banknote className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-medium truncate">{bankAccount.nombreTitular}</p>
                        {getStatusBadge(bankAccount.estado)}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>Banco: {bankAccount.banco}</p>
                        <p>Tipo: {bankAccount.tipoCuenta === 'ahorro' ? 'Cuenta de Ahorro' : 'Cuenta Corriente'}</p>
                        <p>Cuenta: •••••••••{bankAccount.numeroCuenta.slice(-3)}</p>
                        <p>Cédula: {bankAccount.cedula}</p>
                      </div>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid="button-delete-bank-account"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar Cuenta</AlertDialogTitle>
                        <AlertDialogDescription>
                          ¿Estás seguro de que deseas eliminar esta cuenta bancaria? No podrás solicitar retiros sin una cuenta registrada.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteBankAccountMutation.mutate()}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {payoutStatus && (
                  <div className="pt-3 border-t">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Balance disponible:</span>
                        <span className="font-semibold text-green-600">RD${parseFloat(payoutStatus.balanceDisponible || '0').toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Pendiente:</span>
                        <span className="font-semibold">RD${parseFloat(payoutStatus.balancePendiente || '0').toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {nextPayout && (
                <div className="p-4 bg-muted/50 rounded-md space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Próximo Pago Programado</span>
                  </div>
                  <p className="text-sm text-muted-foreground capitalize">
                    {nextPayout.nextPayoutFormatted}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Días de pago: {nextPayout.scheduledDays?.join(' y ')}
                  </p>
                </div>
              )}

              {bankAccount.estado === 'verificada' && payoutStatus?.balanceDisponible && parseFloat(payoutStatus.balanceDisponible) > 0 && (
                <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" data-testid="button-request-withdrawal">
                      <ArrowDownCircle className="h-4 w-4 mr-2" />
                      Solicitar Retiro
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Solicitar Retiro</DialogTitle>
                      <DialogDescription>
                        Elige el tipo de retiro y el monto a transferir
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Tabs value={withdrawalType} onValueChange={(v: any) => setWithdrawalType(v)}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="programado" data-testid="tab-scheduled-withdrawal">
                            <Calendar className="h-4 w-4 mr-1" />
                            Programado
                          </TabsTrigger>
                          <TabsTrigger value="inmediato" data-testid="tab-immediate-withdrawal">
                            <Clock className="h-4 w-4 mr-1" />
                            Inmediato
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="programado" className="space-y-3">
                          <div className="p-3 bg-muted/50 rounded-md text-sm">
                            <p className="font-medium mb-1">Retiro Programado</p>
                            <p className="text-muted-foreground text-xs">
                              Sin comisión. Se procesará el próximo {nextPayout?.scheduledDays?.[0] || 'Lunes'} o {nextPayout?.scheduledDays?.[1] || 'Viernes'}.
                            </p>
                          </div>
                        </TabsContent>
                        <TabsContent value="inmediato" className="space-y-3">
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-sm">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-amber-700">Retiro Inmediato</p>
                                <p className="text-amber-600/80 text-xs mt-1">
                                  Comisión de RD${nextPayout?.immediateWithdrawalCommission || 100}. 
                                  Recibirás el dinero el mismo día hábil.
                                </p>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>

                      <div className="space-y-2">
                        <Label htmlFor="withdrawalAmount">Monto (RD$)</Label>
                        <Input
                          id="withdrawalAmount"
                          type="number"
                          placeholder="500.00"
                          min="500"
                          step="0.01"
                          value={withdrawalAmount}
                          onChange={(e) => setWithdrawalAmount(e.target.value)}
                          data-testid="input-withdrawal-amount"
                        />
                        <p className="text-xs text-muted-foreground">
                          Balance disponible: RD${parseFloat(payoutStatus.balanceDisponible || '0').toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Monto mínimo: RD$500
                        </p>
                      </div>

                      {withdrawalType === 'inmediato' && withdrawalAmount && parseFloat(withdrawalAmount) > 0 && (
                        <div className="p-3 border rounded-md text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Monto solicitado:</span>
                            <span>RD${parseFloat(withdrawalAmount).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-amber-600">
                            <span>Comisión:</span>
                            <span>-RD${nextPayout?.immediateWithdrawalCommission || 100}</span>
                          </div>
                          <Separator className="my-1" />
                          <div className="flex justify-between font-semibold">
                            <span>Recibirás:</span>
                            <span className="text-green-600">
                              RD${(parseFloat(withdrawalAmount) - (nextPayout?.immediateWithdrawalCommission || 100)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}

                      <Button
                        className="w-full"
                        onClick={handleWithdrawal}
                        disabled={!isWithdrawalFormValid() || scheduledWithdrawalMutation.isPending || immediateWithdrawalMutation.isPending}
                        data-testid="button-confirm-withdrawal"
                      >
                        {(scheduledWithdrawalMutation.isPending || immediateWithdrawalMutation.isPending) ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Confirmar Retiro
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {bankAccount && withdrawalHistory && withdrawalHistory.withdrawals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Historial de Retiros</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {withdrawalHistory.withdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="p-3 border rounded-md space-y-2"
                    data-testid={`withdrawal-item-${withdrawal.id}`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {withdrawal.tipoRetiro === 'inmediato' ? (
                          <Clock className="h-4 w-4 text-amber-500" />
                        ) : (
                          <Calendar className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="font-medium">
                          RD${parseFloat(withdrawal.monto).toFixed(2)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {withdrawal.tipoRetiro === 'inmediato' ? 'Inmediato' : 'Programado'}
                        </Badge>
                      </div>
                      {getWithdrawalStatusBadge(withdrawal.estado)}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {withdrawal.comision && parseFloat(withdrawal.comision) > 0 && (
                        <p>Comisión: RD${parseFloat(withdrawal.comision).toFixed(2)}</p>
                      )}
                      <p>Neto: RD${parseFloat(withdrawal.montoNeto).toFixed(2)}</p>
                      <p>Fecha: {new Date(withdrawal.createdAt).toLocaleDateString('es-DO', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</p>
                      {withdrawal.procesadoAt && (
                        <p>Procesado: {new Date(withdrawal.procesadoAt).toLocaleDateString('es-DO', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
