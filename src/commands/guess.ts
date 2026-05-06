import { Discord, Slash, SlashOption } from "discordx";
import {
  AutocompleteInteraction,
  MessageFlags,
  ApplicationCommandOptionType,
} from "discord.js";
import sharp from "sharp";
import { getChampionList } from "../data/ddragon.js";
import { SessionManager } from "../game/SessionManager.js";

let championsList: { [key: string]: any } = {};

// Charger la liste des champions au démarrage
async function initChampions() {
  if (Object.keys(championsList).length === 0) {
    championsList = await getChampionList();
  }
}

@Discord()
export class GuessCommand {
  @Slash({
    name: "guess",
    description: "Devine le champion ! 🎮",
  })
  async guess(
    @SlashOption({
      name: "champion",
      description: "Nom du champion",
      type: ApplicationCommandOptionType.String,
      autocomplete: async (interaction: AutocompleteInteraction) => {
        await initChampions();
        const focused = interaction.options.getFocused(true);
        const choices = Object.values(championsList)
          .map((champ: any) => champ.name)
          .filter((name: string) =>
            name.toLowerCase().includes(focused.value.toLowerCase()),
          )
          .slice(0, 25);
        await interaction.respond(
          choices.map((name) => ({ name, value: name })),
        );
      },
      required: true,
    })
    championName: string,
    interaction: any,
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await initChampions();

      // Vérifier que l'utilisateur a une partie en cours
      const session = SessionManager.getSession(interaction.user.id);
      if (!session) {
        await interaction.editReply({
          content:
            "❌ Tu n'as pas de partie en cours ! Fais `/splash` d'abord.",
        });
        return;
      }

      // Vérifier si le champion existe
      const guessedChampion = Object.values(championsList).find(
        (champ: any) => champ.name.toLowerCase() === championName.toLowerCase(),
      ) as any;

      if (!guessedChampion) {
        await interaction.editReply({
          content: "❌ Ce champion n'existe pas !",
        });
        return;
      }

      // Vérifier si c'est la bonne réponse
      const isCorrect =
        guessedChampion.id.toLowerCase() === session.championId.toLowerCase();

      // Ajouter l'essai à la session
      SessionManager.addAttempt(
        interaction.user.id,
        guessedChampion.name,
        isCorrect,
      );

      // Construire l'historique
      const historyLines = session.attempts
        .map((attempt) => {
          const emoji = attempt.correct ? "🟢" : "🔴";
          return `${emoji} ${attempt.championName}`;
        })
        .join("\n");

      // Message de réponse
      if (isCorrect) {
        // Victoire ! 🎉
        const attempts = session.attempts.length;
        const message =
          attempts === 1
            ? "🎉 **Trouvé du premier coup !**"
            : `🎉 **Trouvé en ${attempts} essai${attempts > 1 ? "s" : ""} !**`;

        await interaction.editReply({
          content: `${message}\n\n**Historique:**\n${historyLines}`,
        });

        // Envoyer l'image complète en DM
        const dmChannel =
          interaction.user.dmChannel || (await interaction.user.createDM());
        await dmChannel.send({
          content: `✅ **${session.championName}** était la réponse !`,
          files: [
            {
              attachment: session.imageBuffer,
              name: "splash_full.png",
            },
          ],
        });

        SessionManager.endSession(interaction.user.id);
      } else {
        // Mauvaise réponse - augmenter la taille du crop progressivement
        const newCropSize = SessionManager.increaseCropSize(
          interaction.user.id,
        );

        if (newCropSize === null) {
          await interaction.editReply({
            content: "❌ Erreur : pas de partie en cours !",
          });
          return;
        }

        // Obtenir les dimensions de l'image
        const metadata = await sharp(session.imageBuffer).metadata();
        const imgWidth = metadata.width || 1215;
        const imgHeight = metadata.height || 1215;

        // Garder les mêmes coordonnées de départ, juste augmenter la taille
        let newLeft = session.cropLeft;
        let newTop = session.cropTop;

        // S'assurer que le crop ne dépasse pas les limites de l'image
        if (newLeft + newCropSize > imgWidth) {
          newLeft = Math.max(0, imgWidth - newCropSize);
        }
        if (newTop + newCropSize > imgHeight) {
          newTop = Math.max(0, imgHeight - newCropSize);
        }

        // Limiter les dimensions indépendamment pour permettre des rectangles
        const finalCropWidth = Math.min(newCropSize, imgWidth - newLeft);
        const finalCropHeight = Math.min(newCropSize, imgHeight - newTop);

        // Re-cropper l'image avec les nouvelles dimensions
        const newCroppedBuffer = await sharp(session.imageBuffer, {
          failOnError: false,
        })
          .extract({
            left: newLeft,
            top: newTop,
            width: finalCropWidth,
            height: finalCropHeight,
          })
          .png()
          .toBuffer();

        // Mettre à jour la session
        session.cropLeft = newLeft;
        session.cropTop = newTop;

        // Envoyer l'image mise à jour en DM
        const dmChannel =
          interaction.user.dmChannel || (await interaction.user.createDM());
        await dmChannel.send({
          content: `❌ **Mauvais !** (Tentative ${session.attempts.length})\n\n**Historique:**\n${historyLines}\n\n🔍 Voici un crop plus grand...\nCroppe: ${finalCropWidth}x${finalCropHeight}px`,
          files: [
            {
              attachment: newCroppedBuffer,
              name: "splash_crop.png",
            },
          ],
        });

        await interaction.editReply({
          content: `❌ Mauvais ! Image mise à jour en DM. Essaie encore !`,
        });
      }
    } catch (error) {
      console.error("Erreur dans /guess:", error);
      await interaction.editReply({
        content: "❌ Une erreur est survenue. Réessaie plus tard.",
      });
    }
  }
}
