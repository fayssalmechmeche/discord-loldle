import { Discord, Slash } from "discordx";
import { EmbedBuilder } from "discord.js";
import { SessionManager } from "../game/SessionManager.js";

@Discord()
export class ResultsCommand {
  @Slash({
    name: "results",
    description: "Affiche les résultats du Loldle du jour pour ce serveur 📊",
  })
  async results(interaction: any) {
    try {
      // Vérifier qu'on est sur un serveur
      const guildId = interaction.guildId || interaction.guild?.id;
      if (!guildId) {
        await interaction.reply({
          content: "❌ Cette commande ne fonctionne que dans un serveur !",
          ephemeral: true,
        });
        return;
      }

      // Vérifier que le setup a été fait
      const configuredChannel = SessionManager.getGuildSetupChannel(guildId);
      if (!configuredChannel) {
        await interaction.reply({
          content:
            "❌ Aucun salon configuré ! L'admin doit d'abord faire `/setup`",
          ephemeral: true,
        });
        return;
      }

      // Vérifier qu'on est dans le bon salon
      if (interaction.channelId !== configuredChannel) {
        const channel =
          await interaction.guild?.channels.fetch(configuredChannel);
        await interaction.reply({
          content: `❌ Cette commande ne fonctionne que dans ${channel?.toString()} !`,
          ephemeral: true,
        });
        return;
      }

      // Récupérer le champion du jour
      const dailyChampion = SessionManager.getDailyChampion();
      if (!dailyChampion) {
        await interaction.reply({
          content:
            "Aucun champion du jour n'a été lancé. Fais `/splash` d'abord !",
          ephemeral: true,
        });
        return;
      }

      // Récupérer les résultats du jour pour ce serveur
      const results = SessionManager.getDailyResults(guildId);

      if (results.length === 0) {
        await interaction.reply({
          content: `🏆 **Loldle du jour: ${dailyChampion.name}**\n\nAucun joueur n'a encore trouvé le champion !`,
          ephemeral: true,
        });
        return;
      }

      // Créer le classement
      let leaderboard = `🏆 **Loldle du jour: ${dailyChampion.name}**\n\n`;
      leaderboard += "**Classement:**\n";

      const medals = ["🥇", "🥈", "🥉"];

      results.forEach((result, index) => {
        const medal = medals[index] || "▪️";
        const attemptText = result.attemptCount === 1 ? "essai" : "essais";
        leaderboard += `${medal} **${result.username}** - ${result.attemptCount} ${attemptText}\n`;
      });

      const embed = new EmbedBuilder()
        .setTitle(`📊 Résultats du Loldle`)
        .setDescription(leaderboard)
        .setColor(0x0099ff)
        .setFooter({
          text: `Total: ${results.length} joueur(s) qui ont trouvé`,
        });

      await interaction.reply({
        embeds: [embed],
        flags: 64, // Ephemeral: visible uniquement pour l'utilisateur
      });
    } catch (error) {
      console.error("Erreur dans /results:", error);
      await interaction.reply({
        content: "❌ Une erreur est survenue.",
        ephemeral: true,
      });
    }
  }
}
