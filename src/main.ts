import { dirname, importx } from "@discordx/importer";
import { IntentsBitField, type Interaction, type Message } from "discord.js";
import { Client } from "discordx";
import "dotenv/config";
import { getLatestVersion } from "./data/ddragon.js";
import { SessionManager } from "./game/SessionManager.js";
import { initScheduler } from "./game/scheduler.js";
import { SetupHandler } from "./commands/setup.js";

export const bot = new Client({
  // To use only guild command
  // botGuilds: [(client) => client.guilds.cache.map((guild) => guild.id)],

  // Discord intents
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.MessageContent,
  ],

  // Debug logs are disabled in silent mode
  silent: false,
});

bot.once("ready", async () => {
  // Make sure all guilds are cached
  await bot.guilds.fetch();

  // Initialiser le SessionManager avec les données persistantes
  SessionManager.init();

  // Initialiser le scheduler pour l'envoi automatique des résultats à 23H59
  initScheduler(bot);

  // Cache the latest version of League of Legends data
  await getLatestVersion();

  // Synchronize applications commands with Discord
  void bot.initApplicationCommands();

  // To clear all guild commands, uncomment this line,
  // This is useful when moving from guild commands to global commands
  // It must only be executed once
  //
  // await bot.clearApplicationCommands(...bot.guilds.cache.map((g) => g.id));

  console.log("Bot started");
});

bot.on("interactionCreate", async (interaction: Interaction) => {
  // Gérer les menus de sélection de salon
  if (interaction.isChannelSelectMenu()) {
    if (interaction.customId === "loldle_channel_select") {
      await SetupHandler.handleChannelSelect(interaction);
      return;
    }
  }

  // Exécuter les autres interactions (commandes, boutons, etc.)
  bot.executeInteraction(interaction);
});

async function run() {
  // The following syntax should be used in the commonjs environment
  //
  // await importx(__dirname + "/{events,commands}/**/*.{ts,js}");

  // The following syntax should be used in the ECMAScript environment
  await importx(`${dirname(import.meta.url)}/{events,commands}/**/*.{ts,js}`);

  // Let's start the bot
  if (!process.env.BOT_TOKEN) {
    throw Error("Could not find BOT_TOKEN in your environment");
  }

  // Log in with your bot token
  await bot.login(process.env.BOT_TOKEN);
}

void run();
