import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Truck, FileText, DollarSign, MapPin, Clock } from 'lucide-react';
import { loadGoogleMapsScript, type Coordinates } from '@/lib/maps';
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
  // Inherited from ServicioWithDetails
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/dashboard'],
  });

  const { data: activeDrivers, refetch: refetchDrivers } = useQuery<ConductorWithUser[]>({
    queryKey: ['/api/admin/active-drivers'],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const { data: allServices } = useQuery<ActiveService[]>({
    queryKey: ['/api/admin/services'],
    refetchInterval: 10000,
  });

  // Filter active services (not completed or cancelled)
  const activeServices = allServices?.filter(
    s => !['completado', 'cancelado'].includes(s.estado)
  ) || [];

  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);

  // Helper function to safely escape HTML to prevent XSS
  const escapeHtml = (unsafe: string): string => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // WebSocket for real-time updates
  const { send } = useWebSocket((message) => {
    if (message.type === 'driver_location_update') {
      refetchDrivers();
    }
  });

  useEffect(() => {
    send({ type: 'join_admin_dashboard', payload: {} });
  }, [send]);

  // Initialize map
  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => {
        if (mapRef.current && !map) {
          const newMap = new window.google.maps.Map(mapRef.current, {
            center: { lat: 18.4861, lng: -69.9312 }, // Santo Domingo, RD
            zoom: 12,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
          setMap(newMap);
        }
      })
      .catch((error) => {
        console.error('Map error:', error);
        setMapError('El mapa no está disponible. Configure la API de Google Maps para habilitar esta función.');
      });
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!map || !activeDrivers) return;

    // Clear existing markers and info windows
    markersRef.current.forEach(marker => marker.setMap(null));
    infoWindowsRef.current.forEach(infoWindow => infoWindow.close());
    markersRef.current = [];
    infoWindowsRef.current = [];

    // Add driver markers
    activeDrivers.forEach((driver) => {
      if (!driver.ubicacionLat || !driver.ubicacionLng) return;

      const position = {
        lat: parseFloat(driver.ubicacionLat as string),
        lng: parseFloat(driver.ubicacionLng as string),
      };

      // Different icon based on whether driver has active service
      const hasActiveService = activeServices.some(s => s.conductorId === driver.userId);
      const iconUrl = hasActiveService
        ? 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png' // In service
        : 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'; // Available

      const marker = new window.google.maps.Marker({
        position,
        map,
        title: driver.user ? `${driver.user.nombre} ${driver.user.apellido}` : 'Conductor',
        icon: iconUrl,
      });

      // Create info window with driver details (XSS-safe)
      const driverName = driver.user 
        ? escapeHtml(`${driver.user.nombre} ${driver.user.apellido}`) 
        : 'Conductor';
      const placa = escapeHtml(driver.placaGrua);
      const vehiculo = escapeHtml(`${driver.marcaGrua} ${driver.modeloGrua}`);
      const statusText = hasActiveService ? 'En servicio' : 'Disponible';
      const statusIcon = hasActiveService ? '🟡' : '🟢';

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px;">
              ${driverName}
            </h3>
            <p style="margin: 4px 0; font-size: 12px;">
              <strong>Placa:</strong> ${placa}
            </p>
            <p style="margin: 4px 0; font-size: 12px;">
              <strong>Vehículo:</strong> ${vehiculo}
            </p>
            <p style="margin: 4px 0; font-size: 12px;">
              <strong>Estado:</strong> ${statusIcon} ${statusText}
            </p>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindowsRef.current.forEach(iw => iw.close());
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
      infoWindowsRef.current.push(infoWindow);
    });

    // Add service markers
    activeServices.forEach((service) => {
      if (!service.origenLat || !service.origenLng) return;

      const position = {
        lat: parseFloat(service.origenLat as string),
        lng: parseFloat(service.origenLng as string),
      };

      const marker = new window.google.maps.Marker({
        position,
        map,
        title: `Servicio - ${service.estado}`,
        icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
      });

      const statusLabels: Record<string, string> = {
        pendiente: 'Buscando conductor',
        aceptado: 'Conductor en camino',
        conductor_en_sitio: 'Conductor en el punto',
        cargando: 'Cargando vehículo',
        en_progreso: 'En ruta al destino',
        completado: 'Completado',
        cancelado: 'Cancelado',
      };

      // XSS-safe values
      const clientName = service.cliente 
        ? escapeHtml(`${service.cliente.nombre} ${service.cliente.apellido}`)
        : 'N/A';
      const statusLabel = escapeHtml(statusLabels[service.estado] || service.estado);
      const origen = escapeHtml(service.origenDireccion || 'N/A');
      const conductorName = service.conductor
        ? escapeHtml(`${service.conductor.nombre} ${service.conductor.apellido}`)
        : null;

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 250px;">
            <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px;">
              Servicio Activo
            </h3>
            <p style="margin: 4px 0; font-size: 12px;">
              <strong>Cliente:</strong> ${clientName}
            </p>
            <p style="margin: 4px 0; font-size: 12px;">
              <strong>Estado:</strong> ${statusLabel}
            </p>
            <p style="margin: 4px 0; font-size: 12px;">
              <strong>Origen:</strong> ${origen}
            </p>
            ${conductorName ? `
              <p style="margin: 4px 0; font-size: 12px;">
                <strong>Conductor:</strong> ${conductorName}
              </p>
            ` : ''}
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindowsRef.current.forEach(iw => iw.close());
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
      infoWindowsRef.current.push(infoWindow);
    });
  }, [map, activeDrivers, activeServices]);

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
        {mapError ? (
          <div className="w-full h-full min-h-[500px] rounded-lg bg-muted flex items-center justify-center" data-testid="map-error">
            <div className="text-center p-4">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{mapError}</p>
            </div>
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-full min-h-[500px] rounded-lg" data-testid="map-realtime" />
        )}
      </Card>
    </div>
  );
}
