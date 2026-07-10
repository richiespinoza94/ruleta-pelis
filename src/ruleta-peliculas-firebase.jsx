import React, { useState, useEffect, useRef } from "react";
import {
  Lock, Film, Play, Check, X, MapPin, Popcorn, Sparkles, Clock,
  ChevronDown, RotateCw, Star, ArrowLeft, Users, Calendar, Eye, Heart
} from "lucide-react";
import { db } from "./firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

/* ============================================================
   PALETA (colores de Catalina: verde, rojo, azul)
   ============================================================ */
const C = {
  verde: "#10B981",
  rojo: "#EF4444",
  azul: "#3B82F6",
  verdeD: "#065F46",
  rojoD: "#991B1B",
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
  ricardo: { name: "Ricardo", pin: "9456", color: C.azul, initial: "R" },
  catalina: { name: "Catalina", pin: "1511", color: C.rojo, initial: "C" },
};

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
];

const LUGARES = ["Casa", "Cine", "Casa de un amigo", "En el celular", "Cama", "Otro"];

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

  const spinRef = useRef(false);           // ✅ ahora arriba, siempre se ejecuta
  const SALA_DOC = doc(db, "sala", "casa");

  /* ---- Escuchar cambios en tiempo real ---- */
  useEffect(() => {
    const unsub = onSnapshot(SALA_DOC, async (snap) => {
      if (snap.exists()) {
        setSala(snap.data());
      } else {
        const inicial = {
          movies: PELICULAS_INICIALES,
          history: [],
          estados: { ricardo: ESTADOS[10], catalina: ESTADOS[2] },
          spinReq: null,
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
      setRotation(newRot);
      setTimeout(() => {
        setSpinning(false);
        setWinner(target);
        setDoc(SALA_DOC, { spinReq: null }, { merge: true });
        spinRef.current = false;
      }, 3600);
    }
  }, [sala?.spinReq?.status]); // eslint-disable-line

  /* ---- Helper para guardar cambios ---- */
  const guardar = (cambios) => setDoc(SALA_DOC, cambios, { merge: true });

  /* ================= A PARTIR DE AQUÍ, RETURNS CONDICIONALES ================= */

  if (loading) {
    return (
      <div className="rp-body" style={{ minHeight: "100vh", background: C.fondo, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
      <div className="rp-body" style={{ minHeight: "100vh", background: C.fondo, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <FontStyles />
        <p style={{ color: C.rojo }}>Error al conectar a Firestore. Verifica tu config.</p>
      </div>
    );
  }

  const tryLogin = () => {
    const match = Object.keys(USERS).find((k) => USERS[k].pin === pin);
    if (match) {
      setCurrentUser(match);
      setScreen("main");
      setPin("");
      setPinError(false);
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 600);
      setPin("");
    }
  };

  if (screen === "login") {
    return (
      <div className="rp-body" style={{ minHeight: "100vh", background: `radial-gradient(circle at 30% 20%, ${C.azulD}22, ${C.fondo} 55%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <FontStyles />
        <div className="rp-pop" style={{ background: C.card, border: `1px solid ${C.borde}`, borderRadius: 24, padding: "40px 28px", width: "100%", maxWidth: 380, textAlign: "center" }}>
          <div style={{ display: "inline-flex", gap: 6, marginBottom: 16 }}>
            {[C.verde, C.rojo, C.azul].map((c, i) => (
              <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
            ))}
          </div>
          <div style={{ fontSize: 46, marginBottom: 4 }}>🎬</div>
          <h1 className="rp-display" style={{ color: C.texto, fontSize: 26, fontWeight: 800, margin: "0 0 4px" }}>Ruleta de Pelis</h1>
          <p style={{ color: C.sec, fontSize: 13, margin: "0 0 28px" }}>Ricardo & Catalina · noche de cine</p>

          <div style={{ position: "relative", marginBottom: 8 }}>
            <Lock size={16} color={C.sec} style={{ position: "absolute", left: 16, top: 17 }} />
            <input
              type="password" inputMode="numeric" value={pin} placeholder="Ingresa tu PIN"
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onKeyDown={(e) => e.key === "Enter" && tryLogin()}
              className="rp-body"
              style={{
                width: "100%", padding: "15px 16px 15px 44px", borderRadius: 14, fontSize: 18, letterSpacing: 6,
                background: C.cardHi, color: C.texto, textAlign: "center",
                border: `2px solid ${pinError ? C.rojo : C.borde}`, outline: "none",
                transition: "border 0.2s",
              }}
            />
          </div>
          {pinError && <p style={{ color: C.rojo, fontSize: 12, margin: "0 0 8px" }}>PIN incorrecto</p>}

          <button
            onClick={tryLogin}
            className="rp-display"
            style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", cursor: "pointer", fontSize: 16, fontWeight: 700, color: "#fff", background: `linear-gradient(135deg, ${C.verdeBtn}, ${C.azulBtn})` }}
          >
            Entrar
          </button>

          <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${C.borde}`, display: "flex", gap: 8 }}>
            {Object.entries(USERS).map(([k, u]) => (
              <button key={k} onClick={() => { setPin(u.pin); }}
                style={{ flex: 1, padding: "8px", borderRadius: 10, cursor: "pointer", background: "transparent", border: `1px solid ${C.borde}`, color: C.sec, fontSize: 11 }}>
                <span style={{ color: u.color, fontWeight: 700 }}>{u.name}</span>
                <br />(demo)
              </button>
            ))}
          </div>
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

  const guardarParte = (movie, data) => {
    const draftPrevio = movie.draft || { notas: {} };
    const notasNuevas = { ...draftPrevio.notas, [currentUser]: data.notas };
    const draft = { fecha: data.fecha, lugar: data.lugar, comida: data.comida, rating: data.rating, notas: notasNuevas };
    const completo = notasNuevas.ricardo?.trim() && notasNuevas.catalina?.trim();

    if (completo) {
      guardar({
        movies: sala.movies.map((m) => (m.id === movie.id ? { ...m, state: "vista", draft: null } : m)),
        history: [{ ...draft, movieId: movie.id, movie, id: Date.now() }, ...sala.history],
      });
    } else {
      guardar({
        movies: sala.movies.map((m) => (m.id === movie.id ? { ...m, draft } : m)),
      });
    }
    setRegistrando(null);
  };

  return (
    <div className="rp-body" style={{ minHeight: "100vh", background: `radial-gradient(circle at 70% -10%, ${C.azulD}22, ${C.fondo} 50%)`, color: C.texto, paddingBottom: 40 }}>
      <FontStyles />

      <div style={{ position: "sticky", top: 0, zIndex: 10, background: `${C.fondo}ee`, backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.borde}`, padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 460, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: me.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff" }} className="rp-display">{me.initial}</div>
            <div>
              <div className="rp-display" style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>Hola, {me.name}</div>
              <div style={{ fontSize: 11, color: C.sec }}>{available.length} pelis en la ruleta</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowHistory(true)} title="Historial"
              style={{ width: 38, height: 38, borderRadius: 10, background: C.card, border: `1px solid ${C.borde}`, color: C.texto, cursor: "pointer", position: "relative" }}>
              <Eye size={17} />
              {pendientes.length > 0 ? (
                <span style={{ position: "absolute", top: -6, right: -6, background: C.rojo, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 8, padding: "1px 5px" }}>!</span>
              ) : sala.history.length > 0 && (
                <span style={{ position: "absolute", top: -6, right: -6, background: C.verde, color: "#052e16", fontSize: 10, fontWeight: 700, borderRadius: 8, padding: "1px 5px" }}>{sala.history.length}</span>
              )}
            </button>
            <button onClick={() => { setScreen("login"); setCurrentUser(null); }} title="Salir"
              style={{ width: 38, height: 38, borderRadius: 10, background: C.card, border: `1px solid ${C.borde}`, color: C.sec, cursor: "pointer" }}>
              <X size={17} />
            </button>
          </div>
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
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
              <button onClick={pedirGiro} disabled={available.length === 0} className="rp-display"
                style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", cursor: available.length ? "pointer" : "not-allowed", fontSize: 17, fontWeight: 700, color: "#fff", background: available.length ? `linear-gradient(135deg, ${C.rojoBtn}, ${C.azulBtn})` : C.cardHi, opacity: available.length ? 1 : 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <RotateCw size={19} /> Pedir girar
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

        <div style={{ background: `${C.azul}12`, border: `1px dashed ${C.azul}66`, borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: C.sec }}>
          <Users size={16} color={C.azul} />
          <span style={{ flex: 1 }}>Conectado a Firebase (tiempo real)</span>
          <button onClick={() => setCurrentUser(other)} className="rp-display"
            style={{ padding: "6px 12px", borderRadius: 10, background: USERS[other].color, border: "none", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
            Ver como {USERS[other].name}
          </button>
        </div>
      </div>

      {showEstadoPicker && (
        <Modal onClose={() => setShowEstadoPicker(false)} title="¿Cómo te sientes?">
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
        </Modal>
      )}

      {sala.spinReq?.status === "pending" && sala.spinReq.by !== currentUser && (
        <div style={overlay}>
          <div className="rp-pop" style={{ ...sheet, textAlign: "center", borderTop: `4px solid ${C.rojo}` }}>
            <div style={{ fontSize: 44, marginBottom: 6 }}>🎡</div>
            <h2 className="rp-display" style={{ margin: "0 0 6px", fontSize: 21, fontWeight: 800 }}>¡{USERS[sala.spinReq.by].name} quiere girar!</h2>
            <p style={{ color: C.sec, fontSize: 14, margin: "0 0 22px" }}>¿Aceptas girar la ruleta juntos?</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => guardar({ spinReq: null })} className="rp-display"
                style={{ flex: 1, padding: "14px", borderRadius: 14, border: `1px solid ${C.borde}`, background: "transparent", color: C.sec, fontWeight: 600, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <X size={17} /> Ahora no
              </button>
              <button onClick={() => guardar({ spinReq: { ...sala.spinReq, status: "approved" } })} className="rp-display"
                style={{ flex: 1.4, padding: "14px", borderRadius: 14, border: "none", background: `linear-gradient(135deg, ${C.verdeBtn}, ${C.azulBtn})`, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Check size={18} /> ¡Aceptar!
              </button>
            </div>
          </div>
        </div>
      )}

      {winner && !registrando && (
        <div style={overlay}>
          <div className="rp-pop" style={{ ...sheet, textAlign: "center" }}>
            <p style={{ color: C.dorado, fontWeight: 600, fontSize: 13, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 10px" }}>✨ La ruleta eligió ✨</p>
            {(() => {
              const shownIdx = winner._num ?? 0;
              const col = SLICE_COLORS[shownIdx % 3];
              return <div className="rp-display" style={{ width: 44, height: 44, borderRadius: 12, background: col, color: "#fff", fontSize: 20, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>{shownIdx + 1}</div>;
            })()}
            <h2 className="rp-display" style={{ margin: "4px 0 2px", fontSize: 27, fontWeight: 800, background: `linear-gradient(135deg, ${C.verde}, ${C.rojo}, ${C.azul})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{winner.title}</h2>
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
  const [lugar, setLugar] = useState(draft.lugar || "Casa");
  const [comida, setComida] = useState(draft.comida || "");
  const [rating, setRating] = useState(draft.rating || 0);
  const [miNota, setMiNota] = useState(draft.notas?.[currentUser] || "");

  const other = currentUser === "ricardo" ? "catalina" : "ricardo";
  const otherUser = USERS[other];
  const otherNota = draft.notas?.[other] || "";
  const otherListo = otherNota.trim().length > 0;
  const puedoGuardar = miNota.trim().length > 0;

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
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <Star size={28} color={C.dorado} fill={n <= rating ? C.dorado : "none"} />
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
              style={{ ...inputS, resize: "vertical", borderColor: USERS[currentUser].color + "66" }} className="rp-body" />
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

        <button onClick={() => puedoGuardar && onSave({ fecha, lugar, comida, rating, notas: miNota })} disabled={!puedoGuardar} className="rp-display"
          style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", background: puedoGuardar ? `linear-gradient(135deg, ${C.verdeBtn}, ${C.azulBtn})` : C.cardHi, color: puedoGuardar ? "#fff" : C.sec, fontWeight: 700, fontSize: 15, cursor: puedoGuardar ? "pointer" : "not-allowed", marginTop: 6, opacity: puedoGuardar ? 1 : 0.6 }}>
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

const inputS = { width: "100%", padding: "12px 14px", borderRadius: 12, background: C.cardHi, color: C.texto, border: `1px solid ${C.borde}`, outline: "none", fontSize: 14 };

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
        {history.length === 0 ? (
          <p style={{ color: C.sec, textAlign: "center", padding: "20px 0", fontSize: 13 }}>Aún ninguna registrada 🍿</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.map((h) => (
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
            ))}
          </div>
        )}
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
