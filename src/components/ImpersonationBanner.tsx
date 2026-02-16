import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert, X } from 'lucide-react';

export function ImpersonationBanner() {
  const { isImpersonating, clinic, stopImpersonation } = useAuth();
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  const handleExit = () => {
    stopImpersonation();
    navigate('/admin/dashboard');
  };

  return (
    <div className="bg-yellow-500 text-yellow-950 px-4 py-1.5 flex items-center justify-between text-sm font-medium">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4" />
        <span>Режим просмотра клиники: <strong>{clinic?.name}</strong></span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-yellow-950 hover:text-yellow-900 hover:bg-yellow-400"
        onClick={handleExit}
      >
        <X className="h-3 w-3 mr-1" />
        Выйти
      </Button>
    </div>
  );
}
