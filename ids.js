// ID larni topish uchun yordamchi:
//   node ids.js                      -> barcha chat/kanal/guruhlar va ID lari
//   node ids.js <guruh_id> Daler     -> guruhdan "Daler" ismli a'zolar ID si
const { createClient, requireEnv, norm } = require("./common");

(async () => {
  requireEnv(["API_ID", "API_HASH", "SESSION_STRING"]);
  const client = createClient();
  await client.connect();

  const dialogs = await client.getDialogs({ limit: 300 });

  const [groupId, searchName] = process.argv.slice(2);

  if (!groupId) {
    for (const d of dialogs) console.log(`${String(d.id)}  |  ${d.title || d.name}`);
  } else {
    const dialog = dialogs.find((d) => norm(d.id) === norm(groupId));
    if (!dialog) {
      console.error("Bunday guruh topilmadi. Avval `node ids.js` bilan ro'yxatni tekshiring.");
    } else {
      const users = await client.getParticipants(dialog.entity, { search: searchName || "", limit: 50 });
      for (const u of users) {
        console.log(`${String(u.id)}  |  ${[u.firstName, u.lastName].filter(Boolean).join(" ")}  |  @${u.username || "-"}`);
      }
    }
  }

  await client.disconnect();
  process.exit(0);
})();
