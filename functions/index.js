/* ============================================================
   Cloud Function — Notificaciones push de Ruleta de Pelis
   ------------------------------------------------------------
   Este archivo va en:  functions/index.js

   ¿Por qué hace falta un servidor?
   Por seguridad, el navegador del celular de Ricardo NO puede
   enviarle una notificación directamente al celular de Catalina:
   eso requiere una clave privada que jamás debe estar en el
   código del navegador. Esta función corre en los servidores de
   Google, escucha los cambios del documento `sala/casa` y desde
   ahí sí puede enviar el push al dispositivo de la otra persona.
   ============================================================ */

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

const NOMBRES = { ricardo: "Ricardo", catalina: "Catalina" };
const elOtro = (usuario) => (usuario === "ricardo" ? "catalina" : "ricardo");

/**
 * Detecta si alguien acaba de escribir su parte (nota de película o impresión
 * de lectura) mientras el item SIGUE pendiente — es decir, "le tocó a la otra
 * persona". No dispara si el item ya se completó (ambos escribieron) ni si es
 * un item nuevo sin nada que comparar contra un "antes".
 */
function detectarNotaParcial(antesArr, despuesArr, campoDraft) {
  const avisos = [];
  if (!antesArr || !despuesArr) return avisos;
  for (const d of despuesArr) {
    if (d.state !== "pendiente") continue;
    const a = antesArr.find((x) => x.id === d.id);
    if (!a) continue;
    const antesVals = (a.draft && a.draft[campoDraft]) || {};
    const despuesVals = (d.draft && d.draft[campoDraft]) || {};
    for (const persona of ["ricardo", "catalina"]) {
      const teniaAntes = !!(antesVals[persona] && antesVals[persona].trim());
      const tieneAhora = !!(despuesVals[persona] && despuesVals[persona].trim());
      if (!teniaAntes && tieneAhora) avisos.push({ quien: persona, id: d.id });
    }
  }
  return avisos;
}


/**
 * Envía una notificación a todos los dispositivos registrados de un usuario.
 * Si algún token ya no es válido (app desinstalada, permiso revocado, etc.),
 * lo limpia de Firestore para no seguir intentando enviarle.
 */
async function enviarA(usuario, { titulo, cuerpo, tag, renotify }) {
  const snap = await db.doc("sala/casa").get();
  const data = snap.data() || {};
  const tokens = (data.tokens && data.tokens[usuario]) || [];

  if (tokens.length === 0) {
    console.log(`Sin tokens registrados para ${usuario}; no se envía nada.`);
    return;
  }

  // Enviamos SOLO 'data' (sin bloque 'notification') para que el Service Worker
  // controle la apariencia. Si mandáramos ambos, el navegador podría mostrar
  // una notificación duplicada.
  const mensaje = {
    tokens,
    data: {
      title: titulo,
      body: cuerpo,
      tag: tag || "ruleta-general",
      renotify: renotify ? "true" : "false",
      url: "/",
    },
    webpush: {
      headers: { Urgency: "high", TTL: "300" },
      fcmOptions: { link: "/" },
    },
  };

  const resultado = await getMessaging().sendEachForMulticast(mensaje);
  console.log(`Enviado a ${usuario}: ${resultado.successCount} ok, ${resultado.failureCount} fallidos`);

  // Limpieza de tokens muertos
  const tokensInvalidos = [];
  resultado.responses.forEach((r, i) => {
    if (!r.success) {
      const codigo = r.error && r.error.code;
      if (
        codigo === "messaging/invalid-registration-token" ||
        codigo === "messaging/registration-token-not-registered"
      ) {
        tokensInvalidos.push(tokens[i]);
      } else {
        console.warn("Fallo de envío no relacionado al token:", codigo);
      }
    }
  });

  if (tokensInvalidos.length > 0) {
    console.log(`Limpiando ${tokensInvalidos.length} token(s) inválido(s) de ${usuario}`);
    await db.doc("sala/casa").update({
      [`tokens.${usuario}`]: FieldValue.arrayRemove(...tokensInvalidos),
    });
  }
}

