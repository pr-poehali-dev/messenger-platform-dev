import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import AuthScreen from "@/components/AuthScreen";
import CreateChatModal from "@/components/CreateChatModal";
import CreateChannelModal from "@/components/CreateChannelModal";
import SettingsPanel from "@/components/SettingsPanel";
import { api } from "@/lib/api";
import { isLoggedIn, getStoredUser } from "@/lib/auth";

interface Chat { id: number; type: string; name: string; avatar_url?: string; last_text: string; last_time?: string; unread: number; online: boolean; }
interface Message { id: number; user_id: number; display_name: string; avatar_url?: string; text: string; type: string; reply_to?: number; is_edited: boolean; created_at: string; mine: boolean; }
interface Contact { id: number; username: string; display_name: string; avatar_url?: string; status: string; }
interface Channel { id: number; name: string; description?: string; subscribers_count: number; is_owner: boolean; subscribed: boolean; last_post?: string; last_time?: string; }
interface Notification { id: number; type: string; title?: string; body: string; is_read: boolean; created_at: string; }

type Section = "chats" | "channels" | "notifications" | "contacts" | "settings";

function avatarLetters(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

const COLORS = ["#00d4ff", "#00e5b3", "#a78bfa", "#f59e0b", "#f472b6", "#34d399", "#60a5fa", "#fb923c"];
function colorFor(id: number | string) { return COLORS[String(id).charCodeAt(0) % COLORS.length]; }

function formatTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800000) return d.toLocaleDateString("ru", { weekday: "short" });
  return d.toLocaleDateString("ru", { day: "2-digit", month: "2-digit" });
}

