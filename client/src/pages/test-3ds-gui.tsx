import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ShieldCheck, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Test3DSPage() {
  const { toast } = useToast();
  const [azulOrderId, setAzulOrderId] = useState<string>("");
  const [cres, setCres] = useState<string>("");
  const [step, setStep] = useState<number>(1);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  // Paso 1: Iniciar Pago
  const initMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/test/azul-3ds-challenge");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.result?.requires3DS) {
        setAzulOrderId(data.result.azulOrderId);
        setPaymentResult(data.result);
        if (data.result.acsUrl && data.result.creq) {
          setStep(3); // Salto directo a desafío si tiene URL y CReq
        } else if (data.result.methodForm) {
          setStep(2); // Requiere 3DS Method (Paso 4 del script)
        }
        toast({ title: "3DS Iniciado", description: "La tarjeta requiere autenticación." });
      } else if (data.result?.success) {
        setPaymentResult(data.result);
        setStep(5);
        toast({ title: "Pago Exitoso", description: "El pago se completó sin fricción." });
      } else {
        toast({ 
          title: "Error", 
          description: data.result?.errorDescription || "Error al iniciar pago",
          variant: "destructive" 
        });
      }
    },
  });

  // Paso 4: Procesar CRes
  const processChallengeMutation = useMutation({
    mutationFn: async () => {
      // Nota: En una app real, esto iría a un endpoint de backend que llama a ProcessThreeDSChallenge
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
        toast({ title: "Autenticación Completada", description: "El pago ha sido procesado." });
      }
    }
  });

  // Paso 2: Continuar tras Method
  const continueMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/test/azul-3ds-continue", {
        azulOrderId,
        status: 'RECEIVED'
      });
      return res.json();
    },
    onSuccess: (data) => {
      setPaymentResult(data);
      if (data.requires3DS && data.acsUrl && data.creq) {
        setStep(3);
        toast({ title: "Desafío Requerido", description: "Azul indica que se requiere el desafío 3DS." });
      } else if (data.success) {
        setStep(5);
        toast({ title: "Pago Exitoso", description: "El pago se completó tras el método." });
      } else {
        toast({ 
          title: "Error", 
          description: data.errorDescription || data.responseMessage || "Error al continuar 3DS",
          variant: "destructive" 
        });
      }
    }
  });

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Simulador 3D Secure</h1>
        </div>

        {/* PASO 1: INICIO */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Paso 1: Iniciar Transacción</CardTitle>
              <CardDescription>
                Usaremos la tarjeta de prueba 3DS Challenge (Visa ...0129)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => initMutation.mutate()} 
                disabled={initMutation.isPending}
                className="w-full"
              >
                {initMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Iniciar Pago de Prueba (RD$1.18)
              </Button>
            </CardContent>
          </Card>
        )}

        {/* PASO 2: 3DS METHOD (Simulación) */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Paso 2: 3DS Method</CardTitle>
              <CardDescription>
                El servidor de Azul requiere información del navegador.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>3D2METHOD Recibido</AlertTitle>
                <AlertDescription>
                  Simulando envío de huella digital del navegador...
                </AlertDescription>
              </Alert>
              <Button 
                onClick={() => continueMutation.mutate()} 
                disabled={continueMutation.isPending}
                className="w-full"
              >
                {continueMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Continuar al Desafío
              </Button>
            </CardContent>
          </Card>
        )}

        {/* PASO 3: DESAFÍO */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Paso 3: Desafío de Autenticación</CardTitle>
              <CardDescription>
                Debes completar la verificación con el emisor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted rounded-md space-y-2">
                <p className="text-sm font-medium">Instrucciones:</p>
                <ol className="text-xs text-muted-foreground list-decimal ml-4 space-y-1">
                  <li>Usa el helper (scripts/3ds-helper.html) o una herramienta externa.</li>
                  <li>URL: <code className="break-all">{paymentResult?.acsUrl}</code></li>
                  <li>CReq: <code className="break-all text-[10px]">{paymentResult?.creq}</code></li>
                  <li>OTP: 1234</li>
                </ol>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cres">Resultado del Desafío (CRes)</Label>
                <Input 
                  id="cres" 
                  value={cres} 
                  onChange={(e) => setCres(e.target.value)} 
                  placeholder="Pegue aquí el CRes obtenido"
                />
              </div>

              <Button 
                onClick={() => processChallengeMutation.mutate()} 
                disabled={!cres || processChallengeMutation.isPending}
                className="w-full"
              >
                {processChallengeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Finalizar Pago
              </Button>
            </CardContent>
          </Card>
        )}

        {/* PASO 5: RESULTADO */}
        {step === 5 && (
          <Card className={paymentResult?.success ? "border-green-500" : "border-red-500"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {paymentResult?.success ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
                Resultado de la Transacción
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Estado:</span>
                <span className="font-mono">{paymentResult?.isoCode || "Error"}</span>
                <span className="text-muted-foreground">Mensaje:</span>
                <span>{paymentResult?.responseMessage || paymentResult?.errorDescription}</span>
                <span className="text-muted-foreground">Azul Order ID:</span>
                <span className="font-mono">{paymentResult?.azulOrderId}</span>
                <span className="text-muted-foreground">Autorización:</span>
                <span className="font-mono">{paymentResult?.authorizationCode || "N/A"}</span>
              </div>
              
              <Button variant="outline" onClick={() => {
                setStep(1);
                setPaymentResult(null);
                setCres("");
              }} className="w-full">
                Realizar otra prueba
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
