import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Users, Calendar, Percent, Loader2, DollarSign, AlertTriangle, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useExcelExport } from '@/hooks/use-excel-export';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useClinicAnalytics } from '@/hooks/use-clinic-analytics';
import { formatCurrency } from '@/lib/formatters';

const chartConfig = {
  value: { label: 'Значение', color: 'hsl(var(--primary))' }
};

type DateRange = 'week' | 'month' | 'quarter';

const Analytics = () => {
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const { revenueData, conversionData, servicesData, paymentMethods, debtors, kpis, isLoading } = useClinicAnalytics(dateRange);
  const { exportRevenueReport } = useExcelExport();

  const dateRangeLabels: Record<DateRange, string> = {
    week: 'За неделю',
    month: 'За месяц',
    quarter: 'За квартал',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Аналитика</h1>
          <p className="text-muted-foreground">Статистика и отчёты клиники</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">За неделю</SelectItem>
              <SelectItem value="month">За месяц</SelectItem>
              <SelectItem value="quarter">За квартал</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" title="Экспорт выручки в Excel" onClick={() => exportRevenueReport(revenueData)}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Выручка</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">{dateRangeLabels[dateRange].toLowerCase()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Конверсия</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.conversionRate}%</div>
            <p className={`text-xs flex items-center gap-1 ${kpis.conversionGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {kpis.conversionGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {kpis.conversionGrowth >= 0 ? '+' : ''}{kpis.conversionGrowth}% к пред. периоду
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Средний чек</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.averageCheck)}</div>
            <p className="text-xs text-muted-foreground">за приём</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Новые пациенты</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.newPatients}</div>
            <p className="text-xs text-muted-foreground">{dateRangeLabels[dateRange].toLowerCase()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Загрузка врачей</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.doctorWorkload}%</div>
            <p className="text-xs text-muted-foreground">в среднем</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Выручка {dateRangeLabels[dateRange].toLowerCase()}</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={revenueData}>
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                  <ChartTooltip 
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} 
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Нет данных за выбранный период
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Воронка конверсии</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {conversionData.map((item) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.name}</span>
                    <span className="font-medium">{item.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all" 
                      style={{ 
                        width: `${item.value}%`, 
                        backgroundColor: item.color 
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Популярные услуги</CardTitle>
          </CardHeader>
          <CardContent>
            {servicesData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={servicesData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => {
                          if (name === 'value') return [`${value} шт.`, 'Количество'];
                          return [formatCurrency(Number(value)), 'Выручка'];
                        }}
                      />
                    }
                  />
                  <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Нет данных за выбранный период
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods & Debtors */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Способы оплаты</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethods.length > 0 ? (
              <div className="flex items-center gap-6">
                <ChartContainer config={chartConfig} className="h-[250px] w-[250px] flex-shrink-0">
                  <PieChart>
                    <Pie
                      data={paymentMethods}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {paymentMethods.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
                    />
                  </PieChart>
                </ChartContainer>
                <div className="space-y-2 flex-1 min-w-0">
                  {paymentMethods.map((method) => (
                    <div key={method.method} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: method.color }} />
                        <span className="text-sm truncate">{method.label}</span>
                      </div>
                      <span className="text-sm font-medium flex-shrink-0">{formatCurrency(method.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Нет данных за выбранный период
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Должники
              {debtors.length > 0 && (
                <Badge variant="destructive" className="ml-2">{debtors.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {debtors.length > 0 ? (
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Пациент</TableHead>
                      <TableHead>Телефон</TableHead>
                      <TableHead className="text-right">Долг</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {debtors.map((debtor) => (
                      <TableRow key={debtor.id}>
                        <TableCell className="font-medium">{debtor.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{debtor.phone || '—'}</TableCell>
                        <TableCell className="text-right text-destructive font-medium">
                          {formatCurrency(Math.abs(debtor.balance))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Должников нет
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
