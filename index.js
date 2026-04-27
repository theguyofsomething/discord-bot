const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1485144103040843888";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

console.log("BOT STARTING...");

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
      rods: ["basic"],
      bait: {},
      cars: [],
      aircraft: [],
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
    { name: "Minnow", rarity: "Common", chance: 50, value: 50, img: "https://i.imgur.com/1.png" },
    { name: "Salmon", rarity: "Uncommon", chance: 30, value: 120, img: "https://i.imgur.com/2.png" },
    { name: "Tuna", rarity: "Rare", chance: 15, value: 300, img: "https://i.imgur.com/3.png" },
    { name: "Seraphine", rarity: "Legendary", chance: 5, value: 1000, img: "https://i.imgur.com/4.png" }
  ]
};

function rollFish(user) {
  let rod = rods[user.rods[user.rods.length - 1]];
  let luck = rod.luck;

  let table = locations.lake.map(f => ({
    ...f,
    chance: f.chance * luck
  }));

  let total = table.reduce((a, b) => a + b.chance, 0);
  let rand = Math.random() * total;

  let sum = 0;
  for (let fish of table) {
    sum += fish.chance;
    if (rand <= sum) return fish;
  }
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
const carShop = {
  sedan: { price: 2000 },
  sports: { price: 5000 }
};

const aircraftShop = {
  glider: { price: 3000 },
  jet: { price: 10000 }
};

// ================= COMMANDS =================
const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Ping"),

  new SlashCommandBuilder().setName("balance").setDescription("Check balance"),

  new SlashCommandBuilder().setName("daily").setDescription("Daily reward"),

  new SlashCommandBuilder().setName("leaderboard").setDescription("Global leaderboard"),

  new SlashCommandBuilder().setName("profile").setDescription("Your profile"),

  new SlashCommandBuilder().setName("fish").setDescription("Go fishing"),

  new SlashCommandBuilder().setName("carshop").setDescription("View cars"),
  new SlashCommandBuilder().setName("buycar")
    .setDescription("Buy car")
    .addStringOption(o => o.setName("car").setDescription("Car name").setRequired(true)),

  new SlashCommandBuilder().setName("aircraftshop").setDescription("View aircraft"),
  new SlashCommandBuilder().setName("buyaircraft")
    .setDescription("Buy aircraft")
    .addStringOption(o => o.setName("aircraft").setDescription("Aircraft name").setRequired(true))
].map(c => c.toJSON());

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

    let fish = rollFish(user);
    user.money += fish.value;
    user.inventory[fish.name] = (user.inventory[fish.name] || 0) + 1;

    addXP(user, 20);
    saveData();

    return i.reply({
      content: `🎣 ${fish.name} (${fish.rarity}) +${fish.value}`,
      embeds: [new EmbedBuilder().setImage(fish.img)]
    });
  }

  // carshop
  if (i.commandName === "carshop") {
    let txt = Object.entries(carShop)
      .map(([n, v]) => `${n} — ${v.price}`)
      .join("\n");
    return i.reply("🚗\n" + txt);
  }

  if (i.commandName === "buycar") {
    let name = i.options.getString("car");
    let car = carShop[name];

    if (!car) return i.reply("Invalid");
    if (user.money < car.price) return i.reply("No money");

    user.money -= car.price;
    user.cars.push(name);
    saveData();

    return i.reply(`Bought ${name}`);
  }

  // aircraft
  if (i.commandName === "aircraftshop") {
    let txt = Object.entries(aircraftShop)
      .map(([n, v]) => `${n} — ${v.price}`)
      .join("\n");
    return i.reply("✈️\n" + txt);
  }

  if (i.commandName === "buyaircraft") {
    let name = i.options.getString("aircraft");
    let a = aircraftShop[name];

    if (!a) return i.reply("Invalid");
    if (user.money < a.price) return i.reply("No money");

    user.money -= a.price;
    user.aircraft.push(name);
    saveData();

    return i.reply(`Bought ${name}`);
  }

  // profile
  if (i.commandName === "profile") {
    let perk = user.level >= 10 ? "Lucky Fisher" : "None";

    return i.reply(
      `Level: ${user.level}\nXP: ${user.exp}\nMoney: ${user.money}\nPerk: ${perk}`
    );
  }
});

client.login(TOKEN);
