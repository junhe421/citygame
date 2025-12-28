
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from "@google/genai";
import { AdvisorResponse, BuildingType, CityStats, Grid, Language } from "../types";

const ai = new GoogleGenAI({
  apiKey: process.env.API_KEY,
  baseUrl: process.env.GEMINI_API_BASE_URL
} as any);
const modelId = 'gemini-1.5-flash';

export const generateCityAnalysis = async (stats: CityStats, grid: Grid, lang: Language): Promise<AdvisorResponse> => {
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
    - Level: ${stats.level}.
    - Power: ${stats.powerGrid.used}/${stats.powerGrid.total} (${powerStatus}).
    - Buildings: ${JSON.stringify(counts)}.
    
    Task: 
    1. Analyze the city status.
    2. If there is a clear problem (low power, low money, low happiness, need more housing) OR if the city is doing well but could grow next, propose a 'Mayor Challenge'.
    3. If everything is just stable/boring, no challenge needed.
    
    Output Format: JSON only, matching the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING, description: "Short 20-word advice." },
            challenge: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                targetType: { type: Type.STRING, enum: ['population', 'happiness', 'money', 'park_count', 'power_surplus'] },
                targetValue: { type: Type.NUMBER },
                reward: { type: Type.NUMBER },
                deadlineDuration: { type: Type.NUMBER, description: "Days to complete" }
              },
              required: ['title', 'description', 'targetType', 'targetValue', 'reward', 'deadlineDuration']
            }
          },
          required: ['analysis']
        }
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AdvisorResponse;
    }
    throw new Error("No response");
  } catch (e) {
    console.error(e);
    return { analysis: lang === 'zh' ? "顾问正在休息。" : "Advisor is offline." };
  }
};
