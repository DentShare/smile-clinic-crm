import { useCallback } from 'react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ExportColumn {
  key: string;
  header: string;
  formatter?: (value: any, row: any) => string;
}

export const useExcelExport = () => {
  const exportToExcel = useCallback((
    data: any[],
    columns: ExportColumn[],
    filename: string
  ) => {
    // Transform data based on columns
    const exportData = data.map(row => {
      const exportRow: Record<string, any> = {};
      columns.forEach(col => {
        const value = col.key.split('.').reduce((obj, key) => obj?.[key], row);
        exportRow[col.header] = col.formatter ? col.formatter(value, row) : value ?? '';
      });
      return exportRow;
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Auto-size columns
    const colWidths = columns.map(col => ({
      wch: Math.max(
        col.header.length,
        ...exportData.map(row => String(row[col.header] || '').length)
      ) + 2
    }));
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Данные');

    // Generate filename with date
    const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm', { locale: ru });
    const fullFilename = `${filename}_${dateStr}.xlsx`;

    // Save file
    XLSX.writeFile(wb, fullFilename);
  }, []);

  const exportClinics = useCallback((clinics: any[]) => {
    const columns: ExportColumn[] = [
      { key: 'name', header: 'Название клиники' },
      { key: 'subdomain', header: 'Поддомен' },
      { key: 'owner_name', header: 'Владелец' },
      { key: 'phone', header: 'Телефон' },
      { key: 'email', header: 'Email' },
      { key: 'inn', header: 'ИНН' },
      { 
        key: 'subscription.status', 
        header: 'Статус',
        formatter: (value) => {
          const statusMap: Record<string, string> = {
            trial: 'Триал',
            active: 'Активна',
            past_due: 'Просрочена',
            cancelled: 'Отменена'
          };
          return statusMap[value] || value || '';
        }
      },
      { 
        key: 'subscription.plan.name_ru', 
        header: 'Тариф'
      },
      { 
        key: 'subscription.current_period_end', 
        header: 'Оплачено до',
        formatter: (value) => value ? format(new Date(value), 'dd.MM.yyyy') : ''
      },
      { key: 'acquisition_source', header: 'Источник' },
      { 
        key: 'created_at', 
        header: 'Дата регистрации',
        formatter: (value) => value ? format(new Date(value), 'dd.MM.yyyy') : ''
      },
      { key: 'admin_notes', header: 'Заметки' }
    ];

    exportToExcel(clinics, columns, 'clinics_export');
  }, [exportToExcel]);

  const exportPayments = useCallback((payments: any[]) => {
    const columns: ExportColumn[] = [
      { 
        key: 'created_at', 
        header: 'Дата',
        formatter: (value) => value ? format(new Date(value), 'dd.MM.yyyy HH:mm') : ''
      },
      { key: 'clinic.name', header: 'Клиника' },
      { key: 'amount', header: 'Сумма' },
      { key: 'currency', header: 'Валюта' },
      { key: 'payment_method', header: 'Метод оплаты' },
      { 
        key: 'status', 
        header: 'Статус',
        formatter: (value) => {
          const statusMap: Record<string, string> = {
            pending: 'Ожидает',
            completed: 'Выполнен',
            failed: 'Ошибка',
            refunded: 'Возврат'
          };
          return statusMap[value] || value || '';
        }
      },
      { key: 'description', header: 'Описание' }
    ];

    exportToExcel(payments, columns, 'payments_export');
  }, [exportToExcel]);

  const exportAlerts = useCallback((alerts: any[]) => {
    const columns: ExportColumn[] = [
      { key: 'clinicName', header: 'Клиника' },
      { 
        key: 'severity', 
        header: 'Критичность',
        formatter: (value) => {
          const map: Record<string, string> = {
            critical: 'Критично',
            warning: 'Предупреждение',
            info: 'Информация'
          };
          return map[value] || value;
        }
      },
      { key: 'title', header: 'Заголовок' },
      { key: 'description', header: 'Описание' },
      { key: 'data.ownerPhone', header: 'Телефон владельца' },
      { 
        key: 'createdAt', 
        header: 'Дата',
        formatter: (value) => value ? format(new Date(value), 'dd.MM.yyyy HH:mm') : ''
      }
    ];

    exportToExcel(alerts, columns, 'alerts_export');
  }, [exportToExcel]);

  const exportClinicPayments = useCallback((payments: any[]) => {
    const columns: ExportColumn[] = [
      { key: 'created_at', header: 'Дата', formatter: (v) => v ? format(new Date(v), 'dd.MM.yyyy HH:mm') : '' },
      { key: 'patient_name', header: 'Пациент' },
      { key: 'amount', header: 'Сумма' },
      { key: 'payment_method', header: 'Способ оплаты', formatter: (v) => {
        const map: Record<string, string> = { cash: 'Наличные', uzcard: 'UzCard', humo: 'Humo', click: 'Click', payme: 'Payme', visa: 'Visa', transfer: 'Перевод', card: 'Карта' };
        return map[v] || v || '';
      }},
      { key: 'is_fiscalized', header: 'Фискализирован', formatter: (v) => v ? 'Да' : 'Нет' },
      { key: 'notes', header: 'Комментарий' },
    ];
    exportToExcel(payments, columns, 'платежи');
  }, [exportToExcel]);

  const exportPatientsList = useCallback((patients: any[]) => {
    const columns: ExportColumn[] = [
      { key: 'full_name', header: 'ФИО' },
      { key: 'phone', header: 'Телефон' },
      { key: 'birth_date', header: 'Дата рождения', formatter: (v) => v ? format(new Date(v), 'dd.MM.yyyy') : '' },
      { key: 'gender', header: 'Пол', formatter: (v) => v === 'male' ? 'Муж' : v === 'female' ? 'Жен' : '' },
      { key: 'balance', header: 'Баланс' },
      { key: 'source', header: 'Источник' },
      { key: 'created_at', header: 'Дата регистрации', formatter: (v) => v ? format(new Date(v), 'dd.MM.yyyy') : '' },
    ];
    exportToExcel(patients, columns, 'пациенты');
  }, [exportToExcel]);

  const exportAppointments = useCallback((appointments: any[]) => {
    const columns: ExportColumn[] = [
      { key: 'start_time', header: 'Дата и время', formatter: (v) => v ? format(new Date(v), 'dd.MM.yyyy HH:mm') : '' },
      { key: 'patient_name', header: 'Пациент' },
      { key: 'doctor_name', header: 'Врач' },
      { key: 'service_name', header: 'Услуга' },
      { key: 'status', header: 'Статус', formatter: (v) => {
        const map: Record<string, string> = { scheduled: 'Запланирован', confirmed: 'Подтверждён', completed: 'Завершён', cancelled: 'Отменён', no_show: 'Не пришёл' };
        return map[v] || v || '';
      }},
    ];
    exportToExcel(appointments, columns, 'приёмы');
  }, [exportToExcel]);

  const exportInventory = useCallback((items: any[]) => {
    const columns: ExportColumn[] = [
      { key: 'name', header: 'Название' },
      { key: 'sku', header: 'Артикул' },
      { key: 'category', header: 'Категория' },
      { key: 'quantity', header: 'Остаток' },
      { key: 'unit', header: 'Ед. изм.' },
      { key: 'min_quantity', header: 'Мин. остаток' },
      { key: 'price', header: 'Цена' },
    ];
    exportToExcel(items, columns, 'склад');
  }, [exportToExcel]);

  const exportRevenueReport = useCallback((data: any[]) => {
    const columns: ExportColumn[] = [
      { key: 'date', header: 'Дата' },
      { key: 'name', header: 'День' },
      { key: 'value', header: 'Выручка (so\'m)' },
    ];
    exportToExcel(data, columns, 'выручка');
  }, [exportToExcel]);

  return {
    exportToExcel, exportClinics, exportPayments, exportAlerts,
    exportClinicPayments, exportPatientsList, exportAppointments,
    exportInventory, exportRevenueReport,
  };
};
