import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";

function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [discord-bot] ${message}`);
}

const SITE_URL = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : process.env.REPL_SLUG
    ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
    : "https://atlantis-archive.replit.app";

export async function startDiscordBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !clientId) {
    log("Discord bot token or client ID not found. Bot will not start.");
    return;
  }

  log(`Using Client ID: ${clientId.substring(0, 6)}...${clientId.substring(clientId.length - 4)}`);
  log(`Using Guild ID: ${guildId || "none (global registration)"}`);
  log(`Client ID length: ${clientId.length}`);

  const command = new SlashCommandBuilder()
    .setName("atlantis")
    .setDescription("Get the link to the Atlantis Archive website");

  const rest = new REST({ version: "10" }).setToken(token);

  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: [command.toJSON()],
      });
      log(`Registered /atlantis command for guild ${guildId}`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), {
        body: [command.toJSON()],
      });
      log("Registered /atlantis command globally");
    }
  } catch (err) {
    log(`Failed to register slash command: ${err}`);
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.on("ready", () => {
    log(`Bot logged in as ${client.user?.tag}`);
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "atlantis") return;

    await interaction.reply({
      embeds: [
        {
          title: "Atlantis Archive",
          description:
            "Access the Atlantis Alliance Archives — your hub for alliance documents, guides, and intelligence.",
          url: SITE_URL,
          color: 0x0ea5e9,
          fields: [
            {
              name: "Website",
              value: `[Click here to open the Archive](${SITE_URL})`,
            },
          ],
          footer: {
            text: "From the Depths, We Rise",
          },
        },
      ],
    });
  });

  client.on("error", (err) => {
    log(`Bot error: ${err.message}`);
  });

  try {
    await client.login(token);
  } catch (err) {
    log(`Failed to login Discord bot: ${err}`);
  }
}
