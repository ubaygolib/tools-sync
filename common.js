require("dotenv").config();
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

// ---------- Sozlamalar (.env dan) ----------
const API_ID = Number(process.env.API_ID);
const API_HASH = process.env.API_HASH;
const SESSION_STRING = process.env.SESSION_STRING || "";
const SOURCE_GROUP_ID = process.env.SOURCE_GROUP_ID;
const TARGET_CHANNEL_ID = process.env.TARGET_CHANNEL_ID;
const DALER_USER_ID = process.env.DALER_USER_ID;

function requireEnv(names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    console.error(`.env faylida yetishmayapti: ${missing.join(", ")}`);
    process.exit(1);
  }
}

// "-100123" -> Number, "@kanal" -> o'zi
function parseId(v) {
  return /^-?\d+$/.test(String(v)) ? Number(v) : v;
}

// -100 belgisini olib tashlab, ID larni solishtirishga tayyorlaydi
function norm(id) {
  return String(id).replace(/^-100/, "").replace(/^-/, "");
}

function createClient() {
  return new TelegramClient(new StringSession(SESSION_STRING), API_ID, API_HASH, {
    connectionRetries: 10,
    autoReconnect: true,
  });
}

// ---------- Filtr: faqat Daler + (fayl yoki havola) ----------
const URL_RE = /(https?:\/\/|www\.|t\.me\/)\S+/i;
// Faqat HUJJAT (PDF, ZIP, DOCX va hokazo) fayl hisoblanadi.
// Quyidagi turlar fayl EMAS: ovozli xabar va audio, video va dumaloq video, stiker, GIF.
// Rasm (photo) ham o'tmaydi. Videoni ham o'tkazmoqchi bo'lsangiz, ro'yxatdan
// "DocumentAttributeVideo" ni olib tashlang.
const NOT_A_FILE = [
  "DocumentAttributeAudio",
  "DocumentAttributeVideo",
  "DocumentAttributeSticker",
  "DocumentAttributeAnimated",
];

function hasFile(message) {
  const media = message.media;
  if (!media || media.className !== "MessageMediaDocument") return false;
  const attrs = (media.document && media.document.attributes) || [];
  return !attrs.some((a) => NOT_A_FILE.includes(a.className));
}

function hasLink(message) {
  const ents = message.entities || [];
  if (ents.some((e) => e.className === "MessageEntityUrl" || e.className === "MessageEntityTextUrl")) {
    return true;
  }
  return URL_RE.test(message.message || "");
}

function isFromDaler(message) {
  return message.senderId != null && norm(message.senderId) === norm(DALER_USER_ID);
}

function shouldForward(message) {
  return isFromDaler(message) && (hasFile(message) || hasLink(message));
}

module.exports = {
  API_ID, API_HASH, SESSION_STRING,
  SOURCE_GROUP_ID, TARGET_CHANNEL_ID, DALER_USER_ID,
  requireEnv, parseId, norm, createClient, shouldForward,
  isFromDaler, hasFile, hasLink,
};