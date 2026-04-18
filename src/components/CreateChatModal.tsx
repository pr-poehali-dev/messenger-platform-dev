import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";

interface Props {
  onClose: () => void;
  onCreated: (chat: { id: number; type: string; name: string }) => void;
}

export default function CreateChatModal({ onClose, onCreated }: Props) {
  const [tab, setTab] = useState<"personal" | "group">("personal");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<{ id: number; username: string; display_name: string; avatar_url?: string }[]>([]);
  const [selected, setSelected] = useState<{ id: number; display_name: string }[]>([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.length < 2) { setUsers([]); return; }
    const t = setTimeout(async () => {
      const res = await api.searchUsers(search);
      if (res.ok) setUsers(res.data.users || []);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const toggle = (u: { id: number; display_name: string }) => {
    if (tab === "personal") {
      setSelected([u]);
    } else {
      setSelected(s => s.find(x => x.id === u.id) ? s.filter(x => x.id !== u.id) : [...s, u]);
    }
  };

  const create = async () => {
    if (!selected.length) return;
    setLoading(true);
    const name = tab === "group" ? groupName || `Группа` : selected[0].display_name;
    const res = await api.createChat(tab, name, selected.map(u => u.id));
    if (res.ok) onCreated(res.data);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-md rounded-2xl p-5 animate-scale-in" style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Новый чат</h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}><Icon name="X" size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl p-1 mb-4" style={{ background: "var(--bg-surface)" }}>
          {(["personal", "group"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="flex-1 py-1.5 rounded-lg text-sm transition-all"
              style={{ background: tab === t ? "var(--bg-active)" : "transparent", color: tab === t ? "var(--accent-cyan)" : "var(--text-muted)" }}>
              {t === "personal" ? "Личный" : "Группа"}
            </button>
          ))}
        </div>

        {tab === "group" && (
          <input
            placeholder="Название группы"
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl mb-3 outline-none text-sm"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: 13 }}
          />
        )}

        <div className="relative mb-3">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            placeholder="Найти пользователя..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-xl outline-none text-sm"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: 13 }}
          />
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selected.map(u => (
              <span key={u.id} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ background: "var(--accent-glow)", color: "var(--accent-cyan)", border: "1px solid var(--border-accent)" }}>
                {u.display_name}
                <button onClick={() => toggle(u)}><Icon name="X" size={10} /></button>
              </span>
            ))}
          </div>
        )}

        <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
          {users.map(u => (
            <button key={u.id} onClick={() => toggle(u)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left"
              style={{ background: selected.find(x => x.id === u.id) ? "var(--bg-active)" : "transparent" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "var(--bg-surface)", color: "var(--accent-cyan)" }}>
                {u.display_name[0]}
              </div>
              <div>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>{u.display_name}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>@{u.username}</p>
              </div>
              {selected.find(x => x.id === u.id) && <Icon name="Check" size={14} className="ml-auto" style={{ color: "var(--accent-cyan)" }} />}
            </button>
          ))}
          {search.length >= 2 && users.length === 0 && (
            <p className="text-center py-4 text-sm" style={{ color: "var(--text-muted)" }}>Пользователи не найдены</p>
          )}
        </div>

        <button
          disabled={!selected.length || loading}
          onClick={create}
          className="w-full py-2.5 rounded-xl font-medium mt-4 transition-all text-sm"
          style={{ background: selected.length ? "linear-gradient(135deg,#00b4d8,#00d4ff)" : "var(--bg-surface)", color: selected.length ? "#0a0e14" : "var(--text-muted)" }}
        >
          {loading ? "Создаём..." : tab === "personal" ? "Начать диалог" : "Создать группу"}
        </button>
      </div>
    </div>
  );
}
