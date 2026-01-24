import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AcquisitionData } from '@/types/superAdmin';

interface AcquisitionChartProps {
  data: AcquisitionData[];
  loading?: boolean;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--muted-foreground))',
];

const sourceLabels: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  telegram: 'Telegram',
  referral: 'Реферал',
  exhibition: 'Выставка',
  google_ads: 'Google Ads',
  organic: 'Органика',
  other: 'Другое',
};

export function AcquisitionChart({ data, loading }: AcquisitionChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    name: sourceLabels[item.source] || item.source,
    fill: COLORS[index % COLORS.length],
  }));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Источники привлечения</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Источники привлечения</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pie">
          <TabsList className="mb-4">
            <TabsTrigger value="pie">Диаграмма</TabsTrigger>
            <TabsTrigger value="bar">Конверсия</TabsTrigger>
          </TabsList>

          <TabsContent value="pie">
            <div className="h-[300px]">
              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Нет данных
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="signups"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ payload }) => {
                        if (!payload?.length) return null;
                        const item = payload[0].payload;
                        return (
                          <div className="bg-popover border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Регистраций: {item.signups}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Конверсия: {item.conversionRate}%
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Legend 
                      formatter={(value) => <span className="text-sm">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bar">
            <div className="h-[300px]">
              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Нет данных
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number) => [`${value}%`, 'Конверсия']}
                      content={({ payload }) => {
                        if (!payload?.length) return null;
                        const item = payload[0].payload;
                        return (
                          <div className="bg-popover border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm">
                              {item.converted} из {item.signups} ({item.conversionRate}%)
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar 
                      dataKey="conversionRate" 
                      fill="hsl(var(--chart-2))"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