export default function Index() {
  const [authed, setAuthed] = useState(isLoggedIn());
  const [activeSection, setActiveSection] = useState<Section>("chats");
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);

  // Data
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchResults, setSearchResults] = useState<{ users: Contact[]; messages: { id: number; text: string; chat_name: string; chat_id: number }[] } | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const user = getStoredUser();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadChats = useCallback(async () => {
    const res = await api.getChats();
    if (res.ok) setChats(res.data.chats || []);
  }, []);

  const loadMessages = useCallback(async (chatId: number) => {
    const res = await api.getMessages(chatId);
    if (res.ok) setMessages(res.data.messages || []);
  }, []);

  const loadContacts = useCallback(async () => {
    const res = await api.getContacts();
    if (res.ok) setContacts(res.data.contacts || []);
  }, []);

  const loadChannels = useCallback(async () => {
    const res = await api.getChannels();
    if (res.ok) setChannels(res.data.channels || []);
  }, []);

  const loadNotifications = useCallback(async () => {
    const res = await api.getNotifications();
    if (res.ok) {
      setNotifications(res.data.notifications || []);
      setUnreadNotifs(res.data.unread_count || 0);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    loadChats();
  }, [authed, loadChats]);

  useEffect(() => {
    if (!authed) return;
    if (activeSection === "contacts") loadContacts();
    if (activeSection === "channels") loadChannels();
    if (activeSection === "notifications") loadNotifications();
  }, [activeSection, authed, loadContacts, loadChannels, loadNotifications]);

  useEffect(() => {
    if (activeChat) loadMessages(activeChat.id);
  }, [activeChat, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll messages every 3s when chat is open
  useEffect(() => {
    if (!activeChat || !authed) return;
    const interval = setInterval(() => loadMessages(activeChat.id), 3000);
    return () => clearInterval(interval);
  }, [activeChat, authed, loadMessages]);

  // Poll chats list every 5s
  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(loadChats, 5000);
    return () => clearInterval(interval);
  }, [authed, loadChats]);

  // Global search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults(null); return; }
    const t = setTimeout(async () => {
      const res = await api.search(searchQuery);
      if (res.ok) setSearchResults(res.data);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const sendMessage = async () => {
    if (!activeChat || !messageInput.trim()) return;
    if (editingMsg) {
      await api.editMessage(editingMsg.id, messageInput.trim());
      setEditingMsg(null);
      setMessageInput("");
      loadMessages(activeChat.id);
      return;
    }
    const res = await api.sendMessage(activeChat.id, messageInput.trim());
    if (res.ok) {
      setMessageInput("");
      setMessages(prev => [...prev, res.data]);
      loadChats();
    }
  };

  const deleteMsg = async (id: number) => {
    await api.deleteMessage(id);
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const markAllNotifRead = async () => {
    await api.markAllRead();
    loadNotifications();
  };

  const navItems: { section: Section; icon: string; label: string; badge?: number }[] = [
    { section: "chats", icon: "MessageSquare", label: "Чаты", badge: chats.reduce((a, c) => a + c.unread, 0) || undefined },
    { section: "channels", icon: "Radio", label: "Каналы" },
    { section: "notifications", icon: "Bell", label: "Уведомления", badge: unreadNotifs || undefined },
    { section: "contacts", icon: "Users", label: "Контакты" },
    { section: "settings", icon: "Settings", label: "Настройки" },
  ];

  const filteredChats = chats.filter(c =>
    !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.last_text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!authed) return <AuthScreen onAuth={() => setAuthed(true)} />;

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: "var(--bg-deep)", fontFamily: "'Golos Text', sans-serif" }}>

      {/* Sidebar */}
      <div className="flex flex-col items-center py-5 px-2 gap-1" style={{ width: 64, background: "var(--bg-panel)", borderRight: "1px solid var(--border-subtle)" }}>
        <div className="mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center glow-cyan" style={{ background: "linear-gradient(135deg, #00d4ff, #00e5b3)" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#0a0e14" }}>V</span>
          </div>
        </div>

        {navItems.map(item => (
          <button key={item.section} onClick={() => setActiveSection(item.section)}
            className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
            style={{ background: activeSection === item.section ? "var(--bg-active)" : "transparent", color: activeSection === item.section ? "var(--accent-cyan)" : "var(--text-muted)" }}
            title={item.label}
          >
            <Icon name={item.icon} size={20} />
            {item.badge ? (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: "var(--accent-cyan)", color: "#0a0e14" }}>
                {item.badge > 9 ? "9+" : item.badge}
              </span>
            ) : null}
            {activeSection === item.section && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ background: "var(--accent-cyan)" }} />}
          </button>
        ))}

        <div className="mt-auto">
          <button onClick={() => setActiveSection("settings")} className="relative w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: "var(--bg-surface)", color: "var(--accent-cyan)", border: "2px solid var(--border-accent)" }}>
            {user ? avatarLetters(user.display_name) : "?"}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 animate-pulse-dot" style={{ background: "var(--online)", borderColor: "var(--bg-panel)" }} />
          </button>
        </div>
      </div>

      {/* Left Panel */}
      <div className="flex flex-col" style={{ width: 300, background: "var(--bg-panel)", borderRight: "1px solid var(--border-subtle)" }}>
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
              {navItems.find(n => n.section === activeSection)?.label}
            </h2>
            <div className="flex gap-1">
              {activeSection === "chats" && (
                <>
                  <button onClick={() => setShowSearch(!showSearch)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                    style={{ color: showSearch ? "var(--accent-cyan)" : "var(--text-muted)", background: showSearch ? "var(--bg-active)" : "transparent" }}>
                    <Icon name="Search" size={15} />
                  </button>
                  <button onClick={() => setShowCreateChat(true)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
                    <Icon name="PenSquare" size={15} />
                  </button>
                </>
              )}
              {activeSection === "channels" && (
                <button onClick={() => setShowCreateChannel(true)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
                  <Icon name="Plus" size={15} />
                </button>
              )}
            </div>
          </div>

          {(showSearch || activeSection !== "chats") && (
            <div className="relative animate-fade-in">
              <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск..."
                className="w-full pl-8 pr-3 py-2 rounded-lg outline-none transition-all"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: 13 }} />
            </div>
          )}
        </div>

        {/* Chats */}
        {activeSection === "chats" && (
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {searchResults && (
              <div className="px-2 mb-2 animate-fade-in">
                {searchResults.users.length > 0 && (
                  <>
                    <p className="text-[10px] px-1 mb-1" style={{ color: "var(--text-muted)" }}>ЛЮДИ</p>
                    {searchResults.users.map(u => (
                      <div key={u.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl mb-0.5"
                        style={{ background: "var(--bg-surface)" }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: `${colorFor(u.id)}22`, color: colorFor(u.id) }}>
                          {avatarLetters(u.display_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{u.display_name}</p>
                          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>@{u.username}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {searchResults.messages.length > 0 && (
                  <>
                    <p className="text-[10px] px-1 mb-1 mt-2" style={{ color: "var(--text-muted)" }}>СООБЩЕНИЯ</p>
                    {searchResults.messages.map(m => (
                      <button key={m.id} className="w-full flex flex-col px-3 py-2 rounded-xl mb-0.5 text-left"
                        style={{ background: "var(--bg-surface)" }}
                        onClick={() => { const c = chats.find(ch => ch.id === m.chat_id); if (c) { setActiveChat(c); setSearchQuery(""); setShowSearch(false); } }}>
                        <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{m.text}</p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{m.chat_name}</p>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
            {filteredChats.length === 0 && !searchResults && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Icon name="MessageSquarePlus" size={28} style={{ color: "var(--text-muted)" }} />
                <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>Нет чатов.<br />Нажмите ✏️ чтобы начать</p>
              </div>
            )}
            {filteredChats.map((chat, i) => (
              <button key={chat.id} onClick={() => setActiveChat(chat)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left mb-0.5 animate-slide-in"
                style={{ background: activeChat?.id === chat.id ? "var(--bg-active)" : "transparent", animationDelay: `${i * 25}ms`, borderLeft: activeChat?.id === chat.id ? "2px solid var(--accent-cyan)" : "2px solid transparent" }}>
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${colorFor(chat.id)}22`, color: colorFor(chat.id) }}>
                    {chat.type === "group" ? <Icon name="Users" size={16} /> : avatarLetters(chat.name)}
                  </div>
                  {chat.online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 animate-pulse-dot" style={{ background: "var(--online)", borderColor: "var(--bg-panel)" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate" style={{ color: "var(--text-primary)", fontSize: 13 }}>{chat.name}</span>
                    <span className="text-[10px] ml-1 flex-shrink-0" style={{ color: "var(--text-muted)" }}>{formatTime(chat.last_time)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs truncate flex-1" style={{ color: "var(--text-secondary)", fontSize: 12 }}>{chat.last_text || "Нет сообщений"}</p>
                    {chat.unread > 0 && <span className="ml-2 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: "var(--accent-cyan)", color: "#0a0e14" }}>{chat.unread > 9 ? "9+" : chat.unread}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Channels */}
        {activeSection === "channels" && (
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {channels.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Icon name="Radio" size={28} style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Нет каналов</p>
              </div>
            )}
            {channels.filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((ch, i) => (
              <button key={ch.id} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-0.5 text-left animate-slide-in" style={{ animationDelay: `${i * 35}ms` }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${colorFor(ch.id)}22`, color: colorFor(ch.id) }}>
                  <Icon name="Radio" size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate" style={{ color: "var(--text-primary)", fontSize: 13 }}>{ch.name}</span>
                    {ch.is_owner && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent-glow)", color: "var(--accent-cyan)" }}>Мой</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Icon name="Users" size={10} style={{ color: "var(--text-muted)" }} />
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{ch.subscribers_count}</span>
                    {ch.last_post && <span className="ml-1 truncate" style={{ color: "var(--text-secondary)", fontSize: 11 }}>{ch.last_post}</span>}
                  </div>
                </div>
                <button onClick={async (e) => { e.stopPropagation(); if (ch.subscribed) await api.unsubscribeChannel(ch.id); else await api.subscribeChannel(ch.id); loadChannels(); }}
                  className="text-[10px] px-2 py-1 rounded-lg flex-shrink-0"
                  style={{ background: ch.subscribed ? "var(--bg-active)" : "var(--accent-glow)", color: ch.subscribed ? "var(--text-muted)" : "var(--accent-cyan)", border: `1px solid ${ch.subscribed ? "var(--border-subtle)" : "var(--border-accent)"}` }}>
                  {ch.subscribed ? "Отписаться" : "Подписаться"}
                </button>
              </button>
            ))}
          </div>
        )}

        {/* Notifications */}
        {activeSection === "notifications" && (
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            <div className="px-3 mb-3">
              <button onClick={markAllNotifRead} className="text-xs" style={{ color: "var(--accent-cyan)" }}>Отметить все прочитанными</button>
            </div>
            {notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Icon name="BellOff" size={28} style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Нет уведомлений</p>
              </div>
            )}
            {notifications.map((n, i) => (
              <div key={n.id} className="flex items-start gap-3 px-3 py-3 rounded-xl mb-0.5 animate-fade-in" style={{ background: n.is_read ? "transparent" : "var(--bg-surface)", animationDelay: `${i * 35}ms` }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-glow)", color: "var(--accent-cyan)" }}>
                  <Icon name="Bell" size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="leading-relaxed" style={{ color: n.is_read ? "var(--text-secondary)" : "var(--text-primary)", fontSize: 12 }}>{n.body}</p>
                  <span className="text-[10px] mt-0.5 block" style={{ color: "var(--text-muted)" }}>{formatTime(n.created_at)}</span>
                </div>
                {!n.is_read && <div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: "var(--accent-cyan)" }} />}
              </div>
            ))}
          </div>
        )}

        {/* Contacts */}
        {activeSection === "contacts" && (
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {contacts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Icon name="UserPlus" size={28} style={{ color: "var(--text-muted)" }} />
                <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>Нет контактов.<br />Найдите людей через поиск</p>
              </div>
            )}
            {contacts.filter(c => !searchQuery || c.display_name.toLowerCase().includes(searchQuery.toLowerCase())).map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 animate-slide-in" style={{ animationDelay: `${i * 35}ms` }}>
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${colorFor(c.id)}22`, color: colorFor(c.id) }}>
                    {avatarLetters(c.display_name)}
                  </div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2" style={{ background: c.status === "online" ? "var(--online)" : "var(--offline)", borderColor: "var(--bg-panel)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium" style={{ color: "var(--text-primary)", fontSize: 13 }}>{c.display_name}</p>
                  <p style={{ color: c.status === "online" ? "var(--online)" : "var(--text-muted)", fontSize: 11 }}>@{c.username}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={async () => { const res = await api.createChat("personal", c.display_name, [c.id]); if (res.ok) { await loadChats(); setActiveSection("chats"); } }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "var(--accent-cyan)" }}>
                    <Icon name="MessageCircle" size={15} />
                  </button>
                  <button onClick={async () => { await api.removeContact(c.id); loadContacts(); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
                    <Icon name="UserMinus" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Settings */}
        {activeSection === "settings" && <div className="flex-1 overflow-hidden" />}
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col" style={{ background: "var(--bg-message)" }}>
        {activeSection === "settings" ? (
          <SettingsPanel onLogout={() => setAuthed(false)} onUpdated={() => {}} />
        ) : activeSection === "chats" && activeChat ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-5 py-3.5" style={{ background: "var(--bg-panel)", borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="relative">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${colorFor(activeChat.id)}22`, color: colorFor(activeChat.id) }}>
                  {activeChat.type === "group" ? <Icon name="Users" size={16} /> : avatarLetters(activeChat.name)}
                </div>
                {activeChat.online && <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 animate-pulse-dot" style={{ background: "var(--online)", borderColor: "var(--bg-panel)" }} />}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{activeChat.name}</p>
                <p style={{ color: activeChat.online ? "var(--online)" : "var(--text-muted)", fontSize: 11 }}>
                  {activeChat.type === "group" ? "Группа" : activeChat.online ? "В сети" : "Не в сети"}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                {["Phone", "Video", "Search", "MoreVertical"].map(icon => (
                  <button key={icon} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: "var(--text-secondary)" }}>
                    <Icon name={icon} size={17} />
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2.5">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1 gap-3">
                  <Icon name="MessageCircle" size={32} style={{ color: "var(--text-muted)" }} />
                  <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Начните диалог</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={msg.id} className={`flex gap-2.5 group animate-fade-in ${msg.mine ? "flex-row-reverse" : ""}`} style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
                  {!msg.mine && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-auto" style={{ background: `${colorFor(msg.user_id)}22`, color: colorFor(msg.user_id) }}>
                      {avatarLetters(msg.display_name || "?")}
                    </div>
                  )}
                  <div className={`max-w-[65%] flex flex-col gap-0.5 ${msg.mine ? "items-end" : "items-start"}`}>
                    {!msg.mine && <span className="px-1" style={{ color: colorFor(msg.user_id), fontSize: 11 }}>{msg.display_name}</span>}
                    <div className="px-4 py-2.5 relative" style={{
                      background: msg.mine ? "linear-gradient(135deg, #00b4d8, #00d4ff)" : "var(--bg-surface)",
                      color: msg.mine ? "#0a0e14" : "var(--text-primary)",
                      borderRadius: msg.mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      boxShadow: msg.mine ? "0 2px 12px rgba(0,212,255,0.2)" : "none",
                    }}>
                      <p className="leading-relaxed" style={{ fontSize: 13 }}>{msg.text}</p>
                      {msg.is_edited && <span className="text-[9px] opacity-60 ml-1">изм.</span>}
                      {/* Actions */}
                      {msg.mine && (
                        <div className="absolute -top-7 right-0 hidden group-hover:flex gap-0.5 px-1 py-1 rounded-lg" style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)" }}>
                          <button onClick={() => { setEditingMsg(msg); setMessageInput(msg.text); }} className="w-6 h-6 rounded flex items-center justify-center" style={{ color: "var(--accent-cyan)" }}>
                            <Icon name="Pencil" size={11} />
                          </button>
                          <button onClick={() => deleteMsg(msg.id)} className="w-6 h-6 rounded flex items-center justify-center" style={{ color: "#f87171" }}>
                            <Icon name="Trash2" size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 px-1 ${msg.mine ? "flex-row-reverse" : ""}`}>
                      <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{formatTime(msg.created_at)}</span>
                      {msg.mine && <Icon name="CheckCheck" size={12} style={{ color: "var(--accent-cyan)" }} />}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3" style={{ background: "var(--bg-panel)", borderTop: "1px solid var(--border-subtle)" }}>
              {editingMsg && (
                <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg animate-fade-in" style={{ background: "var(--bg-surface)" }}>
                  <Icon name="Pencil" size={12} style={{ color: "var(--accent-cyan)" }} />
                  <span className="text-xs flex-1 truncate" style={{ color: "var(--text-secondary)" }}>Редактирование: {editingMsg.text}</span>
                  <button onClick={() => { setEditingMsg(null); setMessageInput(""); }} style={{ color: "var(--text-muted)" }}>
                    <Icon name="X" size={14} />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <button className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                  <Icon name="Paperclip" size={17} />
                </button>
                <textarea
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  placeholder="Написать сообщение..."
                  rows={1}
                  className="flex-1 px-4 py-2.5 rounded-xl resize-none outline-none transition-all"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: 13, lineHeight: "1.5", maxHeight: 120 }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                />
                <button className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                  <Icon name="Smile" size={17} />
                </button>
                <button
                  onClick={sendMessage}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ background: messageInput.trim() ? "linear-gradient(135deg, #00b4d8, #00d4ff)" : "var(--bg-surface)", color: messageInput.trim() ? "#0a0e14" : "var(--text-muted)", boxShadow: messageInput.trim() ? "0 2px 12px rgba(0,212,255,0.3)" : "none" }}
                >
                  <Icon name={messageInput.trim() ? "Send" : "Mic"} size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center glow-cyan" style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.1), rgba(0,229,179,0.1))", border: "1px solid var(--border-accent)" }}>
              <Icon name={navItems.find(n => n.section === activeSection)?.icon || "MessageSquare"} size={32} style={{ color: "var(--accent-cyan)" }} />
            </div>
            <div className="text-center">
              <p className="font-semibold mb-1" style={{ color: "var(--text-primary)", fontSize: 15 }}>
                {activeSection === "chats" && "Выберите чат"}
                {activeSection === "channels" && "Каналы"}
                {activeSection === "notifications" && "Уведомления"}
                {activeSection === "contacts" && "Контакты"}
              </p>
              <p style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                {activeSection === "chats" ? "Выберите чат или создайте новый" : "Выберите элемент в списке слева"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Info Panel */}
      {activeSection === "chats" && activeChat && (
        <div className="hidden xl:flex flex-col" style={{ width: 240, background: "var(--bg-panel)", borderLeft: "1px solid var(--border-subtle)" }}>
          <div className="flex flex-col items-center px-4 pt-6 pb-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <div className="relative mb-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg" style={{ background: `${colorFor(activeChat.id)}22`, color: colorFor(activeChat.id) }}>
                {activeChat.type === "group" ? <Icon name="Users" size={24} /> : avatarLetters(activeChat.name)}
              </div>
              {activeChat.online && <div className="absolute bottom-1 right-0 w-3 h-3 rounded-full border-2 animate-pulse-dot" style={{ background: "var(--online)", borderColor: "var(--bg-panel)" }} />}
            </div>
            <p className="font-semibold text-center text-sm" style={{ color: "var(--text-primary)" }}>{activeChat.name}</p>
            <p className="text-xs mt-1" style={{ color: activeChat.online ? "var(--online)" : "var(--text-muted)" }}>
              {activeChat.online ? "В сети" : "Не в сети"}
            </p>
          </div>
          <div className="px-4 py-4 flex flex-col gap-1">
            {[{ icon: "Phone", label: "Позвонить" }, { icon: "Video", label: "Видеозвонок" }, { icon: "BellOff", label: "Без звука" }, { icon: "Search", label: "Поиск в чате" }].map(a => (
              <button key={a.label} className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left" style={{ color: "var(--text-secondary)" }}>
                <Icon name={a.icon} size={15} style={{ color: "var(--accent-cyan)" }} />
                <span style={{ fontSize: 12 }}>{a.label}</span>
              </button>
            ))}
          </div>
          <div className="px-4 mt-2">
            <p className="text-xs mb-2 px-1" style={{ color: "var(--text-muted)" }}>ВСЕ СООБЩЕНИЯ</p>
            <p className="text-xs px-1" style={{ color: "var(--text-secondary)" }}>{messages.length} сообщений</p>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateChat && (
        <CreateChatModal onClose={() => setShowCreateChat(false)}
          onCreated={async (chat) => { setShowCreateChat(false); await loadChats(); const found = chats.find(c => c.id === chat.id); if (found) setActiveChat(found); else { await loadChats(); } }} />
      )}
      {showCreateChannel && (
        <CreateChannelModal onClose={() => setShowCreateChannel(false)} onCreated={async () => { setShowCreateChannel(false); await loadChannels(); }} />
      )}
    </div>
  );
}
