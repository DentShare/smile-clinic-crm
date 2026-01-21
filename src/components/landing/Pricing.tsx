import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '290 000',
    description: 'Для небольших клиник с 1-2 врачами',
    features: [
      'До 2 врачей',
      'До 500 пациентов',
      'Базовая аналитика',
      'Учёт пациентов',
      'Расписание',
      'Email поддержка'
    ],
    popular: false,
    cta: 'Начать бесплатно'
  },
  {
    name: 'Professional',
    price: '590 000',
    description: 'Для растущих клиник с командой врачей',
    features: [
      'До 10 врачей',
      'До 5000 пациентов',
      'Расширенная аналитика',
      'Зубная формула',
      'Паспорт имплантов',
      'Электронные документы',
      'Склад материалов',
      'Приоритетная поддержка'
    ],
    popular: true,
    cta: 'Начать бесплатно'
  },
  {
    name: 'Enterprise',
    price: 'По запросу',
    description: 'Для сетей клиник с особыми требованиями',
    features: [
      'Неограниченно врачей',
      'Неограниченно пациентов',
      'Мультиклиника',
      'API интеграции',
      'Выделенный менеджер',
      'SLA 99.9%',
      'Кастомизация',
      'Обучение персонала'
    ],
    popular: false,
    cta: 'Связаться'
  }
];

export const Pricing = () => {
  return (
    <section className="py-20 lg:py-32" id="pricing">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Простые и понятные тарифы
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            14 дней бесплатно на любом тарифе. Никаких скрытых платежей.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative flex flex-col ${
                plan.popular 
                  ? 'border-primary shadow-lg scale-105' 
                  : 'border-border/50'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Популярный
                </Badge>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.price !== 'По запросу' && (
                    <span className="text-muted-foreground"> so'm/мес</span>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  asChild 
                  className="w-full" 
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  <Link to="/register">{plan.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
