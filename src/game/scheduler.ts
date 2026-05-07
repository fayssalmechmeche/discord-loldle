import { Client } from "discordx";
import { SessionManager } from "./SessionManager.js";

export function initScheduler(client: Client) {
  // Vérifie toutes les minutes si c'est 23H59
  setInterval(async () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    if (hours === 23 && minutes === 59) {
      console.log(
        "⏰ 23H59 - Envoi des résultats du jour dans tous les serveurs...",
      );
      await sendDailyResults(client);
      // Attendre 2 minutes pour éviter les exécutions multiples
      await new Promise((resolve) => setTimeout(resolve, 120000));
    }
  }, 60000); // Vérifier toutes les minutes
}

async function sendDailyResults(client: Client) {
  const dailyChampion = SessionManager.getDailyChampion();

  if (!dailyChampion || !dailyChampion.channelId || !dailyChampion.guildId) {
    console.log(
      "⚠️ Pas de champion du jour ou pas de canal de résultats défini",
    );
    return;
  }

  try {
    const guild = client.guilds.cache.get(dailyChampion.guildId);
    if (!guild) {
      console.log(`⚠️ Serveur ${dailyChampion.guildId} non trouvé`);
      return;
    }

    const channel = guild.channels.cache.get(dailyChampion.channelId);
    if (!channel || !channel.isTextBased()) {
      console.log(
        `⚠️ Canal ${dailyChampion.channelId} non trouvé ou pas textuel`,
      );
      return;
    }

    // Récupérer les résultats pour ce serveur
    const results = SessionManager.getDailyResults(dailyChampion.guildId);

    let message = `\n\n📊 **Résultats finaux du Loldle du ${new Date().toLocaleDateString("fr-FR")}**\n`;
    message += `🎮 **Champion:** ${dailyChampion.name}\n\n`;

    if (results.length === 0) {
      message += `😔 Personne n'a trouvé le champion aujourd'hui...\n`;
    } else {
      message += `🏆 **Classement** (${results.length} joueur${results.length > 1 ? "s" : ""}):\n`;
      const medals = ["🥇", "🥈", "🥉"];
      results.forEach((result, index) => {
        const medal = medals[index] || "▪️";
        const attemptText = result.attemptCount === 1 ? "essai" : "essais";
        message += `${medal} **${result.username}** - ${result.attemptCount} ${attemptText}\n`;
      });
    }

    message += `\n💬 Reviens demain pour un nouveau défi ! 🌟`;

    await channel.send(message);
    console.log(`✅ Résultats envoyés dans ${guild.name}`);
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi des résultats:", error);
  }
}
