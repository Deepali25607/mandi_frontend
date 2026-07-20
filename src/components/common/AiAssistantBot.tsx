import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Chip,
  Fab,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import { useSendVoiceCommandMutation } from '@/api/voiceApi';

const MAX_RECORD_MS = 10_000;

/** Neon palette for the futuristic shell. */
const NEO = {
  bg: '#0B1220',
  panel: 'rgba(15, 23, 42, 0.92)',
  border: 'rgba(34, 211, 238, 0.35)',
  cyan: '#22D3EE',
  violet: '#8B5CF6',
  botBubble: 'rgba(30, 41, 59, 0.9)',
  text: '#E2E8F0',
  dim: '#94A3B8',
  gradient: 'linear-gradient(120deg, #06B6D4 0%, #6366F1 55%, #8B5CF6 100%)',
};

/**
 * Futuristic robot avatar — glowing visor eyes, antenna and circuit traces.
 * Pure inline SVG (with SMIL glow animation) so it scales crisply anywhere.
 */
export function NeoBotAvatar({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="MandiAI assistant">
      <defs>
        <linearGradient id="neoHead" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="neoRim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <radialGradient id="neoEye" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#A5F3FC" />
          <stop offset="60%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#0891B2" />
        </radialGradient>
      </defs>

      {/* halo */}
      <circle cx="32" cy="32" r="30.5" fill="url(#neoHead)" stroke="url(#neoRim)" strokeWidth="2" />

      {/* antenna */}
      <line x1="32" y1="10" x2="32" y2="16" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="8.5" r="2.6" fill="#22D3EE">
        <animate attributeName="opacity" values="1;0.35;1" dur="1.8s" repeatCount="indefinite" />
      </circle>

      {/* head */}
      <rect x="14" y="17" width="36" height="28" rx="10" fill="url(#neoHead)" stroke="url(#neoRim)" strokeWidth="1.6" />
      {/* ear pods */}
      <rect x="9.5" y="26" width="4.5" height="10" rx="2.2" fill="#6366F1" />
      <rect x="50" y="26" width="4.5" height="10" rx="2.2" fill="#6366F1" />

      {/* visor */}
      <rect x="19" y="23.5" width="26" height="12.5" rx="6" fill="#020617" stroke="rgba(34,211,238,0.5)" strokeWidth="1" />
      {/* eyes */}
      <ellipse cx="26.5" cy="29.75" rx="3.4" ry="3.9" fill="url(#neoEye)">
        <animate attributeName="ry" values="3.9;3.9;0.6;3.9" keyTimes="0;0.9;0.95;1" dur="4.6s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="37.5" cy="29.75" rx="3.4" ry="3.9" fill="url(#neoEye)">
        <animate attributeName="ry" values="3.9;3.9;0.6;3.9" keyTimes="0;0.9;0.95;1" dur="4.6s" repeatCount="indefinite" />
      </ellipse>

      {/* smile bar */}
      <rect x="26" y="39" width="12" height="2.4" rx="1.2" fill="#22D3EE" opacity="0.9">
        <animate attributeName="width" values="12;8;12" dur="3.4s" repeatCount="indefinite" />
        <animate attributeName="x" values="26;28;26" dur="3.4s" repeatCount="indefinite" />
      </rect>

      {/* circuit traces */}
      <path d="M14 50 h10 l3 3 h8" fill="none" stroke="rgba(34,211,238,0.55)" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="35" cy="53" r="1.4" fill="#22D3EE" />
      <path d="M50 50 h-6 l-2 2" fill="none" stroke="rgba(139,92,246,0.6)" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="42" cy="52" r="1.2" fill="#8B5CF6" />
    </svg>
  );
}

interface ChatMessage {
  from: 'user' | 'bot';
  text: string;
  isError?: boolean;
}

const GREETING: ChatMessage = {
  from: 'bot',
  text: 'Namaste! Main MandiAI hoon ⚡ — aapka smart mandi assistant.\nBol kar ya likh kar kaam karwaiye:\n• "open collections"\n• "Ramesh se 5000 cash aaye"\n• "200 chai kharcha"\n• "10 hazaar bank me jama karo"',
};

/** Tap-to-run smart suggestions shown above the composer. */
const SUGGESTIONS: { label: string; command: string }[] = [
  { label: '📊 Dashboard', command: 'open dashboard' },
  { label: '💰 Collections', command: 'open collections' },
  { label: '🧾 Record expense', command: 'record 100 miscellaneous expense in cash' },
  { label: '🏦 Outstanding', command: 'open outstanding' },
  { label: '📦 Inventory', command: 'open inventory' },
];

/**
 * MandiAI — futuristic floating AI assistant (paid "AI Munim Assistant" plan
 * feature). Speak or type; it navigates screens and records collections,
 * expenses and cash-bank transfers.
 */
export default function AiAssistantBot() {
  const navigate = useNavigate();
  const [send, { isLoading: thinking }] = useSendVoiceCommandMutation();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [draft, setDraft] = useState('');
  const [recording, setRecording] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking, open]);

  // Release the mic if the widget unmounts mid-recording.
  useEffect(() => () => stopTracks(), []);

  const stopTracks = () => {
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const push = (msg: ChatMessage) => setMessages((prev) => [...prev, msg]);

  const runCommand = async (payload: { text?: string; audio?: string; mimeType?: string }) => {
    try {
      const res = await send(payload).unwrap();
      // For voice we only know what was said after transcription — show it as
      // the user's bubble now.
      if (payload.audio) push({ from: 'user', text: res.transcript ? `🎤 "${res.transcript}"` : '🎤 (unclear audio)' });
      if (res.action === 'navigate' && res.path) navigate(res.path);
      push({ from: 'bot', text: res.message });
    } catch (e) {
      const err = e as { data?: { message?: string | string[] } };
      const msg = err?.data?.message;
      if (payload.audio) push({ from: 'user', text: '🎤 (voice command)' });
      push({
        from: 'bot',
        text: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Kuch gadbad ho gayi — please try again.',
        isError: true,
      });
    }
  };

  const sendText = (raw?: string) => {
    const text = (raw ?? draft).trim();
    if (!text || thinking) return;
    if (!raw) setDraft('');
    push({ from: 'user', text });
    void runCommand({ text });
  };

  const startRecording = async () => {
    try {
      // Clean mono speech capture — noise suppression + auto gain make a big
      // difference to Whisper accuracy in a noisy mandi office.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined;
      const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 128_000 });
      const chunks: Blob[] = [];
      const startedAt = Date.now();
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        stopTracks();
        setRecording(false);
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        // Sub-half-second clips are accidental taps — Whisper turns them into
        // hallucinated sentences, so drop them instead of sending.
        if (Date.now() - startedAt < 500 || blob.size === 0) {
          push({ from: 'bot', text: 'Bahut chhota clip tha — press the mic, speak your command, then press stop.' });
          return;
        }
        void toBase64(blob).then((audio) => runCommand({ audio, mimeType: blob.type }));
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      timerRef.current = setTimeout(() => stopRecording(), MAX_RECORD_MS);
    } catch {
      push({ from: 'bot', text: 'Microphone not available — allow mic access and try again.', isError: true });
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  // Sits above the mobile bottom navigation; normal corner offset on desktop.
  const anchorSx = { position: 'fixed', right: 16, bottom: { xs: 88, md: 24 }, zIndex: (t: { zIndex: { modal: number } }) => t.zIndex.modal } as const;

  if (!open) {
    return (
      <Tooltip title="MandiAI — Smart Assistant" placement="left">
        <Fab
          onClick={() => setOpen(true)}
          aria-label="Open MandiAI assistant"
          sx={{
            ...anchorSx,
            width: 62,
            height: 62,
            bgcolor: NEO.bg,
            '&:hover': { bgcolor: '#111C33', transform: 'scale(1.06)' },
            transition: 'transform 0.2s ease',
            boxShadow: '0 0 18px rgba(34, 211, 238, 0.45), 0 8px 24px rgba(0,0,0,0.35)',
            // Pulsing neon halo.
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: -4,
              borderRadius: '50%',
              border: '2px solid rgba(34, 211, 238, 0.5)',
              animation: 'neoHalo 2.4s ease-out infinite',
            },
            '@keyframes neoHalo': {
              '0%': { transform: 'scale(0.9)', opacity: 0.9 },
              '100%': { transform: 'scale(1.45)', opacity: 0 },
            },
          }}
        >
          <NeoBotAvatar size={54} />
        </Fab>
      </Tooltip>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        ...anchorSx,
        width: { xs: 'calc(100vw - 32px)', sm: 372 },
        height: 520,
        maxHeight: 'calc(100dvh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3.5,
        overflow: 'hidden',
        bgcolor: NEO.panel,
        backdropFilter: 'blur(14px)',
        border: '1px solid',
        borderColor: NEO.border,
        boxShadow: '0 0 32px rgba(34, 211, 238, 0.22), 0 24px 48px rgba(0,0,0,0.5)',
        color: NEO.text,
      }}
    >
      {/* Header */}
      <Box sx={{ position: 'relative', p: 1.5, background: NEO.gradient }}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Box
            sx={{
              borderRadius: '50%',
              lineHeight: 0,
              boxShadow: '0 0 14px rgba(2, 6, 23, 0.55)',
            }}
          >
            <NeoBotAvatar size={42} />
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, lineHeight: 1.1, color: '#fff', letterSpacing: 0.4 }}>
              MandiAI
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.6}>
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  bgcolor: '#4ADE80',
                  boxShadow: '0 0 6px #4ADE80',
                  animation: 'neoOnline 1.8s ease-in-out infinite',
                  '@keyframes neoOnline': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.45 } },
                }}
              />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                Online · Smart Mandi Assistant
              </Typography>
            </Stack>
          </Box>
          <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: '#fff' }} aria-label="Close assistant">
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {/* Messages */}
      <Box
        ref={scrollRef}
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: 1.5,
          background: 'radial-gradient(circle at 20% 10%, rgba(99, 102, 241, 0.12), transparent 45%), radial-gradient(circle at 85% 90%, rgba(34, 211, 238, 0.10), transparent 40%)',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(148, 163, 184, 0.35)', borderRadius: 3 },
        }}
      >
        <Stack spacing={1.1}>
          {messages.map((m, i) => (
            <Stack key={i} direction="row" spacing={1} justifyContent={m.from === 'user' ? 'flex-end' : 'flex-start'}>
              {m.from === 'bot' && (
                <Box sx={{ flexShrink: 0, alignSelf: 'flex-end', lineHeight: 0 }}>
                  <NeoBotAvatar size={26} />
                </Box>
              )}
              <Box
                sx={{
                  maxWidth: '82%',
                  px: 1.5,
                  py: 1,
                  borderRadius: 2.5,
                  ...(m.from === 'user'
                    ? {
                        background: NEO.gradient,
                        color: '#fff',
                        borderBottomRightRadius: 6,
                        boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                      }
                    : {
                        bgcolor: NEO.botBubble,
                        border: '1px solid',
                        borderColor: m.isError ? 'rgba(248, 113, 113, 0.55)' : 'rgba(34, 211, 238, 0.25)',
                        borderBottomLeftRadius: 6,
                        color: m.isError ? '#FECACA' : NEO.text,
                      }),
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {m.text}
                </Typography>
              </Box>
            </Stack>
          ))}
          {thinking && (
            <Stack direction="row" spacing={1} alignItems="flex-end">
              <NeoBotAvatar size={26} />
              <Box
                sx={{
                  px: 1.75,
                  py: 1.25,
                  borderRadius: 2.5,
                  borderBottomLeftRadius: 6,
                  bgcolor: NEO.botBubble,
                  border: '1px solid rgba(34, 211, 238, 0.25)',
                  display: 'flex',
                  gap: 0.6,
                }}
              >
                {[0, 1, 2].map((d) => (
                  <Box
                    key={d}
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      bgcolor: NEO.cyan,
                      animation: 'neoDots 1.2s ease-in-out infinite',
                      animationDelay: `${d * 0.18}s`,
                      '@keyframes neoDots': {
                        '0%, 100%': { opacity: 0.25, transform: 'translateY(0)' },
                        '50%': { opacity: 1, transform: 'translateY(-4px)' },
                      },
                    }}
                  />
                ))}
              </Box>
            </Stack>
          )}
        </Stack>
      </Box>

      {/* Smart suggestions */}
      <Box
        sx={{
          px: 1.25,
          pt: 1,
          display: 'flex',
          gap: 0.75,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {SUGGESTIONS.map((s) => (
          <Chip
            key={s.label}
            label={s.label}
            size="small"
            onClick={() => sendText(s.command)}
            disabled={thinking || recording}
            sx={{
              flexShrink: 0,
              color: NEO.text,
              bgcolor: 'rgba(30, 41, 59, 0.9)',
              border: '1px solid rgba(34, 211, 238, 0.3)',
              fontWeight: 600,
              '&:hover': { bgcolor: 'rgba(34, 211, 238, 0.18)' },
            }}
          />
        ))}
      </Box>

      {/* Composer */}
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ p: 1.25 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={recording ? '🎙 Listening…' : 'Ask MandiAI…'}
          value={draft}
          disabled={recording}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: NEO.text,
              bgcolor: 'rgba(2, 6, 23, 0.6)',
              borderRadius: 5,
              '& fieldset': { borderColor: 'rgba(34, 211, 238, 0.3)' },
              '&:hover fieldset': { borderColor: 'rgba(34, 211, 238, 0.55)' },
              '&.Mui-focused fieldset': { borderColor: NEO.cyan },
            },
            '& .MuiOutlinedInput-input::placeholder': { color: NEO.dim, opacity: 1 },
          }}
        />
        <Tooltip title={recording ? 'Stop and run' : 'Speak a command'}>
          <span>
            <IconButton
              onClick={recording ? stopRecording : startRecording}
              disabled={thinking}
              sx={{
                color: recording ? '#F87171' : NEO.cyan,
                border: '1px solid',
                borderColor: recording ? 'rgba(248, 113, 113, 0.6)' : 'rgba(34, 211, 238, 0.35)',
                ...(recording && {
                  animation: 'neoPulse 1.2s ease-in-out infinite',
                  '@keyframes neoPulse': { '0%, 100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.18)' } },
                }),
              }}
              aria-label={recording ? 'Stop recording' : 'Record voice command'}
            >
              {recording ? <StopRoundedIcon /> : <MicRoundedIcon />}
            </IconButton>
          </span>
        </Tooltip>
        <IconButton
          onClick={() => sendText()}
          disabled={!draft.trim() || thinking || recording}
          aria-label="Send"
          sx={{
            color: '#fff',
            background: NEO.gradient,
            '&:hover': { opacity: 0.9, background: NEO.gradient },
            '&.Mui-disabled': { background: 'rgba(51, 65, 85, 0.6)', color: 'rgba(148, 163, 184, 0.5)' },
          }}
        >
          <SendRoundedIcon />
        </IconButton>
      </Stack>
    </Paper>
  );
}

const toBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    // Result is "data:audio/webm;base64,<data>" — send only the payload.
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
