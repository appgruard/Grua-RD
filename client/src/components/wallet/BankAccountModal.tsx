import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, AlertTriangle, Banknote, Building2 } from 'lucide-react';

interface BankAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BankAccountData {
  hasBankAccount: boolean;
  payoutEnabled: boolean;
  bankAccount: {
    id: string;
    banco: string;
    tipoCuenta: string;
    numeroCuenta: string;
    nombreTitular: string;
    cedula: string;
    estado: string;
    last4: string;
  } | null;
  balance: {
    available: string;
    pending: string;
  };
}

interface Bank {
  id: string;
  name: string;
}

const ACCOUNT_TYPES = [
  { id: 'ahorro', name: 'Cuenta de Ahorro' },
  { id: 'corriente', name: 'Cuenta Corriente' },
];

export function BankAccountModal({ open, onOpenChange }: BankAccountModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    banco: '',
    tipoCuenta: '',
    numeroCuenta: '',
    nombreTitular: '',
    cedula: '',
  });

  const { data: banksData } = useQuery<{ banks: Bank[] }>({
    queryKey: ['/api/drivers/banks'],
    enabled: open,
  });

  const { data: accountStatus, isLoading: isLoadingStatus } = useQuery<BankAccountData>({
    queryKey: ['/api/drivers/bank-account-status'],
    enabled: open,
  });

  useEffect(() => {
    if (accountStatus?.bankAccount) {
      setFormData({
        banco: accountStatus.bankAccount.banco || '',
        tipoCuenta: accountStatus.bankAccount.tipoCuenta || '',
        numeroCuenta: accountStatus.bankAccount.numeroCuenta || '',
        nombreTitular: accountStatus.bankAccount.nombreTitular || '',
        cedula: accountStatus.bankAccount.cedula || '',
      });
    }
  }, [accountStatus]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/drivers/bank-account', formData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al guardar cuenta bancaria');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/bank-account-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/payout-account-status'] });
      toast({
        title: 'Cuenta guardada',
        description: 'Tu cuenta bancaria ha sido registrada correctamente',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', '/api/drivers/bank-account', {});
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al eliminar cuenta bancaria');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/bank-account-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/payout-account-status'] });
      setFormData({
        banco: '',
        tipoCuenta: '',
        numeroCuenta: '',
        nombreTitular: '',
        cedula: '',
      });
      toast({
        title: 'Cuenta eliminada',
        description: 'Tu cuenta bancaria ha sido eliminada',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.banco || !formData.tipoCuenta || !formData.numeroCuenta || !formData.nombreTitular || !formData.cedula) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor completa todos los campos',
        variant: 'destructive',
      });
      return;
    }
    saveMutation.mutate();
  };

  const banks = banksData?.banks || [];
  const isEditing = !!accountStatus?.bankAccount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {isEditing ? 'Editar Cuenta Bancaria' : 'Agregar Cuenta Bancaria'}
          </DialogTitle>
          <DialogDescription>
            Esta cuenta se utilizará para recibir los pagos de tus servicios.
          </DialogDescription>
        </DialogHeader>

        {isLoadingStatus ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="banco">Banco</Label>
              <Select
                value={formData.banco}
                onValueChange={(value) => setFormData({ ...formData, banco: value })}
              >
                <SelectTrigger id="banco" data-testid="select-bank">
                  <SelectValue placeholder="Selecciona un banco" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoCuenta">Tipo de Cuenta</Label>
              <Select
                value={formData.tipoCuenta}
                onValueChange={(value) => setFormData({ ...formData, tipoCuenta: value })}
              >
                <SelectTrigger id="tipoCuenta" data-testid="select-account-type">
                  <SelectValue placeholder="Selecciona tipo de cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numeroCuenta">Número de Cuenta</Label>
              <Input
                id="numeroCuenta"
                value={formData.numeroCuenta}
                onChange={(e) => setFormData({ ...formData, numeroCuenta: e.target.value })}
                placeholder="Ej: 1234567890"
                data-testid="input-account-number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombreTitular">Nombre del Titular</Label>
              <Input
                id="nombreTitular"
                value={formData.nombreTitular}
                onChange={(e) => setFormData({ ...formData, nombreTitular: e.target.value })}
                placeholder="Nombre completo como aparece en la cuenta"
                data-testid="input-account-holder"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cedula">Cédula del Titular</Label>
              <Input
                id="cedula"
                value={formData.cedula}
                onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                placeholder="Ej: 001-0000000-0"
                data-testid="input-cedula"
              />
            </div>

            {accountStatus?.bankAccount?.estado === 'pendiente_verificacion' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Tu cuenta está pendiente de verificación. Esto puede tomar hasta 24 horas.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending || saveMutation.isPending}
                  data-testid="button-delete-bank-account"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Eliminar
                </Button>
              )}
              <Button
                type="submit"
                disabled={saveMutation.isPending || deleteMutation.isPending}
                data-testid="button-save-bank-account"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Banknote className="w-4 h-4 mr-2" />
                )}
                {isEditing ? 'Actualizar' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
