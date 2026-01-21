import ToothChart from '@/components/dental/ToothChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ToothChartDemo = () => {
  // Demo patient ID - in real app this would come from patient selection
  const demoPatientId = 'demo-patient';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Интерактивная зубная формула</h1>
        <p className="text-muted-foreground">
          Кликните на зуб для изменения его статуса
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Пациент: Демо Пациент</CardTitle>
          <CardDescription>
            Демонстрация зубной формулы с FDI нумерацией (11-48)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ToothChart patientId={demoPatientId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Как использовать</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <ul className="list-disc list-inside space-y-2">
            <li>Кликните на любой зуб для открытия редактора</li>
            <li>Выберите статус из предложенных вариантов</li>
            <li>Добавьте заметки при необходимости</li>
            <li>Нажмите "Сохранить" для сохранения изменений</li>
          </ul>
          <p>
            <strong>Нумерация FDI:</strong> Первая цифра - квадрант (1-4), 
            вторая - номер зуба (1-8). Например, 11 - правый верхний центральный резец.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ToothChartDemo;
