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

  return { exportToExcel, exportClinics, exportPayments, exportAlerts };
};
