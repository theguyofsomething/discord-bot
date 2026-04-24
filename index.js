const { Client, GatewayIntentBits } = require('discord.js');

console.log("TOKEN VALUE:", process.env.TOKEN); // debug line

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const prefix = "!";
const users = {};

function getUser(id) {
  if (!users[id]) {
    users[id] = { wallet: 0, bank: 0, lastDaily: 0 };
  }
  return users[id];
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", (msg) => {
  if (msg.author.bot) return;
  if (!msg.content.startsWith(prefix)) return;

  const args = msg.content.slice(prefix.length).split(" ");
  const cmd = args[0].toLowerCase();
  const user = getUser(msg.author.id);

  if (cmd === "ping") {
    msg.reply("Pong!");
  }

  if (cmd === "daily") {
    const now = Date.now();
    if (now - user.lastDaily < 86400000) {
      return msg.reply("⏳ Already claimed!");
    }
    user.wallet += 100;
    user.lastDaily = now;
    msg.reply("💰 You got 100 DSH$!");
  }

  if (cmd === "work") {
    const earned = Math.floor(Math.random() * 100) + 50;
    user.wallet += earned;
    msg.reply(`💼 You earned ${earned} DSH$`);
  }

  if (cmd === "balance") {
    msg.reply(`💰 Wallet: ${user.wallet}\n🏦 Bank: ${user.bank}`);
  }
});

client.login(process.env.TOKEN);
