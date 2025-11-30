import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Users, Truck, FileText, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { MapboxMap } from '@/components/maps/MapboxMap';
import { useWebSocket } from '@/lib/websocket';
import { cn } from '@/lib/utils';
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
  const [showLegend, setShowLegend] = useState(false);
  
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
        type: 'driver' as const,
      };
    }) || []),
    ...(activeServices?.filter(s => s.origenLat && s.origenLng).map((service) => ({
      position: {
        lat: parseFloat(service.origenLat as string),
        lng: parseFloat(service.origenLng as string),
      },
      title: `Servicio - ${service.estado}`,
      color: '#ef4444',
      type: 'service' as const,
    })) || []),
  ];

  if (statsLoading || !stats) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 md:p-6 animate-pulse">
              <div className="h-16 md:h-20 bg-muted rounded" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Usuarios',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      testId: 'stat-users',
    },
    {
      title: 'Conductores',
      value: stats.totalDrivers,
      description: `${activeDrivers?.length || 0} en línea`,
      icon: Truck,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      testId: 'stat-drivers',
    },
    {
      title: 'Servicios',
      value: stats.totalServices,
      description: `${activeServices.length} activos`,
      icon: FileText,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      testId: 'stat-services',
    },
    {
      title: 'Ingresos',
      value: `RD$ ${stats.totalRevenue.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      testId: 'stat-revenue',
    },
  ];

  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="p-3 md:p-4" data-testid={stat.testId}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground mb-0.5 md:mb-1 truncate">{stat.title}</p>
                  <p className="text-lg md:text-2xl font-bold truncate">{stat.value}</p>
                  {stat.description && (
                    <p className="text-xs text-muted-foreground truncate">{stat.description}</p>
                  )}
                </div>
                <div className={`${stat.bgColor} p-2 md:p-3 rounded-lg flex-shrink-0`}>
                  <Icon className={`w-4 h-4 md:w-6 md:h-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <div className="p-3 md:p-4 border-b border-border flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-base md:text-lg font-semibold">Mapa en Tiempo Real</h2>
            
            <button 
              className="sm:hidden flex items-center justify-between text-sm text-muted-foreground"
              onClick={() => setShowLegend(!showLegend)}
              data-testid="button-toggle-legend"
            >
              <span>Leyenda</span>
              {showLegend ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <div className={cn(
              "flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm",
              "sm:flex",
              showLegend ? "flex" : "hidden"
            )}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-muted-foreground text-xs md:text-sm">Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span className="text-muted-foreground text-xs md:text-sm">En servicio</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-muted-foreground text-xs md:text-sm">Solicitud</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 relative min-h-[300px] md:min-h-[400px]">
          <MapboxMap
            center={center}
            zoom={12}
            markers={markers}
            className="absolute inset-0"
          />
        </div>
      </Card>
    </div>
  );
}
