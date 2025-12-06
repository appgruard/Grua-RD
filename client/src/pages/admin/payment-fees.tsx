import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, CreditCard, TrendingUp, Users, Building } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PaymentFeesData {
  summary: {
    totalCollected: number;
    totalDLocalFees: number;
    netReceived: number;
    feePercentage: number;
    totalOperatorShare: number;
    totalCompanyShare: number;
  };
  byPeriod: Array<{
    date: string;
    collected: number;
    fees: number;
    net: number;
  }>;
  recentTransactions: Array<{
    id: string;
    servicioId: string;
    amount: number;
    dlocalFee: number;
    netAmount: number;
    operatorShare: number;
    companyShare: number;
    createdAt: string;
  }>;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-DO', { 
    style: 'currency', 
    currency: 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32 mb-1" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      ))}
    </div>
  );
}

export default function AdminPaymentFees() {
  const { data, isLoading } = useQuery<PaymentFeesData>({
    queryKey: ['/api/admin/payment-fees'],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Comisiones dLocal</h1>
          <p className="text-muted-foreground">Resumen de comisiones y tarifas de procesamiento de pagos</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transacciones Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  const summary = data?.summary || {
    totalCollected: 0,
    totalDLocalFees: 0,
    netReceived: 0,
    feePercentage: 0,
    totalOperatorShare: 0,
    totalCompanyShare: 0,
  };

  const recentTransactions = data?.recentTransactions || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Comisiones dLocal</h1>
        <p className="text-muted-foreground">Resumen de comisiones y tarifas de procesamiento de pagos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-total-collected">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-collected">
              {formatCurrency(summary.totalCollected)}
            </div>
            <p className="text-xs text-muted-foreground">Monto bruto de todos los servicios</p>
          </CardContent>
        </Card>

        <Card data-testid="card-dlocal-fees">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Comisión dLocal</CardTitle>
            <CreditCard className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="text-dlocal-fees">
              {formatCurrency(summary.totalDLocalFees)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.feePercentage.toFixed(2)}% del total cobrado
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-net-received">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Neto Recibido</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-net-received">
              {formatCurrency(summary.netReceived)}
            </div>
            <p className="text-xs text-muted-foreground">Después de descontar comisiones</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card data-testid="card-operator-share">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Operadores (80%)</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-operator-share">
              {formatCurrency(summary.totalOperatorShare)}
            </div>
            <p className="text-xs text-muted-foreground">Parte correspondiente a conductores</p>
          </CardContent>
        </Card>

        <Card data-testid="card-company-share">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Empresa (20%)</CardTitle>
            <Building className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-company-share">
              {formatCurrency(summary.totalCompanyShare)}
            </div>
            <p className="text-xs text-muted-foreground">Parte correspondiente a Grúa RD</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-transactions">
              No hay transacciones registradas
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Servicio</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Comisión dLocal</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                    <TableHead className="text-right">Operador (80%)</TableHead>
                    <TableHead className="text-right">Empresa (20%)</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((tx) => (
                    <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                      <TableCell className="font-mono text-xs" data-testid={`text-servicio-${tx.id}`}>
                        {tx.servicioId.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-amount-${tx.id}`}>
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-right text-destructive" data-testid={`text-fee-${tx.id}`}>
                        {formatCurrency(tx.dlocalFee)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-net-${tx.id}`}>
                        {formatCurrency(tx.netAmount)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-operator-${tx.id}`}>
                        {formatCurrency(tx.operatorShare)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-company-${tx.id}`}>
                        {formatCurrency(tx.companyShare)}
                      </TableCell>
                      <TableCell data-testid={`text-date-${tx.id}`}>
                        {tx.createdAt ? format(new Date(tx.createdAt), 'dd/MM/yyyy HH:mm', { locale: es }) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
