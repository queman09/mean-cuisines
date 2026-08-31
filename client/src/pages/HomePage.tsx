/**
 * Mean Cuisines — AllRecipes-style redesign
 * Wizard flow: Equipment → Pantry → Recipes → Parallel Cook → Shopping List
 */

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ChefHat, Clock, Plus, Search, ShoppingCart, ExternalLink,
  CheckCircle2, ChevronRight, ChevronLeft, Star,
  Flame, Zap, Play, SkipForward, UtensilsCrossed,
  Moon, Sun, Users, Link as LinkIcon, X, Timer,
  ShoppingBag, Package, Minus, Volume2, VolumeX, Pause,
  RefreshCw, Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type EquipmentKey = "oven" | "stove" | "airFryer" | "counter" | "instantPot" | "microwave";

interface Ingredient { name: string; qty: number; unit: string; }
interface Contributor { id: number; name: string; photoUrl: string; role: string; }
interface Recipe {
  id: number;
  name: string;
  description: string;
  cookTimeMinutes: number;
  servings: number;
  equipment: EquipmentKey[];
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
  imageUrl?: string;
  sourceUrl?: string;
  contributor: Contributor | null;
  createdAt: string;
}

interface PhaseStep {
  recipeId: number;
  recipeName: string;
  stepIndex: number;
  instruction: string;
  equipment: string | null;
  isPassive: boolean;
  isMise: boolean;
  durationMinutes: number;
}

interface CookingPhase {
  phaseNumber: number;
  name: string;
  emoji: string;
  description: string;
  steps: PhaseStep[];
  estimatedMinutes: number;
  isParallel: boolean;
}

interface ParallelPlan {
  phases: CookingPhase[];
  totalMinutes: number;
  sequentialMinutes: number;
  recipeCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AMAZON_AFFILIATE_TAG = "meancuisines-20";

const EQUIPMENT_INFO: Record<EquipmentKey, { label: string; icon: string; searchQuery: string; description: string }> = {
  oven:       { label: "Oven",             icon: "🔥", searchQuery: "countertop+toaster+oven",       description: "Baking, roasting, broiling" },
  stove:      { label: "Stove / Cooktop",  icon: "🍳", searchQuery: "electric+induction+cooktop",    description: "Sautéing, boiling, frying" },
  airFryer:   { label: "Air Fryer",        icon: "💨", searchQuery: "air+fryer",                     description: "Crispy results, no oil needed" },
  counter:    { label: "No Heat / Counter",icon: "🧴", searchQuery: "food+processor+blender",        description: "Mixing, chopping, assembling" },
  instantPot: { label: "Instant Pot",      icon: "⚡", searchQuery: "instant+pot+pressure+cooker",   description: "Pressure cooking & slow cooking" },
  microwave:  { label: "Microwave",        icon: "📡", searchQuery: "countertop+microwave",           description: "Quick heating & cooking" },
};

const RECIPE_PALETTE = [
  { ring: "ring-orange-400", dot: "bg-orange-500", light: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-600 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" },
  { ring: "ring-blue-400",   dot: "bg-blue-500",   light: "bg-blue-50 dark:bg-blue-950/40",     text: "text-blue-600 dark:text-blue-400",   border: "border-blue-200 dark:border-blue-800",   badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  { ring: "ring-green-400",  dot: "bg-green-500",  light: "bg-green-50 dark:bg-green-950/40",   text: "text-green-600 dark:text-green-400",  border: "border-green-200 dark:border-green-800",  badge: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
  { ring: "ring-purple-400", dot: "bg-purple-500", light: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
  { ring: "ring-rose-400",   dot: "bg-rose-500",   light: "bg-rose-50 dark:bg-rose-950/40",     text: "text-rose-600 dark:text-rose-400",   border: "border-rose-200 dark:border-rose-800",   badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300" },
];

const STEP_TYPE = {
  passive:      { icon: "🔥", label: "Hands-off",  cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  active:       { icon: "✋", label: "Active prep", cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
  consolidated: { icon: "⚡", label: "Shared",      cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
};

// ─── Mean Cuisines Logo Component ─────────────────────────────────────────────────────

function MeanCuisinesLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
  const s = size;
  const barH = Math.round(s * 0.22);
  const gap = Math.round(s * 0.06);
  const iconSize = Math.round(s * 0.24);
  const y1 = 0;
  const y2 = barH + gap;
  const y3 = (barH + gap) * 2;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Mean Cuisines logo"
    >
      <defs>
        <linearGradient id="mcGrad1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
        <linearGradient id="mcGrad2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        <linearGradient id="mcGrad3" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
      </defs>
      {/* Bar 1 — top (chef hat icon area) */}
      <rect x="5" y="6" width="68" height="26" rx="5" fill="url(#mcGrad1)" />
      {/* Chef hat icon on bar 1 */}
      <path d="M80 8 C80 4 86 4 86 8 C89 6 94 9 93 14 L89 14 L89 32 L77 32 L77 14 L73 14 C72 9 77 6 80 8Z" fill="white" opacity="0.92" />
      <rect x="77" y="28" width="12" height="3" rx="1.5" fill="white" opacity="0.7" />
      {/* Bar 2 — middle (oven icon area) */}
      <rect x="5" y="38" width="68" height="26" rx="5" fill="url(#mcGrad2)" />
      {/* Oven icon */}
      <rect x="74" y="38" width="20" height="26" rx="3" fill="none" stroke="white" strokeWidth="2.5" opacity="0.9" />
      <rect x="76" y="40" width="16" height="11" rx="1.5" fill="none" stroke="white" strokeWidth="1.5" opacity="0.9" />
      <circle cx="78" cy="55" r="2" fill="white" opacity="0.8" />
      <circle cx="84" cy="55" r="2" fill="white" opacity="0.8" />
      <circle cx="90" cy="55" r="2" fill="white" opacity="0.8" />
      {/* Bar 3 — bottom (fork icon, wider bar) */}
      <rect x="5" y="70" width="68" height="26" rx="5" fill="url(#mcGrad3)" />
      {/* Fork */}
      <path d="M74 72 L74 84 M78 72 L78 84 M82 72 L82 84 M74 72 Q78 68 82 72 M76 84 Q78 90 78 96 Q78 98 80 98 Q82 98 82 96 L82 84" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.9" />
      {/* Spatula */}
      <path d="M88 72 L88 82 Q88 86 86 88 L86 98" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.9" />
      <rect x="84" y="70" width="8" height="5" rx="2" fill="white" opacity="0.9" />
    </svg>
  );
}

function LogoWithText({ size = 28, textClass = "text-base" }: { size?: number; textClass?: string }) {
  return (
    <div className="flex items-center gap-2">
      <img src="/logo.jpg" alt="Mean Cuisines" width={size} height={size} className="rounded-lg object-contain" />
      <span className={`font-display font-bold ${textClass}`}>Mean Cuisines</span>
    </div>
  );
}

// ─── Text-to-Speech Hook ────────────────────────────────────────────────────────

/** Wrap a step instruction with warm encouraging framing */
function wrapWithPersonality(phaseName: string, steps: string[]): string {
  const intros = [
    `Alright, let's make this happen! ${phaseName}.`,
    `Here we go — ${phaseName}!`,
    `Nice work! Now we're on to ${phaseName}.`,
    `You're doing great — ${phaseName} time!`,
    `Let's keep the momentum going with ${phaseName}.`,
  ];
  const outros = [
    "You've got this — take your time.",
    "Looking good in that kitchen!",
    "This is where the magic happens.",
    "Smells amazing already, doesn't it?",
  ];
  const intro = intros[Math.floor(Math.random() * intros.length)];
  const outro = outros[Math.floor(Math.random() * outros.length)];
  const stepsText = steps.map((s, i) => `Step ${i + 1}: ${s}`).join(". ");
  return `${intro} ${stepsText}. ${outro}`;
}

function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  // Priority: natural-sounding Google US voices, then Samantha/Alex (macOS), then any en-US
  return (
    voices.find(v => v.name === "Google US English") ||
    voices.find(v => v.name === "Samantha") ||
    voices.find(v => v.name === "Alex") ||
    voices.find(v => v.lang === "en-US" && !v.name.includes("espeak")) ||
    voices.find(v => v.lang.startsWith("en")) ||
    null
  );
}

function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  // Use a ref for enabled so callbacks always see the latest value without re-creating
  const enabledRef = useRef(true);
  const [enabled, _setEnabled] = useState(true);
  const repeatRef = useRef(false);
  const textRef = useRef<string>("");
  const voicesLoadedRef = useRef(false);

  // Sync refs with state
  const setEnabled = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(enabledRef.current) : v;
    enabledRef.current = next;
    _setEnabled(next);
    if (!next) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      setPaused(false);
    }
  }, []);

  const setRepeat = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(repeatRef.current) : v;
    repeatRef.current = next;
    // trigger re-render
    setSpeaking(s => s);
  }, []);