exports.notificarCambios = onDocumentWritten(
  { document: "sala/casa", region: "southamerica-east1" }, // debe coincidir con la región real de Firestore
  async (event) => {
    const antes = event.data.before.exists ? event.data.before.data() : null;
    const despues = event.data.after.exists ? event.data.after.data() : null;
    if (!despues) return; // documento borrado

    /* ---------- 1) Alguien pidió girar la ruleta ---------- */
    const reqAntes = antes && antes.spinReq;
    const reqDespues = despues.spinReq;

    // Solo notificamos en la TRANSICIÓN a "pending" (no en cada escritura del doc),
    // comparando el seed para distinguir una solicitud nueva de una repetida.
    const esSolicitudNueva =
      reqDespues &&
      reqDespues.status === "pending" &&
      (!reqAntes || reqAntes.status !== "pending" || reqAntes.seed !== reqDespues.seed);

    if (esSolicitudNueva) {
      const destinatario = elOtro(reqDespues.by);
      await enviarA(destinatario, {
        titulo: "🎡 ¡Quieren girar la ruleta!",
        cuerpo: `${NOMBRES[reqDespues.by]} está esperando tu aprobación`,
        tag: "ruleta-spin",
        renotify: true, // es importante: que vuelva a sonar/vibrar
      });
      return;
    }

    /* ---------- 2) Alguien cambió su estado de ánimo ---------- */
    if (antes && antes.estados && despues.estados) {
      for (const usuario of ["ricardo", "catalina"]) {
        const estadoAntes = antes.estados[usuario];
        const estadoDespues = despues.estados[usuario];
        const cambio =
          estadoAntes && estadoDespues && estadoAntes.label !== estadoDespues.label;

        if (cambio) {
          const destinatario = elOtro(usuario);
          await enviarA(destinatario, {
            titulo: `${estadoDespues.emoji} ${NOMBRES[usuario]} cambió su estado`,
            cuerpo: `Ahora está ${estadoDespues.label}`,
            // Mismo tag para TODOS los cambios de estado: si cambia de ánimo varias
            // veces seguidas, la notificación nueva REEMPLAZA a la anterior en la
            // pantalla en vez de apilarse. Al final solo queda una, con el estado real.
            tag: "ruleta-estado",
            // renotify falso: la reemplaza en silencio, sin volver a vibrar cada vez.
            renotify: false,
          });
        }
      }
    }

    /* ---------- 3) Tu pareja registró su nota de una película (falta la tuya) ----------
       Mismo criterio que ya usa la app para notificar: avisar cuando SE NECESITA una
       acción tuya para que algo avance — igual que "pedir girar", pero para completar
       el registro dual de una película. */
    for (const aviso of detectarNotaParcial(antes && antes.movies, despues.movies, "notas")) {
      const pelicula = despues.movies.find((m) => m.id === aviso.id);
      await enviarA(elOtro(aviso.quien), {
        titulo: "📝 Registraron su parte",
        cuerpo: `${NOMBRES[aviso.quien]} ya escribió sobre "${pelicula ? pelicula.title : "una película"}" — te toca a ti`,
        tag: `ruleta-nota-pelicula-${aviso.id}`, // por película: no colapsa avisos de películas distintas
        renotify: true,
      });
    }

    /* ---------- 4) Tu pareja compartió su impresión de una lectura (falta la tuya) ---------- */
    for (const aviso of detectarNotaParcial(antes && antes.lecturas, despues.lecturas, "impresiones")) {
      const lectura = despues.lecturas.find((l) => l.id === aviso.id);
      await enviarA(elOtro(aviso.quien), {
        titulo: "📖 Compartieron su impresión",
        cuerpo: `${NOMBRES[aviso.quien]} ya escribió sobre "${lectura ? lectura.titulo : "una lectura"}" — te toca a ti`,
        tag: `ruleta-impresion-lectura-${aviso.id}`,
        renotify: true,
      });
    }
  }
);

