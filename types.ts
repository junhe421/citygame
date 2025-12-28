
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
export enum BuildingType {
  None = 'None',
  Road = 'Road',
  Residential = 'Residential',
  Commercial = 'Commercial',
  Industrial = 'Industrial',
  Park = 'Park',
  PowerPlant = 'PowerPlant',
}

export enum TerrainType {
  Grass = 'Grass',
  Water = 'Water',
  Mountain = 'Mountain',
}

export enum Season { Spring = 'Spring', Summer = 'Summer', Autumn = 'Autumn', Winter = 'Winter' }
export enum Weather { Sunny = 'Sunny', Rainy = 'Rainy', Cloudy = 'Cloudy', Snowy = 'Snowy' }

export type Language = 'en' | 'zh';

export interface BuildingConfig {
  type: BuildingType;
  cost: number;
  maintenance: number; // Daily cost
  name: Record<Language, string>;
  description: Record<Language, string>;
  color: string;
  popGen: number;
  incomeGen: number;
  powerGen?: number; // Power output
  powerReq?: number; // Power consumption
}

export interface TileData {
  x: number;
  y: number;
  height: number;
  terrainType: TerrainType;
  buildingType: BuildingType;
  isConnected: boolean; // Connected to road network
  hasPower: boolean;
}

export type Grid = TileData[][];

export interface Achievement {
  id: string;
  name: Record<Language, string>;
  description: Record<Language, string>;
  condition: (stats: CityStats, grid: Grid) => boolean;
  unlocked: boolean;
}

export interface TutorialStep {
  id: string;
  text: Record<Language, string>;
  isComplete: (stats: CityStats, grid: Grid) => boolean;
}

export interface CityStats {
  money: number;
  population: number;
  populationCapacity: number;
  happiness: number; // 0 - 100
  powerGrid: { total: number; used: number };
  day: number;
  time: number;
  season: Season;
  weather: Weather;
  unlockedAchievements: string[];
  currentTutorialStep: number;
}

export interface AIGoal {
  description: string;
  targetType: 'population' | 'money' | 'building_count' | 'happiness';
  targetValue: number;
  reward: number;
  completed: boolean;
}

export interface NewsItem { id: string; text: string; type: 'positive' | 'negative' | 'neutral'; }
export interface BuildingSentiment { text: string; author: string; }
