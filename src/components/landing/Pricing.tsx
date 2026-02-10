import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, ChevronDown } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

/* ─── Period & doctor options ─── */
const periods = [
  { months: 3, discount: 0, label: '3 мес.' },
  { months: 6, discount: 10, label: '6 мес.' },
  { months: 12, discount: 20, label: '12 мес.' },
  { months: 24, discount: 30, label: '24 мес.' },
];

const doctorOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, '∞'] as const;
type DoctorOption = (typeof doctorOptions)[number];

/* ─── Plans ─── */
interface Plan {
  key: string;
  name: string;
  tagline: string;
  basePrice: number; // per doctor per month at 3 months
  popular?: boolean;
  features: { name: string; included: boolean }[];
}

const allFeatures = [
  'Регистратура',
  'Карточка пациента',
  'Расписание',
  'Медицинская карта',
  'Планы лечения',
  'Зубная формула',
  'Документация',
  'Листы ожидания',
  'Рассылки',
  'Программа лояльности',
  'Абонементы',
  'Склад материалов',
  'Расчёт ЗП',
  'Финансы',
  'Аналитика',
  'Выгрузка в Excel',
  'Чат-бот',
  'API интеграции',
];

const plans: Plan[] = [
  {
    key: 'basic',
    name: 'Базовый',
    tagline: 'Организуйте регистратуру и расписание',
    basePrice: 99_000,
    features: allFeatures.map((f) => ({
      name: f,
      included: ['Регистратура', 'Карточка пациента', 'Расписание'].includes(f),
    })),
  },
  {
    key: 'standard',
    name: 'Плановый',
    tagline: 'Планируйте лечение и автоматизируйте документацию',
    basePrice: 190_000,
    features: allFeatures.map((f) => ({
      name: f,
      included: ![
        'Программа лояльности',
        'Абонементы',
        'Склад материалов',
        'Расчёт ЗП',
        'Финансы',
        'Аналитика',
        'Чат-бот',
        'API интеграции',
      ].includes(f),
    })),
  },
  {
    key: 'strategic',
    name: 'Стратегический',
    tagline: 'Увеличивайте выручку, привлекая и удерживая клиентов',
    basePrice: 290_000,
    popular: true,
    features: allFeatures.map((f) => ({
      name: f,
      included: !['Склад материалов', 'Расчёт ЗП', 'Финансы', 'API интеграции'].includes(f),
    })),
  },
  {
    key: 'management',
    name: 'Управленческий',
    tagline: 'Полный контроль финансов, склада и команды',
    basePrice: 390_000,
    features: allFeatures.map((f) => ({ name: f, included: true })),
  },
];

/* ─── FAQ ─── */
const faqItems = [
  {
    q: 'Как начать работу?',
    a: 'Зарегистрируйтесь и получите 14 дней бесплатного пробного периода на любом тарифе. Настройте клинику за несколько минут.',
  },
  {
    q: 'Можно ли менять тариф?',
    a: 'Да, вы можете перейти на другой тариф в любое время. При повышении будет пересчитана стоимость за оставшийся период.',
  },
  {
    q: 'Как происходит оплата?',
    a: 'Оплата производится банковским переводом или картой. Мы выставляем счёт на выбранный период. Возможна оплата частями при подписке на 12+ месяцев.',
  },
  {
    q: 'Что включено в пробный период?',
    a: 'В пробный период доступны все функции выбранного тарифа без ограничений. По окончании 14 дней нужно выбрать тариф и оплатить подписку.',
  },
  {
    q: 'Есть ли обучение и поддержка?',
    a: 'Да, обучение и техническая поддержка включены во все тарифы. Мы предоставляем видеоуроки, документацию и помощь через чат 7 дней в неделю.',
  },
  {
    q: 'Сколько врачей можно подключить?',
    a: 'Количество врачей зависит от вашего тарифа. При необходимости подключения более 9 врачей свяжитесь с нами для индивидуального расчёта.',
  },
];

/* ─── Helpers ─── */
function formatPrice(n: number) {
  return n.toLocaleString('ru-RU');
}