/* ============================================================
   obtenerMetadatosEnlace — autocompletar título/autor/contexto
   ------------------------------------------------------------
   Recibe un link (discurso, artículo, video) y trata de sacar:
   - título   → etiqueta <meta property="og:title"> de la página
   - autor    → inferido del propio slug de la URL cuando se puede
                (ej. BYU Speeches), vacío si no hay forma confiable
   - contexto → inferido de patrones de URL conocidos del entorno
                SUD (Conferencia General, FTSOY, Ven Sígueme, etc.)

   Es "mejor esfuerzo": si algo no se puede inferir, se devuelve
   vacío — la persona siempre puede completarlo a mano en el form.
   No hace falta un scraper distinto por sitio: una sola función
   genérica + un puñado de patrones de URL alcanza para todo esto.
   ============================================================ */
const MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function inferirContextoLDS(url) {
  const u = url.toLowerCase();
  let m;
  if ((m = u.match(/\/general-conference\/(\d{4})\/(\d{2})\//))) {
    return `Conferencia General, ${MESES[parseInt(m[2], 10)] || m[2]} ${m[1]}`;
  }
  if ((m = u.match(/\/ftsoy\/(\d{4})\/(\d{2})\//))) {
    return `Para la Fortaleza de la Juventud, ${MESES[parseInt(m[2], 10)] || m[2]} ${m[1]}`;
  }
  if (/\/come-follow-me\/|\/venid-y-seguidme\/|\/ven-sigueme\//.test(u)) return "Ven, Sígueme";
  if (/worldwide-devotional|devocional-mundial/.test(u)) return "Devocional Mundial";
  if (/speeches\.byu\.edu/.test(u)) return "BYU Speeches";
  return "";
}

function inferirAutorDesdeSlugBYU(url) {
  const m = url.match(/speeches\.byu\.edu\/talks\/([a-z0-9-]+)\//i);
  if (!m) return "";
  return m[1]
    .split("-")
    .map((p) => {
      const cap = p.charAt(0).toUpperCase() + p.slice(1);
      return p.length === 1 ? cap + "." : cap;
    })
    .join(" ");
}

function esYouTube(url) {
  return /youtube\.com\/watch|youtu\.be\//.test(url);
}

async function obtenerMetadatosYouTube(url) {
  // Endpoint público de YouTube (oEmbed) — no requiere API key.
  const resp = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
  if (!resp.ok) return { titulo: "", autor: "", contexto: "" };
  const data = await resp.json();
  return { titulo: data.title || "", autor: data.author_name || "", contexto: "" };
}

function extraerOgTitle(html) {
  const m =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  if (m) return decodeEntidadesHtml(m[1]);
  const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return t ? decodeEntidadesHtml(t[1]).replace(/\s*[|\-–]\s*.*$/, "").trim() : "";
}

function decodeEntidadesHtml(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&aacute;/g, "á").replace(/&eacute;/g, "é").replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó").replace(/&uacute;/g, "ú").replace(/&ntilde;/g, "ñ");
}

exports.obtenerMetadatosEnlace = onCall({ region: "us-central1", timeoutSeconds: 15 }, async (request) => {
  const url = (request.data && request.data.url || "").trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new HttpsError("invalid-argument", "Manda un link válido (http:// o https://)");
  }

  if (esYouTube(url)) {
    try {
      return await obtenerMetadatosYouTube(url);
    } catch (e) {
      console.warn("Fallo oEmbed de YouTube:", e);
      return { titulo: "", autor: "", contexto: "" };
    }
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RuletaPelisBot/1.0)" },
    });
    clearTimeout(timer);

    if (!resp.ok) return { titulo: "", autor: "", contexto: inferirContextoLDS(url) };

    // Solo leemos los primeros ~60KB — el <title>/<meta og:title> siempre está
    // en el <head>, no hace falta descargar la página entera.
    const reader = resp.body.getReader();
    let html = "";
    let leido = 0;
    while (leido < 60000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += Buffer.from(value).toString("utf8");
      leido += value.length;
    }
    reader.cancel().catch(() => {});

    return {
      titulo: extraerOgTitle(html),
      autor: inferirAutorDesdeSlugBYU(url),
      contexto: inferirContextoLDS(url),
    };
  } catch (e) {
    console.warn("No se pudieron leer metadatos de", url, e.message);
    // Aunque falle la lectura de la página, el contexto por patrón de URL
    // igual puede servir — lo devolvemos aunque el resto quede vacío.
    return { titulo: "", autor: "", contexto: inferirContextoLDS(url) };
  }
});