  // Ensure voices are loaded (they load async in browsers)
  useEffect(() => {
    const load = () => { voicesLoadedRef.current = true; };
    window.speechSynthesis?.addEventListener("voiceschanged", load);
    // Trigger initial load
    window.speechSynthesis?.getVoices();
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", load);
  }, []);

  const speakRaw = useCallback((text: string) => {
    if (!enabledRef.current || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    textRef.current = text;

    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.92;
      utterance.pitch = 1.05; // slightly warmer
      utterance.volume = 1.0;

      const voice = getBestVoice();
      if (voice) utterance.voice = voice;

      utterance.onstart = () => { setSpeaking(true); setPaused(false); };
      utterance.onend = () => {
        setSpeaking(false);
        setPaused(false);
        if (repeatRef.current && enabledRef.current) {
          setTimeout(() => speakRaw(textRef.current), 1500);
        }
      };
      utterance.onerror = (e) => {
        if (e.error !== "interrupted") {
          setSpeaking(false);
          setPaused(false);
        }
      };
      window.speechSynthesis.speak(utterance);
    };

    // If voices not loaded yet, wait a tick
    if (window.speechSynthesis.getVoices().length === 0) {
      setTimeout(doSpeak, 200);
    } else {
      doSpeak();
    }
  }, []);

  const speak = useCallback((phaseName: string, steps: string[]) => {
    const text = wrapWithPersonality(phaseName, steps);
    speakRaw(text);
  }, [speakRaw]);

  const pause = useCallback(() => {
    if (!window.speechSynthesis) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setPaused(false);
  }, []);

  const replay = useCallback(() => {
    if (textRef.current) speakRaw(textRef.current);
  }, [speakRaw]);

  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  return { speak, speakRaw, pause, stop, replay, speaking, paused, repeat: repeatRef.current, setRepeat, enabled, setEnabled };
}

// ─── TTS Controls bar ─────────────────────────────────────────────────────────

function TTSBar({
  speaking, paused, repeat, enabled,
  onPause, onReplay, onToggleRepeat, onToggleEnabled,
}: {
  speaking: boolean;
  paused: boolean;
  repeat: boolean;
  enabled: boolean;
  onPause: () => void;
  onReplay: () => void;
  onToggleRepeat: () => void;
  onToggleEnabled: () => void;
}) {
  if (!window.speechSynthesis) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/60 border border-border" data-testid="tts-controls">
      {/* Mute toggle */}
      <button
        onClick={onToggleEnabled}
        className={`p-1.5 rounded-lg transition-colors ${enabled ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted"}`}
        title={enabled ? "Mute voice" : "Unmute voice"}
        aria-label={enabled ? "Mute voice" : "Unmute voice"}
      >
        {enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>

      {/* Speaking indicator */}
      {enabled && (
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {speaking && !paused ? (
            <div className="flex gap-0.5 items-end h-4">
              {[2,4,3,5,2].map((h, i) => (
                <div key={i} className={`w-1 bg-primary rounded-full animate-pulse`} style={{ height: `${h * 3}px`, animationDelay: `${i * 0.1}s` }} />
              ))}
              <span className="text-xs text-primary font-medium ml-1">Reading aloud</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">{paused ? "Paused" : enabled ? "Voice on" : "Voice off"}</span>
          )}
        </div>
      )}

      {/* Pause / Resume */}
      {enabled && speaking && (
        <button onClick={onPause} className="p-1.5 rounded-lg hover:bg-accent transition-colors text-foreground" title={paused ? "Resume" : "Pause"} aria-label={paused ? "Resume" : "Pause"}>
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </button>
      )}

      {/* Replay */}
      {enabled && (
        <button onClick={onReplay} className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground" title="Replay" aria-label="Replay">
          <RefreshCw size={14} />
        </button>
      )}

      {/* Repeat toggle */}
      {enabled && (
        <button
          onClick={onToggleRepeat}
          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
            repeat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
          title={repeat ? "Repeat on" : "Repeat off"}
          aria-label={repeat ? "Turn repeat off" : "Turn repeat on"}
          data-testid="tts-repeat"
        >
          🔁 {repeat ? "ON" : "OFF"}
        </button>
      )}
    </div>
  );
}

// ─── Recipe Image Helper ─────────────────────────────────────────────────────
// Curated, verified Unsplash photo IDs matched by recipe name.
// Using direct images.unsplash.com URLs (source.unsplash.com is deprecated).

const RECIPE_PHOTO_MAP: [RegExp, string][] = [
  [/roast chicken|whole chicken/i,         "photo-1505253716362-afaea1d3d1af"],
  [/chicken tikka|tikka masala/i,          "photo-1565557623262-b51c2513a641"],
  [/butter chicken/i,                      "photo-1603894584373-5ac82b2ae398"],
  [/teriyaki chicken/i,                    "photo-1569050467447-ce54b3bbc37d"],
  [/chicken wing/i,                        "photo-1608039829572-78524f79c4c7"],
  [/quesadilla/i,                          "photo-1618449840665-9ed506d73a34"],
  [/pork fried rice/i,                     "photo-1603133872878-684f208fb84b"],
  [/stir.fried rice|fried rice/i,          "photo-1603133872878-684f208fb84b"],
  [/beef stir.?fry|stir.?fry/i,            "photo-1546069901-ba9599a7e63c"],
  [/beef taco|taco/i,                      "photo-1565299585323-38d6b0865b47"],
  [/smash burger|burger/i,                 "photo-1568901346375-23c9450c58cd"],
  [/instant pot.*beef|beef stew/i,         "photo-1547592166-23ac45744acd"],
  [/chili/i,                               "photo-1455619452474-d2be8b1e70cd"],
  [/pulled pork/i,                         "photo-1529193591184-b1d58069ecdd"],
  [/bbq rib|spare rib|baby back/i,         "photo-1544025162-d76694265947"],
  [/sheet pan sausage|sausage.*veg/i,      "photo-1490645935967-10de6ba17061"],
  [/salmon/i,                              "photo-1519708227418-c8fd9a32b7a2"],
  [/shrimp pasta|garlic.*shrimp/i,         "photo-1563379926898-05f4575a45d8"],
  [/carbonara/i,                           "photo-1612874742237-6526221588e3"],
  [/mac.*cheese|macaroni/i,               "photo-1476124369491-e7addf5db371"],
  [/mushroom risotto|risotto/i,            "photo-1476124369491-e7addf5db371"],
  [/lentil dal|dal/i,                      "photo-1546833998-877b37c2e5c6"],
  [/vegetable curry|veggie curry/i,        "photo-1585937421612-70a008356fbe"],
  [/chicken.*rice|instant pot.*chicken/i,  "photo-1567620905732-2d1ec7ab7445"],
  [/french onion soup/i,                   "photo-1547592166-23ac45744acd"],
  [/creamy tomato soup|tomato soup/i,      "photo-1547592180-85f173990554"],
  [/shakshuka/i,                           "photo-1590412200988-a436970781fa"],
  [/greek salad/i,                         "photo-1540189549336-e6e99c3679fe"],
  [/avocado toast/i,                       "photo-1525351484163-7529414344d8"],
  [/banana bread/i,                        "photo-1586444248902-2f64eddc13df"],
  [/mug cake/i,                            "photo-1606313564200-e75d5e30476c"],
  [/air fryer.*fries|french fries/i,       "photo-1576107232684-1279f390859f"],
  [/crispy.*potato|roasted potato/i,       "photo-1518977676601-b53f82aba655"],
  [/honey.*carrot|glazed carrot/i,         "photo-1598170845058-32b9d6a5da37"],
  [/grilled cheese/i,                      "photo-1528735602780-2552fd46c7af"],
  [/overnight oat/i,                       "photo-1586511925558-a4c6376fe65f"],
  [/spaghetti carbonara|carbonara/i,       "photo-1612874742237-6526221588e3"],
  [/teriyaki/i,                            "photo-1569050467447-ce54b3bbc37d"],
  [/beef stir/i,                           "photo-1546069901-ba9599a7e63c"],
  [/pulled pork/i,                         "photo-1529193591184-b1d58069ecdd"],
  [/vegetable curry/i,                     "photo-1585937421612-70a008356fbe"],
  [/grilled cheese/i,                      "photo-1528735602780-2552fd46c7af"],
  [/pork fried/i,                          "photo-1603133872878-684f208fb84b"],
  [/lentil/i,                              "photo-1546833998-877b37c2e5c6"],
  // Tag-based fallbacks
  [/pasta|noodle|spaghetti/i,              "photo-1563379926898-05f4575a45d8"],
  [/soup|stew/i,                           "photo-1547592166-23ac45744acd"],
  [/salad/i,                               "photo-1540189549336-e6e99c3679fe"],
  [/breakfast|egg/i,                       "photo-1525351484163-7529414344d8"],
  [/dessert|cake|sweet|chocolate/i,        "photo-1606313564200-e75d5e30476c"],
  [/seafood|fish|shrimp/i,                 "photo-1519708227418-c8fd9a32b7a2"],
  [/vegan|vegetarian/i,                    "photo-1540189549336-e6e99c3679fe"],
  [/indian|curry/i,                        "photo-1585937421612-70a008356fbe"],
  [/mexican/i,                             "photo-1565299585323-38d6b0865b47"],
  [/bbq|grill|smoke/i,                     "photo-1529193591184-b1d58069ecdd"],
  [/chicken/i,                             "photo-1505253716362-afaea1d3d1af"],
  [/beef|steak/i,                          "photo-1546069901-ba9599a7e63c"],
  [/pork/i,                                "photo-1529193591184-b1d58069ecdd"],
  [/rice/i,                                "photo-1567620905732-2d1ec7ab7445"],
  [/potato/i,                              "photo-1518977676601-b53f82aba655"],
];

