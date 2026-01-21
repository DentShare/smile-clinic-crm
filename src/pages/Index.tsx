import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

const features = [
  'Учёт пациентов и история лечения',
  'Интерактивная зубная формула',
  'Паспорт имплантов с QR-сканером',
  'Расписание и запись',
  'Склад и материалы',
  'Финансы и аналитика',
  'Документооборот с электронной подписью'
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="container flex flex-col items-center justify-center py-20 text-center">
        <span className="text-6xl mb-6">🦷</span>
        <h1 className="text-4xl font-bold mb-4">DentaClinic</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
          SaaS CRM для стоматологических клиник. Полный контроль над бизнесом в одной системе.
        </p>
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link to="/register">Начать бесплатно</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/login">Войти</Link>
          </Button>
        </div>
      </div>

      {/* Features */}
      <div className="container py-16">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Возможности платформы</CardTitle>
            <CardDescription>14 дней бесплатно, без ограничений</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
