import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TreatmentItem {
  id: string;
  service_name: string;
  tooth_number?: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_completed: boolean;
}

interface TreatmentStage {
  id: string;
  title: string;
  description?: string;
  estimated_price: number;
  status: string;
  items?: TreatmentItem[];
}

interface TreatmentPlan {
  id: string;
  title: string;
  description?: string;
  total_price: number;
  status: string;
  created_at: string;
  stages?: TreatmentStage[];
}

interface Patient {
  full_name: string;
  phone: string;
  birth_date?: string;
}

interface Clinic {
  name: string;
  address?: string;
  phone?: string;
}

interface TreatmentPlanPrintProps {
  plan: TreatmentPlan;
  patient: Patient;
  clinic: Clinic;
}

const TreatmentPlanPrint = forwardRef<HTMLDivElement, TreatmentPlanPrintProps>(
  ({ plan, patient, clinic }, ref) => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('ru-RU').format(amount) + ' сум';
    };

    return (
      <div ref={ref} className="p-8 bg-white text-black min-h-[297mm] w-[210mm] mx-auto print:m-0 print:p-6">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold mb-2">{clinic.name}</h1>
          {clinic.address && <p className="text-sm">{clinic.address}</p>}
          {clinic.phone && <p className="text-sm">Тел: {clinic.phone}</p>}
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-center mb-6">ПЛАН ЛЕЧЕНИЯ</h2>

        {/* Patient Info */}
        <div className="mb-6 border border-gray-300 p-4 rounded">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Пациент:</span> {patient.full_name}
            </div>
            <div>
              <span className="font-semibold">Телефон:</span> {patient.phone}
            </div>
            {patient.birth_date && (
              <div>
                <span className="font-semibold">Дата рождения:</span>{' '}
                {format(new Date(patient.birth_date), 'dd.MM.yyyy')}
              </div>
            )}
            <div>
              <span className="font-semibold">Дата составления:</span>{' '}
              {plan.created_at 
                ? format(new Date(plan.created_at), 'dd.MM.yyyy', { locale: ru })
                : format(new Date(), 'dd.MM.yyyy', { locale: ru })}
            </div>
          </div>
        </div>

        {/* Plan Title & Description */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">{plan.title}</h3>
          {plan.description && <p className="text-sm text-gray-700">{plan.description}</p>}
        </div>

        {/* Stages */}
        {plan.stages?.map((stage, stageIndex) => (
          <div key={stage.id} className="mb-6">
            <h4 className="font-semibold bg-gray-100 p-2 mb-2">
              Этап {stageIndex + 1}: {stage.title}
            </h4>
            {stage.description && (
              <p className="text-sm text-gray-600 mb-2 px-2">{stage.description}</p>
            )}

            {/* Items Table */}
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-2 text-left">№</th>
                  <th className="border border-gray-300 p-2 text-left">Услуга</th>
                  <th className="border border-gray-300 p-2 text-center">Зуб</th>
                  <th className="border border-gray-300 p-2 text-center">Кол-во</th>
                  <th className="border border-gray-300 p-2 text-right">Цена</th>
                  <th className="border border-gray-300 p-2 text-right">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {stage.items?.map((item, itemIndex) => (
                  <tr key={item.id}>
                    <td className="border border-gray-300 p-2">{itemIndex + 1}</td>
                    <td className="border border-gray-300 p-2">{item.service_name}</td>
                    <td className="border border-gray-300 p-2 text-center">
                      {item.tooth_number || '—'}
                    </td>
                    <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                    <td className="border border-gray-300 p-2 text-right">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="border border-gray-300 p-2 text-right">
                      {formatCurrency(item.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold bg-gray-50">
                  <td colSpan={5} className="border border-gray-300 p-2 text-right">
                    Итого по этапу:
                  </td>
                  <td className="border border-gray-300 p-2 text-right">
                    {formatCurrency(stage.estimated_price)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ))}

        {/* Total */}
        <div className="border-t-2 border-black pt-4 mt-6">
          <div className="text-xl font-bold text-right">
            ОБЩАЯ СТОИМОСТЬ: {formatCurrency(plan.total_price)}
          </div>
        </div>

        {/* Terms */}
        <div className="mt-8 text-xs text-gray-600">
          <p className="mb-2">
            <strong>Примечание:</strong> Данный план лечения носит рекомендательный характер. 
            Окончательная стоимость может измениться в зависимости от клинической ситуации.
          </p>
          <p>
            Цены действительны на момент составления плана. Срок действия плана: 30 дней.
          </p>
        </div>

        {/* Signatures */}
        <div className="mt-12 grid grid-cols-2 gap-8">
          <div>
            <div className="border-b border-black mb-2 h-16"></div>
            <p className="text-sm">Врач: _______________________</p>
            <p className="text-xs text-gray-500 mt-1">подпись, расшифровка</p>
          </div>
          <div>
            <div className="border-b border-black mb-2 h-16"></div>
            <p className="text-sm">Пациент: _______________________</p>
            <p className="text-xs text-gray-500 mt-1">подпись, расшифровка</p>
          </div>
        </div>

        {/* Date */}
        <div className="mt-8 text-sm">
          <p>Дата: «____» ______________ 20___ г.</p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500 border-t pt-4">
          <p>Документ сформирован автоматически системой {clinic.name}</p>
          <p>{format(new Date(), 'dd.MM.yyyy HH:mm', { locale: ru })}</p>
        </div>
      </div>
    );
  }
);

TreatmentPlanPrint.displayName = 'TreatmentPlanPrint';

export default TreatmentPlanPrint;
