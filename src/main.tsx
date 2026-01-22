import { createRoot } from "react-dom/client";
import "./index.css";

const mount = async () => {
  const el = document.getElementById("root");
  if (!el) return;

  const root = createRoot(el);

  // Show a minimal boot screen immediately, so we never stay on a blank page.
  root.render(
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-lg border bg-card p-6">
        <div className="text-sm text-muted-foreground">Загрузка приложения…</div>
      </div>
    </div>
  );

  // Catch runtime errors that happen before React renders (e.g. module eval/import errors).
  const showFatal = (title: string, details?: string) => {
    root.render(
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-2xl w-full rounded-lg border bg-card p-6">
          <h1 className="text-lg font-semibold">{title}</h1>
          {details ? (
            <pre className="mt-3 whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs text-muted-foreground">
              {details}
            </pre>
          ) : null}
          <p className="mt-4 text-xs text-muted-foreground">
            Откройте консоль браузера для полного стека.
          </p>
        </div>
      </div>
    );
  };

  window.addEventListener("error", (e) => {
    // eslint-disable-next-line no-console
    console.error("[window.error]", e.error ?? e.message);
    showFatal("Ошибка при загрузке приложения", String(e.error ?? e.message));
  });

  window.addEventListener("unhandledrejection", (e) => {
    // eslint-disable-next-line no-console
    console.error("[unhandledrejection]", e.reason);
    showFatal("Ошибка при загрузке приложения", String(e.reason));
  });

  try {
    const mod = await import("./App.tsx");
    const App = mod.default;
    root.render(<App />);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[bootstrap] Failed to load App:", err);
    showFatal("Не удалось запустить приложение", String(err));
  }
};

void mount();
