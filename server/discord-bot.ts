import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActivityType } from "discord.js";

function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [discord-bot] ${message}`);
}

const SITE_URL = "https://atlantis-archives.onrender.com";

export async function startDiscordBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !clientId) {
    log("Discord bot token or client ID not found. Bot will not start.");
    return;
  }

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

  client.on("clientReady", () => {
    log(`Bot logged in as ${client.user?.tag}`);
    log("Bot is running");
    client.user?.setActivity("Currently drowning in commands", {
      type: ActivityType.Custom,
    });
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

  const selfPingPort = process.env.PORT || "5000";
  setInterval(async () => {
    try {
      const res = await fetch(`http://localhost:${selfPingPort}/api/health`);
      if (res.ok) {
        log("Self-ping OK");
      }
    } catch {
      log("Self-ping failed");
    }
  }, 4 * 60 * 1000);
}
