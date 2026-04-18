import { useState } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";
import { saveSession } from "@/lib/auth";

interface Props {
  onAuth: () => void;
}

export default function AuthScreen({ onAuth }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ login: "", email: "", username: "", display_name: "", password: "" });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let res;
      if (mode === "login") {
        res = await api.login(form.login, form.password);
      } else {
        res = await api.register(form.username, form.display_name, form.email, form.password);
      }
      if (!res.ok) {
        setError(res.data.error || "Ошибка");
      } else {
        saveSession(res.data.token, res.data.user);
        onAuth();
      }
    } catch {
      setError("Ошибка соединения");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-deep)" }}>
      <div className="w-full max-w-sm px-4 animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 glow-cyan" style={{ background: "linear-gradient(135deg, #00d4ff, #00e5b3)" }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: "#0a0e14" }}>V</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Вектор</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Защищённый мессенджер</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl p-1 mb-6" style={{ background: "var(--bg-surface)" }}>
          {(["login", "register"] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: mode === m ? "var(--bg-active)" : "transparent",
                color: mode === m ? "var(--accent-cyan)" : "var(--text-muted)",
              }}
            >
              {m === "login" ? "Войти" : "Регистрация"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "register" && (
            <>
              <Field icon="User" placeholder="Имя пользователя (латиница)" value={form.username} onChange={v => set("username", v)} />
              <Field icon="UserCircle" placeholder="Отображаемое имя" value={form.display_name} onChange={v => set("display_name", v)} />
              <Field icon="Mail" placeholder="Email" type="email" value={form.email} onChange={v => set("email", v)} />
            </>
          )}
          {mode === "login" && (
            <Field icon="Mail" placeholder="Email или имя пользователя" value={form.login} onChange={v => set("login", v)} />
          )}
          <Field icon="Lock" placeholder="Пароль" type="password" value={form.password} onChange={v => set("password", v)} />

          {error && (
            <div className="px-3 py-2 rounded-lg text-sm animate-fade-in" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="py-3 rounded-xl font-semibold mt-2 transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #00b4d8, #00d4ff)",
              color: "#0a0e14",
              boxShadow: "0 4px 20px rgba(0,212,255,0.3)",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <div className="typing-dots flex gap-1 items-center"><span /><span /><span /></div>
            ) : (
              <>
                <Icon name={mode === "login" ? "LogIn" : "UserPlus"} size={17} />
                {mode === "login" ? "Войти" : "Создать аккаунт"}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ icon, placeholder, value, onChange, type = "text" }: { icon: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="relative">
      <Icon name={icon} size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full pl-9 pr-3 py-2.5 rounded-xl outline-none transition-all text-sm"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: 13 }}
        autoComplete={type === "password" ? "current-password" : "off"}
      />
    </div>
  );
}
