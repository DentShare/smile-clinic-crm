import { Link } from 'react-router-dom';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';
import { cn } from '@/lib/utils';

export const Footer = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <footer 
      ref={ref}
      className={cn(
        "border-t bg-card transition-all duration-700",
        isVisible 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 translate-y-8"
      )}
    >
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🦷</span>
              <span className="font-bold text-lg">Dentelica</span>
            </div>
            <p className="text-muted-foreground text-sm max-w-sm mb-4">
              Современная CRM для стоматологических клиник. 
              Управляйте бизнесом эффективно.
            </p>
            <div className="text-sm text-muted-foreground">
              <div>📞 +998 71 123-45-67</div>
              <div>✉️ info@dentelica.uz</div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Продукт</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition-colors">Возможности</a></li>
              <li><a href="#pricing" className="hover:text-foreground transition-colors">Тарифы</a></li>
              <li><a href="#demo" className="hover:text-foreground transition-colors">Демо</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Компания</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/login" className="hover:text-foreground transition-colors">Войти</Link></li>
              <li><Link to="/register" className="hover:text-foreground transition-colors">Регистрация</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div>© 2025 Dentelica. Все права защищены.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Политика конфиденциальности</a>
            <a href="#" className="hover:text-foreground transition-colors">Условия использования</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
