import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Mail, Phone, Star, Truck, LogOut } from 'lucide-react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import type { Conductor } from '@shared/schema';

export default function DriverProfile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const { data: driverData } = useQuery<Conductor>({
    queryKey: ['/api/drivers/me'],
  });

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
