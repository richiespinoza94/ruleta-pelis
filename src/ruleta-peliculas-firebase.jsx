import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Film, Check, X, MapPin, Popcorn, Sparkles, Clock,
  ChevronDown, ChevronLeft, RotateCw, Star, Calendar, Eye, Heart,
  BellRing, BellOff, Wifi, BookOpen, Link2, User, Wand2
} from "lucide-react";
import { db, VAPID_KEY, getMessagingSeguro, obtenerMetadatosEnlace } from "./firebase";
import { doc, onSnapshot, setDoc, runTransaction, updateDoc, arrayUnion } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";

/* ============================================================
   PALETA (colores de Catalina: verde, rojo, azul)
   ============================================================ */
const C = {
  verde: "#10B981",
  rojo: "#EF4444",
  azul: "#3B82F6",
  azulD: "#1E40AF",
  // Tonos de botón (más oscuros, cumplen contraste AA 4.5:1 con texto blanco)
  verdeBtn: "#047857",
  rojoBtn: "#DC2626",
  azulBtn: "#2563EB",
  fondo: "#0B1120",
  card: "#151E32",
  cardHi: "#1E293B",
  texto: "#F1F5F9",
  sec: "#94A3B8",
  dorado: "#FBBF24",
  borde: "#243049",
};

const USERS = {
  ricardo: { name: "Ricardo", pin: "9456", color: C.azul, btn: C.azulBtn, initial: "R" },
  catalina: { name: "Catalina", pin: "1511", color: C.rojo, btn: C.rojoBtn, initial: "C" },
};

const ANNIVERSARY_DATE = "29 de julio de 2026";

/* Mensajes de error del PIN — cálidos pero genéricos (sirven para cualquiera
   de los dos, ya que cualquiera puede equivocarse escribiendo). */
const PIN_ERROR_MESSAGES = [
  "Casi… intenta otra vez, mi amor",
  "Ese no es, pero te quiero igual",
  "Un dígito se perdió en el camino",
];

const ESTADOS = [
  { label: "Con sueño", emoji: "😴" },
  { label: "Con energía", emoji: "⚡" },
  { label: "Romántico/a", emoji: "😍" },
  { label: "Con hambre", emoji: "🍿" },
  { label: "Emocionado/a", emoji: "🤩" },
  { label: "Relajado/a", emoji: "😌" },
  { label: "Sensible", emoji: "🥹" },
  { label: "Fiestero/a", emoji: "🥳" },
  { label: "Concentrado/a", emoji: "🧐" },
  { label: "Perezoso/a", emoji: "🦥" },
  { label: "Feliz", emoji: "😄" },
  { label: "Nostálgico/a", emoji: "🌙" },
  { label: "Enamorado/a", emoji: "❤️" },
  { label: "Extrañándote", emoji: "🥺" },
  { label: "Con ganas de abrazos", emoji: "🤗" },
  { label: "Con antojo de una cita", emoji: "💕" },
  { label: "Pensativo/a", emoji: "🤔" },
  { label: "Necesito mi espacio", emoji: "🌿" },
];

/* Estado dinámico "Pensando en [pareja]" — se arma con el nombre real de la otra persona,
   por eso no vive en la lista fija de arriba (Ricardo no puede "pensar en Ricardo"). */
const estadoPensandoEnPareja = (nombrePareja) => ({
  label: `Pensando en ${nombrePareja}`,
  emoji: "🥰",
});

const LUGARES = ["Cine", "Centro Jas Noroeste", "Casa de Cata", "Casa de Ricardo", "ILN", "IRU", "Otro"];

const PELICULAS_INICIALES = [
  { id: "m1", title: "500 días con Summer", year: 2009, genre: "Romance", synopsis: "Tom, un romántico empedernido, recuerda de forma no lineal los 500 días de su relación con Summer, una chica que no cree en el amor verdadero. Una historia agridulce sobre las expectativas y la realidad del amor.", state: "ruleta" },
  { id: "m2", title: "10 cosas que odio de ti", year: 1999, genre: "Comedia romántica", synopsis: "Para poder salir con la popular Bianca, un pretendiente paga a un chico rebelde para que conquiste a su temperamental hermana mayor, Kat. Comedia inspirada en 'La fierecilla domada' de Shakespeare.", state: "ruleta" },
  { id: "m3", title: "16 deseos", year: 2010, genre: "Fantasía", synopsis: "Abby siempre soñó con su cumpleaños número 16 y recibe unas velas mágicas que cumplen sus deseos, pero pronto descubre que obtener todo lo que quiere tiene consecuencias inesperadas.", state: "ruleta" },
  { id: "m4", title: "La La Land", year: 2016, genre: "Musical", synopsis: "Mia, una aspirante a actriz, y Sebastian, un pianista de jazz, se enamoran en Los Ángeles mientras persiguen sus sueños. Un musical vibrante sobre el amor y los sacrificios de la ambición.", state: "ruleta" },
  { id: "m5", title: "Antes de ti", year: 2016, genre: "Drama romántico", synopsis: "Lou, una joven alegre, es contratada como cuidadora de Will, un hombre parapléjico y cínico tras un accidente. A medida que se acercan, ambos transforman sus vidas para siempre.", state: "ruleta" },
  { id: "m6", title: "Siempre el mismo día", year: 2011, genre: "Romance", synopsis: "Emma y Dexter se conocen el día de su graduación y la película revisita su relación cada 15 de julio durante veinte años. Una historia sobre el amor, el tiempo y las oportunidades perdidas.", state: "ruleta" },
  { id: "m7", title: "Ni idea", year: 1995, genre: "Comedia", synopsis: "Cher, una popular y adinerada estudiante de Beverly Hills, se dedica a 'mejorar' la vida de los demás, hasta que descubre que quizás es ella quien necesita cambiar. Inspirada en 'Emma' de Jane Austen.", state: "ruleta" },
  { id: "m8", title: "Diario de una princesa", year: 2001, genre: "Familiar", synopsis: "Mia, una tímida adolescente de San Francisco, descubre que es la heredera al trono del reino de Genovia. Con la ayuda de su abuela, la reina, aprende a convertirse en princesa.", state: "ruleta" },
  { id: "m9", title: "She's the Man", year: 2006, genre: "Comedia romántica", synopsis: "Viola se hace pasar por su hermano gemelo para unirse al equipo de fútbol masculino y demostrar su talento, pero todo se complica cuando se enamora de su compañero de cuarto. Inspirada en 'Noche de Reyes'.", state: "ruleta" },
  { id: "m10", title: "Love, Rosie", year: 2014, genre: "Comedia romántica", synopsis: "Rosie y Alex son mejores amigos desde la infancia y parecen destinados a estar juntos, pero el destino y las malas decisiones los separan una y otra vez a lo largo de los años.", state: "ruleta" },
  { id: "m11", title: "Aladdin", year: 1992, genre: "Aventura", synopsis: "Un joven ladrón callejero encuentra una lámpara mágica con un genio que concede deseos, y la usa para conquistar a la princesa Jasmine mientras enfrenta al malvado Jafar. Clásico de Disney lleno de música.", state: "ruleta" },
  { id: "m12", title: "Up: Una aventura de altura", year: 2009, genre: "Animación", synopsis: "Carl, un viudo gruñón de 78 años, cumple el sueño de su vida atando miles de globos a su casa para volar a Sudamérica, sin saber que un pequeño explorador viajará con él. Conmovedora aventura de Pixar.", state: "ruleta" },
];

const SLICE_COLORS = [C.verde, C.rojo, C.azul];

/* ============================================================
   Utilidades de lista para historiales grandes (películas y lecturas)
   ------------------------------------------------------------
   Funciones puras (sin estado, sin React) para poder probarlas
   de forma aislada. Todo corre en memoria del celular — Firestore
   ya sincroniza el documento completo, así que filtrar/ordenar
   acá no es una consulta nueva, es un .filter()/.sort() normal.
   ============================================================ */
const PAGINA = 10; // "Ver 10 más" — ver conversación de diseño para el porqué de 10

function buscarEnHistorial(items, query, campos) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((it) =>
    campos.some((campo) => (campo(it) || "").toLowerCase().includes(q))
  );
}

function ordenarHistorial(items, criterio, getTitulo = (it) => it.titulo || "") {
  const copia = [...items];
  if (criterio === "reciente") return copia.sort((a, b) => (b.id || 0) - (a.id || 0));
  if (criterio === "antiguo") return copia.sort((a, b) => (a.id || 0) - (b.id || 0));
  if (criterio === "calificacion") return copia.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  if (criterio === "az") return copia.sort((a, b) => getTitulo(a).localeCompare(getTitulo(b), "es"));
  return copia;
}

/* Agrupa por año, a partir del campo `fecha` (string "YYYY-MM-DD").
   Devuelve un array de [año, items[]] ya en el orden en que llegaron
   (asumimos que `items` ya viene ordenado — esta función no reordena). */
function agruparPorAnio(items) {
  const grupos = new Map();
  for (const it of items) {
    const anio = (it.fecha || "").slice(0, 4) || "Sin fecha";
    if (!grupos.has(anio)) grupos.set(anio, []);
    grupos.get(anio).push(it);
  }
  return Array.from(grupos.entries());
}


/* Vibración háptica — no-op en navegadores/dispositivos sin soporte (ej. iOS Safari) */
const vibrate = (pattern) => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch (e) { /* silencioso */ }
  }
};

const FontStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Poppins:wght@400;500;600&display=swap');
    * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
    .rp-display { font-family: 'Outfit', sans-serif; }
    .rp-body { font-family: 'Poppins', sans-serif; }
    @keyframes rp-pop { 0% { transform: scale(0.7); opacity: 0; } 60% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
    @keyframes rp-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
    @keyframes rp-slideup { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .rp-pop { animation: rp-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
    .rp-pulse { animation: rp-pulse 1.6s ease-in-out infinite; }
    .rp-slideup { animation: rp-slideup 0.4s ease both; }
    .rp-scroll::-webkit-scrollbar { width: 6px; }
    .rp-scroll::-webkit-scrollbar-thumb { background: ${C.borde}; border-radius: 3px; }
    @keyframes rp-confetti-fall {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(340px) rotate(340deg); opacity: 0; }
    }
    @keyframes rp-shake {
      10%, 90% { transform: translateX(-1px); }
      20%, 80% { transform: translateX(2px); }
      30%, 50%, 70% { transform: translateX(-4px); }
      40%, 60% { transform: translateX(4px); }
    }
    .rp-shake { animation: rp-shake 0.4s ease; }
    /* Fix: 100vh no coincide con el alto real visible en celular (la barra de
       direcciones lo distorsiona) — svh sí. Se declara dos veces a propósito:
       la 2da línea la ignoran los navegadores viejos, la usan los nuevos. */
    .rp-safe-height { min-height: 100vh; min-height: 100svh; }
    .rp-confetti-piece { animation-name: rp-confetti-fall; animation-timing-function: ease-in; animation-fill-mode: forwards; border-radius: 2px; }
    /* #8 Accesibilidad: respeta la preferencia de movimiento reducido del sistema
       (solo afecta animaciones decorativas, no la rotación funcional de la ruleta,
       para no dejar la pantalla "congelada" mientras el código sigue esperando el resultado) */
    @media (prefers-reduced-motion: reduce) {
      .rp-pop, .rp-pulse, .rp-slideup, .rp-confetti-piece, .rp-shake { animation: none !important; }
      .rp-confetti-wrap { display: none !important; }
    }
  `}</style>
);

/* ============================================================
   RULETA (SVG)
   ============================================================ */
function Wheel({ movies, rotation, spinning }) {
  const size = 320;
  const cx = size / 2, cy = size / 2, r = size / 2 - 8;
  const n = movies.length;
  const slice = n > 0 ? 360 / n : 360;

  const polar = (deg, rad) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  };

  return (
    <div style={{ position: "relative", width: size, height: size, maxWidth: "86vw", aspectRatio: "1", margin: "0 auto" }}>
      <div style={{ position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)", zIndex: 5, filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.5))" }}>
        <svg width="30" height="34" viewBox="0 0 30 34">
          <path d="M15 32 L2 8 Q15 0 28 8 Z" fill={C.dorado} />
          <circle cx="15" cy="9" r="4" fill={C.fondo} />
        </svg>
      </div>

      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{
          width: "100%", height: "100%",
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? "transform 3.6s cubic-bezier(0.15, 0.9, 0.2, 1)" : "none",
          filter: "drop-shadow(0 10px 34px rgba(0,0,0,0.55))",
        }}
      >
        <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke={C.dorado} strokeWidth="4" />
        <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke={C.fondo} strokeWidth="1" />

        {n === 0 && (
          <>
            <circle cx={cx} cy={cy} r={r} fill={C.card} />
            <text x={cx} y={cy - 6} fill={C.texto} fontSize="16" fontWeight="700" textAnchor="middle" className="rp-display">¡Todas vistas!</text>
            <text x={cx} y={cy + 16} fill={C.sec} fontSize="20" textAnchor="middle">🎉</text>
          </>
        )}

        {movies.map((m, i) => {
          const start = i * slice, end = (i + 1) * slice;
          const [x1, y1] = polar(start, r);
          const [x2, y2] = polar(end, r);
          const large = slice > 180 ? 1 : 0;
          const path = n === 1
            ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`
            : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
          const mid = start + slice / 2;
          const [dx, dy] = polar(mid, r * 0.74);
          const col = SLICE_COLORS[i % 3];
          return (
            <g key={m.id}>
              <path d={path} fill={col} stroke={C.fondo} strokeWidth="2.5" />
              <circle cx={dx} cy={dy} r="15" fill="#ffffff" opacity="0.96" />
              <text x={dx} y={dy} fill={col} fontSize="15" fontWeight="800"
                textAnchor="middle" dominantBaseline="central" className="rp-display"
                style={{ pointerEvents: "none" }}>
                {i + 1}
              </text>
            </g>
          );
        })}

        <circle cx={cx} cy={cy} r="30" fill={C.fondo} />
        <circle cx={cx} cy={cy} r="30" fill="none" stroke={C.dorado} strokeWidth="3" />
        <circle cx={cx} cy={cy} r="30" fill="none" stroke={C.card} strokeWidth="1" />
      </svg>

      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 4, pointerEvents: "none" }}>
        <Film size={26} color={C.dorado} />
      </div>
    </div>
  );
}

