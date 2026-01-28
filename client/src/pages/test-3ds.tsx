import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { CreditCard, Shield, CheckCircle, XCircle, Clock, AlertTriangle, ArrowLeft } from 'lucide-react';

interface ThreeDSSession {
  sessionId: string;
  status: string;
  requiresChallenge: boolean;
  challengeUrl?: string;
  threeDSMethodURL?: string;
  threeDSServerTransID?: string;
  result?: {
    success: boolean;
    authorizationCode?: string;
    azulOrderId?: string;
    responseMessage?: string;
    errorDescription?: string;
  };
}

const TEST_CARDS = [
  { 
    name: 'Frictionless con 3DS Method', 
    number: '4265880000000007', 
    expiration: '202812',
    expected: 'Aprobado con Method',
    badge: 'default' as const
  },
  { 
    name: 'Frictionless sin 3DS Method', 
    number: '4147463011110117',
    expiration: '202812',
    expected: 'Aprobado directo',
    badge: 'default' as const
  },
  { 
    name: 'Challenge con 3DS Method', 
    number: '4005520000000129',
    expiration: '202812',
    expected: 'Requiere autenticacion',
    badge: 'secondary' as const
  },
  { 
    name: 'Challenge sin 3DS Method', 
    number: '4761120010000492',
    expiration: '202812',
    expected: 'Challenge directo',
    badge: 'secondary' as const
  },
  { 
    name: 'Visa Estandar', 
    number: '4000000000000002',
    expiration: '202812',
    expected: 'Prueba generica Visa',
    badge: 'outline' as const
  },
  { 
    name: 'Mastercard Estandar', 
    number: '5555555555554444',
    expiration: '202812',
    expected: 'Prueba generica MC',
    badge: 'outline' as const
  },
];

