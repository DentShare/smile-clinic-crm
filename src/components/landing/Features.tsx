import { 
  Users, 
  Calendar, 
  CreditCard, 
  FileText, 
  Package, 
  BarChart3,
  QrCode,
  Shield
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Users,
    title: 'Учёт пациентов',
    description: 'Полная история лечения, интерактивная зубная формула и медицинские карты'
  },
  {
    icon: Calendar,
    title: 'Умное расписание',
    description: 'Визуальный календарь по врачам, напоминания пациентам через SMS и Telegram'
  },
  {
    icon: CreditCard,
    title: 'Финансы',
    description: 'Приём оплат, рассрочки, интеграция с фискализацией и сплит-платежи'
  },
  {
    icon: FileText,
    title: 'Документы',
    description: 'Электронная подпись договоров, согласий и актов прямо на планшете'
  },
  {
    icon: Package,
    title: 'Склад материалов',
    description: 'Учёт расходников, автоматическое списание и уведомления о минимальных остатках'
  },
  {
    icon: BarChart3,
    title: 'Аналитика',
    description: 'Выручка, конверсия, загрузка врачей — всё в понятных дашбордах'
  },
  {
    icon: QrCode,
    title: 'Паспорт имплантов',
    description: 'QR-код для пациента со всей информацией об установленных имплантах'
  },
  {
    icon: Shield,
    title: 'Безопасность',
    description: 'Шифрование данных, резервное копирование и ролевой доступ'
  }
];

export const Features = () => {
  return (
    <section className="py-20 lg:py-32 bg-muted/30" id="features">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Всё для управления клиникой
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Замените Excel, бумажные журналы и разрозненные программы на одну современную систему
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card 
              key={feature.title} 
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50"
            >
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
