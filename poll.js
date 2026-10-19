// BIR MARTA ISHLAYDIGAN rejim (cron / serverless funksiya uchun):
// ulanadi, oxirgi tekshiruvdan keyingi yangi xabarlarni forward qiladi va chiqadi.
// Oxirgi ko'rilgan xabar ID si state.json da saqlanadi.
// DIQQAT: serverless'da fayl saqlanmaydi, getState/setState ni KV/baza bilan almashtiring.
const fs = require("fs");
const path = require("path");
const {
  SOURCE_GROUP_ID, TARGET_CHANNEL_ID,
  requireEnv, parseId, createClient, shouldForward,
} = require("./common");

requireEnv(["API_ID", "API_HASH", "SESSION_STRING", "SOURCE_GROUP_ID", "TARGET_CHANNEL_ID", "DALER_USER_ID"]);

const STATE_FILE = path.join(__dirname, "state.json");

function getState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")).lastId ?? null;
  } catch {
    return null;
  }
}

function setState(lastId) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ lastId }));
}

(async () => {
  const client = createClient();
  await client.connect();
  await client.getDialogs({ limit: 300 });

  const source = await client.getEntity(parseId(SOURCE_GROUP_ID));
  const target = await client.getEntity(parseId(TARGET_CHANNEL_ID));

  let lastId = getState();

  // Birinchi ishga tushirishda eski xabarlarni forward qilmaymiz, faqat joriy nuqtani eslab qolamiz
  if (lastId === null) {
    const latest = await client.getMessages(source, { limit: 1 });
    setState(latest.length ? latest[0].id : 0);
    console.log("Boshlang'ich nuqta saqlandi. Keyingi ishga tushirishdan boshlab forward qilinadi.");
    await client.disconnect();
    process.exit(0);
  }

  const messages = await client.getMessages(source, { minId: lastId, limit: 300 });

  // Eski xabardan yangisiga qarab ketma-ket
  for (const message of messages.reverse()) {
    try {
      if (shouldForward(message)) {
        await client.forwardMessages(target, { messages: [message.id], fromPeer: source });
        console.log(`Forward qilindi: xabar #${message.id}`);
      }
    } catch (e) {
      console.error(`Xabar #${message.id} xatosi:`, e.message || e);
    }
    lastId = Math.max(lastId, message.id);
  }

  setState(lastId);
  await client.disconnect();
  process.exit(0);
})();