export default function Test3DS() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<ThreeDSSession | null>(null);
  const [pollingStatus, setPollingStatus] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const [cardNumber, setCardNumber] = useState('4265880000000007');
  const [expMonth, setExpMonth] = useState('12');
  const [expYear, setExpYear] = useState('2028');
  const [cvv, setCvv] = useState('123');
  const [amount, setAmount] = useState('100.00');
  const [holderName, setHolderName] = useState('Test User');

  const getBrowserInfo = () => ({
    acceptHeader: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    ipAddress: '127.0.0.1',
    language: navigator.language || 'es-DO',
    colorDepth: screen.colorDepth,
    screenWidth: screen.width,
    screenHeight: screen.height,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    userAgent: navigator.userAgent,
    javaScriptEnabled: 'true',
    requestorChallengeIndicator: cardNumber === '4005520000000129' ? '04' : '01',
  });

  const pollSessionStatus = async (sessionId: string) => {
    setPollingStatus(true);
    let attempts = 0;
    const maxAttempts = 60;
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/azul/3ds/status/${sessionId}`);
        const data = await response.json();
        
        setSession(prev => ({ ...prev!, ...data }));
        
        if (data.status === 'COMPLETED' || data.status === 'FAILED' || data.status === 'ERROR') {
          setPollingStatus(false);
          if (data.result?.success) {
            toast({
              title: 'Pago Exitoso',
              description: `Codigo de autorizacion: ${data.result.authorizationCode}`,
            });
          } else {
            toast({
              title: 'Pago Fallido',
              description: data.result?.errorDescription || data.result?.responseMessage || 'Error desconocido',
              variant: 'destructive',
            });
          }
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setPollingStatus(false);
          toast({
            title: 'Timeout',
            description: 'La sesion expiro sin completar',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error polling status:', error);
        setPollingStatus(false);
      }
    };
    
    poll();
  };

  const initiate3DSPayment = async () => {
    setLoading(true);
    setSession(null);
    
    try {
      const amountNum = parseFloat(amount);
      const expiration = `${expYear}${expMonth.padStart(2, '0')}`;
      
      const payload = {
        cardNumber: cardNumber.replace(/\s/g, ''),
        expiration,
        cvc: cvv,
        amount: amountNum,
        cardHolderName: holderName,
        browserInfo: getBrowserInfo(),
        customOrderId: `TEST-${Date.now()}`,
      };
      
      const res = await apiRequest('POST', '/api/azul/3ds/initiate', payload);
      const data: ThreeDSSession = await res.json();
      
      setSession(data);
      
      if (data.threeDSMethodURL) {
        toast({
          title: '3DS Method Requerido',
          description: 'Ejecutando recoleccion de datos del navegador...',
        });
        pollSessionStatus(data.sessionId);
      } else if (data.requiresChallenge && data.challengeUrl) {
        toast({
          title: 'Challenge Requerido',
          description: 'Complete la autenticacion en el iframe',
        });
        pollSessionStatus(data.sessionId);
      } else if (data.status === 'COMPLETED') {
        if (data.result?.success) {
          toast({
            title: 'Pago Exitoso (Frictionless)',
            description: `Codigo: ${data.result.authorizationCode}`,
          });
        } else {
          toast({
            title: 'Pago Fallido',
            description: data.result?.errorDescription || 'Error en el pago',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      console.error('Error initiating 3DS:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error al iniciar pago 3DS',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectTestCard = (card: typeof TEST_CARDS[0]) => {
    setCardNumber(card.number);
    const exp = card.expiration;
    setExpYear(exp.substring(0, 4));
    setExpMonth(exp.substring(4, 6));
    setSession(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'FAILED':
      case 'ERROR':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'PENDING_3DS_METHOD':
      case 'PENDING_CHALLENGE':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-500">Completado</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Fallido</Badge>;
      case 'ERROR':
        return <Badge variant="destructive">Error</Badge>;
      case 'PENDING_3DS_METHOD':
        return <Badge variant="secondary">3DS Method</Badge>;
      case 'PENDING_CHALLENGE':
        return <Badge variant="secondary">Challenge</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <a href="/" className="text-muted-foreground hover:text-foreground p-2 -ml-2">
            <ArrowLeft className="h-5 w-5" />
          </a>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
              <span className="truncate">Prueba 3D Secure 2.0</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Prueba el flujo de pagos con autenticacion 3DS de Azul
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
              Tarjetas de Prueba Azul
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Selecciona una tarjeta para probar diferentes escenarios de 3DS
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-2 sm:gap-3">
              {TEST_CARDS.map((card) => (
                <button
                  key={card.number}
                  type="button"
                  onClick={() => selectTestCard(card)}
                  data-testid={`card-${card.number}`}
                  className={`p-3 sm:p-4 rounded-lg border text-left transition-colors hover-elevate ${
                    cardNumber === card.number 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base">{card.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground font-mono truncate">
                        {card.number.replace(/(\d{4})/g, '$1 ').trim()}
                      </p>
                    </div>
                    <Badge variant={card.badge} className="w-fit text-xs">
                      {card.expected}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">Datos de la Tarjeta</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Los datos se envian de forma segura al servidor
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="cardNumber" className="text-sm">Numero de Tarjeta</Label>
                <Input
                  id="cardNumber"
                  data-testid="input-card-number"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4265 8800 0000 0007"
                  maxLength={19}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="holderName" className="text-sm">Nombre del Titular</Label>
                <Input
                  id="holderName"
                  data-testid="input-holder-name"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder="JOHN DOE"
                  className="text-sm"
                />
              </div>
            </div>
            
            <div className="grid gap-3 grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="expMonth" className="text-sm">Mes</Label>
                <Input
                  id="expMonth"
                  data-testid="input-exp-month"
                  value={expMonth}
                  onChange={(e) => setExpMonth(e.target.value)}
                  placeholder="12"
                  maxLength={2}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expYear" className="text-sm">Ano</Label>
                <Input
                  id="expYear"
                  data-testid="input-exp-year"
                  value={expYear}
                  onChange={(e) => setExpYear(e.target.value)}
                  placeholder="2028"
                  maxLength={4}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv" className="text-sm">CVV</Label>
                <Input
                  id="cvv"
                  data-testid="input-cvv"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  placeholder="123"
                  maxLength={4}
                  type="password"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm">Monto (RD$)</Label>
              <Input
                id="amount"
                data-testid="input-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100.00"
                className="text-sm"
              />
            </div>

            <Button 
              onClick={initiate3DSPayment} 
              disabled={loading || pollingStatus}
              className="w-full"
              data-testid="button-pay"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  Procesando...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Pagar con 3D Secure
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {session && (
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                {getStatusIcon(session.status)}
                Estado de la Sesion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-2 text-sm">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-muted-foreground">Session ID:</span>
                  <span className="font-mono text-xs break-all">{session.sessionId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Estado:</span>
                  {getStatusBadge(session.status)}
                </div>
                {session.threeDSServerTransID && (
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-muted-foreground">3DS Trans ID:</span>
                    <span className="font-mono text-xs break-all">{session.threeDSServerTransID}</span>
                  </div>
                )}
              </div>

              {pollingStatus && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                  Esperando respuesta...
                </div>
              )}

              {session.threeDSMethodURL && session.status === 'PENDING_3DS_METHOD' && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Ejecutando 3DS Method (invisible):
                    </p>
                    <iframe
                      ref={iframeRef}
                      src={session.threeDSMethodURL}
                      className="w-full h-1 border-0"
                      title="3DS Method"
                      data-testid="iframe-3ds-method"
                    />
                  </div>
                </>
              )}

              {session.challengeUrl && session.status === 'PENDING_CHALLENGE' && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Complete la autenticacion:
                    </p>
                    <iframe
                      src={session.challengeUrl}
                      className="w-full h-80 sm:h-96 border rounded-lg"
                      title="3DS Challenge"
                      data-testid="iframe-3ds-challenge"
                    />
                  </div>
                </>
              )}

              {session.result && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm sm:text-base">Resultado del Pago</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Exitoso:</span>
                        <span>{session.result.success ? 'Si' : 'No'}</span>
                      </div>
                      {session.result.authorizationCode && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Codigo Autorizacion:</span>
                          <span className="font-mono">{session.result.authorizationCode}</span>
                        </div>
                      )}
                      {session.result.azulOrderId && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Azul Order ID:</span>
                          <span className="font-mono">{session.result.azulOrderId}</span>
                        </div>
                      )}
                      {session.result.responseMessage && (
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                          <span className="text-muted-foreground">Mensaje:</span>
                          <span className="text-right">{session.result.responseMessage}</span>
                        </div>
                      )}
                      {session.result.errorDescription && (
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                          <span className="text-muted-foreground">Error:</span>
                          <span className="text-red-500 text-right">{session.result.errorDescription}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">Informacion Tecnica</CardTitle>
          </CardHeader>
          <CardContent className="text-xs sm:text-sm text-muted-foreground space-y-1 pt-0">
            <p><strong>Ambiente:</strong> Sandbox (pruebas.azul.com.do)</p>
            <p><strong>Merchant ID:</strong> 39038540035</p>
            <p><strong>Flujos:</strong> Frictionless, 3DS Method, Challenge</p>
            <p className="break-all"><strong>Callback:</strong> https://app.gruard.com/api/azul/3ds/callback</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
