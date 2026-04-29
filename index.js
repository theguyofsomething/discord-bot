const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const TOKEN = process.env.TOKEN;
console.log("TOKEN EXISTS:", !!process.env.TOKEN);
const CLIENT_ID = "1485144103040843888";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// 🎨 UI COLORS
const colors = {
  common: 0x95a5a6,
  uncommon: 0x2ecc71,
  rare: 0x3498db,
  legendary: 0xf1c40f,
  mythic: 0xff69b4
};

// 🧠 DEBUG LOGGER
function log(msg) {
  console.log("[BOT]", msg);
}

// ================= DATA =================
let data = {};
if (fs.existsSync("data.json")) {
  data = JSON.parse(fs.readFileSync("data.json"));
}

function saveData() {
  fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
}

function getUser(id) {
  if (!data[id]) {
    data[id] = {
      money: 0,
      bank: 0,
      exp: 0,
      level: 1,
      inventory: {},
      rod: "basic",
      bait: "worm",
      location: "lake",
      boat: "none",
      cooldowns: {}
    };
  }
  return data[id];
}

// ================= COOLDOWN =================
function cooldown(user, name, time) {
  let now = Date.now();
  let last = user.cooldowns[name] || 0;
  if (now - last < time) {
    return Math.ceil((time - (now - last)) / 1000);
  }
  user.cooldowns[name] = now;
  return 0;
}

// ================= FISCH SYSTEM =================
const rods = {
  basic: { luck: 1 },
  pro: { luck: 2 },
  divine: { luck: 4 }
};

const baitTypes = {
  worm: { luck: 1 },
  golden: { luck: 3 }
};

const locations = {
  lake: [
    { name: "Minnow", rarity: "Common", chance: 50, value: 50, img: "https://static.wikia.nocookie.net/fisch/images/4/40/Minnow_Bait_Render.png/revision/latest?cb=20250224011628" },
    { name: "Salmon", rarity: "Uncommon", chance: 30, value: 120, img: "https://static.wikitide.net/fischwiki/6/69/Chinook_Salmon.png" },
    { name: "Tuna", rarity: "Rare", chance: 15, value: 300, img: "https://static.wikitide.net/fischwiki/thumb/0/0f/Bluefin_Tuna_School.png/250px-Bluefin_Tuna_School.png"},
    { name: "Seraphine", rarity: "Mythic", chance: 5, value: 10000, img: "https://static.wikia.nocookie.net/fisch/images/e/e1/Seraphfin.png/revision/latest?cb=20260113053800" }
  ]
};

ocean: [
    { name: "Tuna", rarity: "Rare", chance: 60, value: 300, img: "https://static.wikitide.net/fischwiki/thumb/0/0f/Bluefin_Tuna_School.png/250px-Bluefin_Tuna_School.png" },
    { name: "Shark" rarity: "Legendary" , chance: 20, value: 2000, img: "https://static.wikitide.net/fischwiki/1/1b/Ginsu_Shark.png?version=34b1a2dbea07d681631e382376ab4d1e" },   
    { name: "Marlin", rarity: "Legendary", chance: 40, value: 1200, img: "https://static.wikitide.net/fischwiki/e/e9/Massive_Marlin.png?version=3e6f43beb04c1b4b2ebae906baae64ff" }
  ]
};
function rollFish(user) {
  let rod = rods[user.rod || "basic"];
  let bait = baitTypes[user.bait || "worm"];

  let luck = rod.luck + (bait?.luck || 0);

  let area = locations[user.location || "lake"];

  let table = area.map(f => ({
    ...f,
    chance: f.chance * Math.pow(1.2, luck - 1)
  }));

  let total = table.reduce((a, b) => a + b.chance, 0);
  let rand = Math.random() * total;

  let sum = 0;
  for (let fish of table) {
    sum += fish.chance;
    if (rand <= sum) return fish;
  }

  return table[0];
}
// ================= LEVEL =================
function addXP(user, amt) {
  user.exp += amt;
  let needed = user.level * 100;

  if (user.exp >= needed) {
    user.exp = 0;
    user.level++;
    return true;
  }
  return false;
}

// ================= SHOPS =================
const boatShop = {
  raft: { price: 500, unlock: "lake" },
  fishingboat: { price: 2000, unlock: "ocean" }
};
// ================= COMMANDS =================
const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Ping"),

  new SlashCommandBuilder().setName("balance").setDescription("Check balance"),

  new SlashCommandBuilder().setName("daily").setDescription("Daily reward"),

  new SlashCommandBuilder().setName("leaderboard").setDescription("Global leaderboard"),

  new SlashCommandBuilder().setName("profile").setDescription("Your profile"),

  new SlashCommandBuilder().setName("fish").setDescription("Go fishing"),
 
