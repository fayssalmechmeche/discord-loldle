// src/game/SessionManager.ts

import { Storage } from "../data/storage.js";

export interface GameAttempt {
  championName: string;
  correct: boolean;
}

export interface GameSession {
  userId: string;
  championId: string;
  championName: string;
  attempts: GameAttempt[];
  splashUrl: string;
  startedAt: Date;
  // Pour le zoom progressif
  imageBuffer: Buffer;
  cropLeft: number;
  cropTop: number;
  currentCropSize: number;
  cropSizeProgression: number[];
}

export interface DailyChallengeResult {
  guildId: string;
  userId: string;
  username: string;
  attemptCount: number;
  completedAt: Date;
}

// Stocke les sessions en cours par userId
const sessions = new Map<string, GameSession>();

// Champion du jour global
interface DailyChampion {
  id: string;
  name: string;
  date: string; // Format YYYY-MM-DD pour vérifier si c'est le même jour
  guildId?: string; // ID du serveur où /splash a été exécuté
  channelId?: string; // ID du canal où /splash a été exécuté
}

let dailyChampion: DailyChampion | null = null;

// Résultats du jour (guildId -> userId -> résultats)
const dailyResults = new Map<string, Map<string, DailyChallengeResult>>();
let dailyResultsDate: string = "";

// Configuration par serveur (guildId -> channelId)
const guildSetup = new Map<string, string>();

// Historique long terme (date -> {champion, results})
interface DayHistory {
  champion: DailyChampion;
  results: { [guildId: string]: { [userId: string]: DailyChallengeResult } };
}

