
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from "@google/genai";
import { AIGoal, BuildingType, CityStats, Grid, Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelId = 'gemini-3-flash-preview';

export const generateCityAnalysis = async (stats: CityStats, grid: Grid, lang: Language): Promise<string> => {
  const counts: Record<string, number> = {};
  grid.flat().forEach(tile => {
    counts[tile.buildingType] = (counts[tile.buildingType] || 0) + 1;
  });
  
  const powerStatus = stats.powerGrid.used > stats.powerGrid.total ? 'CRITICAL: Blackout' : 'Stable';
  const langName = lang === 'zh' ? 'Chinese' : 'English';
  
  const prompt = `
    Role: Professional City Planning Consultant.
    Language: ${langName}.
    Context:
    - Pop: ${stats.population}, Happiness: ${stats.happiness}%.
    - Money: $${stats.money}.
    - Power: ${stats.powerGrid.used}/${stats.powerGrid.total} (${powerStatus}).
    - Buildings: ${JSON.stringify(counts)}.
    Task: Provide 1 short (max 20 words) urgent advice or observation about this city's management.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: { temperature: 0.8 },
    });
    return response.text || "City status normal.";
  } catch (e) {
    return lang === 'zh' ? "顾问正在休息。" : "Advisor is offline.";
  }
};
