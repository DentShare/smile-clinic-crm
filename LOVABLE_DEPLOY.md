# Lovable Deployment Guide

## 🚀 Деплой Smile Clinic CRM на Lovable

### Предварительные требования

- ✅ Все Supabase миграции применены
- ✅ Код залит на GitHub (DentShare/smile-clinic-crm)
- ✅ Environment variables готовы

---

## 📝 Шаг 1: Подключение проекта к Lovable

### Если проект уже в Lovable:

1. Откройте Lovable Dashboard
2. Выберите проект "Smile Clinic CRM"
3. Settings → Connect Repository
4. Выберите: `DentShare/smile-clinic-crm`
5. Branch: `main`

### Если проект новый:

1. Lovable Dashboard → New Project
2. Import from GitHub
3. Выберите репозиторий: `DentShare/smile-clinic-crm`
4. Framework: Vite + React
5. Build Command: `npm run build`
6. Output Directory: `dist`

---

## 🔑 Шаг 2: Environment Variables

В Lovable Settings → Environment Variables добавьте:

```env
# Production Supabase (используйте ваши реальные значения)
VITE_SUPABASE_URL=https://vdykmcgigszhjcikeepv.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeWttY2dpZ3N6aGpjaWtlZXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NzAxNzQsImV4cCI6MjA4NjU0NjE3NH0.mo_oYKNWFe3-CF7jGoQKYliJLU8PUOPaeTLd-_9hGks
```

**Важно:**
- Используйте Production credentials, НЕ Development!
- Проверьте что ключи действительны в Supabase Dashboard

---

## 🏗️ Шаг 3: Deploy Settings

### Build Configuration:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

### Дополнительные настройки:

- **Node Version:** 18.x или 20.x
- **Auto Deploy:** Включите для автоматического деплоя при push в main
- **Deploy Preview:** Включите для preview веток

---

## 🚀 Шаг 4: Первый Deploy

1. **Trigger Deploy:**
   - Lovable Dashboard → Deployments → Deploy Now
   - Или: `git push origin main` (если auto-deploy включен)

2. **Мониторинг:**
   - Следите за логами в Lovable Dashboard
   - Build должен занять 2-3 минуты

3. **Проверка:**
   - После успешного деплоя откроется URL
   - Формат: `https://your-project.lovable.app`

---

## 🧪 Шаг 5: Тестирование в Lovable Console

### Откройте Lovable Console:

1. Lovable Dashboard → Your Project → Console
2. Или нажмите `` Ctrl+` `` (backtick) в deployed app

### Тесты для проверки:

#### 1. Проверка подключения к Supabase

```javascript
// В Console:
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

// Должно показать: https://vdykmcgigszhjcikeepv.supabase.co
```

#### 2. Тест RPC функций

```javascript
// В Console Lovable выполните:
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

// Тест is_super_admin
const { data, error } = await supabase.rpc('is_super_admin');
console.log('is_super_admin:', data, error);
```

#### 3. Проверка audit_log

```javascript
// После создания тестового платежа:
const { data: logs } = await supabase
  .from('audit_log')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5);

console.table(logs);
```

#### 4. Проверка fraud_alerts

```javascript
const { data: alerts } = await supabase
  .from('fraud_alerts')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5);

console.table(alerts);
```

---

## 📊 Шаг 6: Мониторинг Production

### В Lovable Dashboard проверьте:

- **Analytics:** User activity, page views
- **Logs:** Real-time application logs
- **Performance:** Load times, API response times
- **Errors:** JavaScript errors, failed requests

### В Supabase Dashboard:

1. **Database → Logs:**
   - Проверьте SQL query performance
   - Посмотрите на slow queries

2. **Auth → Users:**
   - Убедитесь что пользователи могут логиниться

3. **Table Editor:**
   - Проверьте данные в `audit_log`
   - Проверьте `fraud_alerts` на подозрительную активность

---

## 🐛 Troubleshooting

### Ошибка: "Failed to build"

**Проблема:** Зависимости не установились

**Решение:**
```bash
# Локально проверьте:
npm install
npm run build

# Если работает локально, проверьте:
# - Node version в Lovable (должна быть 18+)
# - package.json корректный
```

### Ошибка: "Environment variables not defined"

**Проблема:** ENV variables не установлены в Lovable

**Решение:**
1. Lovable Settings → Environment Variables
2. Добавьте `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Redeploy

### Ошибка: "RPC function not found"

**Проблема:** Миграции не применены в Supabase

**Решение:**
1. Откройте Supabase SQL Editor
2. Выполните `supabase/complete_migration.sql`
3. Проверьте что функции созданы:
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name LIKE 'process_%';
   ```

### Ошибка: "Row Level Security policy violation"

**Проблема:** RLS политики блокируют доступ

**Решение:**
1. Убедитесь что пользователь залогинен
2. Проверьте что user имеет роль в `user_roles`
3. Проверьте что user принадлежит к clinic в `profiles`

---

## ✅ Production Checklist

После деплоя проверьте:

### Функциональность
- [ ] Логин работает
- [ ] Пациенты отображаются
- [ ] Платежи создаются
- [ ] Audit log записывается
- [ ] Fraud detection работает

### Производительность
- [ ] Страницы загружаются < 3 сек
- [ ] API calls < 500ms
- [ ] Нет memory leaks

### Безопасность
- [ ] RLS включен на всех таблицах
- [ ] Credentials не в коде
- [ ] HTTPS включен
- [ ] CORS настроен правильно

### Monitoring
- [ ] Lovable Analytics работает
- [ ] Supabase logs доступны
- [ ] Error tracking настроен

---

## 🎯 Следующие шаги

После успешного деплоя:

1. **Создайте тестовую clinic и пользователей**
2. **Протестируйте основные flow:**
   - Регистрация
   - Создание пациентов
   - Запись на прием
   - Обработка платежей
3. **Мониторьте fraud_alerts** первые 24 часа
4. **Проверьте audit_log** на корректность

---

## 📞 Support

- **Lovable Support:** https://lovable.dev/support
- **Supabase Support:** https://supabase.com/dashboard/support
- **Project Issues:** https://github.com/DentShare/smile-clinic-crm/issues

---

**Дата:** 2026-02-13
**Версия:** 1.0.0
**Статус:** ✅ Ready for Production Deployment
