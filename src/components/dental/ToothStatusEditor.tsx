import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ToothStatus } from '@/types/database';
import { toothStatusColors, toothStatusLabels } from './ToothStatusLegend';
import { Cuboid } from 'lucide-react';
import { useState } from 'react';

interface ToothStatusEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toothNumber: number | null;
  currentStatus: ToothStatus;
  currentNotes?: string;
  onSave: (status: ToothStatus, notes: string) => void;
  onOpenImplantPassport?: (toothNumber: number) => void;
}

const ToothStatusEditor = ({
  open,
  onOpenChange,
  toothNumber,
  currentStatus,
  currentNotes = '',
  onSave,
  onOpenImplantPassport,
}: ToothStatusEditorProps) => {
  const [selectedStatus, setSelectedStatus] = useState<ToothStatus>(currentStatus);
  const [notes, setNotes] = useState(currentNotes);

  const statuses = Object.keys(toothStatusColors) as ToothStatus[];

  const handleSave = () => {
    onSave(selectedStatus, notes);
    onOpenChange(false);
  };

  // Reset state when dialog opens with new tooth
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSelectedStatus(currentStatus);
      setNotes(currentNotes);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Зуб №{toothNumber}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Статус</Label>
            <div className="grid grid-cols-2 gap-2">
              {statuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setSelectedStatus(status)}
                  className={`flex items-center gap-2 p-2 rounded-md border text-left transition-colors ${
                    selectedStatus === status
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-sm border flex-shrink-0"
                    style={{ backgroundColor: toothStatusColors[status] }}
                  />
                  <span className="text-sm">{toothStatusLabels[status]}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="notes" className="mb-2 block">Заметки</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительная информация о зубе..."
              rows={3}
            />
          </div>

          {selectedStatus === 'implant' && onOpenImplantPassport && toothNumber && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                onOpenChange(false);
                onOpenImplantPassport(toothNumber);
              }}
            >
              <Cuboid className="h-4 w-4" />
              Паспорт импланта
            </Button>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave}>
              Сохранить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ToothStatusEditor;
