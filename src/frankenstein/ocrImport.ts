import type { PlayerLevel } from './types';
import { PLAYER_LEVELS } from './types';

export interface ParsedPlayer {
  name: string;
  level: PlayerLevel;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Convert a File to a base64 data string (without the data:... prefix).
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:image/...;base64," prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Map raw tower level (1-10) to our PlayerLevel enum (I2, I4, I6, I8, I10).
 */
export function mapToPlayerLevel(towerLevel: number): PlayerLevel {
  const clamped = Math.min(10, Math.max(2, Math.round(towerLevel / 2) * 2));
  return `I${clamped}` as PlayerLevel;
}

/**
 * Send image to Gemini Vision API and ask it to extract player names + tower levels.
 * Returns structured player data.
 */
export async function runOcrOnImage(
  imageFile: File,
  onProgress?: (progress: number) => void,
): Promise<{ rawText: string; suggestions: ParsedPlayer[] }> {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing Gemini API key. Add VITE_GEMINI_API_KEY to .env file');
  }

  onProgress?.(10);

  const base64 = await fileToBase64(imageFile);
  const mimeType = imageFile.type || 'image/png';

  onProgress?.(20);

  const prompt = `This is a screenshot from a mobile game showing alliance members list.
For each player visible in the image, extract:
1. Their nickname/name (the bold text next to their avatar)
2. Their tower/HQ level (the number shown on a colored badge, usually red/yellow, near a castle/tower icon)

Return ONLY a JSON array with objects like: [{"name": "PlayerName", "level": 7}]
- "name" should be the exact player nickname as shown
- "level" should be the tower level number (1-10)
- Do NOT include any other text, markdown, or explanation — ONLY the JSON array
- If you cannot determine the level, use 0`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
        ],
      },
    ],
  };

  onProgress?.(30);

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  onProgress?.(80);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Gemini] API error:', errorText);
    if (response.status === 429) {
      throw new Error('QUOTA_EXCEEDED');
    }
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  console.log('[Gemini] Raw response:', rawText);

  onProgress?.(90);

  // Parse the JSON from Gemini's response
  const suggestions = parseGeminiResponse(rawText);

  onProgress?.(100);

  return { rawText, suggestions };
}

/**
 * Parse Gemini's response (should be a JSON array) into ParsedPlayer[].
 */
function parseGeminiResponse(text: string): ParsedPlayer[] {
  try {
    // Strip markdown code fences if present
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const arr = JSON.parse(cleaned);
    if (!Array.isArray(arr)) return [];

    const players: ParsedPlayer[] = [];
    for (const item of arr) {
      if (!item.name || typeof item.name !== 'string') continue;
      const name = item.name.trim();
      if (name.length < 2 || name.length > 25) continue;

      const rawLevel = typeof item.level === 'number' ? item.level : parseInt(item.level, 10);
      const level: PlayerLevel = (rawLevel >= 1 && rawLevel <= 10)
        ? mapToPlayerLevel(rawLevel)
        : 'I2';

      players.push({ name, level });
    }

    return players;
  } catch (err) {
    console.error('[Gemini] Failed to parse response:', err);
    return [];
  }
}

/** Validate that a level string is valid */
export function isValidLevel(s: string): s is PlayerLevel {
  return (PLAYER_LEVELS as readonly string[]).includes(s);
}
