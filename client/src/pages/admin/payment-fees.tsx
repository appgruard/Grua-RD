import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

export default function AdminPaymentFees() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Comisiones de Pago</h1>
        <p className="text-muted-foreground">Resumen de comisiones y tarifas de procesamiento de pagos</p>
      </div>

      <Card data-testid="card-payment-coming-soon">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-lg font-medium">Métodos de Pago</CardTitle>
          <CreditCard className="h-6 w-6 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CreditCard className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Próximamente</h3>
            <p className="text-muted-foreground max-w-md">
              El sistema de gestión de comisiones de pago estará disponible pronto.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
