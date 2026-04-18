import { useState } from "react";
import Icon from "@/components/ui/icon";

const MOCK_CHATS = [
  { id: 1, type: "personal", name: "Александр Петров", avatar: "АП", color: "#00d4ff", preview: "Окей, отправлю файлы сегодня вечером", time: "14:32", unread: 3, online: true },
  { id: 2, type: "group", name: "Команда продукта", avatar: "КП", color: "#00e5b3", preview: "Марина: Встреча в 16:00 по расписанию", time: "14:15", unread: 12, online: false },
  { id: 3, type: "personal", name: "Марина Соколова", avatar: "МС", color: "#a78bfa", preview: "Спасибо за помощь с презентацией!", time: "13:47", unread: 0, online: true },
  { id: 4, type: "group", name: "Дизайн-ревью", avatar: "ДР", color: "#f59e0b", preview: "Вы: Посмотрите мокапы в папке", time: "12:30", unread: 0, online: false },
  { id: 5, type: "personal", name: "Дмитрий Волков", avatar: "ДВ", color: "#f472b6", preview: "Договорились на понедельник", time: "11:05", unread: 1, online: false },
  { id: 6, type: "group", name: "Маркетинг Q2", avatar: "МQ", color: "#34d399", preview: "Игорь: Кампания запущена ✓", time: "вчера", unread: 0, online: false },
];

const MOCK_CHANNELS = [
  { id: 1, name: "Новости продукта", color: "#00d4ff", subscribers: "4.2K", preview: "Релиз версии 2.1 уже доступен", time: "10:00" },
  { id: 2, name: "Технологии", color: "#a78bfa", subscribers: "18K", preview: "React 20: что нового в этой версии", time: "вчера" },
  { id: 3, name: "Команда Вектор", color: "#00e5b3", subscribers: "87", preview: "Обновление дорожной карты продукта", time: "вчера" },
];

const MOCK_MESSAGES = [
  { id: 1, from: "Александр Петров", avatar: "АП", color: "#00d4ff", text: "Привет! Посмотрел твои комментарии к документу", time: "14:10", mine: false },
  { id: 2, from: "Вы", avatar: "Вы", color: "#00e5b3", text: "Отлично, нашёл что нужно исправить?", time: "14:12", mine: true },
  { id: 3, from: "Александр Петров", avatar: "АП", color: "#00d4ff", text: "Да, раздел с архитектурой требует доработки. Предлагаю сделать созвон завтра утром", time: "14:18", mine: false },
  { id: 4, from: "Вы", avatar: "Вы", color: "#00e5b3", text: "Договорились, в 10:00 подходит?", time: "14:20", mine: true },
  { id: 5, from: "Александр Петров", avatar: "АП", color: "#00d4ff", text: "Окей, отправлю файлы сегодня вечером", time: "14:32", mine: false },
];

const MOCK_NOTIFICATIONS = [
  { id: 1, icon: "MessageCircle", color: "#00d4ff", text: "Александр упомянул вас в чате", time: "14:33", read: false },
  { id: 2, icon: "Users", color: "#00e5b3", text: "Вас добавили в группу «Дизайн-ревью»", time: "12:15", read: false },
  { id: 3, icon: "Radio", color: "#a78bfa", text: "Новый пост в канале «Технологии»", time: "11:30", read: true },
  { id: 4, icon: "UserPlus", color: "#f59e0b", text: "Дмитрий Волков отправил запрос в контакты", time: "вчера", read: true },
];

const MOCK_CONTACTS = [
  { id: 1, name: "Александр Петров", status: "В сети", avatar: "АП", color: "#00d4ff", online: true },
  { id: 2, name: "Марина Соколова", status: "Была 1 ч. назад", avatar: "МС", color: "#a78bfa", online: false },
  { id: 3, name: "Дмитрий Волков", status: "Не беспокоить", avatar: "ДВ", color: "#f472b6", online: false },
  { id: 4, name: "Игорь Смирнов", status: "В сети", avatar: "ИС", color: "#34d399", online: true },
];

type Section = "chats" | "channels" | "notifications" | "contacts" | "settings";

