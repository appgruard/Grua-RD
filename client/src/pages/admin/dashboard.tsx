import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Users, Truck, FileText, DollarSign } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalDrivers: number;
  totalServices: number;
  totalRevenue: number;
  activeDrivers: number;
  pendingServices: number;
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/dashboard'],
  });

  if (isLoading || !stats) {
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
      description: `${stats.activeDrivers} activos`,
      icon: Truck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      testId: 'stat-drivers',
    },
    {
      title: 'Servicios',
      value: stats.totalServices,
      description: `${stats.pendingServices} pendientes`,
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
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
    </div>
  );
}
