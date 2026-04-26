console.log("=== BOT STARTING ===");

process.on('uncaughtException', err => {
  console.error("UNCAUGHT ERROR:", err);
});

process.on('unhandledRejection', err => {
  console.error("UNHANDLED PROMISE:", err);
});

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1485144103040843888";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// 💾 Load / Save data
let data = {};
if (fs.existsSync("data.json")) {
  data = JSON.parse(fs.readFileSync("data.json"));
}

function saveData() {
  fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
}

function getUser(id) {
  if (!data[id]) {
    data[id] = { money: 0, bank: 0, exp: 0, cooldowns: {} };
  }
  return data[id];
}

// ⏱️ Cooldown system
function checkCooldown(user, command, time) {
  let now = Date.now();
  let last = user.cooldowns[command] || 0;

  if (now - last < time) {
    return Math.ceil((time - (now - last)) / 1000);
  }

  user.cooldowns[command] = now;
  return 0;
}

// 📜 Slash commands (FIXED)
const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Ping test"),
  new SlashCommandBuilder().setName("daily").setDescription("Get daily reward"),
  new SlashCommandBuilder().setName("balance").setDescription("Check balance"),

  new SlashCommandBuilder()
    .setName("deposit")
    .setDescription("Deposit money")
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("Amount to deposit")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("withdraw")
    .setDescription("Withdraw money")
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("Amount to withdraw")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("gamble")
    .setDescription("Gamble money")
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("Amount to gamble")
        .setRequired(true)
    ),

  new SlashCommandBuilder().setName("enemykill").setDescription("Fight enemy"),
  new SlashCommandBuilder().setName("leaderboard").setDescription("Top players")
].map(cmd => cmd.toJSON());

// 🔄 Register commands
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log("Registering slash commands...");
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log("Slash commands ready!");
  } catch (err) {
    console.error(err);
  }
})();

// ✅ Ready
client.on("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// 🎮 Command handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const user = getUser(interaction.user.id);

  // /ping
  if (interaction.commandName === "ping") {
    return interaction.reply("Pong!");
  }

  // /daily
  if (interaction.commandName === "daily") {
    let cd = checkCooldown(user, "daily", 86400000);
    if (cd) return interaction.reply(`Wait ${cd}s`);

    user.money += 100;
    saveData();
    return interaction.reply("You got 100 DSH$!");
  }

  // /balance
  if (interaction.commandName === "balance") {
    return interaction.reply(`Wallet: ${user.money} | Bank: ${user.bank}`);
  }

  // /deposit
  if (interaction.commandName === "deposit") {
    let amount = interaction.options.getInteger("amount");

    if (user.money < amount) return interaction.reply("Not enough");

    user.money -= amount;
    user.bank += amount;
    saveData();
    return interaction.reply(`Deposited ${amount}`);
  }

  // /withdraw
  if (interaction.commandName === "withdraw") {
    let amount = interaction.options.getInteger("amount");

    if (user.bank < amount) return interaction.reply("Not enough");

    user.bank -= amount;
    user.money += amount;
    saveData();
    return interaction.reply(`Withdrew ${amount}`);
  }

  // /gamble
  if (interaction.commandName === "gamble") {
    let amount = interaction.options.getInteger("amount");

    if (Math.random() < 0.5) {
      user.money += amount;
      saveData();
      return interaction.reply(`You won ${amount}`);
    } else {
      user.money -= amount;
      saveData();
      return interaction.reply(`You lost ${amount}`);
    }
  }

  // /enemykill
  if (interaction.commandName === "enemykill") {
    let reward = Math.floor(Math.random() * 300);
    user.money += reward;
    user.exp += 10;
    saveData();
    return interaction.reply(`Enemy defeated! +${reward}`);
  }

  // /leaderboard
  if (interaction.commandName === "leaderboard") {
    let top = Object.entries(data)
      .sort((a, b) => b[1].money - a[1].money)
      .slice(0, 5);

    let text = top.map((u, i) => `${i + 1}. <@${u[0]}> - ${u[1].money}`).join("\n");

    return interaction.reply("Top:\n" + text);
  }
});

// 🔑 Login
client.login(TOKEN);
