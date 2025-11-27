import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Building2,
  Plus,
  Edit,
  Power,
  Search,
} from 'lucide-react';

interface Aseguradora {
  id: string;
  userId: string;
  nombreEmpresa: string;
  rnc: string;
  telefono: string | null;
  direccion: string | null;
  emailContacto: string | null;
  personaContacto: string | null;
  activo: boolean;
  createdAt: string;
  user?: {
    email: string;
  };
}

interface CreateAseguradoraData {
  email: string;
  password: string;
  nombreEmpresa: string;
  rnc: string;
  telefono: string;
  direccion: string;
  emailContacto: string;
  personaContacto: string;
}

export default function AdminAseguradoras() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedAseguradora, setSelectedAseguradora] = useState<Aseguradora | null>(null);
  
  const [formData, setFormData] = useState<CreateAseguradoraData>({
    email: '',
    password: '',
    nombreEmpresa: '',
    rnc: '',
    telefono: '',
    direccion: '',
    emailContacto: '',
    personaContacto: '',
  });

  const { data: aseguradoras, isLoading } = useQuery<Aseguradora[]>({
    queryKey: ['/api/admin/aseguradoras'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateAseguradoraData) => {
      return apiRequest('/api/admin/aseguradoras', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/aseguradoras'] });
      toast({
        title: 'Aseguradora creada',
        description: 'La compañía de seguros ha sido registrada exitosamente.',
      });
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la aseguradora.',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Aseguradora> }) => {
      return apiRequest(`/api/admin/aseguradoras/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/aseguradoras'] });
      toast({
        title: 'Aseguradora actualizada',
        description: 'Los datos han sido actualizados.',
      });
      setShowEditDialog(false);
      setSelectedAseguradora(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar la aseguradora.',
        variant: 'destructive',
      });
    },
  });

  const toggleActivoMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/aseguradoras/${id}/toggle-activo`, {
        method: 'PUT',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/aseguradoras'] });
      toast({
        title: 'Estado actualizado',
        description: 'El estado de la aseguradora ha sido cambiado.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cambiar el estado.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      nombreEmpresa: '',
      rnc: '',
      telefono: '',
      direccion: '',
      emailContacto: '',
      personaContacto: '',
    });
  };

  const handleCreate = () => {
    if (!formData.email || !formData.password || !formData.nombreEmpresa || !formData.rnc) {
      toast({
        title: 'Error',
        description: 'Por favor completa los campos obligatorios.',
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = () => {
    if (!selectedAseguradora) return;
    updateMutation.mutate({
      id: selectedAseguradora.id,
      data: {
        nombreEmpresa: selectedAseguradora.nombreEmpresa,
        rnc: selectedAseguradora.rnc,
        telefono: selectedAseguradora.telefono,
        direccion: selectedAseguradora.direccion,
        emailContacto: selectedAseguradora.emailContacto,
        personaContacto: selectedAseguradora.personaContacto,
      },
    });
  };

  const filteredAseguradoras = aseguradoras?.filter((a) =>
    a.nombreEmpresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.rnc.includes(searchTerm) ||
    a.user?.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Gestión de Aseguradoras
          </h2>
          <p className="text-muted-foreground">
            Administra las compañías de seguros registradas en la plataforma
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-aseguradora">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Aseguradora
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Nueva Aseguradora</DialogTitle>
              <DialogDescription>
                Crea una cuenta para una nueva compañía de seguros
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email de Acceso *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@empresa.com"
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contraseña *</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Contraseña segura"
                    data-testid="input-password"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nombre de la Empresa *</Label>
                <Input
                  value={formData.nombreEmpresa}
                  onChange={(e) => setFormData({ ...formData, nombreEmpresa: e.target.value })}
                  placeholder="Seguros ABC"
                  data-testid="input-nombre-empresa"
                />
              </div>
              <div className="space-y-2">
                <Label>RNC *</Label>
                <Input
                  value={formData.rnc}
                  onChange={(e) => setFormData({ ...formData, rnc: e.target.value })}
                  placeholder="123456789"
                  data-testid="input-rnc"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="809-555-1234"
                    data-testid="input-telefono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Persona de Contacto</Label>
                  <Input
                    value={formData.personaContacto}
                    onChange={(e) => setFormData({ ...formData, personaContacto: e.target.value })}
                    placeholder="Juan Pérez"
                    data-testid="input-persona-contacto"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email de Contacto</Label>
                <Input
                  type="email"
                  value={formData.emailContacto}
                  onChange={(e) => setFormData({ ...formData, emailContacto: e.target.value })}
                  placeholder="contacto@empresa.com"
                  data-testid="input-email-contacto"
                />
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  placeholder="Calle Principal #123"
                  data-testid="input-direccion"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} data-testid="button-cancel-create">
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                data-testid="button-submit-create"
              >
                {createMutation.isPending ? 'Creando...' : 'Crear Aseguradora'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {filteredAseguradoras?.length || 0} Aseguradoras Registradas
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, RNC o email..."
                className="pl-9 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAseguradoras?.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No hay aseguradoras registradas</p>
              <p className="text-sm text-muted-foreground">
                Crea la primera aseguradora para comenzar
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>RNC</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAseguradoras?.map((aseguradora) => (
                  <TableRow key={aseguradora.id} data-testid={`row-aseguradora-${aseguradora.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{aseguradora.nombreEmpresa}</p>
                        <p className="text-xs text-muted-foreground">{aseguradora.telefono}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{aseguradora.rnc}</Badge>
                    </TableCell>
                    <TableCell>{aseguradora.user?.email}</TableCell>
                    <TableCell>
                      {aseguradora.personaContacto && (
                        <div>
                          <p className="font-medium">{aseguradora.personaContacto}</p>
                          <p className="text-xs text-muted-foreground">{aseguradora.emailContacto}</p>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={aseguradora.activo ? 'default' : 'secondary'} data-testid={`badge-status-${aseguradora.id}`}>
                        {aseguradora.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(aseguradora.createdAt).toLocaleDateString('es-DO')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAseguradora(aseguradora);
                            setShowEditDialog(true);
                          }}
                          data-testid={`button-edit-${aseguradora.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={aseguradora.activo ? 'destructive' : 'default'}
                          onClick={() => toggleActivoMutation.mutate(aseguradora.id)}
                          disabled={toggleActivoMutation.isPending}
                          data-testid={`button-toggle-${aseguradora.id}`}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Aseguradora</DialogTitle>
            <DialogDescription>
              Actualiza la información de la compañía de seguros
            </DialogDescription>
          </DialogHeader>
          {selectedAseguradora && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre de la Empresa</Label>
                <Input
                  value={selectedAseguradora.nombreEmpresa}
                  onChange={(e) =>
                    setSelectedAseguradora({ ...selectedAseguradora, nombreEmpresa: e.target.value })
                  }
                  data-testid="input-edit-nombre"
                />
              </div>
              <div className="space-y-2">
                <Label>RNC</Label>
                <Input
                  value={selectedAseguradora.rnc}
                  onChange={(e) =>
                    setSelectedAseguradora({ ...selectedAseguradora, rnc: e.target.value })
                  }
                  data-testid="input-edit-rnc"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={selectedAseguradora.telefono || ''}
                    onChange={(e) =>
                      setSelectedAseguradora({ ...selectedAseguradora, telefono: e.target.value })
                    }
                    data-testid="input-edit-telefono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Persona de Contacto</Label>
                  <Input
                    value={selectedAseguradora.personaContacto || ''}
                    onChange={(e) =>
                      setSelectedAseguradora({ ...selectedAseguradora, personaContacto: e.target.value })
                    }
                    data-testid="input-edit-persona"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email de Contacto</Label>
                <Input
                  type="email"
                  value={selectedAseguradora.emailContacto || ''}
                  onChange={(e) =>
                    setSelectedAseguradora({ ...selectedAseguradora, emailContacto: e.target.value })
                  }
                  data-testid="input-edit-email-contacto"
                />
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input
                  value={selectedAseguradora.direccion || ''}
                  onChange={(e) =>
                    setSelectedAseguradora({ ...selectedAseguradora, direccion: e.target.value })
                  }
                  data-testid="input-edit-direccion"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} data-testid="button-cancel-edit">
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              disabled={updateMutation.isPending}
              data-testid="button-submit-edit"
            >
              {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
