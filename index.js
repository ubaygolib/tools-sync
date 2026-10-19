// DOIMIY ISHLAYDIGAN rejim (VPS / kompyuter / Docker):
// guruhdagi yangi xabarlarni real vaqtda tinglaydi.
//
// Diagnostika uchun: .env ga  DEBUG=1  qo'shing, har bir kelgan xabar haqida qator chiqadi.
const { Api } = require("telegram");
const { NewMessage } = require("telegram/events");
const {
  SOURCE_GROUP_ID, TARGET_CHANNEL_ID,
  requireEnv, parseId, norm, createClient, shouldForward,
  isFromDaler, hasFile, hasLink,
} = require("./common");

requireEnv(["API_ID", "API_HASH", "SESSION_STRING", "SOURCE_GROUP_ID", "TARGET_CHANNEL_ID", "DALER_USER_ID"]);

const DEBUG = process.env.DEBUG === "1";

process.on("unhandledRejection", (e) => console.error("unhandledRejection:", e));

(async () => {
  const client = createClient();
  await client.connect();

  // MUHIM: sessiyani yangilanishlarga (updates) obuna qiladi.
  // Busiz faqat connect() qilingan mijozga yangi xabarlar kelmasligi mumkin.
  await client.invoke(new Api.updates.GetState());

  // Chatlar keshini to'ldiramiz, aks holda ID bo'yicha topib bo'lmaydi
  await client.getDialogs({ limit: 300 });

  const source = await client.getEntity(parseId(SOURCE_GROUP_ID));
  const target = await client.getEntity(parseId(TARGET_CHANNEL_ID));

  console.log("Userbot ishga tushdi, kuzatilmoqda...");
  if (DEBUG) console.log("DEBUG rejimi yoqilgan.");

  client.addEventHandler(async (event) => {
    try {
      const message = event.message;
      if (!message) return;

      const fromSource = norm(message.chatId) === norm(SOURCE_GROUP_ID);

      if (DEBUG) {
        console.log(
          `[DEBUG] chat=${message.chatId} (manba guruhmi: ${fromSource}) ` +
          `yuboruvchi=${message.senderId} Daler=${isFromDaler(message)} ` +
          `fayl=${hasFile(message)} havola=${hasLink(message)}`
        );
      }

      if (!fromSource) return;
      if (!shouldForward(message)) return;

      await client.forwardMessages(target, { messages: [message.id], fromPeer: source });
      console.log(`Forward qilindi: xabar #${message.id}`);
    } catch (e) {
      // Masalan: guruhda "kontentni saqlashni cheklash" yoqilgan bo'lsa, forward ruxsat etilmaydi
      console.error("Forward xatosi:", e.message || e);
    }
  }, new NewMessage({ incoming: true }));
})();