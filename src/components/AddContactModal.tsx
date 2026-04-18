import { useState } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

const COLORS = ["#00d4ff","#00e5b3","#a78bfa","#f59e0b","#f472b6","#34d399"];
const colorFor = (id: number) => COLORS[id % COLORS.length];

export default function AddContactModal({ onClose, onAdded }: Props) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<{ id: number; username: string; display_name: string; status: string; is_contact: boolean }[]>([]);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Set<number>>(new Set());

  const doSearch = async (q: string) => {
    setSearch(q);
    if (q.length < 2) { setUsers([]); return; }
    const r = await api.searchUsers(q);
    if (r.ok) setUsers(r.data.users || []);
  };

  const addContact = async (uid: number) => {
    setLoading(true);
    await api.addContact(uid);
    setAdded(s => new Set([...s, uid]));
    setLoading(false);
    onAdded();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-sm rounded-2xl p-5 animate-scale-in" style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Найти людей</h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}><Icon name="X" size={18} /></button>
        </div>

        <div className="relative mb-4">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={e => doSearch(e.target.value)}
            placeholder="Имя или @username..."
            autoFocus
            className="w-full pl-8 pr-3 py-2.5 rounded-xl outline-none text-sm"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: 13 }}
          />
        </div>

        <div className="max-h-72 overflow-y-auto flex flex-col gap-0.5">
          {search.length >= 2 && users.length === 0 && (
            <p className="text-center py-6 text-sm" style={{ color: "var(--text-muted)" }}>Никого не найдено</p>
          )}
          {users.map(u => {
            const isAdded = added.has(u.id) || u.is_contact;
            return (
              <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "var(--bg-surface)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: `${colorFor(u.id)}22`, color: colorFor(u.id) }}>
                  {u.display_name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{u.display_name}</p>
                  <p className="text-xs" style={{ color: u.status === "online" ? "var(--online)" : "var(--text-muted)" }}>
                    @{u.username} · {u.status === "online" ? "В сети" : "Не в сети"}
                  </p>
                </div>
                <button
                  disabled={isAdded || loading}
                  onClick={() => addContact(u.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                  style={{
                    background: isAdded ? "var(--bg-active)" : "var(--accent-glow)",
                    color: isAdded ? "var(--text-muted)" : "var(--accent-cyan)",
                    border: `1px solid ${isAdded ? "var(--border-subtle)" : "var(--border-accent)"}`,
                  }}
                >
                  {isAdded ? <><Icon name="Check" size={11} /> Добавлен</> : "Добавить"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
