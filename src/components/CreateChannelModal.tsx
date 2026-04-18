import { useState } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateChannelModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const create = async () => {
    if (!name.trim()) { setError("Введите название"); return; }
    setLoading(true);
    const res = await api.createChannel(name.trim(), description, isPublic);
    if (res.ok) { onCreated(); }
    else setError(res.data.error || "Ошибка");
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-md rounded-2xl p-5 animate-scale-in" style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Создать канал</h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}><Icon name="X" size={18} /></button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Название</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Название канала"
              className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: 13 }} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Описание</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="О чём этот канал?" rows={2}
              className="w-full px-3 py-2.5 rounded-xl outline-none resize-none text-sm"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: 13 }} />
          </div>
          <button onClick={() => setIsPublic(!isPublic)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left"
            style={{ background: "var(--bg-surface)", border: `1px solid ${isPublic ? "var(--border-accent)" : "var(--border-subtle)"}` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isPublic ? "var(--accent-glow)" : "var(--bg-active)", color: isPublic ? "var(--accent-cyan)" : "var(--text-muted)" }}>
              <Icon name={isPublic ? "Globe" : "Lock"} size={16} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{isPublic ? "Публичный" : "Приватный"}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{isPublic ? "Виден всем пользователям" : "Только по приглашению"}</p>
            </div>
            <Icon name={isPublic ? "CheckCircle" : "Circle"} size={16} className="ml-auto" style={{ color: isPublic ? "var(--accent-cyan)" : "var(--text-muted)" }} />
          </button>

          {error && <p className="text-xs px-1" style={{ color: "#f87171" }}>{error}</p>}

          <button disabled={loading} onClick={create}
            className="py-2.5 rounded-xl font-medium transition-all text-sm mt-1"
            style={{ background: "linear-gradient(135deg,#00b4d8,#00d4ff)", color: "#0a0e14" }}>
            {loading ? "Создаём..." : "Создать канал"}
          </button>
        </div>
      </div>
    </div>
  );
}
