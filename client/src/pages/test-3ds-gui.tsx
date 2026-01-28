import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ShieldCheck, CheckCircle2, XCircle, CreditCard, Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type TestType = 'method-challenge' | 'challenge-only';

export default function Test3DSPage() {
  const { toast } = useToast();
  const [azulOrderId, setAzulOrderId] = useState<string>("");
  const [cres, setCres] = useState<string>("");
  const [step, setStep] = useState<number>(1);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [methodFormHtml, setMethodFormHtml] = useState<string>("");
  const [challengeUrl, setChallengeUrl] = useState<string>("");
  const [challengeCreq, setChallengeCreq] = useState<string>("");
  const [testType, setTestType] = useState<TestType>('method-challenge');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Escuchar mensajes del iframe para capturar el CRes
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.cres) {
        setCres(event.data.cres);
        toast({ title: "CRes Recibido", description: "Procesando respuesta del challenge..." });
        processChallengeMutation.mutate();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [azulOrderId]);

  // Paso 1: Iniciar Pago 3DS
  const initMutation = useMutation({
    mutationFn: async () => {
      const endpoint = testType === 'challenge-only' 
        ? "/api/payments/azul/init-3ds-challenge-only-test"
        : "/api/payments/azul/init-3ds-friction-test";
      const res = await apiRequest("POST", endpoint);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.isoCode === '3D2METHOD' && data.methodForm) {
        setAzulOrderId(data.azulOrderId);
        setMethodFormHtml(data.methodForm);
        setPaymentResult(data);
        setStep(2);
        toast({ title: "3DS Method Requerido", description: "Ejecutando fingerprint del navegador..." });
      } else if ((data.isoCode === '3D' || data.requires3DS) && data.acsUrl && data.creq) {
        setAzulOrderId(data.azulOrderId);
        setChallengeUrl(data.acsUrl);
        setChallengeCreq(data.creq);
        setPaymentResult(data);
        setStep(3);
        toast({ title: "Challenge Requerido", description: "Se requiere autenticacion del emisor." });
      } else if (data.success) {
        setPaymentResult(data);
        setStep(5);
        toast({ title: "Pago Exitoso", description: "El pago se completo sin friccion." });
      } else {
        setPaymentResult(data);
        toast({ 
          title: "Error", 
          description: data.errorDescription || data.responseMessage || "Error al iniciar pago",
          variant: "destructive" 
        });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Paso 2: Continuar tras Method Notification
  const continueMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/test/azul-3ds-continue", {
        azulOrderId,
        status: 'RECEIVED'
      });
      return res.json();
    },
    onSuccess: (data) => {
      console.log('=== CONTINUE RESPONSE ===', data);
      setPaymentResult(data);
      if ((data.isoCode === '3D' || data.requires3DS) && data.acsUrl && data.creq) {
        console.log('Challenge detected, setting URL:', data.acsUrl);
        setChallengeUrl(data.acsUrl);
        setChallengeCreq(data.creq);
        setStep(3);
        toast({ title: "Challenge Requerido", description: "Redirigiendo al servidor de autenticacion..." });
      } else if (data.success) {
        setStep(5);
        toast({ title: "Pago Exitoso", description: "El pago se completo tras el method." });
      } else {
        toast({ 
          title: "Error", 
          description: data.errorDescription || data.responseMessage || "Error al continuar 3DS",
          variant: "destructive" 
        });
      }
    }
  });

  // Paso 4: Procesar CRes
  const processChallengeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payments/azul/process-challenge", {
        azulOrderId,
        cres
      });
      return res.json();
    },
    onSuccess: (data) => {
      setPaymentResult(data);
      setStep(5);
      if (data.success) {
        toast({ title: "Pago Completado", description: "La autenticacion fue exitosa." });
      } else {
        toast({ title: "Pago Fallido", description: data.responseMessage || "Error en autenticacion", variant: "destructive" });
      }
    }
  });

  // Efecto para ejecutar el MethodForm automaticamente
  useEffect(() => {
    if (step === 2 && methodFormHtml && iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(methodFormHtml);
        doc.close();
      }
      // Auto-continuar despues de 3 segundos
      const timer = setTimeout(() => {
        continueMutation.mutate();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step, methodFormHtml]);

  // El challenge ahora requiere click manual para redirigir (no iframe)
  // Esto evita problemas con X-Frame-Options del ACS

  const resetTest = () => {
    setStep(1);
    setPaymentResult(null);
    setCres("");
    setAzulOrderId("");
    setMethodFormHtml("");
    setChallengeUrl("");
    setChallengeCreq("");
    setTestType('method-challenge');
  };

  return (
    <div className="container mx-auto py-10 max-w-3xl">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Prueba 3D Secure con Friccion</h1>
            <p className="text-muted-foreground">Flujo completo de autenticacion segun documentacion Azul</p>
          </div>
        </div>

        {/* Indicador de pasos */}
        <div className="flex items-center justify-between px-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {s}
              </div>
              {s < 5 && <div className={`w-12 h-1 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* PASO 1: INICIO */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Paso 1: Seleccionar Tipo de Prueba
              </CardTitle>
              <CardDescription>
                Elige el flujo 3DS a probar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={testType === 'method-challenge' ? 'default' : 'outline'}
                  onClick={() => setTestType('method-challenge')}
                  className="h-auto py-4 flex flex-col gap-1"
                  data-testid="button-select-method-challenge"
                >
                  <span className="font-medium">Method + Challenge</span>
                  <span className="text-xs opacity-80">Tarjeta: 4005520000000129</span>
                </Button>
                <Button
                  variant={testType === 'challenge-only' ? 'default' : 'outline'}
                  onClick={() => setTestType('challenge-only')}
                  className="h-auto py-4 flex flex-col gap-1"
                  data-testid="button-select-challenge-only"
                >
                  <span className="font-medium">Challenge SIN Method</span>
                  <span className="text-xs opacity-80">Tarjeta: 4147463011110059</span>
                </Button>
              </div>
              
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm font-medium mb-2">Datos de la transaccion:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Tarjeta:</span>
                  <span className="font-mono">
                    {testType === 'challenge-only' ? '4147 4630 1111 0059' : '4005 5200 0000 0129'}
                  </span>
                  <span className="text-muted-foreground">Flujo:</span>
                  <span className="font-mono text-xs">
                    {testType === 'challenge-only' ? 'Desafio sin 3DSMethod' : 'Method + Challenge'}
                  </span>
                  <span className="text-muted-foreground">Vencimiento:</span>
                  <span className="font-mono">12/2028</span>
                  <span className="text-muted-foreground">CVV:</span>
                  <span className="font-mono">123</span>
                  <span className="text-muted-foreground">Monto:</span>
                  <span className="font-mono">RD$1.18</span>
                </div>
              </div>
              <Button 
                onClick={() => initMutation.mutate()} 
                disabled={initMutation.isPending}
                className="w-full"
                size="lg"
                data-testid="button-init-3ds"
              >
                {initMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                Iniciar Pago con 3DS
              </Button>
            </CardContent>
          </Card>
        )}

        {/* PASO 2: 3DS METHOD */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Paso 2-4: 3DS Method (Fingerprint)</CardTitle>
              <CardDescription>
                Enviando informacion del navegador al servidor del emisor...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>3D2METHOD en proceso</AlertTitle>
                <AlertDescription>
                  El MethodForm se ejecuta en segundo plano. Continuando automaticamente...
                </AlertDescription>
              </Alert>
              
              {/* Iframe oculto para el MethodForm */}
              <iframe 
                ref={iframeRef}
                className="w-full h-1 opacity-0"
                title="3DS Method Frame"
                sandbox="allow-scripts allow-forms allow-same-origin"
              />
              
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              
              <Button 
                onClick={() => continueMutation.mutate()} 
                disabled={continueMutation.isPending}
                variant="outline"
                className="w-full"
                data-testid="button-continue-3ds"
              >
                {continueMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Continuar manualmente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* PASO 3: CHALLENGE CON FRICCION */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Paso 5-7: Challenge de Autenticacion
              </CardTitle>
              <CardDescription>
                Completa la verificacion en el servidor del emisor. OTP de prueba: <strong>123456</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700">
                <ShieldCheck className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                <AlertTitle className="text-blue-900 dark:text-blue-100">Challenge Listo</AlertTitle>
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  Haz clic en "Ir al Challenge" para autenticarte. Usa el OTP <strong>123456</strong>.
                  Seras redirigido al servidor del emisor y luego volveras automaticamente.
                </AlertDescription>
              </Alert>
              
              {/* Debug info */}
              <div className="bg-muted p-3 rounded text-xs space-y-1 font-mono overflow-auto">
                <div><strong>ACS URL:</strong> {challengeUrl || 'NO URL'}</div>
                <div><strong>CReq:</strong> {challengeCreq ? `${challengeCreq.substring(0, 50)}...` : 'NO CREQ'}</div>
                <div><strong>AzulOrderId:</strong> {azulOrderId}</div>
              </div>
              
              {/* Formulario visible para enviar al ACS */}
              {challengeUrl && challengeCreq ? (
                <form 
                  method="POST" 
                  action={challengeUrl}
                  className="space-y-3"
                >
                  <input type="hidden" name="creq" value={challengeCreq} />
                  <Button 
                    type="submit"
                    className="w-full"
                    data-testid="button-go-to-challenge"
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Ir al Challenge (Redireccion)
                  </Button>
                </form>
              ) : (
                <Button 
                  disabled
                  className="w-full"
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Esperando datos del challenge...
                </Button>
              )}
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="cres">CRes (si el callback no funciona)</Label>
                  <Input 
                    id="cres" 
                    value={cres} 
                    onChange={(e) => setCres(e.target.value)} 
                    placeholder="Pegar CRes manualmente si es necesario"
                    data-testid="input-cres"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => processChallengeMutation.mutate()} 
                    disabled={!cres || processChallengeMutation.isPending}
                    className="flex-1"
                    data-testid="button-process-cres"
                  >
                    {processChallengeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Procesar CRes
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.open(challengeUrl, '_blank')}
                    data-testid="button-open-acs"
                  >
                    Abrir ACS
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PASO 5: RESULTADO */}
        {step === 5 && (
          <Card className={paymentResult?.success ? "border-green-500 border-2" : "border-red-500 border-2"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {paymentResult?.success ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
                {paymentResult?.success ? "Pago Exitoso" : "Pago Fallido"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm p-4 bg-muted rounded-md">
                <span className="text-muted-foreground">Codigo ISO:</span>
                <span className="font-mono font-medium">{paymentResult?.isoCode || "Error"}</span>
                <span className="text-muted-foreground">Mensaje:</span>
                <span>{paymentResult?.responseMessage || paymentResult?.errorDescription}</span>
                <span className="text-muted-foreground">Azul Order ID:</span>
                <span className="font-mono text-xs">{paymentResult?.azulOrderId || "N/A"}</span>
                <span className="text-muted-foreground">Autorizacion:</span>
                <span className="font-mono">{paymentResult?.authorizationCode || "N/A"}</span>
              </div>
              
              <Button 
                variant="outline" 
                onClick={resetTest} 
                className="w-full"
                data-testid="button-reset-test"
              >
                Realizar otra prueba
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
