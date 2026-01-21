import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';
import { cn } from '@/lib/utils';

const screenshots = [
  {
    id: 'dashboard',
    title: 'Дашборд',
    description: 'Ключевые метрики клиники на одном экране',
    placeholder: (
      <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-muted-foreground">Скриншот дашборда</p>
        </div>
      </div>
    )
  },
  {
    id: 'calendar',
    title: 'Расписание',
    description: 'Визуальный календарь записей по врачам',
    placeholder: (
      <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-info/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-muted-foreground">Скриншот расписания</p>
        </div>
      </div>
    )
  },
  {
    id: 'patient',
    title: 'Карта пациента',
    description: 'Полная информация и история лечения',
    placeholder: (
      <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-success/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-muted-foreground">Скриншот карты пациента</p>
        </div>
      </div>
    )
  },
  {
    id: 'tooth-chart',
    title: 'Зубная формула',
    description: 'Интерактивная карта с историей изменений',
    placeholder: (
      <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-warning/20 flex items-center justify-center">
            <span className="text-3xl">🦷</span>
          </div>
          <p className="text-muted-foreground">Скриншот зубной формулы</p>
        </div>
      </div>
    )
  }
];

export const Screenshots = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: tabsRef, isVisible: tabsVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section className="py-20 lg:py-32" id="demo">
      <div className="container">
        {/* Header */}
        <div 
          ref={headerRef}
          className={cn(
            "text-center mb-12 transition-all duration-700",
            headerVisible 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-8"
          )}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Посмотрите как это работает
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Интуитивный интерфейс, который ваши сотрудники освоят за несколько часов
          </p>
        </div>

        {/* Tabs */}
        <div
          ref={tabsRef}
          className={cn(
            "transition-all duration-700 delay-200",
            tabsVisible 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-8"
          )}
        >
          <Tabs defaultValue="dashboard" className="max-w-5xl mx-auto">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              {screenshots.map((item) => (
                <TabsTrigger key={item.id} value={item.id} className="text-sm">
                  {item.title}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {screenshots.map((item) => (
              <TabsContent key={item.id} value={item.id}>
                <Card className="overflow-hidden border-border/50">
                  {item.placeholder}
                  <div className="p-6 bg-card">
                    <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </section>
  );
};
