import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDriver?: boolean;
  currentPhotoUrl?: string | null;
  cedulaVerificada?: boolean;
  conductorData?: {
    licencia: string;
    placaGrua: string;
    marcaGrua: string;
    modeloGrua: string;
  };
}

interface FaceValidationResult {
  verified: boolean;
  score: number;
  error?: string;
  message?: string;
  skipped?: boolean;
  requiresManualReview?: boolean;
}

export function EditProfileModal({
  open,
  onOpenChange,
  isDriver = false,
  currentPhotoUrl,
  cedulaVerificada = false,
  conductorData,
}: EditProfileModalProps) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [apellido, setApellido] = useState(user?.apellido || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [faceValidationStatus, setFaceValidationStatus] = useState<'idle' | 'validating' | 'success' | 'failed' | 'skipped'>('idle');
  const [faceValidationError, setFaceValidationError] = useState<string | null>(null);
  const [faceValidationScore, setFaceValidationScore] = useState<number | null>(null);
  
  const [licencia, setLicencia] = useState(conductorData?.licencia || '');
  const [placaGrua, setPlacaGrua] = useState(conductorData?.placaGrua || '');
  const [marcaGrua, setMarcaGrua] = useState(conductorData?.marcaGrua || '');
  const [modeloGrua, setModeloGrua] = useState(conductorData?.modeloGrua || '');

  const updateProfileMutation = useMutation({
    mutationFn: async (data: {
      nombre?: string;
      apellido?: string;
      phone?: string;
      conductorData?: {
        licencia?: string;
        placaGrua?: string;
        marcaGrua?: string;
        modeloGrua?: string;
      };
    }) => {
      const response = await apiRequest('PATCH', '/api/users/me', data);
      return response.json();
    },
    onSuccess: async () => {
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/me'] });
      toast({
        title: 'Perfil actualizado',
        description: 'Tu información ha sido actualizada correctamente',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al actualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch('/api/users/profile-photo', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al subir la foto');
      }

      return response.json();
    },
    onSuccess: async () => {
      await refreshUser();
      setSelectedFile(null);
      setPreviewUrl(null);
      setFaceValidationStatus('idle');
      setFaceValidationError(null);
      setFaceValidationScore(null);
      toast({
        title: 'Foto actualizada',
        description: 'Tu foto de perfil ha sido actualizada',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al subir foto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const validateFacePhoto = async (imageBase64: string): Promise<FaceValidationResult> => {
    try {
      const response = await fetch('/api/identity/verify-profile-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ image: imageBase64 }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          verified: false,
          score: 0,
          error: data.message || data.error || 'Error al validar la foto',
        };
      }
      
      return data;
    } catch (error: any) {
      return {
        verified: false,
        score: 0,
        error: error.message || 'Error de conexión al validar la foto',
      };
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Formato inválido',
          description: 'Solo se permiten imágenes (JPG, PNG)',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Archivo muy grande',
          description: 'El tamaño máximo es 5MB',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
      setFaceValidationStatus('idle');
      setFaceValidationError(null);
      setFaceValidationScore(null);
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setPreviewUrl(base64);
        
        if (isDriver) {
          setFaceValidationStatus('validating');
          
          try {
            const result = await validateFacePhoto(base64);
            
            if (result.skipped && result.requiresManualReview) {
              setFaceValidationStatus('skipped');
              setFaceValidationScore(null);
              toast({
                title: 'Validación no disponible',
                description: result.message || 'La foto será revisada manualmente por el equipo.',
              });
            } else if (result.verified) {
              setFaceValidationStatus('success');
              setFaceValidationScore(result.score);
              toast({
                title: 'Foto validada',
                description: `Rostro detectado correctamente (${Math.round(result.score * 100)}% de confianza)`,
              });
            } else {
              setFaceValidationStatus('failed');
              setFaceValidationError(result.error || result.message || 'No se pudo validar el rostro en la imagen');
              setFaceValidationScore(result.score);
              toast({
                title: 'Foto no válida',
                description: result.error || result.message || 'La foto no parece ser de un rostro humano válido',
                variant: 'destructive',
              });
            }
          } catch (error: any) {
            setFaceValidationStatus('failed');
            setFaceValidationError(error.message || 'Error al validar la foto');
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDriver && !currentPhotoUrl && !selectedFile) {
      toast({
        title: 'Foto requerida',
        description: 'Como conductor, debes subir una foto de perfil donde se vea tu rostro claramente',
        variant: 'destructive',
      });
      return;
    }

    if (isDriver && selectedFile && faceValidationStatus === 'failed') {
      toast({
        title: 'Foto no válida',
        description: 'Por favor, sube una foto donde se vea claramente tu rostro',
        variant: 'destructive',
      });
      return;
    }

    if (selectedFile) {
      await uploadPhotoMutation.mutateAsync(selectedFile);
    }

    const updateData: any = {};
    
    if (nombre !== user?.nombre) updateData.nombre = nombre;
    if (apellido !== user?.apellido) updateData.apellido = apellido;
    if (phone !== user?.phone) updateData.phone = phone;

    if (isDriver) {
      const conductorUpdates: any = {};
      if (licencia !== conductorData?.licencia) conductorUpdates.licencia = licencia;
      if (placaGrua !== conductorData?.placaGrua) conductorUpdates.placaGrua = placaGrua;
      if (marcaGrua !== conductorData?.marcaGrua) conductorUpdates.marcaGrua = marcaGrua;
      if (modeloGrua !== conductorData?.modeloGrua) conductorUpdates.modeloGrua = modeloGrua;
      
      if (Object.keys(conductorUpdates).length > 0) {
        updateData.conductorData = conductorUpdates;
      }
    }

    if (Object.keys(updateData).length > 0 || selectedFile) {
      if (Object.keys(updateData).length > 0) {
        await updateProfileMutation.mutateAsync(updateData);
      }
      onOpenChange(false);
    } else {
      onOpenChange(false);
    }
  };

  const isLoading = updateProfileMutation.isPending || uploadPhotoMutation.isPending;
  const isValidating = faceValidationStatus === 'validating';
  const displayPhotoUrl = previewUrl || currentPhotoUrl;

  const canSubmit = !isLoading && !isValidating && (
    !isDriver || 
    !selectedFile || 
    faceValidationStatus === 'success' || 
    faceValidationStatus === 'skipped'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogDescription>
            Actualiza tu información personal
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                {displayPhotoUrl ? (
                  <AvatarImage src={displayPhotoUrl} alt="Foto de perfil" />
                ) : null}
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground font-semibold">
                  {user?.nombre?.[0]}{user?.apellido?.[0]}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 rounded-full shadow-md"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isValidating}
                data-testid="button-change-photo"
              >
                {isValidating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-profile-photo"
              />
            </div>

            {isDriver && faceValidationStatus === 'validating' && (
              <Alert className="text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Validando rostro en la imagen...
                </AlertDescription>
              </Alert>
            )}

            {isDriver && faceValidationStatus === 'success' && (
              <Alert className="text-sm border-green-500/50 bg-green-50 dark:bg-green-950/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-400">
                  Rostro validado correctamente 
                  {faceValidationScore !== null && ` (${Math.round(faceValidationScore * 100)}%)`}
                </AlertDescription>
              </Alert>
            )}

            {isDriver && faceValidationStatus === 'failed' && (
              <Alert variant="destructive" className="text-sm">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {faceValidationError || 'No se detectó un rostro válido. Por favor, sube otra foto.'}
                </AlertDescription>
              </Alert>
            )}

            {isDriver && faceValidationStatus === 'skipped' && (
              <Alert className="text-sm">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Validación de rostro no disponible. La foto será revisada manualmente.
                </AlertDescription>
              </Alert>
            )}

            {isDriver && !currentPhotoUrl && !selectedFile && (
              <Alert variant="destructive" className="text-sm">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Como conductor, es obligatorio subir una foto de perfil donde se vea tu rostro claramente
                </AlertDescription>
              </Alert>
            )}

            {isDriver && faceValidationStatus === 'idle' && (
              <p className="text-xs text-muted-foreground text-center">
                Tu foto debe mostrar claramente tu rostro para identificación
              </p>
            )}
          </div>

          <div className="space-y-4">
            {isDriver && cedulaVerificada && (
              <Alert className="text-sm">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Tu nombre no puede ser modificado porque tu cédula ya fue verificada. El nombre debe coincidir con tu documento de identidad.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  disabled={isLoading || (isDriver && cedulaVerificada)}
                  data-testid="input-nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido</Label>
                <Input
                  id="apellido"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  placeholder="Tu apellido"
                  disabled={isLoading || (isDriver && cedulaVerificada)}
                  data-testid="input-apellido"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="809-555-0000"
                disabled={isLoading}
                data-testid="input-phone"
              />
            </div>

            {isDriver && (
              <>
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-semibold mb-3">Información de la Grúa</h4>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="licencia">Licencia</Label>
                      <Input
                        id="licencia"
                        value={licencia}
                        onChange={(e) => setLicencia(e.target.value)}
                        placeholder="Número de licencia"
                        disabled={isLoading}
                        data-testid="input-licencia"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="placaGrua">Placa de la Grúa</Label>
                      <Input
                        id="placaGrua"
                        value={placaGrua}
                        onChange={(e) => setPlacaGrua(e.target.value)}
                        placeholder="Placa del vehículo"
                        disabled={isLoading}
                        data-testid="input-placa"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="marcaGrua">Marca</Label>
                        <Input
                          id="marcaGrua"
                          value={marcaGrua}
                          onChange={(e) => setMarcaGrua(e.target.value)}
                          placeholder="Marca"
                          disabled={isLoading}
                          data-testid="input-marca"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="modeloGrua">Modelo</Label>
                        <Input
                          id="modeloGrua"
                          value={modeloGrua}
                          onChange={(e) => setModeloGrua(e.target.value)}
                          placeholder="Modelo"
                          disabled={isLoading}
                          data-testid="input-modelo"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isLoading || isValidating}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!canSubmit}
              data-testid="button-save"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
