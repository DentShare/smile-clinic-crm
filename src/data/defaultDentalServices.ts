// Default dental services template with reference prices (UZS)
// These are typical prices for Uzbekistan dental clinics

export interface DefaultService {
  name: string;
  category: string;
  price: number;
  duration_minutes: number;
  description?: string;
}

export const defaultDentalServices: DefaultService[] = [
  // Консультация и диагностика
  { name: 'Первичная консультация', category: 'Консультация', price: 50000, duration_minutes: 30, description: 'Осмотр, составление плана лечения' },
  { name: 'Повторная консультация', category: 'Консультация', price: 30000, duration_minutes: 20 },
  { name: 'Рентген (прицельный снимок)', category: 'Диагностика', price: 30000, duration_minutes: 10 },
  { name: 'Панорамный снимок (ОПТГ)', category: 'Диагностика', price: 100000, duration_minutes: 15 },
  { name: 'КТ (компьютерная томография)', category: 'Диагностика', price: 250000, duration_minutes: 20 },

  // Профессиональная гигиена
  { name: 'Профессиональная чистка (ультразвук)', category: 'Гигиена', price: 200000, duration_minutes: 45, description: 'Удаление зубного камня' },
  { name: 'Профессиональная чистка (Air Flow)', category: 'Гигиена', price: 250000, duration_minutes: 45, description: 'Удаление налёта и пигментации' },
  { name: 'Комплексная гигиена', category: 'Гигиена', price: 400000, duration_minutes: 60, description: 'Ультразвук + Air Flow + полировка' },
  { name: 'Фторирование', category: 'Гигиена', price: 100000, duration_minutes: 20 },

  // Терапия
  { name: 'Лечение кариеса (начальный)', category: 'Терапия', price: 250000, duration_minutes: 45 },
  { name: 'Лечение кариеса (средний)', category: 'Терапия', price: 350000, duration_minutes: 60 },
  { name: 'Лечение кариеса (глубокий)', category: 'Терапия', price: 450000, duration_minutes: 60 },
  { name: 'Лечение пульпита (1 канал)', category: 'Терапия', price: 500000, duration_minutes: 90 },
  { name: 'Лечение пульпита (2 канала)', category: 'Терапия', price: 700000, duration_minutes: 90 },
  { name: 'Лечение пульпита (3 канала)', category: 'Терапия', price: 900000, duration_minutes: 120 },
  { name: 'Лечение периодонтита', category: 'Терапия', price: 600000, duration_minutes: 90 },
  { name: 'Перелечивание канала', category: 'Терапия', price: 400000, duration_minutes: 60 },

  // Хирургия
  { name: 'Удаление зуба (простое)', category: 'Хирургия', price: 200000, duration_minutes: 30 },
  { name: 'Удаление зуба (сложное)', category: 'Хирургия', price: 400000, duration_minutes: 45 },
  { name: 'Удаление зуба мудрости', category: 'Хирургия', price: 600000, duration_minutes: 60 },
  { name: 'Удаление ретинированного зуба', category: 'Хирургия', price: 1000000, duration_minutes: 90 },
  { name: 'Резекция верхушки корня', category: 'Хирургия', price: 800000, duration_minutes: 60 },
  { name: 'Пластика уздечки', category: 'Хирургия', price: 300000, duration_minutes: 30 },

  // Имплантация
  { name: 'Имплантация (Osstem)', category: 'Имплантация', price: 5000000, duration_minutes: 60, description: 'Корея' },
  { name: 'Имплантация (Straumann)', category: 'Имплантация', price: 10000000, duration_minutes: 60, description: 'Швейцария' },
  { name: 'Имплантация (Nobel Biocare)', category: 'Имплантация', price: 12000000, duration_minutes: 60, description: 'Швеция' },
  { name: 'Синус-лифтинг (открытый)', category: 'Имплантация', price: 4000000, duration_minutes: 90 },
  { name: 'Синус-лифтинг (закрытый)', category: 'Имплантация', price: 2000000, duration_minutes: 60 },
  { name: 'Костная пластика', category: 'Имплантация', price: 3000000, duration_minutes: 60 },

  // Протезирование
  { name: 'Металлокерамическая коронка', category: 'Протезирование', price: 1500000, duration_minutes: 45 },
  { name: 'Коронка из диоксида циркония', category: 'Протезирование', price: 2500000, duration_minutes: 45 },
  { name: 'E-max коронка', category: 'Протезирование', price: 3000000, duration_minutes: 45 },
  { name: 'Винир (E-max)', category: 'Протезирование', price: 3500000, duration_minutes: 60 },
  { name: 'Съёмный протез (полный)', category: 'Протезирование', price: 3000000, duration_minutes: 60 },
  { name: 'Съёмный протез (частичный)', category: 'Протезирование', price: 2000000, duration_minutes: 60 },
  { name: 'Бюгельный протез', category: 'Протезирование', price: 4000000, duration_minutes: 60 },

  // Ортодонтия
  { name: 'Консультация ортодонта', category: 'Ортодонтия', price: 100000, duration_minutes: 45 },
  { name: 'Металлические брекеты (1 челюсть)', category: 'Ортодонтия', price: 4000000, duration_minutes: 90 },
  { name: 'Керамические брекеты (1 челюсть)', category: 'Ортодонтия', price: 6000000, duration_minutes: 90 },
  { name: 'Сапфировые брекеты (1 челюсть)', category: 'Ортодонтия', price: 7000000, duration_minutes: 90 },
  { name: 'Элайнеры (полный курс)', category: 'Ортодонтия', price: 15000000, duration_minutes: 60 },
  { name: 'Ретейнер', category: 'Ортодонтия', price: 500000, duration_minutes: 30 },

  // Эстетика
  { name: 'Отбеливание ZOOM', category: 'Эстетика', price: 2000000, duration_minutes: 90 },
  { name: 'Домашнее отбеливание (набор)', category: 'Эстетика', price: 800000, duration_minutes: 30 },
  { name: 'Художественная реставрация', category: 'Эстетика', price: 600000, duration_minutes: 60 },

  // Детская стоматология
  { name: 'Консультация детского стоматолога', category: 'Детская стоматология', price: 50000, duration_minutes: 30 },
  { name: 'Лечение молочного зуба', category: 'Детская стоматология', price: 200000, duration_minutes: 30 },
  { name: 'Удаление молочного зуба', category: 'Детская стоматология', price: 100000, duration_minutes: 20 },
  { name: 'Герметизация фиссур', category: 'Детская стоматология', price: 150000, duration_minutes: 20 },
  { name: 'Серебрение зубов', category: 'Детская стоматология', price: 50000, duration_minutes: 15 },
];

export const serviceCategories = [
  'Консультация',
  'Диагностика', 
  'Гигиена',
  'Терапия',
  'Хирургия',
  'Имплантация',
  'Протезирование',
  'Ортодонтия',
  'Эстетика',
  'Детская стоматология',
];