const UNSPLASH_BASE = "https://images.unsplash.com";
const IMG_PARAMS = "?w=400&h=280&fit=crop&auto=format&q=80";

// General fallbacks by broad food category
const FALLBACK_IDS = [
  "photo-1490645935967-10de6ba17061", // colorful vegetables
  "photo-1504674900247-0877df9cc836", // food spread
  "photo-1512621776951-a57141f2eefd", // healthy food
  "photo-1476718406336-bb5a9690ee2a", // cooking
];

function getRecipeImageUrl(name: string, tags: string[] = []): string {
  const combined = name + " " + tags.join(" ");
  for (const [pattern, photoId] of RECIPE_PHOTO_MAP) {
    if (pattern.test(combined)) {
      return `${UNSPLASH_BASE}/${photoId}${IMG_PARAMS}`;
    }
  }
  // Deterministic fallback based on name length so different recipes get different fallbacks
  const idx = name.length % FALLBACK_IDS.length;
  return `${UNSPLASH_BASE}/${FALLBACK_IDS[idx]}${IMG_PARAMS}`;
}

function fmtMins(m: number) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60), r = m % 60;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}
function fmtElapsed(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
function getAmazonUrl(q: string) {
  return `https://www.amazon.com/s?k=${encodeURIComponent(q.trim())}&tag=${AMAZON_AFFILIATE_TAG}`;
}
function pantryMatch(recipe: Recipe, pantry: string[]): number {
  if (recipe.ingredients.length === 0) return 0;
  const lowerPantry = pantry.map(p => p.toLowerCase());
  const matched = recipe.ingredients.filter(ing =>
    lowerPantry.some(p => ing.name.toLowerCase().includes(p) || p.includes(ing.name.toLowerCase().split(" ")[0]))
  );
  return Math.round((matched.length / recipe.ingredients.length) * 100);
}

// ─── Step Indicator ────────────────────────────────────────────────────────────

function StepBar({ step, total }: { step: number; total: number }) {
  const labels = ["Equipment", "Pantry", "Recipes", "Cook"];
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-lg mx-auto px-4 py-3">
      {labels.slice(0, total).map((label, i) => {
        const idx = i + 1;
        const active = idx === step;
        const done = idx < step;
        return (
          <div key={idx} className="flex items-center gap-0 flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={[
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                done ? "bg-primary text-primary-foreground" :
                active ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                "bg-muted text-muted-foreground"
              ].join(" ")}>
                {done ? <CheckCircle2 size={14} /> : idx}
              </div>
              <span className={`text-[10px] mt-1 font-medium whitespace-nowrap hidden sm:block ${active ? "text-primary" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {i < total - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-4 transition-all ${done ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── STEP 1: Equipment ─────────────────────────────────────────────────────────

function StepEquipment({
  equipment, onToggle, onNext,
}: {
  equipment: Record<EquipmentKey, boolean>;
  onToggle: (k: EquipmentKey) => void;
  onNext: () => void;
}) {
  const hasAny = Object.values(equipment).some(Boolean);
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <img src="/logo.jpg" alt="Mean Cuisines" width={56} height={56} className="rounded-2xl mx-auto mb-3 shadow-md" />
        <h1 className="text-3xl font-display font-extrabold mb-1 bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
          Mean Cuisines
        </h1>
        <p className="text-base font-semibold text-foreground/80 mb-3 italic">Cook Like a Machine, Eat Like a King</p>
        <h2 className="text-xl font-display font-bold mb-1">What's in your kitchen?</h2>
        <p className="text-muted-foreground text-sm">Select your equipment — we'll only show recipes you can actually make.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {(Object.entries(EQUIPMENT_INFO) as [EquipmentKey, typeof EQUIPMENT_INFO[EquipmentKey]][]).map(([key, info]) => {
          const on = equipment[key];
          return (
            <div
              key={key}
              className={[
                "relative rounded-xl border-2 p-4 cursor-pointer transition-all select-none",
                on
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-muted-foreground/40 hover:shadow-sm",
              ].join(" ")}
              onClick={() => onToggle(key)}
              data-testid={`equipment-${key}`}
            >
              {on && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <CheckCircle2 size={12} className="text-primary-foreground" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="text-2xl">{info.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{info.label}</p>
                  <p className="text-xs text-muted-foreground">{info.description}</p>
                </div>
              </div>
              {!on && (
                <a
                  href={getAmazonUrl(info.searchQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 mt-2 text-[11px] text-primary font-medium hover:underline w-fit"
                >
                  <ShoppingCart size={10} /> Buy on Amazon <ExternalLink size={9} />
                </a>
              )}
            </div>
          );
        })}
      </div>

      <Button
        size="lg"
        className="w-full gap-2 bg-primary text-primary-foreground font-bold"
        disabled={!hasAny}
        onClick={onNext}
        data-testid="btn-equipment-next"
      >
        Continue with {Object.values(equipment).filter(Boolean).length} appliance{Object.values(equipment).filter(Boolean).length !== 1 ? "s" : ""}
        <ChevronRight size={18} />
      </Button>
    </div>
  );
}

// ─── STEP 2: Pantry (Ingredients I Have) ─────────────────────────────────────

// Flat list of common ingredients to search through
const ALL_INGREDIENTS = [
  "chicken breast","chicken thighs","ground beef","ground turkey","salmon","shrimp","pork chops",
  "bacon","sausage","eggs","butter","olive oil","vegetable oil","milk","heavy cream","sour cream",
  "cheddar cheese","parmesan","mozzarella","cream cheese","garlic","onion","red onion","green onion",
  "tomatoes","bell pepper","zucchini","mushrooms","spinach","broccoli","carrots","celery","potatoes",
  "sweet potato","corn","peas","green beans","asparagus","lemon","lime","ginger","jalapeño",
  "flour","sugar","brown sugar","baking soda","baking powder","salt","black pepper","cumin","paprika",
  "chili powder","cayenne","oregano","thyme","rosemary","basil","bay leaves","cinnamon","turmeric",
  "soy sauce","Worcestershire sauce","hot sauce","honey","maple syrup","vinegar","tomato paste",
  "chicken broth","beef broth","vegetable broth","coconut milk","canned tomatoes","kidney beans",
  "black beans","rice","pasta","bread crumbs","tortillas","panko","arborio rice","lentils",
];

function StepPantry({
  pantry, onPantryChange, onNext, onBack,
}: {
  pantry: string[];
  onPantryChange: (items: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const suggestions = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return ALL_INGREDIENTS.filter(i => i.includes(q) && !pantry.includes(i)).slice(0, 8);
  }, [query, pantry]);

  const toggle = (item: string) => {
    onPantryChange(
      pantry.includes(item) ? pantry.filter(p => p !== item) : [...pantry, item]
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-display font-bold mb-1">What's in your pantry?</h2>
        <p className="text-muted-foreground text-sm">Tell us what you already have. We'll score each recipe and remove owned items from your shopping list.</p>
      </div>

      {/* Search box */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search ingredients (e.g. chicken, garlic, butter…)"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-9"
          data-testid="pantry-search"
        />
        {/* Dropdown suggestions */}
        {suggestions.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
            {suggestions.map(s => (
              <button
                key={s}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors capitalize"
                onClick={() => { toggle(s); setQuery(""); }}
              >
                + {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected pantry items */}
      {pantry.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Your pantry ({pantry.length} items)
          </p>
          <div className="flex flex-wrap gap-2">
            {pantry.map(item => (
              <button
                key={item}
                onClick={() => toggle(item)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                data-testid={`pantry-item-${item}`}
              >
                <CheckCircle2 size={11} />
                <span className="capitalize">{item}</span>
                <X size={11} className="ml-0.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Common quick-adds */}
      <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Quick add commons</p>
          <div className="flex flex-wrap gap-2">
            {["eggs","butter","garlic","onion","olive oil","salt","black pepper","chicken broth","flour","sugar"].filter(i => !pantry.includes(i)).map(item => (
              <button
                key={item}
                onClick={() => toggle(item)}
                className="px-3 py-1.5 rounded-full border border-dashed border-border bg-card text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors capitalize"
              >
                + {item}
              </button>
            ))}
          </div>
        </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-1"><ChevronLeft size={16} /> Back</Button>
        <Button size="lg" className="flex-1 gap-2 bg-primary text-primary-foreground font-bold" onClick={onNext} data-testid="btn-pantry-next">
          {pantry.length === 0 ? "Skip — I'll buy everything" : `Continue with ${pantry.length} pantry items`}
          <ChevronRight size={18} />
        </Button>
      </div>
    </div>
  );
}

// ─── STEP 3: Recipe Selection ─────────────────────────────────────────────────

function MatchBar({ pct }: { pct: number }) {
  const color = pct >= 75 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[11px] font-bold tabular-nums ${pct >= 75 ? "text-green-600 dark:text-green-400" : pct >= 40 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
        {pct}%
      </span>
    </div>
  );
}

function StepRecipes({
  recipes, equipment, pantry, selectedIds, servings,
  onToggle, onServing, onNext, onBack, isLoading,
  onShowAdd, contributors,
}: {
  recipes: Recipe[];
  equipment: Record<EquipmentKey, boolean>;
  pantry: string[];
  selectedIds: number[];
  servings: Record<number, number>;
  onToggle: (id: number) => void;
  onServing: (id: number, s: number) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading: boolean;
  onShowAdd: () => void;
  contributors: Contributor[];
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "compatible" | "pantry">("compatible");

  const compatible = useMemo(() =>
    recipes.filter(r => r.equipment.length === 0 || r.equipment.every(eq => equipment[eq])),
    [recipes, equipment]
  );

  const scored = useMemo(() =>
    compatible.map(r => ({ ...r, match: pantryMatch(r, pantry) }))
      .sort((a, b) => b.match - a.match),
    [compatible, pantry]
  );

  const displayed = useMemo(() => {
    let list = scored;
    if (filter === "compatible") list = scored;
    if (filter === "pantry") list = scored.filter(r => r.match > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.tags.some(t => t.toLowerCase().includes(q)));
    }
    return list;
  }, [scored, filter, search]);

  const canCook = selectedIds.length >= 2;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h2 className="text-2xl font-display font-bold">Pick your recipes</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {compatible.length} compatible · select 2–5 to parallel cook
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onShowAdd} className="gap-1.5 text-xs shrink-0">
          <Plus size={13} /> Add Recipe
        </Button>
      </div>

      {/* Search + filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search recipes…" className="pl-8 h-9 text-sm" />
        </div>
        <div className="flex gap-1">
          {(["compatible","pantry","all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >{f === "compatible" ? "✓ Compatible" : f === "pantry" ? "🥬 Pantry match" : "All"}</button>
          ))}
        </div>
      </div>

      {/* Selected strip */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20 flex-wrap">
          <Zap size={14} className="text-primary shrink-0" />
          <span className="text-xs font-medium text-primary">{selectedIds.length} selected</span>
          {selectedIds.map((id, idx) => {
            const r = recipes.find(r => r.id === id);
            if (!r) return null;
            const pal = RECIPE_PALETTE[idx % RECIPE_PALETTE.length];
            return (
              <span key={id} className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${pal.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pal.dot}`} />
                {r.name}
                <button onClick={() => onToggle(id)} className="ml-0.5 hover:opacity-70"><X size={10} /></button>
              </span>
            );
          })}
        </div>
      )}

      {/* Recipe grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl bg-muted animate-pulse h-64" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {displayed.map(recipe => {
            const selIdx = selectedIds.indexOf(recipe.id);
            const isSelected = selIdx !== -1;
            const pal = isSelected ? RECIPE_PALETTE[selIdx % RECIPE_PALETTE.length] : null;
            const isDisabled = !isSelected && selectedIds.length >= 5;
            const sv = servings[recipe.id] ?? recipe.servings;

            return (
              <div
                key={recipe.id}
                className={[
                  "rounded-xl border-2 overflow-hidden bg-card transition-all duration-150 flex flex-col",
                  isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:shadow-md",
                  isSelected ? `${pal!.border} shadow-sm ring-2 ${pal!.ring}` : "border-border",
                ].join(" ")}
                onClick={() => !isDisabled && onToggle(recipe.id)}
                data-testid={`recipe-card-${recipe.id}`}
              >
                {/* Recipe image — Unsplash matched by recipe name */}
                <div className="relative h-40 bg-muted overflow-hidden">
                  <img
                    src={getRecipeImageUrl(recipe.name, recipe.tags)}
                    alt={recipe.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://source.unsplash.com/400x300/?food,cooking";
                    }}
                  />
                  {/* Selected overlay */}
                  {isSelected && (
                    <div className={`absolute inset-0 ${pal!.light} opacity-40`} />
                  )}
                  {/* Selected badge */}
                  {isSelected && (
                    <div className={`absolute top-2 right-2 w-7 h-7 rounded-full ${pal!.dot} flex items-center justify-center shadow-md`}>
                      <CheckCircle2 size={14} className="text-white" />
                    </div>
                  )}
                  {/* Equipment badges overlay */}
                  <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
                    {recipe.equipment.map(eq => (
                      <span key={eq} className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm">
                        {EQUIPMENT_INFO[eq]?.icon ?? "🍴"} {EQUIPMENT_INFO[eq]?.label ?? eq}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="font-display font-bold text-sm leading-tight mb-1">{recipe.name}</h3>

                  {/* Pantry match */}
                  <MatchBar pct={recipe.match} />

                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Clock size={11} />{fmtMins(recipe.cookTimeMinutes)}</span>
                    <span>·</span>
                    <span>{recipe.equipment.map(e => EQUIPMENT_INFO[e]?.icon ?? e).join(" ")}</span>
                    {recipe.tags.slice(0, 2).map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{t}</span>
                    ))}
                  </div>

                  {/* Per-recipe servings — only when selected */}
                  {isSelected && (
                    <div
                      className="mt-3 pt-3 border-t border-border flex items-center justify-between"
                      onClick={e => e.stopPropagation()}
                    >
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Users size={11} /> Servings</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => onServing(recipe.id, Math.max(1, sv - 1))} className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-accent"><Minus size={10} /></button>
                        <span className="text-sm font-bold w-5 text-center">{sv}</span>
                        <button onClick={() => onServing(recipe.id, Math.min(20, sv + 1))} className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-accent"><Plus size={10} /></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {displayed.length === 0 && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              <UtensilsCrossed size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No matching recipes. Try changing your filters.</p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 sticky bottom-4">
        <Button variant="outline" onClick={onBack} className="gap-1 shrink-0"><ChevronLeft size={16} /> Back</Button>
        <Button
          size="lg"
          className="flex-1 gap-2 bg-primary text-primary-foreground font-bold"
          disabled={!canCook}
          onClick={onNext}
          data-testid="btn-recipes-next"
        >
          <Zap size={16} />
          {canCook
            ? `Start Parallel Cook (${selectedIds.length} recipes)`
            : `Select at least ${2 - selectedIds.length} more recipe${2 - selectedIds.length !== 1 ? "s" : ""}`}
          <ChevronRight size={18} />
        </Button>
      </div>
    </div>
  );
}