new SlashCommandBuilder().setName("boatshop").setDescription("View boats"),

new SlashCommandBuilder().setName("buyboat")
  .setDescription("Buy a boat")
  .addStringOption(o =>
    o.setName("boat")
     .setDescription("Boat name")
     .setRequired(true)
  ),
  
  new SlashCommandBuilder()
  .setName("travel")
  .setDescription("Travel to a location")
  .addStringOption(o =>
    o.setName("place")
     .setDescription("Where to go")
     .setRequired(true)
  ),
// register
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("Commands loaded");
})();

// ================= READY =================
client.on("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ================= HANDLER =================
client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;

  const user = getUser(i.user.id);

  // ping
  if (i.commandName === "ping") return i.reply("Pong!");

  // daily
  if (i.commandName === "daily") {
    let cd = cooldown(user, "daily", 86400000);
    if (cd) return i.reply(`Wait ${cd}s`);

    user.money += 200;
    saveData();
    return i.reply("💰 You got 200!");
  }

  // balance
  if (i.commandName === "balance") {
    return i.reply(`💰 ${user.money} | 🏦 ${user.bank}`);
  }

  // leaderboard
  if (i.commandName === "leaderboard") {
    let top = Object.entries(data)
      .sort((a, b) => (b[1].money + b[1].bank) - (a[1].money + a[1].bank))
      .slice(0, 10);

    let txt = top.map((u, i) =>
      `${i + 1}. <@${u[0]}> — ${u[1].money + u[1].bank}`
    ).join("\n");

    return i.reply("🌍 Leaderboard\n" + txt);
  }

  // fishing
if (i.commandName === "fish") {
  let cd = cooldown(user, "fish", 5000);
  if (cd) return i.reply(`Wait ${cd}s`);

  // 🎬 ANIMATION START (PUT IT HERE)
  await i.reply("🎣 Casting line...");

  await new Promise(r => setTimeout(r, 1200));
  await i.editReply("🌊 Something is biting...");

  await new Promise(r => setTimeout(r, 1200));
  await i.editReply("⚡ REEL IT IN!");

  await new Promise(r => setTimeout(r, 800));
  // 🎬 ANIMATION END

  // 🎣 NOW roll fish AFTER animation
  let fish = rollFish(user);

  user.money += fish.value;
  user.inventory[fish.name] = (user.inventory[fish.name] || 0) + 1;

  addXP(user, 20);
  saveData();

  let rarityColor = colors[fish.rarity.toLowerCase()] || 0xffffff;

  const embed = new EmbedBuilder()
    .setTitle("🎣 You caught something!")
    .setDescription(`**${fish.name}**`)
    .addFields(
      { name: "💰 Value", value: `${fish.value}`, inline: true },
      { name: "⭐ Rarity", value: fish.rarity, inline: true }
    )
    .setColor(rarityColor)
    .setImage(fish.img);

  // 🎉 FINAL RESULT
  await i.editReply({ content: "", embeds: [embed] });
}

if (i.commandName === "boatshop") {
  let txt = Object.entries(boatShop)
    .map(([n, v]) => `${n} — ${v.price}`)
    .join("\n");

  return i.reply("🚤 Boat Shop\n" + txt);
}

if (i.commandName === "buyboat") {
  let name = i.options.getString("boat");
  let boat = boatShop[name];

  if (!boat) return i.reply("Invalid boat");
  if (user.money < boat.price) return i.reply("Not enough money");

  user.money -= boat.price;
  user.boat = name;
  saveData();

  return i.reply(`🚤 You bought a ${name}`);
}

if (i.commandName === "travel") {
  let place = i.options.getString("place");

  if (!locations[place]) {
    return i.reply("Invalid location");
  }

  let boat = boatShop[user.boat];

  if (!boat || boat.unlock !== place) {
    return i.reply("🚫 You need a better boat to go there!");
  }

  user.location = place;
  saveData();

  return i.reply(`🌊 You traveled to ${place}`);
}
  // profile
  if (i.commandName === "profile") {
    let perk = user.level >= 10 ? "Lucky Fisher" : "None";

    return i.reply(
  `👤 Profile
Level: ${user.level}
XP: ${user.exp}
💰 Money: ${user.money}
🌊 Location: ${user.location}
🚤 Boat: ${user.boat}`
);

client.login(TOKEN);
