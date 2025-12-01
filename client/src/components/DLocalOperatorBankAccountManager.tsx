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
import { CreditCard, Plus, Trash2, Loader2, CheckCircle, Banknote } from 'lucide-react';

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

export default function DLocalOperatorBankAccountManager() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nombreTitular, setNombreTitular] = useState('');
  const [cedula, setCedula] = useState('');
  const [banco, setBanco] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState<'ahorro' | 'corriente'>('ahorro');
  const [numeroCuenta, setNumeroCuenta] = useState('');

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
                    <div className="flex items-center gap-2 mb-1">
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
                      <span className="font-semibold">RD${parseFloat(payoutStatus.balanceDisponible || '0').toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Pendiente:</span>
                      <span className="font-semibold">RD${parseFloat(payoutStatus.balancePendiente || '0').toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {bankAccount.estado === 'verificada' && payoutStatus?.balanceDisponible && parseFloat(payoutStatus.balanceDisponible) > 0 && (
              <Button className="w-full" data-testid="button-request-withdrawal">
                <Banknote className="h-4 w-4 mr-2" />
                Solicitar Retiro
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
