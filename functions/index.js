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
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

const NOMBRES = { ricardo: "Ricardo", catalina: "Catalina" };
const elOtro = (usuario) => (usuario === "ricardo" ? "catalina" : "ricardo");

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
  { document: "sala/casa", region: "us-central1" },
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
    if (!antes || !antes.estados || !despues.estados) return;

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
);
