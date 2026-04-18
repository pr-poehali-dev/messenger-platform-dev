import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";

interface Member { id: number; username: string; display_name: string; avatar_url?: string; status: string; role: string; }
interface Props {
  chatId: number;
  chatName: string;
  onClose: () => void;
}

const COLORS = ["#00d4ff","#00e5b3","#a78bfa","#f59e0b","#f472b6","#34d399","#60a5fa","#fb923c"];
const colorFor = (id: number) => COLORS[id % COLORS.length];

export default function GroupInfoPanel({ chatId, chatName, onClose }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [searchRes, setSearchRes] = useState<{ id: number; display_name: string; username: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const me = getStoredUser();

  useEffect(() => {
    api.getChatMembers(chatId).then(r => { if (r.ok) setMembers(r.data.members || []); });
  }, [chatId]);

  useEffect(() => {
    if (search.length < 2) { setSearchRes([]); return; }
    const t = setTimeout(async () => {
      const r = await api.searchUsers(search);
      if (r.ok) setSearchRes(r.data.users || []);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const addMember = async (uid: number) => {
    setLoading(true);
    await api.addChatMember(chatId, uid);
    const r = await api.getChatMembers(chatId);
    if (r.ok) setMembers(r.data.members || []);
    setSearch("");
    setSearchRes([]);
    setLoading(false);
  };

  const removeMember = async (uid: number) => {
    await api.removeChatMember(chatId, uid);
    setMembers(m => m.filter(x => x.id !== uid));
  };

  const myRole = members.find(m => m.id === me?.id)?.role;
  const isAdmin = myRole === "admin";

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <button onClick={onClose} style={{ color: "var(--text-muted)" }}><Icon name="ArrowLeft" size={18} /></button>
        <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Участники группы</h3>
      </div>

      {/* Chat info */}
      <div className="flex flex-col items-center py-5 px-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-2" style={{ background: "var(--accent-glow)", border: "1px solid var(--border-accent)" }}>
          <Icon name="Users" size={24} style={{ color: "var(--accent-cyan)" }} />
        </div>
        <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{chatName}</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{members.length} участников</p>
      </div>

      {/* Add member (admin only) */}
      {isAdmin && (
        <div className="px-3 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="relative">
            <Icon name="UserPlus" size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Добавить участника..."
              className="w-full pl-8 pr-3 py-2 rounded-xl outline-none text-xs"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: 12 }} />
          </div>
          {searchRes.length > 0 && (
            <div className="mt-1.5 flex flex-col gap-0.5 max-h-32 overflow-y-auto">
              {searchRes.filter(u => !members.find(m => m.id === u.id)).map(u => (
                <button key={u.id} onClick={() => addMember(u.id)} disabled={loading}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all"
                  style={{ background: "var(--bg-surface)" }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: `${colorFor(u.id)}22`, color: colorFor(u.id) }}>
                    {u.display_name[0]}
                  </div>
                  <span className="text-xs flex-1 truncate" style={{ color: "var(--text-primary)" }}>{u.display_name}</span>
                  <Icon name="Plus" size={12} style={{ color: "var(--accent-cyan)" }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {members.map((m, i) => (
          <div key={m.id} className="flex items-center gap-2.5 px-2 py-2 rounded-xl mb-0.5 animate-slide-in" style={{ animationDelay: `${i * 25}ms` }}>
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${colorFor(m.id)}22`, color: colorFor(m.id) }}>
                {m.display_name[0]}
              </div>
              <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full border-2" style={{ background: m.status === "online" ? "var(--online)" : "var(--offline)", borderColor: "var(--bg-panel)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{m.display_name}</p>
              <p className="text-[10px]" style={{ color: m.role === "admin" ? "var(--accent-cyan)" : "var(--text-muted)" }}>
                {m.role === "admin" ? "Администратор" : "Участник"}
              </p>
            </div>
            {isAdmin && m.id !== me?.id && (
              <button onClick={() => removeMember(m.id)} className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ color: "#f87171" }}>
                <Icon name="UserMinus" size={12} />
              </button>
            )}
            {m.id === me?.id && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent-glow)", color: "var(--accent-cyan)" }}>Вы</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
