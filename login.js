// Bir marta ishga tushiriladi: telefon raqam va kod orqali kirib, SESSION_STRING beradi.
const readline = require("readline/promises");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
require("dotenv").config();

(async () => {
  const apiId = Number(process.env.API_ID);
  const apiHash = process.env.API_HASH;
  if (!apiId || !apiHash) {
    console.error(".env da API_ID va API_HASH ni to'ldiring (my.telegram.org dan).");
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });

  await client.start({
    phoneNumber: () => rl.question("Telefon raqam (+998...): "),
    phoneCode: () => rl.question("Telegram yuborgan kod: "),
    password: () => rl.question("2 bosqichli parol (bo'lmasa Enter): "),
    onError: (err) => console.error("Xato:", err.message),
  });

  console.log("\n=== SESSION_STRING (uni .env ga yozing, hech kimga bermang) ===\n");
  console.log(client.session.save());
  console.log("\n===============================================================\n");

  rl.close();
  await client.disconnect();
  process.exit(0);
})();