interface StoredDayHistory {
  champion: DailyChampion;
  results: {
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
}

let history: Map<string, DayHistory> = new Map();

function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

function loadFromStorage(): void {
  const data = Storage.load();

  // Charger l'historique
  if (data.history) {
    for (const [date, dayData] of Object.entries(data.history)) {
      const storedData = dayData as StoredDayHistory;
      // Convertir les dates de string à Date
      const results: {
        [guildId: string]: { [userId: string]: DailyChallengeResult };
      } = {};
      for (const [guildId, users] of Object.entries(storedData.results)) {
        results[guildId] = {};
        for (const [userId, result] of Object.entries(users)) {
          results[guildId][userId] = {
            ...result,
            completedAt: new Date(result.completedAt),
          };
        }
      }
      history.set(date, {
        champion: storedData.champion,
        results,
      });
    }
  }

  // Charger le champion du jour
  if (data.dailyChampion && data.dailyChampion.date === getTodayDate()) {
    dailyChampion = data.dailyChampion;
    dailyResultsDate = data.dailyResultsDate;
  }

  // Charger les résultats du jour
  if (data.dailyResultsDate === getTodayDate()) {
    for (const [guildId, users] of Object.entries(data.dailyResults)) {
      const guildMap = new Map<string, DailyChallengeResult>();
      for (const [userId, result] of Object.entries(users)) {
        guildMap.set(userId, {
          ...result,
          completedAt: new Date(result.completedAt),
        });
      }
      dailyResults.set(guildId, guildMap);
    }
  }
}

function saveToStorage(): void {
  const resultsData: { [guildId: string]: any } = {};

  for (const [guildId, users] of dailyResults.entries()) {
    resultsData[guildId] = {};
    for (const [userId, result] of users.entries()) {
      resultsData[guildId][userId] = {
        ...result,
        completedAt: result.completedAt.toISOString(),
      };
    }
  }

  // Préparer l'historique pour le stockage (convertir les Dates en strings)
  const historyData: { [date: string]: any } = {};
  for (const [date, dayData] of history.entries()) {
    const resultsForStorage: { [guildId: string]: any } = {};
    for (const [guildId, users] of Object.entries(dayData.results)) {
      resultsForStorage[guildId] = {};
      for (const [userId, result] of Object.entries(users)) {
        resultsForStorage[guildId][userId] = {
          ...result,
          completedAt: result.completedAt.toISOString(),
        };
      }
    }
    historyData[date] = {
      champion: dayData.champion,
      results: resultsForStorage,
    };
  }

  Storage.save({
    dailyChampion,
    dailyResults: resultsData,
    dailyResultsDate,
    history: historyData,
  });
}

function resetDailyIfNeeded(): void {
  const today = getTodayDate();
  if (dailyResultsDate !== today) {
    // Archiver les résultats d'hier dans l'historique si le champion d'hier existe
    if (dailyChampion && dailyChampion.date !== today) {
      const resultsForHistory: {
        [guildId: string]: { [userId: string]: DailyChallengeResult };
      } = {};
      for (const [guildId, users] of dailyResults.entries()) {
        resultsForHistory[guildId] = {};
        for (const [userId, result] of users.entries()) {
          resultsForHistory[guildId][userId] = result;
        }
      }
      history.set(dailyChampion.date, {
        champion: dailyChampion,
        results: resultsForHistory,
      });
    }

    // Réinitialiser pour le nouveau jour
    dailyResults.clear();
    dailyChampion = null;
    dailyResultsDate = today;
    saveToStorage();
  }
}

export const SessionManager = {
  createSession(
    userId: string,
    championId: string,
    championName: string,
    splashUrl: string,
    imageBuffer: Buffer,
    cropLeft: number,
    cropTop: number,
    initialCropSize: number,
  ): GameSession {
    const session: GameSession = {
      userId,
      championId,
      championName,
      attempts: [],
      splashUrl,
      startedAt: new Date(),
      imageBuffer,
      cropLeft,
      cropTop,
      currentCropSize: initialCropSize,
      cropSizeProgression: [150, 280, 420, 600, 800, 1000, 1215],
    };
    sessions.set(userId, session);
    return session;
  },

  getSession(userId: string): GameSession | undefined {
    return sessions.get(userId);
  },

  addAttempt(userId: string, championName: string, correct: boolean): void {
    const session = sessions.get(userId);
    if (session) {
      session.attempts.push({ championName, correct });
    }
  },

  increaseCropSize(userId: string): number | null {
    const session = sessions.get(userId);
    if (!session) return null;

    const currentIndex = session.cropSizeProgression.indexOf(
      session.currentCropSize,
    );
    if (currentIndex < session.cropSizeProgression.length - 1) {
      session.currentCropSize = session.cropSizeProgression[currentIndex + 1];
      return session.currentCropSize;
    }
    return session.currentCropSize; // Retourne la dernière taille
  },

  endSession(userId: string): GameSession | undefined {
    const session = sessions.get(userId);
    sessions.delete(userId);
    return session;
  },

  hasActiveSession(userId: string): boolean {
    return sessions.has(userId);
  },

  // ===== GESTION DU CHAMPION DU JOUR =====
  setDailyChampion(
    championId: string,
    championName: string,
    guildId?: string,
    channelId?: string,
  ): void {
    resetDailyIfNeeded();
    dailyChampion = {
      id: championId,
      name: championName,
      date: getTodayDate(),
      guildId,
      channelId,
    };
    saveToStorage();
  },

  getDailyChampion(): DailyChampion | null {
    resetDailyIfNeeded();
    return dailyChampion;
  },

  // ===== GESTION DES RÉSULTATS DU JOUR =====
  completedTodaysChallenge(guildId: string, userId: string): boolean {
    resetDailyIfNeeded();
    const guildResults = dailyResults.get(guildId);
    if (!guildResults) return false;
    return guildResults.has(userId);
  },

  // Vérifier si l'utilisateur a complété le défi sur n'importe quel serveur
  completedTodaysChallengeAnywhere(userId: string): boolean {
    resetDailyIfNeeded();
    for (const guildResults of dailyResults.values()) {
      if (guildResults.has(userId)) {
        return true;
      }
    }
    return false;
  },

  recordDailyResult(
    guildId: string,
    userId: string,
    username: string,
    attemptCount: number,
  ): void {
    resetDailyIfNeeded();
    if (!dailyResults.has(guildId)) {
      dailyResults.set(guildId, new Map());
    }
    const guildResults = dailyResults.get(guildId)!;
    guildResults.set(userId, {
      guildId,
      userId,
      username,
      attemptCount,
      completedAt: new Date(),
    });
    saveToStorage();
  },

  getDailyResults(guildId: string): DailyChallengeResult[] {
    resetDailyIfNeeded();
    const guildResults = dailyResults.get(guildId);
    if (!guildResults) return [];
    return Array.from(guildResults.values()).sort(
      (a, b) => a.attemptCount - b.attemptCount,
    );
  },

  getDailyResultsForGuild(guildId: string): DailyChallengeResult[] {
    return this.getDailyResults(guildId);
  },

  // ===== INITIALISATION =====
  init(): void {
    loadFromStorage();
    console.log("✅ SessionManager initialisé avec les données persistantes");
  },

  // ===== HISTORIQUE =====
  getHistory(
    days: number = 7,
  ): Array<{ date: string; champion: DailyChampion; resultCount: number }> {
    const result: Array<{
      date: string;
      champion: DailyChampion;
      resultCount: number;
    }> = [];
    const sortedDates = Array.from(history.keys()).sort().reverse();

    for (const date of sortedDates.slice(0, days)) {
      const dayData = history.get(date)!;
      let resultCount = 0;
      for (const guildResults of Object.values(dayData.results)) {
        resultCount += Object.keys(guildResults).length;
      }
      result.push({
        date,
        champion: dayData.champion,
        resultCount,
      });
    }

    return result;
  },

  getHistoryForDate(date: string): DayHistory | null {
    return history.get(date) || null;
  },

  // ===== GESTION DE LA CONFIGURATION PAR SERVEUR =====
  setGuildSetup(guildId: string, channelId: string): void {
    guildSetup.set(guildId, channelId);
  },

  getGuildSetupChannel(guildId: string): string | null {
    return guildSetup.get(guildId) || null;
  },
};
