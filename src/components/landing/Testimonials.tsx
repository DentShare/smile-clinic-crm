import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Азиз Каримов',
    role: 'Директор',
    clinic: 'DentaPro Clinic, Ташкент',
    avatar: 'АК',
    rating: 5,
    text: 'Перешли с Excel за неделю. Теперь вся история пациентов под рукой, администраторы не путаются с записями, а я вижу выручку в реальном времени.'
  },
  {
    name: 'Нигора Султанова',
    role: 'Главный врач',
    clinic: 'SmileDent, Самарканд',
    avatar: 'НС',
    rating: 5,
    text: 'Зубная формула — это то, чего нам не хватало. Вижу полную историю лечения каждого зуба. Пациенты в восторге от QR-паспорта имплантов.'
  },
  {
    name: 'Тимур Рахимов',
    role: 'Владелец',
    clinic: 'Family Dental, Бухара',
    avatar: 'ТР',
    rating: 5,
    text: 'Электронная подпись согласий сэкономила нам кучу бумаги и времени. Поддержка отвечает быстро, даже в выходные. Рекомендую!'
  }
];

export const Testimonials = () => {
  return (
    <section className="py-20 lg:py-32 bg-muted/30">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Нам доверяют клиники по всей стране
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Отзывы врачей и владельцев клиник, которые уже используют DentaClinic
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="border-border/50">
              <CardContent className="p-6">
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-foreground mb-6 leading-relaxed">
                  "{testimonial.text}"
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">{testimonial.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {testimonial.role}, {testimonial.clinic}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
