import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

interface Props {
  onSend: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}

export default function VoiceRecorder({ onSend, onCancel }: Props) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startRecording();
    return () => { stopAll(); };
  }, []);

  const stopAll = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: "audio/webm" });
        setBlob(b);
        setAudioUrl(URL.createObjectURL(b));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(100);
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch {
      onCancel();
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDuration(seconds);
    setRecording(false);
    mediaRef.current?.stop();
  };

  const send = () => {
    if (blob) onSend(blob, duration || seconds);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl animate-fade-in" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-accent)" }}>
      {recording ? (
        <>
          <div className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: "#f87171" }} />
          <span className="text-sm font-mono flex-1" style={{ color: "var(--text-primary)" }}>{fmt(seconds)}</span>
          <button onClick={stopRecording} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(248,113,113,0.15)", color: "#f87171" }}>
            <Icon name="Square" size={14} />
          </button>
          <button onClick={() => { stopAll(); onCancel(); }} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
            <Icon name="X" size={16} />
          </button>
        </>
      ) : audioUrl ? (
        <>
          <audio src={audioUrl} controls className="flex-1 h-8" style={{ maxWidth: 200 }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{fmt(duration)}</span>
          <button onClick={send} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#00b4d8,#00d4ff)", color: "#0a0e14" }}>
            <Icon name="Send" size={14} />
          </button>
          <button onClick={onCancel} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
            <Icon name="Trash2" size={14} />
          </button>
        </>
      ) : null}
    </div>
  );
}
