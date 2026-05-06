// src/game/SessionManager.ts

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

// Stocke les sessions en cours par userId
const sessions = new Map<string, GameSession>();

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
};
