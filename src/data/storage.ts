import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

interface StorageData {
  dailyChampion: {
    id: string;
    name: string;
    date: string;
  } | null;
  dailyResults: {
    [guildId: string]: {
      [userId: string]: {
        guildId: string;
        userId: string;
        username: string;
        attemptCount: number;
        completedAt: string;
      };
    };
  };
  dailyResultsDate: string;
}

const DATA_DIR = join(process.cwd(), "data");
const STORAGE_FILE = join(DATA_DIR, "loldle_data.json");

// Crée le répertoire data s'il n'existe pas
function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export const Storage = {
  // Charger les données depuis le fichier JSON
  load(): StorageData {
    ensureDataDir();

    try {
      if (existsSync(STORAGE_FILE)) {
        const data = readFileSync(STORAGE_FILE, "utf-8");
        const parsed = JSON.parse(data);
        console.log("✅ Données chargées depuis le stockage persistant");
        return parsed;
      }
    } catch (error) {
      console.error("⚠️ Erreur lors de la lecture du stockage:", error);
    }

    // Retourner les données par défaut si le fichier n'existe pas
    return {
      dailyChampion: null,
      dailyResults: {},
      dailyResultsDate: "",
    };
  },

  // Sauvegarder les données dans le fichier JSON
  save(data: StorageData): void {
    try {
      ensureDataDir();
      writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde du stockage:", error);
    }
  },
};