/* ─── Component ─── */
export const Pricing = () => {
  const [selectedPeriod, setSelectedPeriod] = useState(0);
  const [selectedDoctors, setSelectedDoctors] = useState<number>(3); // index into doctorOptions

  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: configRef, isVisible: configVisible } = useScrollAnimation({ threshold: 0.1 });
  const { ref: plansRef, isVisible: plansVisible } = useScrollAnimation({ threshold: 0.05 });
  const { ref: faqRef, isVisible: faqVisible } = useScrollAnimation({ threshold: 0.1 });

  const period = periods[selectedPeriod];
  const doctorCount = doctorOptions[selectedDoctors];
  const doctorMultiplier = typeof doctorCount === 'number' ? doctorCount : 10;

  const calculatedPrices = useMemo(
    () =>
      plans.map((p) => {
        const monthly = Math.round(p.basePrice * doctorMultiplier * (1 - period.discount / 100));
        const total = monthly * period.months;
        return { monthly, total };
      }),
    [selectedPeriod, selectedDoctors]
  );

  return (
    <section className="py-20 lg:py-32" id="pricing">
      <div className="container max-w-7xl">
        {/* Header */}
        <div
          ref={headerRef}
          className={cn(
            'text-center mb-16 transition-all duration-700',
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Цены, тарифы и возможности
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Настройте тариф под свою клинику. 14 дней бесплатно на любом плане.
          </p>
        </div>

        {/* ─── Configurator ─── */}
        <div
          ref={configRef}
          className={cn(
            'grid grid-cols-1 md:grid-cols-2 gap-6 mb-16 transition-all duration-700',
            configVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          {/* Period selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Выберите период</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {periods.map((p, i) => (
                  <button
                    key={p.months}
                    onClick={() => setSelectedPeriod(i)}
                    className={cn(
                      'relative flex flex-col items-center px-5 py-3 rounded-lg border-2 transition-all text-sm font-medium',
                      selectedPeriod === i
                        ? 'border-primary bg-accent text-accent-foreground'
                        : 'border-border bg-card text-foreground hover:border-primary/40'
                    )}
                  >
                    <span className="font-semibold">{p.label}</span>
                    {p.discount > 0 && (
                      <Badge variant="secondary" className="mt-1 text-xs bg-primary/10 text-primary">
                        −{p.discount}%
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Doctor selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Количество врачей</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {doctorOptions.map((d, i) => (
                  <button
                    key={String(d)}
                    onClick={() => setSelectedDoctors(i)}
                    className={cn(
                      'w-10 h-10 rounded-lg border-2 flex items-center justify-center text-sm font-semibold transition-all',
                      selectedDoctors === i
                        ? 'border-primary bg-accent text-accent-foreground'
                        : 'border-border bg-card text-foreground hover:border-primary/40'
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Plan cards ─── */}
        <div
          ref={plansRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20"
        >
          {plans.map((plan, index) => {
            const price = calculatedPrices[index];
            return (
              <Card
                key={plan.key}
                className={cn(
                  'relative flex flex-col transition-all duration-500',
                  plan.popular
                    ? 'border-primary shadow-lg ring-1 ring-primary/20'
                    : 'border-border/50',
                  plansVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                )}
                style={{
                  transitionDelay: plansVisible ? `${index * 100}ms` : '0ms',
                }}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-4">
                    Хит
                  </Badge>
                )}

                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{plan.tagline}</p>

                  <div className="pt-4 space-y-0.5">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-sm text-muted-foreground">от</span>
                      <span className="text-3xl font-bold tracking-tight">
                        {formatPrice(price.monthly)}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">so'm/мес.</span>
                    {period.months > 3 && (
                      <p className="text-xs text-muted-foreground pt-1">
                        {formatPrice(price.total)} so'm за {period.months} мес.
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col pt-2">
                  {/* Feature list */}
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f.name} className="flex items-center gap-2.5 text-sm">
                        {f.included ? (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                        )}
                        <span className={cn(!f.included && 'text-muted-foreground/50')}>
                          {f.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    <Link to="/register">
                      {plan.key === 'management' ? 'Связаться' : 'Начать бесплатно'}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ─── FAQ ─── */}
        <div
          ref={faqRef}
          className={cn(
            'max-w-3xl mx-auto transition-all duration-700',
            faqVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <h3 className="text-2xl font-bold text-center mb-8">Часто задаваемые вопросы</h3>
          <Accordion type="single" collapsible className="space-y-3">
            {faqItems.map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border rounded-lg px-5 bg-card"
              >
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