// ─── STEP 4: Parallel Cook ─────────────────────────────────────────────────────

// ── Recipe color legend (dots only, no fills in execution) ──
const RECIPE_DOTS = [
  "bg-orange-500", "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-rose-500",
];

function RecipeTag({ name, recipeIdx, isConsolidated }: { name: string; recipeIdx: number; isConsolidated?: boolean }) {
  const dot = isConsolidated ? "bg-violet-400" : RECIPE_DOTS[recipeIdx % RECIPE_DOTS.length];
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
      {isConsolidated ? "All recipes" : name}
    </span>
  );
}

// ── Game Plan: 2 sub-pages ──
// SubPage 1: Shopping List  SubPage 2: Cook Map
function GamePlanView({
  phases, totalMinutes, sequentialMinutes, selectedRecipes, pantry, servings,
  burners, onStart, onBack,
}: {
  phases: CookingPhase[];
  totalMinutes: number;
  sequentialMinutes: number;
  selectedRecipes: Recipe[];
  pantry: string[];
  servings: Record<number, number>;
  burners: number;
  onStart: () => void;
  onBack: () => void;
}) {
  const [subPage, setSubPage] = useState<"shopping" | "map">("shopping");
  const timeSaved = Math.max(0, sequentialMinutes - totalMinutes);
  const lowerPantry = pantry.map(p => p.toLowerCase());

  const allIngredients = selectedRecipes.flatMap(r => {
    const mult = (servings[r.id] ?? r.servings) / (r.servings || 1);
    return r.ingredients.map(ing => ({
      ...ing,
      qty: mult !== 1 && ing.qty > 0 ? +(ing.qty * mult).toFixed(1) : ing.qty,
      recipeName: r.name,
      owned: lowerPantry.some(p =>
        ing.name.toLowerCase().includes(p) || p.includes(ing.name.toLowerCase().split(" ")[0])
      ),
    }));
  });
  const toBuy = allIngredients.filter(i => !i.owned);
  const alreadyHave = allIngredients.filter(i => i.owned);

  const recipeIndex = (id: number) => selectedRecipes.findIndex(r => r.id === id);

  // Shared stats strip
  const StatsStrip = () => (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <div className="rounded-xl bg-card border border-border p-3 text-center">
        <div className="text-xl font-bold font-display">{selectedRecipes.length}</div>
        <div className="text-xs text-muted-foreground">Recipes</div>
      </div>
      <div className="rounded-xl bg-card border border-border p-3 text-center">
        <div className="text-xl font-bold font-display">{fmtMins(totalMinutes)}</div>
        <div className="text-xs text-muted-foreground">Cook time</div>
      </div>
      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 text-center">
        <div className="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400">
          {timeSaved > 0 ? `-${fmtMins(timeSaved)}` : `${fmtMins(sequentialMinutes)}`}
        </div>
        <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
          {timeSaved > 0 ? "Time saved" : "Sequential time"}
        </div>
      </div>
    </div>
  );

  // ── SubPage 1: Shopping List ──
  if (subPage === "shopping") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-display font-bold">Shopping List</h2>
            <p className="text-xs text-muted-foreground">Get what you need, then review your cook map</p>
          </div>
          <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full shrink-0">1 of 2</span>
        </div>

        <StatsStrip />

        {/* Recipe legend */}
        <div className="flex flex-wrap gap-3 mb-5 p-3 rounded-xl bg-muted/40">
          {selectedRecipes.map((r, i) => (
            <span key={r.id} className="flex items-center gap-1.5 text-xs font-medium">
              <span className={`w-2.5 h-2.5 rounded-full ${RECIPE_DOTS[i % RECIPE_DOTS.length]}`} />
              {r.name}
              {servings[r.id] && servings[r.id] !== r.servings && (
                <span className="text-muted-foreground">×{servings[r.id]}</span>
              )}
            </span>
          ))}
        </div>

        {/* Items to buy */}
        {toBuy.length > 0 ? (
          <div className="rounded-xl border border-border overflow-hidden bg-card divide-y divide-border mb-4">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/60">
              <ShoppingCart size={14} className="text-primary" />
              <span className="font-semibold text-sm">Need to buy ({toBuy.length} items)</span>
            </div>
            {toBuy.map((ing, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-accent/30 transition-colors">
                <div>
                  <span className="text-sm font-medium">{ing.qty > 0 ? `${ing.qty} ${ing.unit} ` : ""}{ing.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">({ing.recipeName})</span>
                </div>
                <a href={getAmazonUrl(ing.name)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline font-medium shrink-0 ml-3">
                  <ShoppingCart size={11} /> Buy <ExternalLink size={9} />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-4 text-sm text-emerald-700 dark:text-emerald-300 mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} /> You have everything you need — nothing to buy!
          </div>
        )}

        {/* Already have */}
        {alreadyHave.length > 0 && (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 mb-6">
            <p className="text-xs text-muted-foreground font-medium mb-2">✓ Already in your pantry ({alreadyHave.length})</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {alreadyHave.map((ing, i) => (
                <span key={i} className="text-xs text-muted-foreground/50 line-through">{ing.name}</span>
              ))}
            </div>
          </div>
        )}

        <Button size="lg" onClick={() => setSubPage("map")}
          className="w-full gap-3 bg-primary text-primary-foreground font-bold py-5 rounded-2xl text-base"
          data-testid="btn-to-cook-map">
          View Cook Map <ChevronRight size={20} />
        </Button>
      </div>
    );
  }

  // ── SubPage 2: Cook Map (flowchart) ──
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setSubPage("shopping")} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
          <ChevronLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-display font-bold">Cook Map</h2>
          <p className="text-xs text-muted-foreground">Your parallel workflow — top to bottom, start to finish</p>
        </div>
        <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full shrink-0">2 of 2</span>
      </div>

      {/* Recipe color key */}
      <div className="flex flex-wrap gap-3 mb-5 p-3 rounded-xl bg-muted/40">
        {selectedRecipes.map((r, i) => (
          <span key={r.id} className="flex items-center gap-1.5 text-xs font-medium">
            <span className={`w-2.5 h-2.5 rounded-full ${RECIPE_DOTS[i % RECIPE_DOTS.length]}`} />
            {r.name}
          </span>
        ))}
      </div>

      {/* ── Flowchart ── */}
      <div className="space-y-3 mb-6">
        {phases.map((phase, phaseIdx) => {
          const recipeGroups = new Map<number, PhaseStep[]>();
          phase.steps.forEach(s => {
            if (!recipeGroups.has(s.recipeId)) recipeGroups.set(s.recipeId, []);
            recipeGroups.get(s.recipeId)!.push(s);
          });
          const recipeGroupEntries = Array.from(recipeGroups.entries());
          const isMultiRecipe = recipeGroupEntries.length > 1;

          return (
            <div key={phaseIdx} className="rounded-2xl border border-border overflow-hidden shadow-sm">
              {/* Phase header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-muted/60 border-b border-border">
                <span className="text-lg leading-none">{phase.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-bold text-sm">Phase {phase.phaseNumber}: {phase.name}</span>
                    {isMultiRecipe && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">⇆ parallel</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{phase.description}</p>
                </div>
                <span className="text-xs font-mono text-muted-foreground shrink-0">~{fmtMins(phase.estimatedMinutes)}</span>
              </div>

              {/* Steps */}
              <div className={`p-3 bg-card ${isMultiRecipe ? "grid gap-3" : ""}`}
                style={isMultiRecipe ? { gridTemplateColumns: `repeat(${Math.min(recipeGroupEntries.length, 3)}, 1fr)` } : {}}>
                {isMultiRecipe ? (
                  recipeGroupEntries.map(([recipeId, steps]) => {
                    const rIdx = recipeIndex(recipeId);
                    const dot = RECIPE_DOTS[rIdx % RECIPE_DOTS.length];
                    return (
                      <div key={recipeId} className="rounded-xl border border-border bg-background p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className={`w-2 h-2 rounded-full ${dot}`} />
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                            {steps[0].recipeName}
                          </span>
                        </div>
                        <ol className="space-y-1.5">
                          {steps.map((step, si) => (
                            <li key={si} className="flex gap-2 text-sm leading-snug">
                              <span className="text-primary font-bold text-xs mt-0.5 shrink-0 w-4">{si + 1}.</span>
                              <span>{step.instruction}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    );
                  })
                ) : (
                  <ol className="space-y-1.5">
                    {phase.steps.map((step, si) => (
                      <li key={si} className="flex gap-2.5 text-sm leading-snug">
                        <span className="text-primary font-bold text-xs mt-0.5 shrink-0 w-4">{si + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <span>{step.instruction}</span>
                          {phase.steps.some(s => s.recipeId !== step.recipeId) && (
                            <span className="ml-1 text-[10px] text-muted-foreground">({step.recipeName})</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              {/* Arrow connector */}
              {phaseIdx < phases.length - 1 && (
                <div className="flex justify-center py-2 bg-background border-t border-dashed border-border/50">
                  <span className="text-muted-foreground/30 text-sm">▼</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button size="lg" onClick={onStart}
        className="w-full gap-3 bg-primary text-primary-foreground font-bold py-5 rounded-2xl text-base sticky bottom-4"
        data-testid="btn-start-cooking">
        <Play size={20} /> Start Cooking — {phases.length} Phases
      </Button>
    </div>
  );
}

// ── Execution Mode: phase by phase ──
function ExecutionView({
  phases, totalMinutes, selectedRecipes,
  onFinish, onBackToMap, onExitToHome,
}: {
  phases: CookingPhase[];
  totalMinutes: number;
  selectedRecipes: Recipe[];
  onFinish: () => void;
  onBackToMap: () => void;
  onExitToHome: () => void;
}) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tts = useTTS();

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  const current = phases[phaseIdx];
  const next = phases[phaseIdx + 1] ?? null;
  const isLast = phaseIdx === phases.length - 1;
  const isFirst = phaseIdx === 0;
  const progress = Math.round(((phaseIdx + 1) / phases.length) * 100);

  // Auto-read current phase when it changes
  useEffect(() => {
    if (current) {
      const stepTexts = current.steps.map(s => s.instruction);
      const t = setTimeout(() => tts.speak(current.name, stepTexts), 500);
      return () => clearTimeout(t);
    }
  }, [phaseIdx]);

  // Stop TTS when leaving execution mode
  useEffect(() => {
    return () => tts.stop();
  }, []);

  const recipeIndex = (id: number) => selectedRecipes.findIndex(r => r.id === id);

  // Group current phase steps by recipe for parallel display
  const recipeGroups = new Map<number, PhaseStep[]>();
  current.steps.forEach(s => {
    if (!recipeGroups.has(s.recipeId)) recipeGroups.set(s.recipeId, []);
    recipeGroups.get(s.recipeId)!.push(s);
  });
  const recipeGroupEntries = Array.from(recipeGroups.entries());
  const isMultiRecipe = recipeGroupEntries.length > 1;

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col" data-testid="execution-mode">
      {/* Progress bar */}
      <div className="h-1.5 bg-muted">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Timer + TTS bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Timer size={13} />
          <span className="font-mono font-semibold">{fmtElapsed(elapsed)}</span>
          <span>elapsed</span>
        </div>

        {/* TTS Controls */}
        <TTSBar
          speaking={tts.speaking}
          paused={tts.paused}
          repeat={tts.repeat}
          enabled={tts.enabled}
          onPause={tts.pause}
          onReplay={tts.replay}
          onToggleRepeat={() => tts.setRepeat(!tts.repeat)}
          onToggleEnabled={() => tts.setEnabled(e => !e)}
        />

        <div className="flex items-center gap-2">
          <button onClick={onBackToMap} className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap">
            Cook map
          </button>
          {/* Return to Home with warning */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-xs text-muted-foreground hover:text-destructive transition-colors whitespace-nowrap">
                ✕ Exit
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Exit cooking session?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your current cooking session and recipe selections will be cleared.
                  You'll start fresh from the beginning. This can't be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep cooking</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onExitToHome}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, exit
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full flex flex-col">
        {/* Phase header */}
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">{current.emoji}</div>
          <h3 className="text-xl font-display font-bold">{current.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{current.description}</p>
          {isMultiRecipe && (
            <span className="inline-block mt-2 text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              ⇆ Do these in parallel
            </span>
          )}
          <div className="text-xs text-muted-foreground mt-1">
            Phase {phaseIdx + 1} of {phases.length}
          </div>
        </div>

        {/* Steps — parallel columns or single list */}
        <div className="flex-1 mb-6" data-testid="active-step">
          {isMultiRecipe ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(recipeGroupEntries.length, 2)}, 1fr)` }}>
              {recipeGroupEntries.map(([recipeId, steps]) => {
                const rIdx = recipeIndex(recipeId);
                const dot = RECIPE_DOTS[rIdx % RECIPE_DOTS.length];
                return (
                  <div key={recipeId} className="rounded-2xl border-2 border-border bg-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`w-3 h-3 rounded-full ${dot}`} />
                      <span className="font-display font-bold text-sm">{steps[0].recipeName}</span>
                    </div>
                    <ol className="space-y-3">
                      {steps.map((step, si) => (
                        <li key={si} className="flex gap-3 text-sm leading-snug">
                          <span className="text-primary font-bold text-xs mt-0.5 shrink-0">{si + 1}.</span>
                          <span className="leading-relaxed">{step.instruction}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border-2 border-border bg-card p-6 shadow-sm">
              <ol className="space-y-4">
                {current.steps.map((step, si) => (
                  <li key={si} className="flex gap-4">
                    <span className="text-primary font-bold text-sm shrink-0 mt-0.5 w-5">{si + 1}.</span>
                    <p className="text-base sm:text-lg leading-relaxed font-medium" data-testid={`step-instruction-${si}`}>
                      {step.instruction}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Next phase preview */}
        {next && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-4 mb-5" data-testid="next-step-preview">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1.5">
              Up next
            </p>
            <div className="flex items-center gap-2">
              <span className="text-base">{next.emoji}</span>
              <div>
                <p className="text-sm font-semibold">{next.name}</p>
                <p className="text-xs text-muted-foreground">{next.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Phase dots */}
        <div className="flex items-center justify-center gap-1.5 mb-5 flex-wrap">
          {phases.map((_, i) => (
            <button
              key={i}
              onClick={() => setPhaseIdx(i)}
              className={`rounded-full transition-all ${
                i < phaseIdx
                  ? "w-2.5 h-2.5 bg-primary/40 hover:bg-primary/70"
                  : i === phaseIdx
                  ? "w-3.5 h-3.5 bg-primary"
                  : "w-2.5 h-2.5 bg-muted-foreground/20 hover:bg-muted-foreground/40"
              }`}
              aria-label={`Go to phase ${i + 1}: ${phases[i].name}`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {!isFirst && (
            <Button
              variant="outline"
              onClick={() => setPhaseIdx(i => i - 1)}
              className="gap-1 shrink-0"
              data-testid="btn-prev-step"
            >
              <ChevronLeft size={18} /> Back
            </Button>
          )}
          {isLast ? (
            <Button
              size="lg"
              onClick={() => { setRunning(false); tts.stop(); onFinish(); }}
              className="flex-1 gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-5 rounded-2xl text-base"
              data-testid="btn-finish"
            >
              <CheckCircle2 size={22} /> Done — Let's eat!
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={() => setPhaseIdx(i => i + 1)}
              className="flex-1 gap-3 bg-primary text-primary-foreground font-bold py-5 rounded-2xl text-base"
              data-testid="btn-next-step"
            >
              Next Phase <ChevronRight size={22} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Done screen ──
function DoneScreen({ selectedRecipes, onReset }: { selectedRecipes: Recipe[]; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6 py-12">
      <img src="/logo.jpg" alt="Mean Cuisines" width={64} height={64} className="rounded-2xl mb-4 shadow-md" />
      <h2 className="text-3xl font-display font-bold mb-2">Meal prep complete!</h2>
      <p className="text-muted-foreground mb-6">{selectedRecipes.length} recipes cooked in parallel.</p>
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {selectedRecipes.map(r => (
          <Badge key={r.id} variant="secondary" className="text-sm px-3 py-1">✓ {r.name}</Badge>
        ))}
      </div>
      <Button size="lg" onClick={onReset} className="gap-2 bg-primary text-primary-foreground" data-testid="btn-cook-again">
        Cook Another Batch
      </Button>
    </div>
  );
}

type CookSubPhase = "gameplan" | "execution" | "done";

function StepCook({
  parallelPlan, selectedRecipes, pantry, servings, burners,
  onFinish, onBack,
}: {
  parallelPlan: ParallelPlan;
  selectedRecipes: Recipe[];
  pantry: string[];
  servings: Record<number, number>;
  burners: number;
  onFinish: () => void;
  onBack: () => void;
}) {
  const [subPhase, setSubPhase] = useState<CookSubPhase>("gameplan");

  if (subPhase === "execution") {
    return (
      <ExecutionView
        phases={parallelPlan.phases}
        totalMinutes={parallelPlan.totalMinutes}
        selectedRecipes={selectedRecipes}
        onFinish={() => setSubPhase("done")}
        onBackToMap={() => setSubPhase("gameplan")}
        onExitToHome={onFinish}
      />
    );
  }

  if (subPhase === "done") {
    return <DoneScreen selectedRecipes={selectedRecipes} onReset={onFinish} />;
  }

  return (
    <GamePlanView
      phases={parallelPlan.phases}
      totalMinutes={parallelPlan.totalMinutes}
      sequentialMinutes={parallelPlan.sequentialMinutes}
      selectedRecipes={selectedRecipes}
      pantry={pantry}
      servings={servings}
      burners={burners}
      onStart={() => setSubPhase("execution")}
      onBack={onBack}
    />
  );
}


// ─── STEP 5: Shopping List ────────────────────────────────────────────────────

function StepShopping({
  selectedRecipes, pantry, servings, onBack, onReset,
}: {
  selectedRecipes: Recipe[];
  pantry: string[];
  servings: Record<number, number>;
  onBack: () => void;
  onReset: () => void;
}) {
  const lowerPantry = pantry.map(p => p.toLowerCase());

  const allItems = selectedRecipes.flatMap(r => {
    const multiplier = (servings[r.id] ?? r.servings) / (r.servings || 1);
    return r.ingredients.map(ing => {
      const owned = lowerPantry.some(p => ing.name.toLowerCase().includes(p) || p.includes(ing.name.toLowerCase().split(" ")[0]));
      const qty = multiplier !== 1 && ing.qty > 0 ? +(ing.qty * multiplier).toFixed(1) : ing.qty;
      return { ...ing, qty, recipeName: r.name, owned };
    });
  });

  const toBuy = allItems.filter(i => !i.owned);
  const have = allItems.filter(i => i.owned);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-accent text-muted-foreground"><ChevronLeft size={18} /></button>
        <div>
          <h2 className="text-xl font-display font-bold">Shopping List</h2>
          <p className="text-xs text-muted-foreground">{toBuy.length} to buy · {have.length} already in pantry</p>
        </div>
      </div>

      {/* Buy section */}
      {toBuy.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart size={15} className="text-primary" />
            <h3 className="font-semibold text-sm">Need to buy ({toBuy.length})</h3>
          </div>
          <div className="rounded-xl border border-border overflow-hidden bg-card divide-y divide-border">
            {toBuy.map((ing, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors">
                <div>
                  <span className="text-sm font-medium">{ing.qty > 0 ? `${ing.qty} ${ing.unit} ` : ""}{ing.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">({ing.recipeName})</span>
                </div>
                <a
                  href={getAmazonUrl(ing.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline font-medium shrink-0 ml-3"
                >
                  <ShoppingCart size={11} /> Buy <ExternalLink size={9} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Already have section */}
      {have.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Package size={15} className="text-muted-foreground" />
            <h3 className="font-semibold text-sm text-muted-foreground">Already in your pantry ({have.length})</h3>
          </div>
          <div className="rounded-xl border border-border overflow-hidden bg-muted/30 divide-y divide-border">
            {have.map((ing, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 opacity-50">
                <span className="text-sm line-through">{ing.qty > 0 ? `${ing.qty} ${ing.unit} ` : ""}{ing.name}</span>
                <span className="text-xs text-muted-foreground">({ing.recipeName})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button size="lg" onClick={onReset} className="w-full gap-2 bg-primary text-primary-foreground font-bold">
        <ChefHat size={18} /> Cook Another Batch
      </Button>
    </div>
  );
}

// ─── Add Recipe Modal (with URL import) ──────────────────────────────────────────

type ImportedRecipeData = {
  name: string; description: string; cookTimeMinutes: number; servings: number;
  equipment: string[]; ingredients: { name: string; qty: number; unit: string }[];
  steps: string[]; tags: string[]; imageUrl: string | null; sourceUrl: string; author: string | null;
};

function AddRecipeModal({ open, onClose, contributors }: { open: boolean; onClose: () => void; contributors: Contributor[] }) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"manual" | "url">("url");
  const [urlInput, setUrlInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importedPreview, setImportedPreview] = useState<ImportedRecipeData | null>(null);

  const [form, setForm] = useState({
    name: "", description: "", cookTimeMinutes: 30, servings: 4,
    equipment: [] as EquipmentKey[], ingredients: "", steps: "",
    tags: "", sourceUrl: "", contributorId: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const ingArr = data.ingredients.split("\n").filter(Boolean).map(line => {
        const parts = line.trim().split(" ");
        const qty = parseFloat(parts[0]) || 0;
        const unit = !isNaN(parseFloat(parts[0])) ? (parts[1] || "") : "";
        const name = !isNaN(parseFloat(parts[0])) ? parts.slice(2).join(" ") : line.trim();
        return { qty, unit, name };
      });
      return apiRequest("POST", "/api/recipes", {
        name: data.name, description: data.description,
        cookTimeMinutes: Number(data.cookTimeMinutes), servings: Number(data.servings),
        equipment: data.equipment, ingredients: ingArr,
        steps: data.steps.split("\n").filter(Boolean).map(s => s.trim()),
        tags: data.tags.split(",").map(t => t.trim()).filter(Boolean),
        imageUrl: null, sourceUrl: data.sourceUrl || null,
        contributorId: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      toast({ title: "Recipe added!" });
      handleClose();
    },
    onError: () => toast({ title: "Failed to add recipe", variant: "destructive" }),
  });

  const handleImportUrl = async () => {
    if (!urlInput.trim()) return;
    setImporting(true);
    setImportError("");
    setImportedPreview(null);
    try {
      const res = await apiRequest("POST", "/api/recipes/import-url", { url: urlInput.trim() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      // Pre-fill the form
      setImportedPreview(data);
      setForm(f => ({
        ...f,
        name: data.name || "",
        description: data.description || "",
        cookTimeMinutes: data.cookTimeMinutes || 30,
        servings: data.servings || 4,
        equipment: data.equipment || [],
        ingredients: (data.ingredients || []).map((i: any) => `${i.qty > 0 ? i.qty + " " : ""}${i.unit ? i.unit + " " : ""}${i.name}`).join("\n"),
        steps: (data.steps || []).join("\n"),
        tags: (data.tags || []).join(", "),
        sourceUrl: data.sourceUrl || urlInput.trim(),
      }));
      setMode("manual"); // switch to review form
    } catch (e: any) {
      setImportError(e.message || "Could not import recipe from this URL.");
    } finally {
      setImporting(false);
    }
  };

  const toggleEquip = (eq: EquipmentKey) =>
    setForm(f => ({ ...f, equipment: f.equipment.includes(eq) ? f.equipment.filter(e => e !== eq) : [...f.equipment, eq] }));

  const handleClose = () => {
    onClose();
    setMode("url");
    setUrlInput("");
    setImportError("");
    setImportedPreview(null);
    setForm({ name: "", description: "", cookTimeMinutes: 30, servings: 4, equipment: [], ingredients: "", steps: "", tags: "", sourceUrl: "", contributorId: "" });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <img src="/logo.jpg" alt="Mean Cuisines" width={22} height={22} className="rounded object-contain" />
            Add a Recipe
          </DialogTitle>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-muted mb-4">
          <button
            onClick={() => setMode("url")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === "url" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            🔗 Import from URL
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === "manual" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            ✍️ Enter manually
          </button>
        </div>

        {/* URL Import Tab */}
        {mode === "url" && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
                Paste a recipe URL
              </Label>
              <div className="flex gap-2">
                <Input
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder="https://www.allrecipes.com/recipe/..."
                  className="flex-1"
                  data-testid="input-recipe-url"
                  onKeyDown={e => e.key === "Enter" && handleImportUrl()}
                />
                <Button onClick={handleImportUrl} disabled={importing || !urlInput.trim()} className="bg-primary text-primary-foreground gap-1.5 shrink-0">
                  {importing ? <Loader2 size={14} className="animate-spin" /> : <LinkIcon size={14} />}
                  {importing ? "Importing…" : "Import"}
                </Button>
              </div>
            </div>

            {importError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-3 text-sm text-destructive">
                <p className="font-semibold mb-1">Couldn't import this page</p>
                <p className="text-xs opacity-80">{importError}</p>
              </div>
            )}

            {/* Supported sites */}
            <div className="rounded-xl bg-muted/50 px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Works with these sites</p>
              <div className="flex flex-wrap gap-1.5">
                {["AllRecipes", "Food Network", "Tasty", "NYT Cooking", "Serious Eats", "BBC Good Food", "Epicurious", "Bon Appétit", "Simply Recipes", "Delish"].map(site => (
                  <span key={site} className="text-[11px] px-2 py-0.5 rounded-full bg-background border border-border text-muted-foreground">{site}</span>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 opacity-70">Works on any site using standard recipe markup · No API key required</p>
            </div>
          </div>
        )}

        {/* Manual / Review Form */}
        {mode === "manual" && (
          <div className="space-y-4 py-2">
            {importedPreview && (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2.5 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 size={14} />
                Recipe imported from <span className="font-semibold truncate">{importedPreview.sourceUrl?.replace(/https?:\/\//, "").split("/")[0]}</span>
                — review and edit below
              </div>
            )}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Recipe Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Lemon Herb Salmon" data-testid="input-recipe-name" />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="A short description..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Cook Time (min)</Label>
                <Input type="number" min={5} max={300} value={form.cookTimeMinutes} onChange={e => setForm(f => ({ ...f, cookTimeMinutes: parseInt(e.target.value) || 30 }))} />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Servings</Label>
                <Input type="number" min={1} max={20} value={form.servings} onChange={e => setForm(f => ({ ...f, servings: parseInt(e.target.value) || 4 }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Equipment Needed *</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(EQUIPMENT_INFO) as [EquipmentKey, typeof EQUIPMENT_INFO[EquipmentKey]][]).map(([eq, info]) => (
                  <label key={eq} className="flex items-center gap-2 cursor-pointer hover:bg-accent p-2 rounded-lg transition-colors">
                    <input type="checkbox" checked={form.equipment.includes(eq)} onChange={() => toggleEquip(eq)} className="accent-primary" />
                    <span className="text-sm">{info.icon} {info.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                Ingredients <span className="normal-case font-normal">(one per line: qty unit name)</span>
              </Label>
              <Textarea value={form.ingredients} onChange={e => setForm(f => ({ ...f, ingredients: e.target.value }))}
                placeholder={"2 tbsp olive oil\n1 lemon\n4 salmon fillets"} rows={5} className="font-mono text-xs" />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                Steps <span className="normal-case font-normal">(one per line)</span>
              </Label>
              <Textarea value={form.steps} onChange={e => setForm(f => ({ ...f, steps: e.target.value }))}
                placeholder={"Preheat oven to 400°F.\nSeason salmon.\nBake 12–15 minutes."} rows={5} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Tags</Label>
                <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="healthy, quick" />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Source URL</Label>
                <Input value={form.sourceUrl} onChange={e => setForm(f => ({ ...f, sourceUrl: e.target.value }))} placeholder="https://..." />
              </div>
            </div>
          </div>
        )}

        {mode === "manual" && (!form.name || form.equipment.length === 0) && (
          <div className="text-xs text-destructive px-1 -mt-2 space-y-0.5">
            {!form.name && <p>⚠ Recipe name is required</p>}
            {form.equipment.length === 0 && <p>⚠ Select at least one piece of equipment</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          {mode === "manual" && (
            <Button onClick={() => mutation.mutate(form)}
              disabled={!form.name || form.equipment.length === 0 || mutation.isPending}
              className="bg-primary text-primary-foreground" data-testid="button-submit-recipe">
              {mutation.isPending ? "Adding…" : "Add Recipe"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────

type AppStep = 1 | 2 | 3 | 4 | 5;

export default function HomePage() {
  const { toast } = useToast();
  const [darkMode, setDarkMode] = useState(window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => { document.documentElement.classList.toggle("dark", darkMode); }, [darkMode]);

  // Wizard state
  const [step, setStep] = useState<AppStep>(1);
  const [equipment, setEquipment] = useState<Record<EquipmentKey, boolean>>({
    oven: true, stove: true, airFryer: false, counter: true, instantPot: false, microwave: false,
  });
  const [pantry, setPantry] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [servings, setServings] = useState<Record<number, number>>({});
  const [burners, setBurners] = useState(2);
  const [parallelPlan, setParallelPlan] = useState<ParallelPlan | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: recipes = [], isLoading } = useQuery<Recipe[]>({ queryKey: ["/api/recipes"] });
  const { data: contributors = [] } = useQuery<Contributor[]>({ queryKey: ["/api/contributors"] });

  const selectedRecipes = recipes.filter(r => selectedIds.includes(r.id));

  const buildMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/schedule/parallel", { recipeIds: ids, burners });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? "Failed"); }
      return res.json() as Promise<ParallelPlan>;
    },
    onSuccess: (data) => { setParallelPlan(data); setStep(4); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const toggleEquipment = (k: EquipmentKey) => {
    setEquipment(prev => ({ ...prev, [k]: !prev[k] }));
    setSelectedIds([]);
  };

  const toggleRecipe = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleReset = () => {
    setStep(1);
    setSelectedIds([]);
    setParallelPlan(null);
    setServings({});
  };

  return (
    <div className="min-h-screen bg-background" data-testid="homepage">
      {/* ── Global nav ── */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14 gap-3">
          <div className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="Mean Cuisines" width={32} height={32} className="rounded-lg object-contain" />
            <span className="font-display font-bold text-base hidden sm:block">Mean Cuisines</span>
          </div>

          {/* Step bar in header on md+ */}
          <div className="flex-1 hidden md:block">
            <StepBar step={step} total={5} />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(d => !d)} className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground" aria-label="Toggle dark mode">
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile step bar */}
        <div className="md:hidden border-t border-border">
          <StepBar step={step} total={5} />
        </div>
      </header>

      {/* ── Step content ── */}
      <main className="pb-16">
        {step === 1 && (
          <StepEquipment
            equipment={equipment}
            onToggle={toggleEquipment}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StepPantry
            pantry={pantry}
            onPantryChange={setPantry}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepRecipes
            recipes={recipes}
            equipment={equipment}
            pantry={pantry}
            selectedIds={selectedIds}
            servings={servings}
            onToggle={toggleRecipe}
            onServing={(id, s) => setServings(prev => ({ ...prev, [id]: s }))}
            onNext={() => buildMutation.mutate(selectedIds)}
            onBack={() => setStep(2)}
            isLoading={isLoading || buildMutation.isPending}
            onShowAdd={() => setShowAddModal(true)}
            contributors={contributors}
          />
        )}
        {step === 4 && parallelPlan && (
          <StepCook
            parallelPlan={parallelPlan}
            selectedRecipes={selectedRecipes}
            pantry={pantry}
            servings={servings}
            burners={burners}
            onFinish={handleReset}
            onBack={() => setStep(3)}
          />
        )}

      </main>

      <footer className="border-t border-border px-4 md:px-6 py-5 mt-auto">
        <div className="text-center text-xs text-muted-foreground space-y-2">
          <p>
            <Link href="/privacy" className="text-primary hover:underline">Privacy</Link>
            <span className="mx-2">·</span>
            <Link href="/terms" className="text-primary hover:underline">Terms</Link>
            <span className="mx-2">·</span>
            <a href="/llms.txt" className="text-primary hover:underline">For agents</a>
          </p>
          <p className="text-muted-foreground/60">
            Mean Cuisines is a participant in the Amazon Services LLC Associates Program, an
            affiliate advertising program designed to provide a means for sites to earn advertising
            fees by advertising and linking to Amazon.com and affiliated sites. As an Amazon
            Associate, we earn from qualifying purchases.
          </p>
        </div>
      </footer>

      <AddRecipeModal open={showAddModal} onClose={() => setShowAddModal(false)} contributors={contributors} />
    </div>
  );
}
