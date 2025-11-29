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
import { Camera, Loader2, User, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDriver?: boolean;
  currentPhotoUrl?: string | null;
  conductorData?: {
    licencia: string;
    placaGrua: string;
    marcaGrua: string;
    modeloGrua: string;
  };
}

export function EditProfileModal({
  open,
  onOpenChange,
  isDriver = false,
  currentPhotoUrl,
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
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
  const displayPhotoUrl = previewUrl || currentPhotoUrl;

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
                disabled={isLoading}
                data-testid="button-change-photo"
              >
                <Camera className="w-4 h-4" />
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

            {isDriver && !currentPhotoUrl && !selectedFile && (
              <Alert variant="destructive" className="text-sm">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Como conductor, es obligatorio subir una foto de perfil donde se vea tu rostro claramente
                </AlertDescription>
              </Alert>
            )}

            {isDriver && (
              <p className="text-xs text-muted-foreground text-center">
                Tu foto debe mostrar claramente tu rostro para identificación
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  disabled={isLoading}
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
                  disabled={isLoading}
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
              disabled={isLoading}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading}
              data-testid="button-save"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
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
