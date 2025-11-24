import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, Star, Truck, LogOut, FileText, Upload, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/FileUpload';
import type { Conductor, Documento } from '@shared/schema';

const REQUIRED_DOCUMENTS = [
  { tipo: 'licencia', label: 'Licencia de Conducir' },
  { tipo: 'matricula', label: 'Matrícula del Vehículo' },
  { tipo: 'seguro_grua', label: 'Seguro de la Grúa' },
  { tipo: 'foto_vehiculo', label: 'Foto del Vehículo' },
  { tipo: 'cedula_frontal', label: 'Cédula (Frente)' },
  { tipo: 'cedula_trasera', label: 'Cédula (Reverso)' },
];

export default function DriverProfile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const { data: driverData } = useQuery<Conductor>({
    queryKey: ['/api/drivers/me'],
  });

  const { data: documentos = [] } = useQuery<Documento[]>({
    queryKey: ['/api/documentos/user', user?.id],
    enabled: !!user,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, tipo }: { file: File; tipo: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipo', tipo);

      // Use fetch directly for FormData (apiRequest expects JSON)
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al subir el documento');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate both document endpoints for cache consistency
      queryClient.invalidateQueries({ queryKey: ['/api/documentos/user', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents/my-documents'] });
      
      toast({
        title: 'Documento subido',
        description: 'El documento se ha subido correctamente y está pendiente de revisión',
      });
      setUploadingDoc(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al subir documento',
        description: error.message,
        variant: 'destructive',
      });
      setUploadingDoc(null);
    },
  });

  const getDocumentStatus = (tipo: string) => {
    const doc = documentos.find(d => d.tipo === tipo);
    return doc;
  };

  const handleFileSelect = (file: File, tipo: string) => {
    setUploadingDoc(tipo);
    uploadMutation.mutate({ file, tipo });
  };

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Mi Perfil</h1>

      <Card className="p-6 mb-4">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="w-20 h-20">
            <AvatarFallback className="text-2xl">
              {user.nombre[0]}{user.apellido[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-bold" data-testid="text-username">
              {user.nombre} {user.apellido}
            </h2>
            {user.calificacionPromedio && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">
                  {parseFloat(user.calificacionPromedio as string).toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Correo</p>
              <p className="font-medium" data-testid="text-email">{user.email}</p>
            </div>
          </div>

          {user.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium" data-testid="text-phone">{user.phone}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Tipo de usuario</p>
              <p className="font-medium capitalize">{user.userType}</p>
            </div>
          </div>
        </div>
      </Card>

      {driverData && (
        <>
          <Card className="p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Información de la Grúa</h3>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Licencia</p>
                <p className="font-medium" data-testid="text-licencia">{driverData.licencia}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Placa</p>
                <p className="font-medium" data-testid="text-placa">{driverData.placaGrua}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Marca</p>
                  <p className="font-medium" data-testid="text-marca">{driverData.marcaGrua}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Modelo</p>
                  <p className="font-medium" data-testid="text-modelo">{driverData.modeloGrua}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Documentos</h3>
            </div>

            <div className="space-y-4">
              {REQUIRED_DOCUMENTS.map((docType) => {
                const documento = getDocumentStatus(docType.tipo);
                const isUploading = uploadingDoc === docType.tipo;

                return (
                  <div key={docType.tipo} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">
                        {docType.label}
                      </label>
                      {documento && (
                        <Badge
                          variant={
                            documento.estado === 'aprobado'
                              ? 'default'
                              : documento.estado === 'rechazado'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="gap-1"
                        >
                          {documento.estado === 'aprobado' && (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          {documento.estado === 'rechazado' && (
                            <XCircle className="w-3 h-3" />
                          )}
                          {documento.estado === 'pendiente' && (
                            <Clock className="w-3 h-3" />
                          )}
                          {documento.estado === 'aprobado' ? 'Aprobado' : documento.estado === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                        </Badge>
                      )}
                    </div>

                    {documento?.estado === 'rechazado' && documento.motivoRechazo && (
                      <p className="text-sm text-destructive">
                        Motivo: {documento.motivoRechazo}
                      </p>
                    )}

                    <FileUpload
                      onFileSelect={(file) => handleFileSelect(file, docType.tipo)}
                      disabled={isUploading}
                      label=""
                      helperText={
                        isUploading
                          ? 'Subiendo documento...'
                          : documento
                          ? 'Subir nuevo documento'
                          : 'Arrastra un archivo o haz clic para seleccionar'
                      }
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      <Button
        variant="destructive"
        className="w-full"
        onClick={handleLogout}
        data-testid="button-logout"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Cerrar Sesión
      </Button>
    </div>
  );
}
