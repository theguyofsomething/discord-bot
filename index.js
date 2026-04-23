const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const prefix = "!";

// Database (temporary, resets on restart)
const users = {};

function getUser(id) {
  if (!users[id]) {
    users[id] = {
      wallet: 0,
      bank: 0,
      lastDaily: 0
    };
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

  // 💰 DAILY
  if (cmd === "daily") {
    const now = Date.now();
    if (now - user.lastDaily < 86400000) {
      return msg.reply("⏳ You already claimed your daily!");
    }

    user.wallet += 100;
    user.lastDaily = now;

    msg.reply("💰 You got 100 DSH$!");
  }

  // 💼 WORK
  if (cmd === "work") {
    const earned = Math.floor(Math.random() * 100) + 50;
    user.wallet += earned;

    msg.reply(`💼 You earned ${earned} DSH$`);
  }

  // 💰 BALANCE
  if (cmd === "balance") {
    msg.reply(`💰 Wallet: ${user.wallet} DSH$\n🏦 Bank: ${user.bank} DSH$`);
  }

  // 🏦 DEPOSIT
  if (cmd === "deposit") {
    const amount = parseInt(args[1]);
    if (!amount || amount <= 0) return msg.reply("Enter amount!");

    if (user.wallet < amount) return msg.reply("Not enough money!");

    user.wallet -= amount;
    user.bank += amount;

    msg.reply(`🏦 Deposited ${amount} DSH$`);
  }

  // 💸 WITHDRAW
  if (cmd === "withdraw") {
    const amount = parseInt(args[1]);
    if (!amount || amount <= 0) return msg.reply("Enter amount!");

    if (user.bank < amount) return msg.reply("Not enough in bank!");

    user.bank -= amount;
    user.wallet += amount;

    msg.reply(`💸 Withdrew ${amount} DSH$`);
  }

  // 🏆 LEADERBOARD
  if (cmd === "leaderboard") {
    const top = Object.entries(users)
      .sort((a, b) => (b[1].wallet + b[1].bank) - (a[1].wallet + a[1].bank))
      .slice(0, 5);

    let text = "🏆 Leaderboard:\n";
    top.forEach((u, i) => {
      text += `${i + 1}. <@${u[0]}> - ${u[1].wallet + u[1].bank} DSH$\n`;
    });

    msg.reply(text);
  }
});

client.login(process.env.TOKEN);
