import { Discord, Slash } from "discordx";
import {
  ChannelType,
  CommandInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
} from "discord.js";
import { SessionManager } from "../game/SessionManager.js";

@Discord()
export class SetupCommand {
  @Slash({
    name: "setup",
    description: "Configure le salon pour le Loldle (Admin uniquement)",
  })
  async setup(interaction: CommandInteraction): Promise<void> {
    // Vérifier que c'est un admin
    const member = await interaction.guild?.members.fetch(interaction.user.id);
    if (!member?.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: "❌ Seuls les admins peuvent utiliser cette commande !",
        ephemeral: true,
      });
      return;
    }

    // Créer un menu de sélection de salon
    const channelSelect = new ChannelSelectMenuBuilder()
      .setCustomId("loldle_channel_select")
      .setPlaceholder("Choisir un salon pour le Loldle")
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
      channelSelect,
    );

    await interaction.reply({
      content: "📌 Sélectionnez le salon où le Loldle sera joué :",
      components: [row],
      ephemeral: true,
    });
  }
}

// Gestionnaire pour le menu de sélection
@Discord()
export class SetupHandler {
  static async handleChannelSelect(interaction: any): Promise<void> {
    // Vérifier que c'est un menu de sélection de salon
    if (!interaction.isChannelSelectMenu()) return;
    if (interaction.customId !== "loldle_channel_select") return;

    try {
      const selectedChannel = interaction.values[0];

      if (!interaction.guildId) {
        await interaction.reply({
          content: "❌ Cette action ne fonctionne que dans un serveur !",
          ephemeral: true,
        });
        return;
      }

      // Stocker le salon dans le SessionManager
      SessionManager.setGuildSetup(interaction.guildId, selectedChannel);

      await interaction.reply({
        content: `✅ Salon configuré ! ${interaction.guild?.channels.cache.get(selectedChannel)?.toString()} sera utilisé pour le Loldle.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Erreur lors de la sélection du salon:", error);
      await interaction.reply({
        content: "❌ Une erreur s'est produite.",
        ephemeral: true,
      });
    }
  }
}
