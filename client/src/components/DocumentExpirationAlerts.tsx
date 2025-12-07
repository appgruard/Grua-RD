import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AlertTriangle, XCircle, Clock, FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Documento } from '@shared/schema';

interface DocumentExpirationAlertsProps {
  onNavigateToDocuments?: () => void;
}

const DOCUMENT_TYPE_NAMES: Record<string, string> = {
  'licencia': 'Licencia de Conducir',
  'poliza': 'Póliza de Seguro',
  'foto_perfil': 'Foto de Perfil',
  'cedula_frontal': 'Cédula (Frente)',
  'cedula_trasera': 'Cédula (Reverso)',
  'seguro_cliente': 'Seguro del Cliente',
};

export function DocumentExpirationAlerts({ onNavigateToDocuments }: DocumentExpirationAlertsProps) {
  const { data: documentos = [] } = useQuery<Documento[]>({
    queryKey: ['/api/documents/my-documents'],
  });

  const now = new Date();

  const expiredDocuments = documentos.filter((doc) => {
    if (!doc.validoHasta) return false;
    return new Date(doc.validoHasta) < now;
  });

  const expiringDocuments = documentos.filter((doc) => {
    if (!doc.validoHasta) return false;
    const expirationDate = new Date(doc.validoHasta);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expirationDate >= now && expirationDate <= thirtyDaysFromNow;
  });

  const getDaysUntilExpiration = (date: string | Date): number => {
    const expirationDate = new Date(date);
    const diffTime = expirationDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (expiredDocuments.length === 0 && expiringDocuments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3" data-testid="document-expiration-alerts">
      {expiredDocuments.length > 0 && (
        <Alert variant="destructive" data-testid="alert-expired-documents">
          <XCircle className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            Documentos Vencidos
            <Badge variant="destructive" className="ml-2">
              {expiredDocuments.length}
            </Badge>
          </AlertTitle>
          <AlertDescription className="mt-2">
            <div className="space-y-2">
              <p className="text-sm">
                Tienes documentos vencidos que requieren atención inmediata. Tu cuenta puede ser suspendida hasta que los actualices.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {expiredDocuments.map((doc) => (
                  <Badge 
                    key={doc.id} 
                    variant="outline" 
                    className="border-destructive text-destructive"
                    data-testid={`badge-expired-${doc.tipo}`}
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    {DOCUMENT_TYPE_NAMES[doc.tipo] || doc.tipo}
                  </Badge>
                ))}
              </div>
              {onNavigateToDocuments && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 border-destructive text-destructive hover:bg-destructive/10"
                  onClick={onNavigateToDocuments}
                  data-testid="button-go-to-documents"
                >
                  Actualizar documentos
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {expiringDocuments.length > 0 && (
        <Card className="p-4 border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20" data-testid="alert-expiring-documents">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-400">
                  Documentos por Vencer
                </h4>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  {expiringDocuments.length}
                </Badge>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-400/80 mt-1">
                Los siguientes documentos vencerán pronto:
              </p>
              <div className="space-y-2 mt-3">
                {expiringDocuments.map((doc) => {
                  const daysLeft = getDaysUntilExpiration(doc.validoHasta!);
                  return (
                    <div 
                      key={doc.id} 
                      className="flex items-center justify-between gap-2 text-sm p-2 rounded-md bg-yellow-100/50 dark:bg-yellow-900/30"
                      data-testid={`expiring-doc-${doc.tipo}`}
                    >
                      <span className="text-yellow-800 dark:text-yellow-300 font-medium">
                        {DOCUMENT_TYPE_NAMES[doc.tipo] || doc.tipo}
                      </span>
                      <Badge
                        variant={daysLeft <= 7 ? 'destructive' : 'secondary'}
                        className={daysLeft <= 7 ? '' : 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {daysLeft} días
                      </Badge>
                    </div>
                  );
                })}
              </div>
              {onNavigateToDocuments && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-500 dark:text-yellow-400 dark:hover:bg-yellow-900/50"
                  onClick={onNavigateToDocuments}
                  data-testid="button-renew-documents"
                >
                  Renovar documentos
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
