import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChartDataPoint {
  periodo: string;
  monto: number;
}

interface SocioChartsProps {
  chartData: ChartDataPoint[];
  formatCurrency: (value: number | string) => string;
}

export default function SocioCharts({ chartData, formatCurrency }: SocioChartsProps) {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="periodo" 
            tick={{ fontSize: 12 }}
            tickLine={false}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={false}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip 
            formatter={(value: number) => [formatCurrency(value), 'Monto']}
            labelStyle={{ color: 'var(--foreground)' }}
            contentStyle={{ 
              backgroundColor: 'var(--background)', 
              border: '1px solid var(--border)',
              borderRadius: '8px'
            }}
          />
          <Bar 
            dataKey="monto" 
            fill="hsl(var(--primary))" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
