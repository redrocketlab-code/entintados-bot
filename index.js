const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "entintados_token_2024";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// Guardamos el estado de cada usuario en memoria
const userState = {};

// ─── Función para enviar mensajes ────────────────────────────────────────────
async function sendMessage(to, message) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error al enviar mensaje:", error.response?.data || error.message);
  }
}

// ─── Mensajes del bot ─────────────────────────────────────────────────────────
const MENU_PRINCIPAL = `¡Hola! 👋 Gracias por comunicarte con *Entintados Paraguay* 🖨️

¿En qué podemos ayudarte hoy?

1️⃣ Realizar un pedido
2️⃣ Consultar el estado de mi pedido
3️⃣ Ver catálogo
4️⃣ Consultar precios

Respondé con el número de tu interés 😊`;

const MSG_PEDIDO = `¡Perfecto! Para registrar tu pedido, por favor envianos los siguientes datos:

📝 *Nombre y Apellido:*
🪪 *Cédula de Identidad (C.I.):*
🛒 *Producto que te interesa:*

⚠️ _Recordá que para confirmar el pedido se requiere una seña del 50%._`;

const MSG_ESTADO = `Claro, vamos a consultar tu pedido 📦

Por favor envianos los siguientes datos:

🛒 *Producto que pediste:*
📝 *Nombre y Apellido:*
🪪 *Cédula de Identidad (C.I.):*`;

const MSG_CATALOGO = `¡Aquí está nuestro catálogo! 🎨

👉 Accedé al catálogo completo en el siguiente enlace:
https://drive.google.com/file/d/1ejI2FBtLJRiqkXoEe0YkLDEKeuVEVVL-/view?usp=sharing

Si tenés alguna consulta sobre algún producto, ¡no dudes en escribirnos! 😊`;

const MSG_PRECIO = `¡Con gusto te ayudamos! 💬

¿Qué producto te interesa? Contanos y te damos el precio al instante 🚀`;

const MSG_GRACIAS = `¡Gracias por tu mensaje! ✅ Uno de nuestros asesores se pondrá en contacto con vos a la brevedad.

Si necesitás algo más, escribinos cuando quieras 😊`;

const MSG_NO_ENTENDIDO = `No entendí tu respuesta 😅

Por favor respondé con un número del menú:

1️⃣ Realizar un pedido
2️⃣ Consultar el estado de mi pedido
3️⃣ Ver catálogo
4️⃣ Consultar precios`;

// ─── Lógica principal del bot ─────────────────────────────────────────────────
async function handleMessage(from, messageText) {
  const text = messageText.trim().toLowerCase();
  const state = userState[from] || { step: "menu" };

  // Si el usuario está esperando completar un formulario
  if (state.step === "waiting_pedido" || state.step === "waiting_estado" || state.step === "waiting_precio") {
    await sendMessage(from, MSG_GRACIAS);
    userState[from] = { step: "menu" };
    return;
  }

  // Menú principal
  if (state.step === "menu") {
    if (text === "1") {
      await sendMessage(from, MSG_PEDIDO);
      userState[from] = { step: "waiting_pedido" };
    } else if (text === "2") {
      await sendMessage(from, MSG_ESTADO);
      userState[from] = { step: "waiting_estado" };
    } else if (text === "3") {
      await sendMessage(from, MSG_CATALOGO);
      userState[from] = { step: "menu" };
    } else if (text === "4") {
      await sendMessage(from, MSG_PRECIO);
      userState[from] = { step: "waiting_precio" };
    } else {
      // Primera vez o no entendió
      if (!state.greeted) {
        await sendMessage(from, MENU_PRINCIPAL);
        userState[from] = { step: "menu", greeted: true };
      } else {
        await sendMessage(from, MSG_NO_ENTENDIDO);
      }
    }
    return;
  }
}

// ─── Webhook: verificación de Meta ───────────────────────────────────────────
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado correctamente");
    res.status(200).send(challenge);
  } else {
    console.error("❌ Token de verificación incorrecto");
    res.sendStatus(403);
  }
});

// ─── Webhook: recibir mensajes ────────────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "whatsapp_business_account") {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (messages && messages.length > 0) {
      const message = messages[0];
      const from = message.from;
      const messageText = message.text?.body;

      if (messageText) {
        console.log(`📩 Mensaje de ${from}: ${messageText}`);
        await handleMessage(from, messageText);
      }
    }
  }

  res.sendStatus(200);
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("🤖 Bot de Entintados Paraguay funcionando correctamente!");
});

// ─── Inicio del servidor ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📱 Bot de Entintados Paraguay listo!`);
});
