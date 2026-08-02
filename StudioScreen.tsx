import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, Mic, MicOff, Palette, Sparkles, Trash2 } from "lucide-react";
import { CATEGORIES, MEDIUMS } from "@/lib/catalog";
import { streamImage } from "@/lib/streamImage";
import { useVoice, speak } from "@/hooks/useVoice";

type GalleryItem = {
  id: string;
  src: string;
  subject: string;
  medium: string;
};

const FILLERS = /\b(naga ai|naga|please|can you|could you|draw|sketch|paint|make|create|show|me|a|an|the|for|of|now|in)\b/gi;

export function StudioScreen() {
  const [medium, setMedium] = useState(MEDIUMS[0]!);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]!.id);
  const [subject, setSubject] = useState<string>("");
  const [heard, setHeard] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const busyRef = useRef(false);

  const category = useMemo(
    () => CATEGORIES.find((c) => c.id === activeCategory) ?? CATEGORIES[0]!,
    [activeCategory],
  );

  const draw = useCallback(
    async (rawSubject: string, med = medium) => {
      const clean = rawSubject.trim();
      if (!clean || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setError(null);
      setSubject(clean);
      setImage(null);
      setIsFinal(false);
      speak(`Drawing ${clean} in ${med.label}.`);

      const prompt = `${clean}, drawn as ${med.promptStyle}. Beautiful, clear, well-composed artwork of "${clean}". Centered subject, clean background, high artistic quality.`;

      try {
        let last = "";
        await streamImage("/api/generate-image", prompt, (dataUrl, final) => {
          last = dataUrl;
          setImage(dataUrl);
          setIsFinal(final);
        });
        if (last) {
          setGallery((g) => [
            { id: `${Date.now()}`, src: last, subject: clean, medium: med.label },
            ...g,
          ]);
        }
        speak("Your drawing is ready.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong while drawing.");
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [medium],
  );

  const handleTranscript = useCallback(
    (text: string, final: boolean) => {
      setHeard(text);
      if (!final) return;
      const lower = text.toLowerCase();

      const matchedMedium = MEDIUMS.find((m) => lower.includes(m.label.toLowerCase()));
      if (matchedMedium) setMedium(matchedMedium);

      let cleaned = text.replace(FILLERS, " ").replace(/\s+/g, " ").trim();
      if (matchedMedium) {
        cleaned = cleaned.replace(new RegExp(matchedMedium.label, "gi"), " ").replace(/\s+/g, " ").trim();
      }
      // Any spoken subject draws — no command verb required.
      if (cleaned.length > 1) {
        void draw(cleaned, matchedMedium ?? medium);
      } else if (matchedMedium) {
        speak(`Medium set to ${matchedMedium.label}.`);
      }

    },
    [draw, medium],
  );

  const { listening, supported, error: voiceError, start, stop } = useVoice(handleTranscript);

  useEffect(() => {
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = (src: string, name: string) => {
    const a = document.createElement("a");
    a.href = src;
    a.download = `${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "naga-ai"}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <Palette className="size-4" />
          </span>
          <div>
            <h1 className="text-lg font-semibold leading-none">
              <span className="text-gradient-gold">Naga AI</span> Studio
            </h1>
            <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Artful Voice AI
            </p>
          </div>
        </div>

        <button
          onClick={listening ? stop : start}
          className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-2"
        >
          {listening ? (
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-2.5 rounded-full bg-primary animate-pulse-ring" />
              <span className="inline-flex size-2.5 rounded-full bg-primary" />
            </span>
          ) : (
            <MicOff className="size-4 text-muted-foreground" />
          )}
          {listening ? "Listening" : "Mic off"}
        </button>
      </header>

      <div className="grid flex-1 gap-5 p-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* LEFT: mediums + catalog */}
        <aside className="panel flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden lg:sticky lg:top-5">
          <div className="border-b border-border/70 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Drawing Medium
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {MEDIUMS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMedium(m)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    medium.id === m.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface-2/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-b border-border/70 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Library
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                    activeCategory === c.id
                      ? "border-accent bg-accent/20 text-foreground"
                      : "border-border bg-surface-2/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="mr-1">{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <p className="mb-3 text-xs text-muted-foreground">
              {category.emoji} {category.label} · {category.items.length} ideas — tap one, or just
              say “draw a peacock”.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {category.items.map((item) => (
                <button
                  key={item}
                  disabled={busy}
                  onClick={() => void draw(item)}
                  className="rounded-lg border border-border bg-surface-2/40 px-2.5 py-2 text-left text-xs text-foreground/90 transition-colors hover:border-primary/70 hover:bg-surface-2 disabled:opacity-50"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* RIGHT: canvas + gallery */}
        <section className="flex min-h-0 flex-col gap-5">
          <div className="panel flex flex-1 flex-col p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold">
                  {subject || "Say “Naga AI, draw a peacock”"}
                </h2>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {medium.label}
                </p>
              </div>
              {image && isFinal && (
                <button
                  onClick={() => download(image, subject)}
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Download className="size-4" /> Download
                </button>
              )}
            </div>

            <div className="mt-4 flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-2/40 p-4">
              {image ? (
                <img
                  src={image}
                  alt={subject}
                  className={`max-h-[58vh] w-auto rounded-xl object-contain transition-[filter] duration-500 ${
                    isFinal ? "blur-0" : "blur-2xl"
                  }`}
                />
              ) : busy ? (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="text-sm">Naga AI is drawing…</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 px-6 text-center text-muted-foreground animate-float-slow">
                  <Sparkles className="size-10 text-primary/70" />
                  <p className="max-w-sm text-sm">
                    Speak a subject and a medium — “water colour lotus”, “pencil sketch of Lord
                    Ganesha”, “charcoal chicken biryani”. Your canvas appears here.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="flex items-center gap-2 rounded-full border border-border bg-surface-2/60 px-3 py-1.5 text-muted-foreground">
                <Mic className="size-3.5" />
                {heard ? `“${heard}”` : "waiting for your voice…"}
              </span>
              {!supported && (
                <span className="text-destructive">
                  Voice not supported here — use Chrome, Edge or Safari.
                </span>
              )}
              {voiceError && <span className="text-destructive">{voiceError}</span>}
              {error && <span className="text-destructive">{error}</span>}
            </div>
          </div>

          {/* Gallery */}
          <div className="panel p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Your Gallery · {gallery.length}
              </h3>
              {gallery.length > 0 && (
                <button
                  onClick={() => setGallery([])}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-3.5" /> Clear
                </button>
              )}
            </div>
            {gallery.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Every drawing you make is saved here — revisit or download any of them anytime.
              </p>
            ) : (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                {gallery.map((g) => (
                  <div key={g.id} className="group relative w-28 shrink-0">
                    <button
                      onClick={() => {
                        setImage(g.src);
                        setIsFinal(true);
                        setSubject(g.subject);
                      }}
                      className="block overflow-hidden rounded-xl border border-border transition-colors hover:border-primary"
                    >
                      <img src={g.src} alt={g.subject} className="size-28 object-cover" />
                    </button>
                    <button
                      onClick={() => download(g.src, g.subject)}
                      aria-label={`Download ${g.subject}`}
                      className="absolute right-1.5 top-1.5 rounded-full bg-background/80 p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Download className="size-3.5" />
                    </button>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">{g.subject}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