export default function Index() {
  const [activeSection, setActiveSection] = useState<Section>("chats");
  const [activeChat, setActiveChat] = useState(MOCK_CHATS[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const navItems: { section: Section; icon: string; label: string; badge?: number }[] = [
    { section: "chats", icon: "MessageSquare", label: "Чаты", badge: MOCK_CHATS.reduce((a, c) => a + c.unread, 0) },
    { section: "channels", icon: "Radio", label: "Каналы" },
    { section: "notifications", icon: "Bell", label: "Уведомления", badge: MOCK_NOTIFICATIONS.filter(n => !n.read).length },
    { section: "contacts", icon: "Users", label: "Контакты" },
    { section: "settings", icon: "Settings", label: "Настройки" },
  ];

  const filteredChats = MOCK_CHATS.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: "var(--bg-deep)", fontFamily: "'Golos Text', sans-serif" }}>

      {/* Sidebar Navigation */}
      <div className="flex flex-col items-center py-5 px-2 gap-1" style={{ width: 64, background: "var(--bg-panel)", borderRight: "1px solid var(--border-subtle)" }}>
        <div className="mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center glow-cyan" style={{ background: "linear-gradient(135deg, #00d4ff, #00e5b3)" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#0a0e14" }}>V</span>
          </div>
        </div>

        {navItems.map((item) => (
          <button
            key={item.section}
            onClick={() => setActiveSection(item.section)}
            className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
            style={{
              background: activeSection === item.section ? "var(--bg-active)" : "transparent",
              color: activeSection === item.section ? "var(--accent-cyan)" : "var(--text-muted)",
            }}
            title={item.label}
          >
            <Icon name={item.icon} size={20} />
            {item.badge ? (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: "var(--accent-cyan)", color: "#0a0e14" }}>
                {item.badge > 9 ? "9+" : item.badge}
              </span>
            ) : null}
            {activeSection === item.section && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ background: "var(--accent-cyan)" }} />
            )}
          </button>
        ))}

        <div className="mt-auto">
          <div className="relative w-9 h-9 rounded-full overflow-hidden cursor-pointer" style={{ border: "2px solid var(--accent-cyan)" }}>
            <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--bg-surface)", color: "var(--accent-cyan)" }}>
              ВЫ
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 animate-pulse-dot" style={{ background: "var(--online)", borderColor: "var(--bg-panel)" }} />
          </div>
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
                  <button onClick={() => setShowSearch(!showSearch)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ color: showSearch ? "var(--accent-cyan)" : "var(--text-muted)", background: showSearch ? "var(--bg-active)" : "transparent" }}>
                    <Icon name="Search" size={15} />
                  </button>
                  <button className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
                    <Icon name="PenSquare" size={15} />
                  </button>
                </>
              )}
              {activeSection === "channels" && (
                <button className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
                  <Icon name="Plus" size={15} />
                </button>
              )}
              {activeSection === "contacts" && (
                <button className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
                  <Icon name="UserPlus" size={15} />
                </button>
              )}
            </div>
          </div>

          {(showSearch || activeSection !== "chats") && (
            <div className="relative animate-fade-in">
              <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск..."
                className="w-full pl-8 pr-3 py-2 rounded-lg outline-none transition-all"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: 13 }}
              />
            </div>
          )}
        </div>

        {/* Chats */}
        {activeSection === "chats" && (
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {filteredChats.map((chat, i) => (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left mb-0.5 animate-slide-in"
                style={{
                  background: activeChat?.id === chat.id ? "var(--bg-active)" : "transparent",
                  animationDelay: `${i * 30}ms`,
                  borderLeft: activeChat?.id === chat.id ? "2px solid var(--accent-cyan)" : "2px solid transparent",
                }}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${chat.color}22`, color: chat.color }}>
                    {chat.type === "group" ? <Icon name="Users" size={16} /> : chat.avatar}
                  </div>
                  {chat.online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 animate-pulse-dot" style={{ background: "var(--online)", borderColor: "var(--bg-panel)" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate" style={{ color: "var(--text-primary)", fontSize: 13 }}>{chat.name}</span>
                    <span className="text-[10px] ml-1 flex-shrink-0" style={{ color: "var(--text-muted)" }}>{chat.time}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs truncate flex-1" style={{ color: "var(--text-secondary)", fontSize: 12 }}>{chat.preview}</p>
                    {chat.unread > 0 && (
                      <span className="ml-2 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: "var(--accent-cyan)", color: "#0a0e14" }}>
                        {chat.unread > 9 ? "9+" : chat.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Channels */}
        {activeSection === "channels" && (
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            <div className="px-3 py-2 mb-2">
              <button className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all" style={{ background: "var(--bg-surface)", color: "var(--accent-cyan)", border: "1px dashed var(--border-accent)" }}>
                <Icon name="Plus" size={15} />
                Создать канал
              </button>
            </div>
            {MOCK_CHANNELS.map((ch, i) => (
              <button key={ch.id} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-0.5 text-left animate-slide-in" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${ch.color}22`, color: ch.color }}>
                  <Icon name="Radio" size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate" style={{ color: "var(--text-primary)", fontSize: 13 }}>{ch.name}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{ch.time}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Icon name="Users" size={10} style={{ color: "var(--text-muted)" }} />
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{ch.subscribers}</span>
                    <span className="ml-1 truncate" style={{ color: "var(--text-secondary)", fontSize: 11 }}>{ch.preview}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Notifications */}
        {activeSection === "notifications" && (
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            <div className="px-3 mb-3">
              <button className="text-xs" style={{ color: "var(--accent-cyan)" }}>Отметить все прочитанными</button>
            </div>
            {MOCK_NOTIFICATIONS.map((n, i) => (
              <div key={n.id} className="flex items-start gap-3 px-3 py-3 rounded-xl mb-0.5 animate-fade-in" style={{ background: n.read ? "transparent" : "var(--bg-surface)", animationDelay: `${i * 40}ms` }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${n.color}22`, color: n.color }}>
                  <Icon name={n.icon} size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="leading-relaxed" style={{ color: n.read ? "var(--text-secondary)" : "var(--text-primary)", fontSize: 12 }}>{n.text}</p>
                  <span className="text-[10px] mt-0.5 block" style={{ color: "var(--text-muted)" }}>{n.time}</span>
                </div>
                {!n.read && <div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: "var(--accent-cyan)" }} />}
              </div>
            ))}
          </div>
        )}

        {/* Contacts */}
        {activeSection === "contacts" && (
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {MOCK_CONTACTS.map((c, i) => (
              <button key={c.id} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-0.5 text-left animate-slide-in" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${c.color}22`, color: c.color }}>{c.avatar}</div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2" style={{ background: c.online ? "var(--online)" : "var(--offline)", borderColor: "var(--bg-panel)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium" style={{ color: "var(--text-primary)", fontSize: 13 }}>{c.name}</p>
                  <p style={{ color: c.online ? "var(--online)" : "var(--text-muted)", fontSize: 11 }}>{c.status}</p>
                </div>
                <button className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
                  <Icon name="MessageCircle" size={15} />
                </button>
              </button>
            ))}
          </div>
        )}

        {/* Settings */}
        {activeSection === "settings" && (
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {[
              { icon: "User", label: "Профиль", desc: "Имя, фото, статус" },
              { icon: "Bell", label: "Уведомления", desc: "Звук, вибрация, режим" },
              { icon: "Shield", label: "Конфиденциальность", desc: "Видимость, блокировка" },
              { icon: "Palette", label: "Оформление", desc: "Тема, шрифт, цвета" },
              { icon: "Smartphone", label: "Устройства", desc: "Активные сессии" },
              { icon: "HelpCircle", label: "Справка", desc: "FAQ, поддержка" },
            ].map((s, i) => (
              <button key={s.label} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all mb-0.5 text-left animate-slide-in" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-surface)", color: "var(--accent-cyan)" }}>
                  <Icon name={s.icon} size={16} />
                </div>
                <div>
                  <p className="font-medium" style={{ color: "var(--text-primary)", fontSize: 13 }}>{s.label}</p>
                  <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{s.desc}</p>
                </div>
                <Icon name="ChevronRight" size={14} className="ml-auto" style={{ color: "var(--text-muted)" }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col" style={{ background: "var(--bg-message)" }}>
        {activeSection === "chats" && activeChat ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-5 py-3.5" style={{ background: "var(--bg-panel)", borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="relative">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${activeChat.color}22`, color: activeChat.color }}>
                  {activeChat.type === "group" ? <Icon name="Users" size={16} /> : activeChat.avatar}
                </div>
                {activeChat.online && <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 animate-pulse-dot" style={{ background: "var(--online)", borderColor: "var(--bg-panel)" }} />}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{activeChat.name}</p>
                {activeChat.online ? (
                  <div className="flex items-center gap-1.5">
                    <div className="typing-dots flex gap-0.5 items-center">
                      <span /><span /><span />
                    </div>
                    <span style={{ color: "var(--accent-cyan)", fontSize: 11 }}>печатает...</span>
                  </div>
                ) : (
                  <p style={{ color: "var(--text-muted)", fontSize: 11 }}>
                    {activeChat.type === "group" ? "4 участника" : "Был(а) недавно"}
                  </p>
                )}
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
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
                <span className="text-[11px] px-3 py-0.5 rounded-full" style={{ color: "var(--text-muted)", background: "var(--bg-surface)" }}>Сегодня</span>
                <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
              </div>

              {MOCK_MESSAGES.map((msg, i) => (
                <div key={msg.id} className={`flex gap-2.5 animate-fade-in ${msg.mine ? "flex-row-reverse" : ""}`} style={{ animationDelay: `${i * 60}ms` }}>
                  {!msg.mine && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-auto" style={{ background: `${msg.color}22`, color: msg.color }}>
                      {msg.avatar}
                    </div>
                  )}
                  <div className={`max-w-[65%] flex flex-col gap-1 ${msg.mine ? "items-end" : "items-start"}`}>
                    {!msg.mine && <span className="px-1" style={{ color: msg.color, fontSize: 11 }}>{msg.from}</span>}
                    <div className="px-4 py-2.5" style={{
                      background: msg.mine ? "linear-gradient(135deg, #00b4d8, #00d4ff)" : "var(--bg-surface)",
                      color: msg.mine ? "#0a0e14" : "var(--text-primary)",
                      borderRadius: msg.mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      boxShadow: msg.mine ? "0 2px 12px rgba(0,212,255,0.2)" : "none",
                    }}>
                      <p className="leading-relaxed" style={{ fontSize: 13 }}>{msg.text}</p>
                    </div>
                    <div className={`flex items-center gap-1 px-1 ${msg.mine ? "flex-row-reverse" : ""}`}>
                      <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{msg.time}</span>
                      {msg.mine && <Icon name="CheckCheck" size={12} style={{ color: "var(--accent-cyan)" }} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="px-4 py-3" style={{ background: "var(--bg-panel)", borderTop: "1px solid var(--border-subtle)" }}>
              <div className="flex items-end gap-2">
                <button className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                  <Icon name="Paperclip" size={17} />
                </button>
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Написать сообщение..."
                  rows={1}
                  className="flex-1 px-4 py-2.5 rounded-xl resize-none outline-none transition-all"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: 13, lineHeight: "1.5", maxHeight: 120 }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); setMessageInput(""); } }}
                />
                <button className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                  <Icon name="Smile" size={17} />
                </button>
                <button
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: messageInput.trim() ? "linear-gradient(135deg, #00b4d8, #00d4ff)" : "var(--bg-surface)",
                    color: messageInput.trim() ? "#0a0e14" : "var(--text-muted)",
                    boxShadow: messageInput.trim() ? "0 2px 12px rgba(0,212,255,0.3)" : "none",
                  }}
                  onClick={() => setMessageInput("")}
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
                {activeSection === "notifications" && "Центр уведомлений"}
                {activeSection === "channels" && "Каналы"}
                {activeSection === "contacts" && "Управление контактами"}
                {activeSection === "settings" && "Настройки профиля"}
                {activeSection === "chats" && "Выберите чат"}
              </p>
              <p style={{ color: "var(--text-secondary)", fontSize: 12 }}>Выберите элемент в списке слева</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Info Panel */}
      {activeSection === "chats" && activeChat && (
        <div className="hidden xl:flex flex-col" style={{ width: 240, background: "var(--bg-panel)", borderLeft: "1px solid var(--border-subtle)" }}>
          <div className="flex flex-col items-center px-4 pt-6 pb-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <div className="relative mb-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg" style={{ background: `${activeChat.color}22`, color: activeChat.color }}>
                {activeChat.type === "group" ? <Icon name="Users" size={24} /> : activeChat.avatar}
              </div>
              {activeChat.online && <div className="absolute bottom-1 right-0 w-3 h-3 rounded-full border-2 animate-pulse-dot" style={{ background: "var(--online)", borderColor: "var(--bg-panel)" }} />}
            </div>
            <p className="font-semibold text-center text-sm" style={{ color: "var(--text-primary)" }}>{activeChat.name}</p>
            <p className="text-xs mt-1" style={{ color: activeChat.online ? "var(--online)" : "var(--text-muted)" }}>
              {activeChat.online ? "В сети" : "Был(а) недавно"}
            </p>
          </div>
          <div className="px-4 py-4 flex flex-col gap-1">
            {[
              { icon: "Phone", label: "Позвонить" },
              { icon: "Video", label: "Видеозвонок" },
              { icon: "BellOff", label: "Без звука" },
              { icon: "Search", label: "Поиск в чате" },
            ].map((a) => (
              <button key={a.label} className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left" style={{ color: "var(--text-secondary)" }}>
                <Icon name={a.icon} size={15} style={{ color: "var(--accent-cyan)" }} />
                <span style={{ fontSize: 12 }}>{a.label}</span>
              </button>
            ))}
          </div>
          <div className="px-4 mt-2">
            <p className="text-xs mb-2 px-1" style={{ color: "var(--text-muted)" }}>МЕДИА И ФАЙЛЫ</p>
            <div className="grid grid-cols-3 gap-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-square rounded-lg" style={{ background: `${["#00d4ff", "#00e5b3", "#a78bfa", "#f59e0b", "#f472b6", "#34d399"][i]}18`, border: "1px solid var(--border-subtle)" }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
