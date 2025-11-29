import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Users, Truck, FileText, DollarSign } from 'lucide-react';
import { MapboxMap } from '@/components/maps/MapboxMap';
import { useWebSocket } from '@/lib/websocket';
import type { Conductor, User, ServicioWithDetails } from '@shared/schema';

interface DashboardStats {
  totalUsers: number;
  totalDrivers: number;
  totalServices: number;
  totalRevenue: number;
  activeDrivers: number;
  pendingServices: number;
}

interface ConductorWithUser extends Conductor {
  user?: User;
}

interface ActiveService extends ServicioWithDetails {
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/dashboard'],
  });

  const { data: activeDrivers, refetch: refetchDrivers } = useQuery<ConductorWithUser[]>({
    queryKey: ['/api/admin/active-drivers'],
    refetchInterval: 10000,
  });

  const { data: allServices } = useQuery<ActiveService[]>({
    queryKey: ['/api/admin/services'],
    refetchInterval: 10000,
  });

  const activeServices = allServices?.filter(
    s => !['completado', 'cancelado'].includes(s.estado)
  ) || [];

  const { send } = useWebSocket((message) => {
    if (message.type === 'driver_location_update') {
      refetchDrivers();
    }
  });

  useEffect(() => {
    send({ type: 'join_admin_dashboard', payload: {} });
  }, [send]);

  const center = { lat: 18.4861, lng: -69.9312 };

  const markers = [
    ...(activeDrivers?.filter(d => d.ubicacionLat && d.ubicacionLng).map((driver) => {
      const hasActiveService = activeServices.some(s => s.conductorId === driver.userId);
      return {
        position: {
          lat: parseFloat(driver.ubicacionLat as string),
          lng: parseFloat(driver.ubicacionLng as string),
        },
        title: driver.user ? `${driver.user.nombre} ${driver.user.apellido}` : 'Conductor',
        color: hasActiveService ? '#eab308' : '#22c55e',
      };
    }) || []),
    ...(activeServices?.filter(s => s.origenLat && s.origenLng).map((service) => ({
      position: {
        lat: parseFloat(service.origenLat as string),
        lng: parseFloat(service.origenLng as string),
      },
      title: `Servicio - ${service.estado}`,
      color: '#ef4444',
    })) || []),
  ];

  if (statsLoading || !stats) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-20 bg-muted rounded" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Usuarios Totales',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      testId: 'stat-users',
    },
    {
      title: 'Conductores',
      value: stats.totalDrivers,
      description: `${activeDrivers?.length || 0} en línea`,
      icon: Truck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      testId: 'stat-drivers',
    },
    {
      title: 'Servicios',
      value: stats.totalServices,
      description: `${activeServices.length} activos`,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      testId: 'stat-services',
    },
    {
      title: 'Ingresos Totales',
      value: `RD$ ${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      testId: 'stat-revenue',
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="p-6" data-testid={stat.testId}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold mb-1">{stat.value}</p>
                  {stat.description && (
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                  )}
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="flex-1 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mapa en Tiempo Real</h2>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-muted-foreground">Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <span className="text-muted-foreground">En servicio</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-muted-foreground">Solicitud activa</span>
            </div>
          </div>
        </div>
        <MapboxMap
          center={center}
          zoom={12}
          markers={markers}
          className="w-full h-full min-h-[500px]"
        />
      </Card>
    </div>
  );
}
