import { DocumentTemplatesSettings } from '@/components/settings/DocumentTemplatesSettings';

const Documents = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Документы</h1>
        <p className="text-muted-foreground">Шаблоны договоров, согласий и актов</p>
      </div>

      <DocumentTemplatesSettings />
    </div>
  );
};

export default Documents;