function Legend({ movies }) {
  if (movies.length === 0) return null;
  return (
    <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px 10px" }}>
      {movies.map((m, i) => {
        const col = SLICE_COLORS[i % 3];
        return (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span className="rp-display" style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 6, background: col, color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
            <span className="rp-body" style={{ fontSize: 12, color: C.sec, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</span>
          </div>
        );
      })}
    </div>
  );
}

/* #3 Confeti — ráfaga de partículas en los colores de la app, respeta prefers-reduced-motion */
function Confetti() {
  const pieces = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 26; i++) {
      arr.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.25,
        duration: 1.1 + Math.random() * 0.7,
        color: SLICE_COLORS[i % 3],
        rotate: Math.random() * 360,
        size: 6 + Math.random() * 6,
      });
    }
    return arr;
  }, []);
  return (
    <div aria-hidden="true" className="rp-confetti-wrap" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", borderRadius: 24 }}>
      {pieces.map((p) => (
        <span key={p.id} className="rp-confetti-piece" style={{
          position: "absolute", top: -10, left: `${p.left}%`,
          width: p.size, height: p.size * 0.4, background: p.color,
          animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`,
          transform: `rotate(${p.rotate}deg)`,
        }} />
      ))}
    </div>
  );
}

/* ============================================================
   APP PRINCIPAL
   👉 TODOS los hooks van aquí arriba, sin excepción,
      antes de cualquier "if (...) return".
   ============================================================ */
export default function App() {
  const [screen, setScreen] = useState("login");
  const [currentUser, setCurrentUser] = useState(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [loginStep, setLoginStep] = useState("select"); // "select" | "pin" | "success"
  const [loginPerson, setLoginPerson] = useState(null); // persona elegida, aún sin verificar
  const [pinErrorMsg, setPinErrorMsg] = useState("");
  const [loginShake, setLoginShake] = useState(false);

  const [sala, setSala] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showEstadoPicker, setShowEstadoPicker] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [showSynopsis, setShowSynopsis] = useState(false);
  const [registrando, setRegistrando] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [detalleHist, setDetalleHist] = useState(null);
  // --- Lecturas ---
  const [showAddLectura, setShowAddLectura] = useState(false);
  const [compartiendo, setCompartiendo] = useState(null); // lectura sobre la que se está compartiendo impresión
  const [showLecturasHistorial, setShowLecturasHistorial] = useState(false);
  const [lecturaDetalle, setLecturaDetalle] = useState(null);
  const [saving, setSaving] = useState(false);          // #8 loading en escrituras
  const [toast, setToast] = useState(null);              // #2 micro-toast de estado
  const [pushEstado, setPushEstado] = useState("desconocido"); // push: desconocido | no-soportado | pendiente | activo | bloqueado | error
  const [pushErrorMsg, setPushErrorMsg] = useState(null);
  const [pushOcupado, setPushOcupado] = useState(false);

  const spinRef = useRef(false);           // ✅ ahora arriba, siempre se ejecuta
  const prevOtherEstado = useRef(null);     // #2 detectar cambio de estado remoto
  const loginSuccessTimeoutRef = useRef(null); // permite cancelar el auto-avance si tocan para saltarlo
  const notifiedReqRef = useRef(null);      // #4 evitar notificar 2 veces la misma solicitud
  const SALA_DOC = doc(db, "sala", "casa");

  /* ---- Escuchar cambios en tiempo real ---- */
  useEffect(() => {
    const unsub = onSnapshot(SALA_DOC, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        // Migración suave: si el documento es de antes de agregar Lecturas, no tiene ese campo.
        // Lo completamos localmente para no romper nada; se guarda solo, sin bloquear la carga.
        if (!data.lecturas) {
          data.lecturas = [];
          setDoc(SALA_DOC, { lecturas: [] }, { merge: true }).catch(() => {});
        }
        setSala(data);
      } else {
        const inicial = {
          movies: PELICULAS_INICIALES,
          history: [],
          lecturas: [],
          estados: {
            ricardo: ESTADOS.find((e) => e.label === "Feliz"),
            catalina: ESTADOS.find((e) => e.label === "Romántico/a"),
          },
          spinReq: null,
          tokens: { ricardo: [], catalina: [] }, // tokens de push por dispositivo
        };
        await setDoc(SALA_DOC, inicial);
        setSala(inicial);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /* ---- Animación de giro sincronizada ---- */
  useEffect(() => {                        // ✅ ahora arriba, siempre se ejecuta
    if (sala?.spinReq?.status === "approved" && !spinRef.current) {
      const available = sala.movies.filter((m) => m.state === "ruleta");
      if (available.length === 0) return;
      spinRef.current = true;
      const idx = Math.abs(sala.spinReq.seed) % available.length;
      const target = { ...available[idx], _num: idx };
      const sliceAngle = 360 / available.length;
      const center = idx * sliceAngle + sliceAngle / 2;
      const desiredMod = ((360 - center) % 360 + 360) % 360;
      const currentMod = ((rotation % 360) + 360) % 360;
      let delta = desiredMod - currentMod;
      if (delta < 0) delta += 360;
      const newRot = rotation + 360 * 6 + delta;
      setSpinning(true);
      // #3 Vibración tipo "tick" mientras gira (patrón corto repetido) + vibración larga al aterrizar
      vibrate([12, 90, 12, 90, 12, 90, 12, 90, 12]);
      setRotation(newRot);
      setTimeout(() => {
        setSpinning(false);
        setWinner(target);
        vibrate([40, 30, 80]); // remate al aterrizar
        setDoc(SALA_DOC, { spinReq: null }, { merge: true });
        spinRef.current = false;
      }, 3600);
    }
  }, [sala?.spinReq?.status]); // eslint-disable-line

  /* ---- Toast en pantalla cuando el estado de ánimo del otro cambia ----
     Nota: las notificaciones con la app cerrada/en 2do plano ahora las manda la
     Cloud Function (FCM). Aquí solo mostramos el aviso EN PANTALLA para cuando
     la persona está mirando la app; si además disparáramos una Notification
     desde el navegador, llegaría duplicada junto con la de FCM. */
  useEffect(() => {
    if (!currentUser || !sala?.estados) return undefined;
    const other = currentUser === "ricardo" ? "catalina" : "ricardo";
    const nuevo = sala.estados[other];
    const cambio = prevOtherEstado.current && nuevo && prevOtherEstado.current.label !== nuevo.label;
    prevOtherEstado.current = nuevo;
    if (!cambio) return undefined;

    setToast(`${USERS[other].name} ahora está ${nuevo.emoji} ${nuevo.label}`);
    vibrate(15);
    const toastTimer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(toastTimer);
  }, [sala?.estados, currentUser]);

  /* ---- Vibración cuando piden girar y la app está abierta ----
     (la notificación con la app cerrada la manda la Cloud Function) */
  useEffect(() => {
    if (!currentUser) return;
    const req = sala?.spinReq;
    const reqId = req ? `${req.by}-${req.seed}` : null;
    if (req && req.status === "pending" && req.by !== currentUser && reqId !== notifiedReqRef.current) {
      notifiedReqRef.current = reqId;
      vibrate([25, 60, 25]);
    }
  }, [sala?.spinReq, currentUser]);

  /* ---- Detectar el estado del permiso de push al cargar ---- */
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const messaging = await getMessagingSeguro();
      if (cancelado) return;
      if (!messaging || typeof Notification === "undefined") {
        setPushEstado("no-soportado");
        return;
      }
      if (Notification.permission === "granted") setPushEstado("activo");
      else if (Notification.permission === "denied") setPushEstado("bloqueado");
      else setPushEstado("pendiente");
    })();
    return () => { cancelado = true; };
  }, []);

  /* ---- Escuchar mensajes de FCM con la app EN PRIMER PLANO ----
     El Service Worker solo maneja los mensajes en segundo plano; si la app está
     abierta, llegan por aquí. Mostramos un toast en vez de una notificación del
     sistema, que sería molesta estando la persona mirando la pantalla. */
  useEffect(() => {
    if (pushEstado !== "activo" || !currentUser) return undefined;
    let unsub = () => {};
    (async () => {
      const messaging = await getMessagingSeguro();
      if (!messaging) return;
      unsub = onMessage(messaging, (payload) => {
        const d = payload.data || {};
        if (d.title) {
          setToast(`${d.title}${d.body ? ` · ${d.body}` : ""}`);
          setTimeout(() => setToast(null), 3500);
        }
      });
    })();
    return () => unsub();
  }, [pushEstado, currentUser]);

  /* ---- Registrar el token de este dispositivo para poder recibir push ----
     Cada celular genera un token único. Lo guardamos en Firestore bajo el usuario
     logueado (en un array, porque una persona puede usar varios dispositivos).
     La Cloud Function lee estos tokens para saber a dónde mandar el aviso.

     FIX: antes, cualquier error acá (VAPID mal copiada, Service Worker sin
     registrar a tiempo, red, etc.) se tragaba en silencio con un console.warn
     que nadie ve en el celular — el banner simplemente desaparecía sin avisar
     nada, pareciendo "activado" cuando en realidad NUNCA se guardó el token,
     y sin token la Cloud Function no tiene a quién mandarle el aviso. Ahora
     devolvemos el motivo real del fallo para poder mostrarlo en pantalla. */
  const registrarTokenPush = async (usuario) => {
    try {
      const messaging = await getMessagingSeguro();
      if (!messaging) return { token: null, error: "Este navegador no soporta notificaciones push" };

      const registro = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      // Esperamos a que el Service Worker esté LISTO (activo), no solo registrado.
      // Pedir el token antes de que esté activo es una causa común de fallo silencioso.
      await navigator.serviceWorker.ready;

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registro,
      });
      if (!token) return { token: null, error: "Firebase no devolvió un token (revisa la clave VAPID)" };

      await updateDoc(SALA_DOC, { [`tokens.${usuario}`]: arrayUnion(token) });
      return { token, error: null };
    } catch (e) {
      console.error("Fallo al registrar token de push:", e);
      const motivo = (e && e.code) || (e && e.message) || "Error desconocido";
      return { token: null, error: motivo };
    }
  };

  /* ---- Activar push (lo dispara el usuario con un botón, no automáticamente) ----
     Los navegadores exigen que la solicitud de permiso venga de un gesto del usuario,
     y además pedirlo de golpe al entrar hace que mucha gente lo rechace por reflejo. */
  const activarPush = async () => {
    if (typeof Notification === "undefined") return;
    setPushOcupado(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso === "granted") {
        const { token, error } = await registrarTokenPush(currentUser);
        if (token) {
          setPushEstado("activo");
          setToast("🔔 Notificaciones activadas en este dispositivo");
          setTimeout(() => setToast(null), 3000);
        } else {
          // FIX: antes esto quedaba en "no-soportado" (silencioso). Ahora mostramos
          // el motivo real para poder diagnosticarlo en vez de adivinar.
          setPushEstado("error");
          setPushErrorMsg(error || "No se pudo completar el registro");
        }
      } else if (permiso === "denied") {
        setPushEstado("bloqueado");
      }
    } finally {
      setPushOcupado(false);
    }
  };

  /* ---- Si el permiso ya estaba dado, refrescamos el token al entrar ----
     El token puede cambiar (reinstalación, limpieza de datos del navegador), así
     que lo re-registramos en cada login en vez de asumir que el guardado sigue vivo. */
  useEffect(() => {
    if (pushEstado === "activo" && currentUser && sala) {
      registrarTokenPush(currentUser).then(({ error }) => {
        if (error) console.warn("Refresco de token falló (silencioso, ya estaba activo antes):", error);
      });
    }
  }, [pushEstado, currentUser, !!sala]); // eslint-disable-line

  /* ---- Helper para guardar cambios (con estado de "guardando" para feedback visual) ---- */
  const guardar = async (cambios) => {
    setSaving(true);
    try {
      await setDoc(SALA_DOC, cambios, { merge: true });
    } finally {
      setSaving(false);
    }
  };

  /* ================= A PARTIR DE AQUÍ, RETURNS CONDICIONALES ================= */

  if (loading) {
    return (
      <div className="rp-body rp-safe-height" style={{ background: C.fondo, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <FontStyles />
        <div style={{ textAlign: "center" }}>
          <div className="rp-pulse" style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
          <p style={{ color: C.sec, fontSize: 14 }}>Conectando con Firebase…</p>
        </div>
      </div>
    );
  }

  if (!sala) {
    return (
      <div className="rp-body rp-safe-height" style={{ background: C.fondo, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <FontStyles />
        <p style={{ color: C.rojo }}>Error al conectar a Firestore. Verifica tu config.</p>
      </div>
    );
  }

  const seleccionarPersona = (key) => {
    vibrate(12);
    setLoginPerson(key);
    setLoginStep("pin");
    setPin("");
    setPinError(false);
  };

  const volverASeleccion = () => {
    setLoginStep("select");
    setLoginPerson(null);
    setPin("");
    setPinError(false);
  };

  const terminarLogin = () => {
    if (loginSuccessTimeoutRef.current) clearTimeout(loginSuccessTimeoutRef.current);
    setCurrentUser(loginPerson);
    setScreen("hub");
    setLoginStep("select");
    setLoginPerson(null);
    setPin("");
    setPinError(false);
  };

  const tryLogin = (candidatePin) => {
    const pinToCheck = candidatePin !== undefined ? candidatePin : pin;
    if (pinToCheck === USERS[loginPerson].pin) {
      vibrate(20); // #1 haptic de éxito
      setLoginStep("success");
      // Auto-avanza en 3s (suficiente para leer el mensaje sin sentirse forzado) —
      // si tocan la pantalla o el botón "Continuar" antes, terminarLogin() cancela esto.
      loginSuccessTimeoutRef.current = setTimeout(terminarLogin, 3000);
    } else {
      vibrate([15, 40, 15, 40, 15]); // #1 haptic de error (patrón distinto al de éxito)
      setPinErrorMsg(PIN_ERROR_MESSAGES[Math.floor(Math.random() * PIN_ERROR_MESSAGES.length)]);
      setPinError(true);
      setLoginShake(true);
      setTimeout(() => { setPin(""); setLoginShake(false); }, 550);
    }
  };

  const pressDigit = (d) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setPinError(false); // limpia el error al empezar a escribir de nuevo (como en el mockup)
    if (next.length === 4) {
      setTimeout(() => tryLogin(next), 200); // pausa breve para que se vea el último punto lleno
    }
  };
  const pressDelete = () => setPin((p) => p.slice(0, -1));

  if (screen === "login") {
    const personaActual = loginPerson ? USERS[loginPerson] : null;
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

    return (
      <div className="rp-body rp-safe-height" style={{ background: `radial-gradient(circle at 30% 20%, ${C.azulD}22, ${C.fondo} 55%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <FontStyles />
        <div className="rp-pop rp-scroll" style={{ position: "relative", background: C.card, border: `1px solid ${C.borde}`, borderRadius: 24, padding: "36px 26px", width: "100%", maxWidth: 380, minHeight: 500, maxHeight: "90svh", overflowY: "auto", display: "flex", flexDirection: "column" }}>

          {/* ---------- Paso 1: elegir persona ---------- */}
          {loginStep === "select" && (
            <div className="rp-slideup" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "center", padding: "6px 14px", borderRadius: 999, background: `${C.dorado}1F`, border: `1px solid ${C.dorado}55`, marginBottom: 24 }}>
                <span style={{ fontSize: 14 }} aria-hidden="true">💛</span>
                <span className="rp-body" style={{ color: C.texto, fontSize: 12.5 }}>Nuestra fecha: {ANNIVERSARY_DATE}</span>
              </div>
              <h1 className="rp-display" style={{ color: C.texto, fontSize: 24, fontWeight: 800, margin: "0 0 6px", textAlign: "center" }}>¿Quién eres?</h1>
              <p style={{ color: C.sec, fontSize: 13.5, textAlign: "center", margin: "0 0 24px" }}>Elige tu nombre para entrar a su espacio</p>

              <div style={{ display: "flex", gap: 12, flex: 1 }}>
                {["ricardo", "catalina"].map((key) => {
                  const u = USERS[key];
                  return (
                    <button key={key} onClick={() => seleccionarPersona(key)}
                      aria-label={`Entrar como ${u.name}`}
                      style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "22px 8px", borderRadius: 18, background: C.cardHi, border: `1px solid ${C.borde}`, cursor: "pointer", minHeight: 140 }}>
                      <div style={{ width: 60, height: 60, borderRadius: "50%", background: u.btn, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 24, boxShadow: `0 10px 24px ${u.color}55` }}>{u.initial}</div>
                      <span className="rp-display" style={{ color: C.texto, fontWeight: 600, fontSize: 15 }}>{u.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---------- Paso 2: PIN con teclado numérico ---------- */}
          {loginStep === "pin" && personaActual && (
            <div className="rp-slideup" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <button onClick={volverASeleccion} aria-label="Volver"
                  style={{ width: 44, height: 44, borderRadius: "50%", background: C.cardHi, border: `1px solid ${C.borde}`, color: C.texto, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ChevronLeft size={19} />
                </button>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: personaActual.btn, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 14 }}>{personaActual.initial}</div>
                <span className="rp-display" style={{ color: C.texto, fontWeight: 600, fontSize: 16 }}>Hola, {personaActual.name}</span>
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
                <p style={{ color: C.sec, fontSize: 13, margin: 0 }}>Ingresa tu PIN</p>
                <div className={loginShake ? "rp-shake" : ""} style={{ display: "flex", gap: 16 }} role="group" aria-label={`${pin.length} de 4 dígitos ingresados`}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} aria-hidden="true" style={{
                      width: 16, height: 16, borderRadius: "50%",
                      background: i < pin.length ? personaActual.color : "transparent",
                      border: `2px solid ${i < pin.length ? personaActual.color : C.sec}`,
                    }} />
                  ))}
                </div>
                {/* minHeight fijo: el mensaje de error reserva su espacio SIEMPRE (visible u
                    oculto), para que aparecer/desaparecer no empuje los puntos de PIN justo
                    en el momento en que están temblando — esa combinación era la causa más
                    probable del "traslape" que se veía. */}
                <div style={{ minHeight: 32, display: "flex", alignItems: "flex-start" }}>
                  {pinError && <p style={{ color: C.rojo, fontSize: 12.5, textAlign: "center", maxWidth: 220, margin: 0 }} role="alert">{pinErrorMsg}</p>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }} role="group" aria-label="Teclado numérico">
                {keys.map((k, idx) =>
                  k === "" ? (
                    <div key={idx} aria-hidden="true" />
                  ) : (
                    <button key={idx}
                      onClick={() => (k === "del" ? pressDelete() : pressDigit(k))}
                      aria-label={k === "del" ? "Borrar" : `Dígito ${k}`}
                      className="rp-display"
                      style={{ height: 56, borderRadius: 16, background: C.cardHi, border: `1px solid ${C.borde}`, color: C.texto, fontWeight: 600, fontSize: 19, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {k === "del" ? "⌫" : k}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* ---------- Paso 3: bienvenida — 3s para leerlo, o "Continuar" para saltarlo ---------- */}
          {loginStep === "success" && personaActual && (
            <div className="rp-pop" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <div className="rp-pulse" style={{ width: 88, height: 88, borderRadius: "50%", background: `radial-gradient(circle, ${personaActual.color}55, ${C.dorado}55)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }} aria-hidden="true">💛</div>
              <h2 className="rp-display" style={{ color: C.texto, fontSize: 22, fontWeight: 800, margin: 0, textAlign: "center" }}>Bienvenido/a, {personaActual.name}</h2>
              <p style={{ color: C.sec, fontSize: 13, textAlign: "center", lineHeight: 1.6, margin: 0, maxWidth: 250 }}>Que este espacio siga creciendo con cada recuerdo que suman juntos.</p>
              <button onClick={terminarLogin} className="rp-display"
                style={{ marginTop: 10, padding: "12px 28px", borderRadius: 14, border: "none", background: `linear-gradient(135deg, ${C.verdeBtn}, ${C.azulBtn})`, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", minHeight: 44 }}>
                Continuar
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ============================================================
     PANTALLA PRINCIPAL
     ============================================================ */
  const me = USERS[currentUser];
  const available = sala.movies.filter((m) => m.state === "ruleta");
  const pendientes = sala.movies.filter((m) => m.state === "pendiente");
  const other = currentUser === "ricardo" ? "catalina" : "ricardo";

  const pedirGiro = () => {
    if (available.length === 0) return;
    if (pendientes.length > 0) { setShowHistory(true); return; }
    const seed = Math.floor(Math.random() * 1000000);
    guardar({ spinReq: { by: currentUser, status: "pending", seed } });
  };

  const verDespues = () => {
    guardar({
      movies: sala.movies.map((m) => (m.id === winner.id ? { ...m, state: "pendiente" } : m)),
    });
    setWinner(null);
    setShowSynopsis(false);
  };

  /* FIX condición de carrera: antes se usaba `movie.draft` (la "foto" tomada
     cuando se abrió el formulario), que podía quedar vieja si la otra persona
     guardaba su nota mientras esta seguía escribiendo — al guardar, se perdía
     la nota ajena. Ahora usamos una transacción de Firestore: lee el documento
     REAL justo en el instante de guardar (no antes) y, si detecta que alguien
     más escribió en el medio, reintenta sola con el dato más fresco. */
  const guardarParte = async (movie, data) => {
    setSaving(true);
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(SALA_DOC);
        const current = snap.data();
        const currentMovie = current.movies.find((m) => m.id === movie.id);
        if (!currentMovie) return; // la película ya no existe en ese estado (caso raro)

        const draftPrevio = currentMovie.draft || { notas: {} };
        const notasNuevas = { ...draftPrevio.notas, [currentUser]: data.notas };
        const draft = { fecha: data.fecha, lugar: data.lugar, comida: data.comida, rating: data.rating, notas: notasNuevas };
        const completo = !!(notasNuevas.ricardo?.trim() && notasNuevas.catalina?.trim());

        if (completo) {
          tx.set(SALA_DOC, {
            movies: current.movies.map((m) => (m.id === movie.id ? { ...m, state: "vista", draft: null } : m)),
            history: [{ ...draft, movieId: movie.id, movie: currentMovie, id: Date.now() }, ...current.history],
          }, { merge: true });
        } else {
          tx.set(SALA_DOC, {
            movies: current.movies.map((m) => (m.id === movie.id ? { ...m, draft } : m)),
          }, { merge: true });
        }
      });
    } finally {
      setSaving(false);
      setRegistrando(null);
    }
  };

  /* ---- Agregar una lectura nueva (no pasa por "aprobación", a diferencia del giro:
     no hay nada que sortear, así que se agrega directo) ---- */
  const agregarLectura = (datos) => {
    const nueva = {
      id: Date.now(),
      titulo: datos.titulo,
      autor: datos.autor,
      enlace: datos.enlace,
      contexto: datos.contexto,
      state: "pendiente",
      draft: { impresiones: {}, metas: {} },
    };
    guardar({ lecturas: [nueva, ...(sala.lecturas || [])] });
    setShowAddLectura(false);
  };

  /* ---- Guardar impresión/meta de una lectura (mismo patrón anti-condición-de-carrera
     que guardarParte para películas: lee el dato fresco con una transacción, no la
     "foto" que se tomó al abrir el formulario) ---- */
  const guardarParteLectura = async (lectura, data) => {
    setSaving(true);
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(SALA_DOC);
        const current = snap.data();
        const currentLectura = (current.lecturas || []).find((l) => l.id === lectura.id);
        if (!currentLectura) return;

        const draftPrevio = currentLectura.draft || { impresiones: {}, metas: {} };
        const impresionesNuevas = { ...draftPrevio.impresiones, [currentUser]: data.impresion };
        const metasNuevas = { ...draftPrevio.metas, [currentUser]: data.meta };
        const completo = !!(impresionesNuevas.ricardo?.trim() && impresionesNuevas.catalina?.trim());

        const lecturasActualizadas = current.lecturas.map((l) => {
          if (l.id !== lectura.id) return l;
          if (completo) {
            return {
              ...l,
              state: "compartido",
              fecha: data.fecha,
              impresiones: impresionesNuevas,
              metas: metasNuevas,
              draft: null,
            };
          }
          return { ...l, draft: { impresiones: impresionesNuevas, metas: metasNuevas, fecha: data.fecha } };
        });

        tx.set(SALA_DOC, { lecturas: lecturasActualizadas }, { merge: true });
      });
    } finally {
      setSaving(false);
      setCompartiendo(null);
    }
  };

  /* ================= HUB — elegir actividad ================= */
  if (screen === "hub") {
    return (
      <div className="rp-body" style={{ minHeight: "100vh", background: `radial-gradient(circle at 70% -10%, ${C.azulD}22, ${C.fondo} 50%)`, color: C.texto, paddingBottom: 40 }}>
        <FontStyles />
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: `${C.fondo}ee`, backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.borde}`, padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 460, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: me.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff" }} className="rp-display">{me.initial}</div>
              <div>
                <div className="rp-display" style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>Hola, {me.name}</div>
                <div style={{ fontSize: 11, color: C.sec }}>Elige qué hacer juntos</div>
              </div>
            </div>
            <button onClick={() => { setScreen("login"); setCurrentUser(null); }} title="Salir" aria-label="Cerrar sesión"
              style={{ width: 44, height: 44, borderRadius: 10, background: C.card, border: `1px solid ${C.borde}`, color: C.sec, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={17} />
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 460, margin: "0 auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <button onClick={() => setScreen("main")} className="rp-pop"
            style={{ textAlign: "left", background: C.card, border: `1px solid ${C.borde}`, borderRadius: 18, padding: 18, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${C.verde}22, ${C.azul}22)`, border: `1px solid ${C.verde}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Film size={22} color={C.verde} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="rp-display" style={{ fontSize: 16, fontWeight: 700, color: C.texto }}>Ruleta de pelis</div>
              <div style={{ color: C.sec, fontSize: 12, marginTop: 2 }}>Giren y descubran qué ver</div>
            </div>
          </button>

          <button onClick={() => setScreen("lecturas")} className="rp-pop"
            style={{ textAlign: "left", background: C.card, border: `1px solid ${C.borde}`, borderRadius: 18, padding: 18, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${C.rojo}22, ${C.dorado}22)`, border: `1px solid ${C.rojo}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <BookOpen size={22} color={C.rojo} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="rp-display" style={{ fontSize: 16, fontWeight: 700, color: C.texto }}>Lecturas juntos</div>
              <div style={{ color: C.sec, fontSize: 12, marginTop: 2 }}>Guarden lo que sintieron leyendo</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  /* ================= LECTURAS ================= */
  if (screen === "lecturas") {
    const lecturasArr = sala.lecturas || [];
    const lecturasPendientes = lecturasArr.filter((l) => l.state === "pendiente");
    const lecturasCompartidas = lecturasArr.filter((l) => l.state === "compartido");

    return (
      <div className="rp-body" style={{ minHeight: "100vh", background: `radial-gradient(circle at 70% -10%, ${C.azulD}22, ${C.fondo} 50%)`, color: C.texto, paddingBottom: 40 }}>
        <FontStyles />

        {toast && (
          <div className="rp-slideup" role="status" aria-live="polite" style={{
            position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 60,
            background: C.cardHi, border: `1px solid ${C.dorado}66`, borderRadius: 14,
            padding: "10px 16px", fontSize: 13, color: C.texto, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            maxWidth: "90vw", textAlign: "center",
          }}>{toast}</div>
        )}

        <div style={{ position: "sticky", top: 0, zIndex: 10, background: `${C.fondo}ee`, backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.borde}`, padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 460, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => setScreen("hub")} aria-label="Volver al inicio"
                style={{ width: 44, height: 44, borderRadius: 10, background: C.card, border: `1px solid ${C.borde}`, color: C.texto, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ChevronLeft size={19} />
              </button>
              <div>
                <div className="rp-display" style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>Lecturas juntos</div>
                <div style={{ fontSize: 11, color: C.sec }}>{lecturasCompartidas.length} compartidas</div>
              </div>
            </div>
            <button onClick={() => setShowLecturasHistorial(true)} aria-label="Ver historial de lecturas"
              style={{ width: 44, height: 44, borderRadius: 10, background: C.card, border: `1px solid ${C.borde}`, color: C.texto, cursor: "pointer", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Eye size={17} />
              {lecturasPendientes.length > 0 && (
                <span style={{ position: "absolute", top: 2, right: 2, background: C.rojoBtn, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 8, padding: "1px 5px" }}>!</span>
              )}
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 460, margin: "0 auto", padding: "16px" }}>
          <button onClick={() => setShowAddLectura(true)} className="rp-display"
            style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", cursor: "pointer", fontSize: 16, fontWeight: 700, color: "#fff", background: `linear-gradient(135deg, ${C.rojoBtn}, ${C.azulBtn})`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
            <BookOpen size={18} /> Agregar lectura
          </button>

          {lecturasPendientes.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Clock size={15} color={C.dorado} />
                <span className="rp-display" style={{ fontSize: 13, fontWeight: 700, color: C.dorado, letterSpacing: 0.5 }}>POR COMPARTIR ({lecturasPendientes.length})</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {lecturasPendientes.map((l) => {
                  const imp = l.draft?.impresiones || {};
                  const rOk = imp.ricardo?.trim(), cOk = imp.catalina?.trim();
                  return (
                    <div key={l.id} style={{ background: `${C.dorado}12`, border: `1px solid ${C.dorado}44`, borderRadius: 14, padding: "12px 14px" }}>
                      <div className="rp-display" style={{ fontWeight: 700, fontSize: 15, color: C.texto, marginBottom: 2 }}>{l.titulo}</div>
                      {(l.autor || l.contexto) && (
                        <div style={{ color: C.sec, fontSize: 11.5, marginBottom: 8 }}>
                          {l.autor}{l.autor && l.contexto ? " · " : ""}{l.contexto}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                        {["ricardo", "catalina"].map((uk) => {
                          const ok = uk === "ricardo" ? rOk : cOk;
                          return (
                            <span key={uk} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: ok ? C.verde : C.sec }}>
                              {ok ? <Check size={13} color={C.verde} /> : <Clock size={13} color={C.sec} />} {USERS[uk].name}
                            </span>
                          );
                        })}
                      </div>
                      <button onClick={() => setCompartiendo(l)} className="rp-display"
                        style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.verdeBtn}, ${C.azulBtn})`, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                        Compartir mi impresión
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {lecturasArr.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: C.sec }}>
              <BookOpen size={32} color={C.borde} style={{ marginBottom: 10 }} />
              <p style={{ margin: 0, fontSize: 13.5 }}>Aún no agregan nada. El primer discurso o escritura que lean juntos empieza acá.</p>
            </div>
          )}
        </div>

        {showAddLectura && (
          <AddLecturaForm onCancel={() => setShowAddLectura(false)} onSave={agregarLectura} />
        )}
        {compartiendo && (
          <CompartirLecturaForm lectura={compartiendo} currentUser={currentUser} onCancel={() => setCompartiendo(null)} onSave={(data) => guardarParteLectura(compartiendo, data)} />
        )}
        {showLecturasHistorial && (
          <LecturasHistorialPanel lecturas={lecturasCompartidas} onClose={() => setShowLecturasHistorial(false)} onSelect={setLecturaDetalle} />
        )}
        {lecturaDetalle && (
          <LecturaDetalle item={lecturaDetalle} onClose={() => setLecturaDetalle(null)} />
        )}
      </div>
    );
  }

  return (
    <div className="rp-body" style={{ minHeight: "100vh", background: `radial-gradient(circle at 70% -10%, ${C.azulD}22, ${C.fondo} 50%)`, color: C.texto, paddingBottom: 40 }}>
      <FontStyles />

      {/* #2 Toast: aviso cuando el estado de ánimo del otro cambia en tiempo real */}
      {toast && (
        <div className="rp-slideup" role="status" aria-live="polite" style={{
          position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 60,
          background: C.cardHi, border: `1px solid ${C.dorado}66`, borderRadius: 14,
          padding: "10px 16px", fontSize: 13, color: C.texto, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          maxWidth: "90vw", textAlign: "center",
        }}>
          {toast}
        </div>
      )}

        <div style={{ position: "sticky", top: 0, zIndex: 10, background: `${C.fondo}ee`, backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.borde}`, padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 460, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => setScreen("hub")} aria-label="Volver al inicio"
                style={{ width: 44, height: 44, borderRadius: 10, background: C.card, border: `1px solid ${C.borde}`, color: C.texto, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ChevronLeft size={19} />
              </button>
              <div>
                <div className="rp-display" style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>Ruleta de pelis</div>
                <div style={{ fontSize: 11, color: C.sec }}>{available.length} pelis en la ruleta</div>
              </div>
            </div>
            <button onClick={() => setShowHistory(true)} title="Historial" aria-label="Ver historial de películas"
              style={{ width: 44, height: 44, borderRadius: 10, background: C.card, border: `1px solid ${C.borde}`, color: C.texto, cursor: "pointer", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Eye size={17} />
              {pendientes.length > 0 ? (
                <span style={{ position: "absolute", top: 2, right: 2, background: C.rojoBtn, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 8, padding: "1px 5px" }}>!</span>
              ) : sala.history.length > 0 && (
                <span style={{ position: "absolute", top: 2, right: 2, background: C.verde, color: "#052e16", fontSize: 10, fontWeight: 700, borderRadius: 8, padding: "1px 5px" }}>{sala.history.length}</span>
              )}
            </button>
          </div>
        </div>

      <div style={{ maxWidth: 460, margin: "0 auto", padding: "16px" }}>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {["ricardo", "catalina"].map((uk) => {
            const u = USERS[uk], est = sala.estados[uk], mine = uk === currentUser;
            return (
              <button key={uk}
                onClick={() => mine && setShowEstadoPicker(true)}
                style={{ flex: 1, textAlign: "left", background: C.card, border: `1px solid ${mine ? u.color : C.borde}`, borderRadius: 16, padding: "12px 14px", cursor: mine ? "pointer" : "default", position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: u.color }} />
                  <span style={{ fontSize: 12, color: C.sec, fontWeight: 500 }}>{u.name}{mine && " (tú)"}</span>
                </div>
                <div key={`${est.label}-${est.emoji}`} className="rp-pop" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 22 }}>{est.emoji}</span>
                  <span className="rp-display" style={{ fontSize: 14, fontWeight: 600 }}>{est.label}</span>
                </div>
                {mine && <ChevronDown size={14} color={C.sec} style={{ position: "absolute", top: 12, right: 12 }} />}
              </button>
            );
          })}
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.borde}`, borderRadius: 24, padding: "28px 16px 22px", marginBottom: 16 }}>
          <Wheel movies={available} rotation={rotation} spinning={spinning} />

          <Legend movies={available} />

          <div style={{ marginTop: 24 }}>
            {!sala.spinReq && !winner && pendientes.length > 0 && (
              <button onClick={() => setShowHistory(true)} className="rp-slideup rp-display"
                style={{ width: "100%", padding: "14px", borderRadius: 16, border: `1px solid ${C.dorado}66`, cursor: "pointer", fontSize: 14, fontWeight: 600, color: C.dorado, background: `${C.dorado}14`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Clock size={17} /> Registra "{pendientes[0].title}" para girar
              </button>
            )}

            {!sala.spinReq && !winner && pendientes.length === 0 && (
              <button onClick={pedirGiro} disabled={available.length === 0 || saving} className="rp-display"
                style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", cursor: (available.length && !saving) ? "pointer" : "not-allowed", fontSize: 17, fontWeight: 700, color: "#fff", background: available.length ? `linear-gradient(135deg, ${C.rojoBtn}, ${C.azulBtn})` : C.cardHi, opacity: (available.length && !saving) ? 1 : 0.55, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <RotateCw size={19} className={saving ? "rp-pulse" : ""} /> {saving ? "Enviando…" : "Pedir girar"}
              </button>
            )}

            {sala.spinReq?.status === "pending" && sala.spinReq.by === currentUser && (
              <div className="rp-slideup" style={{ textAlign: "center", padding: "14px", background: C.cardHi, borderRadius: 16, border: `1px solid ${C.borde}` }}>
                <div className="rp-pulse" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: C.dorado, fontWeight: 600, fontSize: 14 }}>
                  <Clock size={16} /> Esperando a {USERS[other].name}…
                </div>
              </div>
            )}

            {sala.spinReq?.status === "pending" && sala.spinReq.by !== currentUser && (
              <div style={{ textAlign: "center", padding: "12px", background: `${C.rojo}18`, borderRadius: 16, border: `1px solid ${C.rojo}55`, color: C.texto, fontSize: 13 }}>
                <Sparkles size={16} color={C.rojo} style={{ verticalAlign: "middle" }} /> {USERS[sala.spinReq.by].name} quiere girar — mira la alerta 👇
              </div>
            )}
          </div>
        </div>

        <PushBanner
          estado={pushEstado}
          ocupado={pushOcupado}
          onActivar={activarPush}
          nombreOtro={USERS[other].name}
          errorMsg={pushErrorMsg}
        />
      </div>

      {showEstadoPicker && (
        <Modal onClose={() => setShowEstadoPicker(false)} title="¿Cómo te sientes?">
          <div className="rp-scroll" style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: 4 }}>
            {/* Opción dinámica destacada: usa el nombre real de la pareja, no una lista fija */}
            {(() => {
              const opcionPareja = estadoPensandoEnPareja(USERS[other].name);
              const sel = sala.estados[currentUser].label === opcionPareja.label;
              return (
                <button
                  onClick={() => {
                    guardar({ estados: { ...sala.estados, [currentUser]: opcionPareja } });
                    setShowEstadoPicker(false);
                  }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px", borderRadius: 14, cursor: "pointer", marginBottom: 12, background: sel ? `${me.color}22` : `linear-gradient(135deg, ${C.rojo}14, ${C.azul}14)`, border: `1.5px solid ${sel ? me.color : C.dorado}66`, color: C.texto, fontSize: 14, textAlign: "left" }}>
                  <span style={{ fontSize: 22 }}>{opcionPareja.emoji}</span>
                  <span className="rp-display" style={{ fontWeight: 700 }}>{opcionPareja.label}</span>
                </button>
              );
            })()}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {ESTADOS.map((e) => {
                const sel = sala.estados[currentUser].label === e.label;
                return (
                  <button key={e.label}
                    onClick={() => {
                      guardar({ estados: { ...sala.estados, [currentUser]: e } });
                      setShowEstadoPicker(false);
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px", borderRadius: 12, cursor: "pointer", background: sel ? `${me.color}22` : C.cardHi, border: `1.5px solid ${sel ? me.color : C.borde}`, color: C.texto, fontSize: 13, textAlign: "left" }}>
                    <span style={{ fontSize: 20 }}>{e.emoji}</span> {e.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      {sala.spinReq?.status === "pending" && sala.spinReq.by !== currentUser && (
        <div style={overlay}>
          <div className="rp-pop" style={{ ...sheet, textAlign: "center", borderTop: `4px solid ${C.rojo}` }}>
            <div style={{ fontSize: 44, marginBottom: 6 }}>🎡</div>
            <h2 className="rp-display" style={{ margin: "0 0 6px", fontSize: 21, fontWeight: 800 }}>¡{USERS[sala.spinReq.by].name} quiere girar!</h2>
            <p style={{ color: C.sec, fontSize: 14, margin: "0 0 22px" }}>¿Aceptas girar la ruleta juntos?</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => guardar({ spinReq: null })} disabled={saving} className="rp-display"
                style={{ flex: 1, padding: "14px", borderRadius: 14, border: `1px solid ${C.borde}`, background: "transparent", color: C.sec, fontWeight: 600, fontSize: 15, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <X size={17} /> Ahora no
              </button>
              <button onClick={() => guardar({ spinReq: { ...sala.spinReq, status: "approved" } })} disabled={saving} className="rp-display"
                style={{ flex: 1.4, padding: "14px", borderRadius: 14, border: "none", background: `linear-gradient(135deg, ${C.verdeBtn}, ${C.azulBtn})`, color: "#fff", fontWeight: 700, fontSize: 15, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Check size={18} /> {saving ? "Confirmando…" : "¡Aceptar!"}
              </button>
            </div>
          </div>
        </div>
      )}

      {winner && !registrando && (
        <div style={overlay}>
          <div className="rp-pop" style={{ ...sheet, textAlign: "center", position: "relative", overflow: "hidden" }}>
            <Confetti />
            <p style={{ color: C.dorado, fontWeight: 600, fontSize: 13, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 10px" }}>✨ La ruleta eligió ✨</p>
            {(() => {
              const shownIdx = winner._num ?? 0;
              const col = SLICE_COLORS[shownIdx % 3];
              return <div className="rp-display" style={{ width: 44, height: 44, borderRadius: 12, background: col, color: "#fff", fontSize: 20, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>{shownIdx + 1}</div>;
            })()}
            {/* #5 Texto blanco sólido (legible en cualquier título) + acento de color del gajo debajo, en vez de gradiente sobre el propio texto */}
            <h2 className="rp-display" style={{ margin: "4px 0 6px", fontSize: 27, fontWeight: 800, color: C.texto }}>{winner.title}</h2>
            <div style={{ width: 44, height: 3, borderRadius: 2, background: SLICE_COLORS[(winner._num ?? 0) % 3], margin: "0 auto 10px" }} />
            <p style={{ color: C.sec, fontSize: 13, margin: "0 0 20px" }}>{winner.genre} · {winner.year}</p>

            {showSynopsis && (
              <div className="rp-slideup" style={{ background: C.cardHi, borderRadius: 14, padding: "14px", marginBottom: 16, fontSize: 13.5, lineHeight: 1.6, color: C.texto, textAlign: "left" }}>
                {winner.synopsis}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => setShowSynopsis((s) => !s)} className="rp-display"
                style={{ padding: "13px", borderRadius: 14, border: `1px solid ${C.azul}`, background: `${C.azul}18`, color: C.texto, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Film size={16} /> {showSynopsis ? "Ocultar sinopsis" : "Ver sinopsis"}
              </button>
              <button onClick={verDespues} className="rp-display"
                style={{ padding: "14px", borderRadius: 14, border: "none", background: `linear-gradient(135deg, ${C.verdeBtn}, ${C.azulBtn})`, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Popcorn size={17} /> ¡A verla! (registrar luego)
              </button>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: C.sec }}>La registras después desde la lista 👀 · antes del próximo giro</p>
            </div>
          </div>
        </div>
      )}

      {registrando && (
        <ViewingForm movie={registrando} currentUser={currentUser} onCancel={() => setRegistrando(null)} onSave={(data) => guardarParte(registrando, data)} />
      )}

      {showHistory && (
        <HistoryPanel history={sala.history} pendientes={pendientes} onClose={() => setShowHistory(false)} onSelect={setDetalleHist} onRegistrar={(m) => { setShowHistory(false); setRegistrando(m); }} />
      )}
      {detalleHist && (
        <HistoryDetail item={detalleHist} onClose={() => setDetalleHist(null)} />
      )}
    </div>
  );
}

/* ============================================================
   COMPONENTES AUXILIARES
   ============================================================ */
const overlay = { position: "fixed", inset: 0, background: "rgba(3,7,18,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, padding: 12 };
const sheet = { background: C.card, border: `1px solid ${C.borde}`, borderRadius: 24, padding: "26px 22px", width: "100%", maxWidth: 420, marginBottom: 8 };

/* ============================================================
   PushBanner — invitación a activar las notificaciones
   ------------------------------------------------------------
   Diseño: se apoya en el lenguaje visual que ya tiene la app —
   el dorado está reservado para los momentos "de evento" (el
   puntero de la ruleta, "la ruleta eligió"), así que aquí lo
   usamos para que esto se lea como una invitación cálida y no
   como una alerta del sistema. La campana late suavemente para
   atraer la mirada sin gritar.
   ============================================================ */
function PushBanner({ estado, ocupado, onActivar, nombreOtro, errorMsg }) {
  if (estado === "no-soportado" || estado === "desconocido") return null;

  if (estado === "activo") {
    return (
      <div style={{ background: `${C.verde}10`, border: `1px solid ${C.verde}33`, borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.sec }}>
        <Wifi size={15} color={C.verde} />
        <span>Notificaciones activas · sincronizado en tiempo real</span>
      </div>
    );
  }

  if (estado === "error") {
    return (
      <div style={{ background: `${C.rojo}10`, border: `1px solid ${C.rojo}44`, borderRadius: 14, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
          <BellOff size={16} color={C.rojo} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div className="rp-display" style={{ fontSize: 13, fontWeight: 600, color: C.texto, marginBottom: 2 }}>
              No se pudo activar
            </div>
            <p style={{ margin: 0, fontSize: 11.5, color: C.sec, lineHeight: 1.5 }}>
              El permiso quedó dado, pero algo falló al registrar este dispositivo.
              {errorMsg && <><br /><code style={{ color: C.rojo, fontSize: 10.5 }}>{errorMsg}</code></>}
            </p>
          </div>
        </div>
        <button onClick={onActivar} disabled={ocupado} className="rp-display"
          style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${C.rojo}66`, background: "transparent", color: C.texto, fontWeight: 600, fontSize: 13, cursor: ocupado ? "wait" : "pointer" }}>
          {ocupado ? "Reintentando…" : "Reintentar"}
        </button>
      </div>
    );
  }

  if (estado === "bloqueado") {
    return (
      <div style={{ background: `${C.cardHi}`, border: `1px solid ${C.borde}`, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
        <BellOff size={16} color={C.sec} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div className="rp-display" style={{ fontSize: 13, fontWeight: 600, color: C.texto, marginBottom: 2 }}>
            Notificaciones bloqueadas
          </div>
          <p style={{ margin: 0, fontSize: 11.5, color: C.sec, lineHeight: 1.5 }}>
            Las bloqueaste antes, así que el navegador ya no me deja preguntarte.
            Para reactivarlas: toca el candado 🔒 en la barra de direcciones → Notificaciones → Permitir.
          </p>
        </div>
      </div>
    );
  }

  // estado === "pendiente" → la invitación
  return (
    <div style={{
      position: "relative", overflow: "hidden",
      background: `linear-gradient(135deg, ${C.dorado}14, ${C.rojo}0D 60%, ${C.azul}14)`,
      border: `1px solid ${C.dorado}55`, borderRadius: 18, padding: "16px 16px 14px",
    }}>
      {/* Halo decorativo detrás de la campana, para dar profundidad */}
      <div aria-hidden="true" style={{
        position: "absolute", top: -30, left: -20, width: 120, height: 120, borderRadius: "50%",
        background: `radial-gradient(circle, ${C.dorado}22, transparent 70%)`, pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, position: "relative" }}>
        <div className="rp-pulse" style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: `${C.dorado}1F`, border: `1px solid ${C.dorado}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <BellRing size={17} color={C.dorado} />
        </div>
        <div>
          <div className="rp-display" style={{ fontSize: 15, fontWeight: 700, color: C.texto, lineHeight: 1.2 }}>
            No te pierdas ningún giro
          </div>
          <div style={{ fontSize: 11.5, color: C.sec, marginTop: 2 }}>
            Te aviso cuando {nombreOtro} quiera girar, aunque tengas la app cerrada
          </div>
        </div>
      </div>

      <button onClick={onActivar} disabled={ocupado} className="rp-display"
        style={{
          width: "100%", padding: "12px", borderRadius: 12, border: "none",
          background: `linear-gradient(135deg, ${C.verdeBtn}, ${C.azulBtn})`,
          color: "#fff", fontWeight: 700, fontSize: 14,
          cursor: ocupado ? "wait" : "pointer", opacity: ocupado ? 0.7 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          position: "relative",
        }}>
        <BellRing size={16} className={ocupado ? "rp-pulse" : ""} />
        {ocupado ? "Activando…" : "Activar notificaciones"}
      </button>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div style={overlay} onClick={onClose}>
      <div className="rp-slideup rp-body" style={sheet} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 className="rp-display" style={{ margin: 0, fontSize: 19, fontWeight: 700, color: C.texto }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.sec, cursor: "pointer" }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ViewingForm({ movie, currentUser, onCancel, onSave }) {
  const draft = movie.draft || {};
  const [fecha, setFecha] = useState(draft.fecha || new Date().toISOString().slice(0, 10));
  const [lugar, setLugar] = useState(draft.lugar || LUGARES[0]);
  const [comida, setComida] = useState(draft.comida || "");
  const [rating, setRating] = useState(draft.rating || 0);
  const [miNota, setMiNota] = useState(draft.notas?.[currentUser] || "");
  const [shake, setShake] = useState(false); // #6 feedback si intentan guardar vacío

  const other = currentUser === "ricardo" ? "catalina" : "ricardo";
  const otherUser = USERS[other];
  const otherNota = draft.notas?.[other] || "";
  const otherListo = otherNota.trim().length > 0;
  const puedoGuardar = miNota.trim().length > 0;

  const intentarGuardar = () => {
    if (puedoGuardar) {
      onSave({ fecha, lugar, comida, rating, notas: miNota });
    } else {
      setShake(true);
      vibrate(30);
      setTimeout(() => setShake(false), 420);
    }
  };

  return (
    <div style={overlay}>
      <div className="rp-slideup rp-body rp-scroll" style={{ ...sheet, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: C.dorado, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Registrar noche de cine</span>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: C.sec, cursor: "pointer" }}><X size={20} /></button>
        </div>
        <h2 className="rp-display" style={{ margin: "0 0 18px", fontSize: 22, fontWeight: 800, color: C.texto }}>{movie.title}</h2>

        {otherListo && (
          <div style={{ background: `${C.verde}14`, border: `1px solid ${C.verde}44`, borderRadius: 12, padding: "10px 12px", marginBottom: 16, fontSize: 12.5, color: C.texto, display: "flex", alignItems: "center", gap: 8 }}>
            <Check size={15} color={C.verde} /> {otherUser.name} ya completó su parte. ¡Falta la tuya!
          </div>
        )}

        <Field icon={<Calendar size={15} />} label="Fecha">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={inputS} className="rp-body" />
        </Field>

        <Field icon={<MapPin size={15} />} label="¿Dónde la vieron?">
          <select value={lugar} onChange={(e) => setLugar(e.target.value)} style={inputS} className="rp-body">
            {LUGARES.map((l) => <option key={l}>{l}</option>)}
          </select>
        </Field>

        <Field icon={<Popcorn size={15} />} label="¿Qué comieron?">
          <input value={comida} onChange={(e) => setComida(e.target.value)} placeholder="Palomitas, chocolate…" style={inputS} className="rp-body" />
        </Field>

        <Field icon={<Star size={15} />} label="Calificación">
          <div style={{ display: "flex", gap: 2 }} role="radiogroup" aria-label="Calificación de 1 a 5 estrellas">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)}
                role="radio" aria-checked={rating === n} aria-label={`Calificar con ${n} de 5 estrellas`}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 8, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Star size={26} color={C.dorado} fill={n <= rating ? C.dorado : "none"} />
              </button>
            ))}
          </div>
        </Field>

        <div style={{ marginTop: 6, marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.sec, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <Heart size={15} /> ¿Qué aprendieron / qué les gustó?
          </div>

          {/* Mi nota (editable, obligatoria) */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: USERS[currentUser].color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }} className="rp-display">{USERS[currentUser].initial}</div>
              <span className="rp-display" style={{ fontSize: 13, fontWeight: 600, color: USERS[currentUser].color }}>{USERS[currentUser].name} dice: <span style={{ color: C.rojo }}>*</span></span>
            </div>
            <textarea
              value={miNota} onChange={(e) => setMiNota(e.target.value)}
              placeholder="Escribe lo que aprendiste o te gustó… (obligatorio)"
              rows={2}
              className={`rp-body${shake ? " rp-shake" : ""}`}
              style={{ ...inputS, resize: "vertical", borderColor: shake ? C.rojo : USERS[currentUser].color + "66" }} />
          </div>

          {/* Nota del otro (solo lectura) */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: otherUser.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }} className="rp-display">{otherUser.initial}</div>
              <span className="rp-display" style={{ fontSize: 13, fontWeight: 600, color: otherUser.color }}>{otherUser.name} dice:</span>
            </div>
            <div style={{ ...inputS, minHeight: 44, opacity: 0.7, fontStyle: otherListo ? "normal" : "italic", color: otherListo ? C.texto : C.sec }}>
              {otherListo ? otherNota : `Aún no ha registrado su parte…`}
            </div>
          </div>
        </div>

        {/* Botón siempre "clickeable" (mejor accesibilidad: foco/lector de pantalla),
            pero valida y da feedback (shake + vibración) si aún no hay nota propia */}
        <button onClick={intentarGuardar} aria-disabled={!puedoGuardar} className="rp-display"
          style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", background: puedoGuardar ? `linear-gradient(135deg, ${C.verdeBtn}, ${C.azulBtn})` : C.cardHi, color: puedoGuardar ? "#fff" : C.sec, fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 6, opacity: puedoGuardar ? 1 : 0.75 }}>
          {otherListo ? "Guardar mi parte y completar registro" : "Guardar mi parte"}
        </button>
        {!puedoGuardar && <p style={{ margin: "8px 0 0", fontSize: 11.5, color: C.sec, textAlign: "center" }}>Escribe algo en tu campo para poder guardar</p>}
      </div>
    </div>
  );
}

function Field({ icon, label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.sec, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{icon} {label}</div>
      {children}
    </div>
  );
}

const inputS = { width: "100%", padding: "12px 14px", borderRadius: 12, background: C.cardHi, color: C.texto, border: `1px solid ${C.borde}`, outline: "none", fontSize: 16 }; // 16px: evita el auto-zoom de iOS al enfocar

/* ============================================================
   HistorialList — buscar / ordenar / agrupar por año / cargar de a 10
   ------------------------------------------------------------
   Reutilizable entre "Ya vistas" (películas) y "Ya compartidas" (lecturas).
   Todo el filtrado/orden corre client-side sobre datos ya sincronizados
   por Firestore — no dispara ninguna consulta nueva a la base de datos.
   ============================================================ */
function HistorialList({ items, getTitulo, searchFields, renderItem, placeholder, emptyText }) {
  const [query, setQuery] = useState("");
  const [criterio, setCriterio] = useState("reciente");
  const [visibles, setVisibles] = useState(PAGINA);

  if (items.length === 0) {
    return <p style={{ color: C.sec, textAlign: "center", padding: "20px 0", fontSize: 13 }}>{emptyText}</p>;
  }

  const filtrados = buscarEnHistorial(items, query, searchFields);
  const ordenados = ordenarHistorial(filtrados, criterio, getTitulo);
  const visiblesLista = ordenados.slice(0, visibles);
  const grupos = agruparPorAnio(visiblesLista);
  const quedanMas = ordenados.length > visibles;

  return (
    <div>
      {/* Buscar */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setVisibles(PAGINA); }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="rp-body"
          style={{ ...inputS, paddingLeft: 36, fontSize: 14 }}
        />
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.sec, fontSize: 14 }} aria-hidden="true">🔍</span>
      </div>

      {/* Ordenar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto" }} role="group" aria-label="Ordenar por">
        {[
          { v: "reciente", l: "Más reciente" },
          { v: "calificacion", l: "Mejor calificada" },
          { v: "az", l: "A-Z" },
        ].map((op) => (
          <button key={op.v} onClick={() => setCriterio(op.v)} className="rp-display"
            style={{ flexShrink: 0, minHeight: 44, padding: "0 14px", display: "flex", alignItems: "center", borderRadius: 10, fontSize: 11.5, fontWeight: 600, cursor: "pointer", border: `1px solid ${criterio === op.v ? C.azul : C.borde}`, background: criterio === op.v ? `${C.azul}1F` : "transparent", color: criterio === op.v ? C.texto : C.sec }}>
            {op.l}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <p style={{ color: C.sec, textAlign: "center", padding: "16px 0", fontSize: 13 }}>Nada coincide con "{query}"</p>
      ) : (
        <>
          {grupos.map(([anio, itemsDelAnio]) => (
            <div key={anio} style={{ marginBottom: 14 }}>
              <div className="rp-display" style={{ fontSize: 11.5, fontWeight: 700, color: C.sec, letterSpacing: 0.5, marginBottom: 8 }}>{anio}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {itemsDelAnio.map((it) => renderItem(it))}
              </div>
            </div>
          ))}

          {quedanMas && (
            <button onClick={() => setVisibles((v) => v + PAGINA)} className="rp-display"
              style={{ width: "100%", minHeight: 44, borderRadius: 12, border: `1px dashed ${C.borde}`, background: "transparent", color: C.sec, fontWeight: 600, fontSize: 12.5, cursor: "pointer", marginTop: 4 }}>
              Ver {Math.min(PAGINA, ordenados.length - visibles)} más
            </button>
          )}
        </>
      )}
    </div>
  );
}

function HistoryPanel({ history, pendientes, onClose, onSelect, onRegistrar }) {
  return (
    <div style={overlay} onClick={onClose}>
      <div className="rp-slideup rp-body rp-scroll" style={{ ...sheet, maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 className="rp-display" style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.texto }}>🎬 Tus películas</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.sec, cursor: "pointer" }}><X size={20} /></button>
        </div>

        {pendientes.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Clock size={15} color={C.dorado} />
              <span className="rp-display" style={{ fontSize: 13, fontWeight: 700, color: C.dorado, letterSpacing: 0.5 }}>POR REGISTRAR ({pendientes.length})</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pendientes.map((m) => {
                const notas = m.draft?.notas || {};
                const rOk = notas.ricardo?.trim();
                const cOk = notas.catalina?.trim();
                return (
                <div key={m.id} style={{ background: `${C.dorado}12`, border: `1px solid ${C.dorado}44`, borderRadius: 14, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span className="rp-display" style={{ fontWeight: 700, fontSize: 15, color: C.texto }}>{m.title}</span>
                    <span style={{ fontSize: 11, color: C.sec }}>{m.genre} · {m.year}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    {["ricardo", "catalina"].map((uk) => {
                      const ok = uk === "ricardo" ? rOk : cOk;
                      const u = USERS[uk];
                      return (
                        <span key={uk} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: ok ? C.verde : C.sec }}>
                          {ok ? <Check size={13} color={C.verde} /> : <Clock size={13} color={C.sec} />} {u.name}
                        </span>
                      );
                    })}
                  </div>
                  <button onClick={() => onRegistrar(m)} className="rp-display"
                    style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.verdeBtn}, ${C.azulBtn})`, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Popcorn size={15} /> Registrar noche de cine
                  </button>
                </div>
              );})}
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Check size={15} color={C.verde} />
          <span className="rp-display" style={{ fontSize: 13, fontWeight: 700, color: C.verde, letterSpacing: 0.5 }}>YA VISTAS ({history.length})</span>
        </div>
        <HistorialList
          items={history}
          getTitulo={(h) => h.movie?.title || ""}
          searchFields={[(h) => h.movie?.title, (h) => h.lugar, (h) => h.comida]}
          placeholder="Buscar por título, lugar o comida…"
          emptyText="Aún ninguna registrada 🍿"
          renderItem={(h) => (
            <button key={h.id} onClick={() => onSelect(h)}
              style={{ textAlign: "left", background: C.cardHi, border: `1px solid ${C.borde}`, borderRadius: 14, padding: "12px 14px", cursor: "pointer", color: C.texto }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span className="rp-display" style={{ fontWeight: 700, fontSize: 15 }}>{h.movie.title}</span>
                <div style={{ display: "flex", gap: 1 }}>
                  {[1,2,3,4,5].map(n => <Star key={n} size={12} color={C.dorado} fill={n <= h.rating ? C.dorado : "none"} />)}
                </div>
              </div>
              <div style={{ fontSize: 12, color: C.sec, marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span>📅 {h.fecha}</span><span>📍 {h.lugar}</span>{h.comida && <span>🍿 {h.comida}</span>}
              </div>
            </button>
          )}
        />
      </div>
    </div>
  );
}

function HistoryDetail({ item, onClose }) {
  return (
    <Modal title={item.movie.title} onClose={onClose}>
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap", fontSize: 13, color: C.sec }}>
        <span>📅 {item.fecha}</span><span>📍 {item.lugar}</span>{item.comida && <span>🍿 {item.comida}</span>}
        <span>{[1,2,3,4,5].map(n => <Star key={n} size={12} color={C.dorado} fill={n <= item.rating ? C.dorado : "none"} style={{ verticalAlign: "middle" }} />)}</span>
      </div>
      <div style={{ background: C.cardHi, borderRadius: 12, padding: "12px 14px", fontSize: 13, lineHeight: 1.5, color: C.texto, marginBottom: 16 }}>{item.movie.synopsis}</div>
      {["ricardo", "catalina"].map((uk) => {
        const u = USERS[uk], txt = item.notas?.[uk];
        return (
          <div key={uk} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: u.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }} className="rp-display">{u.initial}</div>
              <span className="rp-display" style={{ fontSize: 13, fontWeight: 600, color: u.color }}>{u.name} dijo:</span>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: txt ? C.texto : C.sec, fontStyle: txt ? "normal" : "italic", paddingLeft: 26 }}>{txt || "— sin comentarios —"}</p>
          </div>
        );
      })}
    </Modal>
  );
}

/* ============================================================
   AddLecturaForm — agregar una lectura nueva
   ------------------------------------------------------------
   El botón "Autocompletar" llama a la Cloud Function que lee
   título/autor/contexto del link. Es opcional y explícito (no se
   dispara solo al pegar el link) para no sorprender con llamadas
   de red en segundo plano — el usuario decide cuándo usarla.
   ============================================================ */
function AddLecturaForm({ onCancel, onSave }) {
  const [titulo, setTitulo] = useState("");
  const [autor, setAutor] = useState("");
  const [enlace, setEnlace] = useState("");
  const [contexto, setContexto] = useState("");
  const [autocompletando, setAutocompletando] = useState(false);
  const [shake, setShake] = useState(false);

  const puedeGuardar = titulo.trim().length > 0;

  const autocompletar = async () => {
    if (!enlace.trim()) return;
    setAutocompletando(true);
    try {
      const meta = await obtenerMetadatosEnlace(enlace.trim());
      if (meta.titulo) setTitulo(meta.titulo);
      if (meta.autor) setAutor(meta.autor);
      if (meta.contexto) setContexto(meta.contexto);
    } finally {
      setAutocompletando(false);
    }
  };

  const intentarGuardar = () => {
    if (puedeGuardar) {
      onSave({ titulo: titulo.trim(), autor: autor.trim(), enlace: enlace.trim(), contexto: contexto.trim() });
    } else {
      setShake(true);
      vibrate(30);
      setTimeout(() => setShake(false), 420);
    }
  };

  return (
    <div style={overlay}>
      <div className="rp-slideup rp-body rp-scroll" style={{ ...sheet, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: C.dorado, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Nueva lectura</span>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: C.sec, cursor: "pointer" }}><X size={20} /></button>
        </div>
        <h2 className="rp-display" style={{ margin: "0 0 18px", fontSize: 22, fontWeight: 800, color: C.texto }}>¿Qué van a leer?</h2>

        <Field icon={<Link2 size={15} />} label="Link (opcional)">
          <div style={{ display: "flex", gap: 8 }}>
            <input value={enlace} onChange={(e) => setEnlace(e.target.value)} placeholder="https://..." style={{ ...inputS, flex: 1 }} className="rp-body" type="url" inputMode="url" />
            <button onClick={autocompletar} disabled={!enlace.trim() || autocompletando} className="rp-display"
              style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: `1px solid ${C.azul}`, background: `${C.azul}18`, color: C.texto, fontWeight: 600, fontSize: 12.5, cursor: enlace.trim() ? "pointer" : "not-allowed", opacity: enlace.trim() ? 1 : 0.5, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
              <Wand2 size={14} className={autocompletando ? "rp-pulse" : ""} /> {autocompletando ? "Buscando…" : "Autocompletar"}
            </button>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 11, color: C.sec }}>Funciona con YouTube, churchofjesuschrist.org, speeches.byu.edu y la mayoría de sitios — a veces no encuentra todo, se completa a mano.</p>
        </Field>

        <Field icon={<BookOpen size={15} />} label="Título">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Elige la fe en Dios que prevalece"
            className={`rp-body${shake ? " rp-shake" : ""}`}
            style={{ ...inputS, borderColor: shake ? C.rojo : C.borde }} />
        </Field>

        <Field icon={<User size={15} />} label="Autor (opcional)">
          <input value={autor} onChange={(e) => setAutor(e.target.value)} placeholder="Jeffrey R. Holland" style={inputS} className="rp-body" />
        </Field>

        <Field icon={<MapPin size={15} />} label="¿Dónde se dijo? (opcional)">
          <input value={contexto} onChange={(e) => setContexto(e.target.value)} placeholder="Conferencia General, octubre 2025" style={inputS} className="rp-body" />
          {!contexto && <p style={{ margin: "6px 0 0", fontSize: 11, color: C.sec, fontStyle: "italic" }}>Si no lo saben todavía, no pasa nada — queda como "Aún no se sabe".</p>}
        </Field>

        <button onClick={intentarGuardar} className="rp-display"
          style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", background: puedeGuardar ? `linear-gradient(135deg, ${C.verdeBtn}, ${C.azulBtn})` : C.cardHi, color: puedeGuardar ? "#fff" : C.sec, fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 6, opacity: puedeGuardar ? 1 : 0.75 }}>
          Agregar a la lista
        </button>
        {!puedeGuardar && <p style={{ margin: "8px 0 0", fontSize: 11.5, color: C.sec, textAlign: "center" }}>Escribe al menos el título</p>}
      </div>
    </div>
  );
}

/* ============================================================
   CompartirLecturaForm — impresión + meta dual (mismo patrón que ViewingForm)
   ============================================================ */
function CompartirLecturaForm({ lectura, currentUser, onCancel, onSave }) {
  const draft = lectura.draft || {};
  const [fecha, setFecha] = useState(draft.fecha || new Date().toISOString().slice(0, 10));
  const [impresion, setImpresion] = useState(draft.impresiones?.[currentUser] || "");
  const [meta, setMeta] = useState(draft.metas?.[currentUser] || "");
  const [shake, setShake] = useState(false);

  const other = currentUser === "ricardo" ? "catalina" : "ricardo";
  const otherUser = USERS[other];
  const otherImpresion = draft.impresiones?.[other] || "";
  const otherListo = otherImpresion.trim().length > 0;
  const puedeGuardar = impresion.trim().length > 0;

  const intentarGuardar = () => {
    if (puedeGuardar) {
      onSave({ fecha, impresion, meta });
    } else {
      setShake(true);
      vibrate(30);
      setTimeout(() => setShake(false), 420);
    }
  };

  return (
    <div style={overlay}>
      <div className="rp-slideup rp-body rp-scroll" style={{ ...sheet, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: C.dorado, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Compartir impresión</span>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: C.sec, cursor: "pointer" }}><X size={20} /></button>
        </div>
        <h2 className="rp-display" style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: C.texto }}>{lectura.titulo}</h2>
        {(lectura.autor || lectura.contexto) && (
          <p style={{ margin: "0 0 18px", fontSize: 12, color: C.sec }}>{lectura.autor}{lectura.autor && lectura.contexto ? " · " : ""}{lectura.contexto}</p>
        )}

        {otherListo && (
          <div style={{ background: `${C.verde}14`, border: `1px solid ${C.verde}44`, borderRadius: 12, padding: "10px 12px", marginBottom: 16, fontSize: 12.5, color: C.texto, display: "flex", alignItems: "center", gap: 8 }}>
            <Check size={15} color={C.verde} /> {otherUser.name} ya compartió su parte. ¡Falta la tuya!
          </div>
        )}

        <Field icon={<Calendar size={15} />} label="Fecha">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={inputS} className="rp-body" />
        </Field>

        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: USERS[currentUser].color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }} className="rp-display">{USERS[currentUser].initial}</div>
            <span className="rp-display" style={{ fontSize: 13, fontWeight: 600, color: USERS[currentUser].color }}>¿Qué sentiste? <span style={{ color: C.rojo }}>*</span></span>
          </div>
          <textarea value={impresion} onChange={(e) => setImpresion(e.target.value)} placeholder="Lo que te hizo sentir o pensar…" rows={2}
            className={`rp-body${shake ? " rp-shake" : ""}`}
            style={{ ...inputS, resize: "vertical", borderColor: shake ? C.rojo : USERS[currentUser].color + "66" }} />
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, color: C.sec, fontSize: 12, fontWeight: 600 }}>
            <Heart size={13} /> ¿Alguna meta o deseo que les dejó? (opcional)
          </div>
          <textarea value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="Algo que quieran aplicar o intentar…" rows={2} style={{ ...inputS, resize: "vertical" }} className="rp-body" />
        </div>

        {otherListo && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: otherUser.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }} className="rp-display">{otherUser.initial}</div>
              <span className="rp-display" style={{ fontSize: 13, fontWeight: 600, color: otherUser.color }}>{otherUser.name} sintió:</span>
            </div>
            <div style={{ ...inputS, minHeight: 44, opacity: 0.7 }}>{otherImpresion}</div>
          </div>
        )}

        <button onClick={intentarGuardar} className="rp-display"
          style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", background: puedeGuardar ? `linear-gradient(135deg, ${C.verdeBtn}, ${C.azulBtn})` : C.cardHi, color: puedeGuardar ? "#fff" : C.sec, fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 6, opacity: puedeGuardar ? 1 : 0.75 }}>
          {otherListo ? "Guardar y completar" : "Guardar mi parte"}
        </button>
        {!puedeGuardar && <p style={{ margin: "8px 0 0", fontSize: 11.5, color: C.sec, textAlign: "center" }}>Escribe algo en "¿Qué sentiste?" para guardar</p>}
      </div>
    </div>
  );
}

/* ============================================================
   LecturasHistorialPanel — usa el mismo HistorialList que películas
   ============================================================ */
function LecturasHistorialPanel({ lecturas, onClose, onSelect }) {
  return (
    <div style={overlay} onClick={onClose}>
      <div className="rp-slideup rp-body rp-scroll" style={{ ...sheet, maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 className="rp-display" style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.texto }}>📖 Ya compartidas</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.sec, cursor: "pointer" }}><X size={20} /></button>
        </div>
        <HistorialList
          items={lecturas}
          getTitulo={(l) => l.titulo || ""}
          searchFields={[(l) => l.titulo, (l) => l.autor, (l) => l.contexto]}
          placeholder="Buscar por título, autor o contexto…"
          emptyText="Aún ninguna compartida"
          renderItem={(l) => (
            <button key={l.id} onClick={() => onSelect(l)}
              style={{ textAlign: "left", background: C.cardHi, border: `1px solid ${C.borde}`, borderRadius: 14, padding: "12px 14px", cursor: "pointer", color: C.texto }}>
              <div className="rp-display" style={{ fontWeight: 700, fontSize: 15 }}>{l.titulo}</div>
              <div style={{ fontSize: 12, color: C.sec, marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                {l.autor && <span>✍️ {l.autor}</span>}
                <span>📅 {l.fecha}</span>
                {l.contexto && <span>📍 {l.contexto}</span>}
              </div>
            </button>
          )}
        />
      </div>
    </div>
  );
}

function LecturaDetalle({ item, onClose }) {
  return (
    <Modal title={item.titulo} onClose={onClose}>
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap", fontSize: 13, color: C.sec }}>
        {item.autor && <span>✍️ {item.autor}</span>}
        <span>📅 {item.fecha}</span>
        {item.contexto && <span>📍 {item.contexto}</span>}
      </div>
      {item.enlace && (
        <a href={item.enlace} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.azul, fontSize: 12.5, marginBottom: 16, textDecoration: "none" }}>
          <Link2 size={13} /> Ver el enlace original
        </a>
      )}
      {["ricardo", "catalina"].map((uk) => {
        const u = USERS[uk], txt = item.impresiones?.[uk], metaTxt = item.metas?.[uk];
        return (
          <div key={uk} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: u.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }} className="rp-display">{u.initial}</div>
              <span className="rp-display" style={{ fontSize: 13, fontWeight: 600, color: u.color }}>{u.name} sintió:</span>
            </div>
            <p style={{ margin: "0 0 6px", fontSize: 13.5, color: txt ? C.texto : C.sec, fontStyle: txt ? "normal" : "italic", paddingLeft: 26 }}>{txt || "— sin comentarios —"}</p>
            {metaTxt && (
              <p style={{ margin: 0, fontSize: 12.5, color: C.sec, paddingLeft: 26, display: "flex", alignItems: "flex-start", gap: 5 }}>
                <Heart size={12} style={{ marginTop: 2, flexShrink: 0 }} /> {metaTxt}
              </p>
            )}
          </div>
        );
      })}
    </Modal>
  );
}
