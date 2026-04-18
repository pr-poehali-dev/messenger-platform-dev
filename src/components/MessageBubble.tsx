import { useState } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";

interface Reaction { emoji: string; count: number; mine: boolean; }
interface ReplyPreview { text: string; display_name: string; }

interface Message {
  id: number;
  user_id: number;
  display_name: string;
  avatar_url?: string;
  text: string;
  type: string;
  reply_to?: number;
  reply_preview?: ReplyPreview;
  is_edited: boolean;
  created_at: string;
  mine: boolean;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  voice_duration?: number;
  reactions: Reaction[];
}

interface Props {
  msg: Message;
  color: string;
  onEdit: (msg: Message) => void;
  onDelete: (id: number) => void;
  onReply: (msg: Message) => void;
  onReactionUpdate: (msgId: number, reactions: Reaction[]) => void;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export default function MessageBubble({ msg, color, onEdit, onDelete, onReply, onReactionUpdate }: Props) {
  const [showActions, setShowActions] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  const isImage = msg.type === "image";
  const isVoice = msg.type === "voice";
  const isFile = msg.type === "file";

  const handleReaction = async (emoji: string) => {
    setShowEmoji(false);
    const res = await api.toggleReaction(msg.id, emoji);
    if (res.ok) onReactionUpdate(msg.id, res.data.reactions);
  };

  return (
    <div
      className={`flex gap-2.5 group ${msg.mine ? "flex-row-reverse" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmoji(false); }}
    >
      {!msg.mine && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-auto"
          style={{ background: `${color}22`, color }}>
          {(msg.display_name || "?")[0].toUpperCase()}
        </div>
      )}

      <div className={`max-w-[65%] flex flex-col gap-0.5 ${msg.mine ? "items-end" : "items-start"}`}>
        {/* Reply preview */}
        {msg.reply_preview && (
          <div className="px-3 py-1.5 rounded-lg text-xs max-w-full" style={{ background: msg.mine ? "rgba(0,0,0,0.15)" : "var(--bg-active)", borderLeft: `2px solid ${color}` }}>
            <span className="font-medium block" style={{ color }}>{msg.reply_preview.display_name}</span>
            <span className="truncate block" style={{ color: "var(--text-muted)" }}>{msg.reply_preview.text || "📎 Файл"}</span>
          </div>
        )}

        {!msg.mine && <span className="px-1" style={{ color, fontSize: 11 }}>{msg.display_name}</span>}

        {/* Bubble */}
        <div className="relative px-4 py-2.5" style={{
          background: msg.mine ? "linear-gradient(135deg, #00b4d8, #00d4ff)" : "var(--bg-surface)",
          color: msg.mine ? "#0a0e14" : "var(--text-primary)",
          borderRadius: msg.mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          boxShadow: msg.mine ? "0 2px 12px rgba(0,212,255,0.2)" : "none",
          maxWidth: "100%",
        }}>
          {/* Image */}
          {isImage && msg.file_url && (
            <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
              <img
                src={msg.file_url}
                alt={msg.file_name || "image"}
                className="rounded-xl max-w-full"
                style={{ maxHeight: 280, objectFit: "cover", display: "block" }}
              />
            </a>
          )}

          {/* Voice */}
          {isVoice && msg.file_url && (
            <div className="flex items-center gap-2" style={{ minWidth: 180 }}>
              <Icon name="Mic" size={16} style={{ color: msg.mine ? "#0a0e14" : "var(--accent-cyan)", flexShrink: 0 }} />
              <audio src={msg.file_url} controls className="flex-1" style={{ height: 32, maxWidth: 200 }} />
              {msg.voice_duration && (
                <span className="text-xs flex-shrink-0" style={{ color: msg.mine ? "rgba(0,0,0,0.6)" : "var(--text-muted)" }}>
                  {Math.floor(msg.voice_duration / 60)}:{String(msg.voice_duration % 60).padStart(2, "0")}
                </span>
              )}
            </div>
          )}

          {/* File */}
          {isFile && msg.file_url && (
            <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 no-underline" style={{ textDecoration: "none" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: msg.mine ? "rgba(0,0,0,0.15)" : "var(--bg-active)" }}>
                <Icon name="FileText" size={18} style={{ color: msg.mine ? "#0a0e14" : "var(--accent-cyan)" }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: msg.mine ? "#0a0e14" : "var(--text-primary)", maxWidth: 160 }}>{msg.file_name}</p>
                <p className="text-xs" style={{ color: msg.mine ? "rgba(0,0,0,0.6)" : "var(--text-muted)" }}>{formatFileSize(msg.file_size)}</p>
              </div>
              <Icon name="Download" size={14} style={{ color: msg.mine ? "rgba(0,0,0,0.6)" : "var(--text-muted)", flexShrink: 0 }} />
            </a>
          )}

          {/* Text */}
          {msg.text && (
            <p className="leading-relaxed" style={{ fontSize: 13, marginTop: (isImage || isVoice || isFile) && msg.text ? 8 : 0 }}>
              {msg.text}
              {msg.is_edited && <span className="text-[9px] opacity-60 ml-1">изм.</span>}
            </p>
          )}
          {!msg.text && !isImage && !isVoice && !isFile && (
            <p className="leading-relaxed" style={{ fontSize: 13 }}>
              {msg.is_edited && <span className="text-[9px] opacity-60 ml-1">изм.</span>}
            </p>
          )}
        </div>

        {/* Reactions */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 px-1 ${msg.mine ? "justify-end" : "justify-start"}`}>
            {msg.reactions.map(r => (
              <button key={r.emoji} onClick={() => handleReaction(r.emoji)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-all"
                style={{
                  background: r.mine ? "var(--accent-glow)" : "var(--bg-surface)",
                  border: `1px solid ${r.mine ? "var(--border-accent)" : "var(--border-subtle)"}`,
                  fontSize: 11,
                }}>
                <span>{r.emoji}</span>
                <span style={{ color: r.mine ? "var(--accent-cyan)" : "var(--text-muted)" }}>{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Time + status */}
        <div className={`flex items-center gap-1 px-1 ${msg.mine ? "flex-row-reverse" : ""}`}>
          <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{formatTime(msg.created_at)}</span>
          {msg.mine && <Icon name="CheckCheck" size={12} style={{ color: "var(--accent-cyan)" }} />}
        </div>
      </div>

      {/* Action buttons */}
      <div className={`flex flex-col gap-0.5 self-center transition-opacity ${showActions ? "opacity-100" : "opacity-0"} ${msg.mine ? "order-first mr-1" : "order-last ml-1"}`}>
        <button onClick={() => setShowEmoji(!showEmoji)}
          className="w-6 h-6 rounded-lg flex items-center justify-center relative"
          style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}>
          <Icon name="Smile" size={12} />
          {showEmoji && (
            <div className={`absolute bottom-7 flex gap-1 p-1.5 rounded-xl z-10 ${msg.mine ? "right-0" : "left-0"}`}
              style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
              {QUICK_EMOJIS.map(e => (
                <button key={e} onClick={() => handleReaction(e)} className="text-base hover:scale-125 transition-transform">{e}</button>
              ))}
            </div>
          )}
        </button>
        <button onClick={() => onReply(msg)}
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}>
          <Icon name="Reply" size={12} />
        </button>
        {msg.mine && (
          <>
            <button onClick={() => onEdit(msg)}
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "var(--bg-surface)", color: "var(--accent-cyan)" }}>
              <Icon name="Pencil" size={11} />
            </button>
            <button onClick={() => onDelete(msg.id)}
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "var(--bg-surface)", color: "#f87171" }}>
              <Icon name="Trash2" size={11} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
