import { Discord, Slash } from "discordx";
import { MessageFlags } from "discord.js";
import sharp from "sharp";
import {
  getChampionDetail,
  getChampionList,
  getValidSplashUrl,
} from "../data/ddragon.js";
import { SessionManager } from "../game/SessionManager.js";

@Discord()
export class SplashCommand {
  @Slash({
    name: "splash",
    description: "Reçois une image croppée d'un champion LoL en DM 🎨",
  })
  async splash(interaction: any) {
    // Acknowledge la commande
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      // 1. Récupérer la liste de tous les champions
      const champions = await getChampionList();
      const championIds = Object.keys(champions);

      // 2. Tirer un champion au hasard
      const randomChampionId =
        championIds[Math.floor(Math.random() * championIds.length)];
      const champion = await getChampionDetail(randomChampionId);

      // 3. Récupérer tous les numéros de skins disponibles
      const skinNums = champion.skins.map((skin: any) => skin.num);

      // 4. Trouver un skin qui existe (avec fallback)
      const splashUrl = await getValidSplashUrl(randomChampionId, skinNums);
      console.log(`Splash URL: ${splashUrl}`);

      // 5. Télécharger l'image
      const response = await fetch(splashUrl);
      if (!response.ok) {
        throw new Error(`Erreur de téléchargement: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length === 0) {
        throw new Error("Buffer vide reçu");
      }
      console.log(`Buffer size: ${buffer.length} bytes`);

      // 6. Obtenir les dimensions réelles de l'image
      const metadata = await sharp(buffer).metadata();
      const imgWidth = metadata.width || 1215;
      const imgHeight = metadata.height || 1215;
      console.log(`Image dimensions: ${imgWidth}x${imgHeight}`);

      // 7. Taille de crop initiale (150px)
      const initialCropSize = 150;

      // 8. Cropper l'image depuis un point aléatoire
      // S'assurer que les coordonnées sont valides
      const maxX = Math.max(0, imgWidth - initialCropSize);
      const maxY = Math.max(0, imgHeight - initialCropSize);

      const left = Math.floor(Math.random() * (maxX + 1));
      const top = Math.floor(Math.random() * (maxY + 1));

      console.log(
        `Crop: left=${left}, top=${top}, width=${initialCropSize}, height=${initialCropSize}`,
      );

      const croppedBuffer = await sharp(buffer, { failOnError: false })
        .extract({
          left,
          top,
          width: initialCropSize,
          height: initialCropSize,
        })
        .png()
        .toBuffer();

      // 9. Créer une session de jeu
      SessionManager.createSession(
        interaction.user.id,
        randomChampionId,
        champion.name,
        splashUrl,
        buffer,
        left,
        top,
        initialCropSize,
      );

      // 10. Envoyer l'image en DM
      const dmChannel = await interaction.user.createDM();
      await dmChannel.send({
        content: `🎨 **Voici une portion d'un splash art !**\nCroppe: ${initialCropSize}x${initialCropSize}px\n\nFais \`/guess\` pour répondre !`,
        files: [
          {
            attachment: croppedBuffer,
            name: "splash_crop.png",
          },
        ],
      });

      // 11. Confirmer à l'utilisateur
      await interaction.editReply({
        content: "✅ Image envoyée en DM ! Regarde tes messages privés.",
      });
    } catch (error) {
      console.error("Erreur dans /splash:", error);
      await interaction.editReply({
        content: "❌ Une erreur est survenue. Réessaie plus tard.",
      });
    }
  }
}
