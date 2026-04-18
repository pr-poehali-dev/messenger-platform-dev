import { useState } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";
import { getStoredUser, saveSession, getToken, clearSession } from "@/lib/auth";

interface Props {
  onLogout: () => void;
  onUpdated: () => void;
}

export default function SettingsPanel({ onLogout, onUpdated }: Props) {
  const user = getStoredUser();
  const [section, setSection] = useState("profile");
  const [form, setForm] = useState({ display_name: user?.display_name || "", bio: user?.bio || "" });
  const [statusVal, setStatusVal] = useState(user?.status || "online");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const saveProfile = async () => {
    setLoading(true);
    const res = await api.updateProfile({ display_name: form.display_name, bio: form.bio, status: statusVal });
    if (res.ok) {
      const storedUser = getStoredUser();
      if (storedUser) {
        saveSession(getToken(), { ...storedUser, ...res.data });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onUpdated();
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await api.logout();
    clearSession();
    onLogout();
  };

  const menuItems = [
    { id: "profile", icon: "User", label: "Профиль" },
    { id: "appearance", icon: "Palette", label: "Оформление" },
    { id: "privacy", icon: "Shield", label: "Конфиденциальность" },
    { id: "notifications_s", icon: "Bell", label: "Уведомления" },
    { id: "devices", icon: "Smartphone", label: "Устройства" },
  ];

  return (
    <div className="flex h-full">
      {/* Sub-menu */}
      <div className="flex flex-col gap-0.5 w-40 py-2 px-2" style={{ borderRight: "1px solid var(--border-subtle)" }}>
        {menuItems.map(m => (
          <button key={m.id} onClick={() => setSection(m.id)}
            className="flex items-center gap-2 px-2 py-2 rounded-lg transition-all text-left text-xs"
            style={{ background: section === m.id ? "var(--bg-active)" : "transparent", color: section === m.id ? "var(--accent-cyan)" : "var(--text-secondary)" }}>
            <Icon name={m.icon} size={14} />
            {m.label}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={handleLogout}
          className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs mt-2 transition-all"
          style={{ color: "#f87171" }}>
          <Icon name="LogOut" size={14} />
          Выйти
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-4 overflow-y-auto">
        {section === "profile" && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Профиль</h3>

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: "var(--bg-surface)", color: "var(--accent-cyan)", border: "2px solid var(--border-accent)" }}>
                  {(form.display_name || user?.username || "?")[0].toUpperCase()}
                </div>
                <button className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--accent-cyan)", color: "#0a0e14" }}>
                  <Icon name="Camera" size={11} />
                </button>
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{user?.display_name}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>@{user?.username}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Отображаемое имя</label>
                <input value={form.display_name} onChange={e => set("display_name", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl outline-none text-sm"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: 13 }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>О себе</label>
                <textarea value={form.bio} onChange={e => set("bio", e.target.value)} rows={2} placeholder="Расскажите о себе..."
                  className="w-full px-3 py-2 rounded-xl outline-none resize-none text-sm"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: 13 }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Статус</label>
                <div className="flex gap-2">
                  {[{ val: "online", label: "В сети", color: "#00e5b3" }, { val: "away", label: "Отошёл", color: "#f59e0b" }, { val: "offline", label: "Не беспокоить", color: "#4a5568" }].map(s => (
                    <button key={s.val} onClick={() => setStatusVal(s.val)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: statusVal === s.val ? `${s.color}22` : "var(--bg-surface)", color: statusVal === s.val ? s.color : "var(--text-muted)", border: `1px solid ${statusVal === s.val ? s.color + "44" : "var(--border-subtle)"}` }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={saveProfile} disabled={loading}
              className="py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
              style={{ background: saved ? "rgba(0,229,179,0.15)" : "linear-gradient(135deg,#00b4d8,#00d4ff)", color: saved ? "#00e5b3" : "#0a0e14" }}>
              {saved ? <><Icon name="Check" size={15} />Сохранено</> : loading ? "Сохраняем..." : "Сохранить изменения"}
            </button>
          </div>
        )}

        {section !== "profile" && (
          <div className="flex flex-col items-center justify-center h-full gap-3 animate-fade-in">
            <Icon name="Wrench" size={28} style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Скоро будет доступно</p>
          </div>
        )}
      </div>
    </div>
  );
}
