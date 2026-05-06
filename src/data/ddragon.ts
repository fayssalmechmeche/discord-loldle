// src/data/ddragon.ts

const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";

let cachedVersion: string | null = null;

export async function getLatestVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion;
  const res = await fetch(`${DDRAGON_BASE}/api/versions.json`);
  const versions: string[] = await res.json();
  cachedVersion = versions[0];
  return cachedVersion;
}

export async function getChampionList() {
  const version = await getLatestVersion();
  const res = await fetch(
    `${DDRAGON_BASE}/cdn/${version}/data/fr_FR/champion.json`,
  );
  const data = await res.json();
  return data.data;
}

export async function getChampionDetail(championId: string) {
  const version = await getLatestVersion();
  const res = await fetch(
    `${DDRAGON_BASE}/cdn/${version}/data/fr_FR/champion/${championId}.json`,
  );
  const data = await res.json();
  return data.data[championId];
}

export function getSplashUrl(championId: string, skinNum = 0): string {
  return `${DDRAGON_BASE}/cdn/img/champion/splash/${championId}_${skinNum}.jpg`;
}

export function getSpellIconUrl(spellId: string): string {
  return `${DDRAGON_BASE}/cdn/${cachedVersion}/img/spell/${spellId}.png`;
}

export async function getValidSplashUrl(
  championId: string,
  skinNums: number[],
): Promise<string> {
  // Mélanger les numéros de skin et chercher un qui existe
  const shuffled = [...skinNums].sort(() => Math.random() - 0.5);

  for (const skinNum of shuffled) {
    const url = getSplashUrl(championId, skinNum);
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) {
        return url;
      }
    } catch {
      // Continue to next skin
    }
  }

  // Fallback au skin 0 (devrait toujours exister)
  return getSplashUrl(championId, 0);
}
