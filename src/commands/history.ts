import { Discord, Slash, SlashOption } from "discordx";
import {
  EmbedBuilder,
  CommandInteraction,
  ApplicationCommandOptionType,
} from "discord.js";
import { SessionManager } from "../game/SessionManager.js";

@Discord()
export class HistoryCommand {
  @Slash({
    name: "history",
    description: "Affiche l'historique des champions des derniers jours",
  })
  async execute(
    @SlashOption({
      name: "days",
      description: "Nombre de jours à afficher (par défaut: 7)",
      type: ApplicationCommandOptionType.Integer,
      minValue: 1,
      maxValue: 30,
      required: false,
    })
    days: number = 7,
    interaction: CommandInteraction,
  ): Promise<void> {
    await interaction.deferReply();

    try {
      const history = SessionManager.getHistory(days);

      if (history.length === 0) {
        await interaction.editReply({
          content: "❌ Aucun historique disponible.",
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle("📅 Historique des Champions")
        .setColor(0x0099ff)
        .setDescription(
          `Voici l'historique des ${Math.min(days, history.length)} derniers jour(s)`,
        );

      for (const entry of history) {
        const dateObj = new Date(entry.date);
        const formattedDate = dateObj.toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        embed.addFields({
          name: `${formattedDate} (${entry.date})`,
          value: `🎮 **Champion:** ${entry.champion.name}\n👥 **Joueurs trouvés:** ${entry.resultCount}`,
          inline: false,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Erreur dans la commande history:", error);
      await interaction.editReply({
        content:
          "❌ Une erreur s'est produite lors du chargement de l'historique.",
      });
    }
  }
}
