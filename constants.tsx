
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { BuildingConfig, BuildingType, Language, Achievement, TutorialStep } from './types';

export const GRID_SIZE = 45;
export const TICK_RATE_MS = 2000;
export const INITIAL_MONEY = 5000;

export const BUILDINGS: Record<BuildingType, BuildingConfig> = {
  [BuildingType.None]: {
    type: BuildingType.None, cost: 0, maintenance: 0,
    name: { en: 'Bulldoze', zh: '推土机' },
    description: { en: 'Clear a tile', zh: '清除地块' },
    color: '#ef4444', popGen: 0, incomeGen: 0,
  },
  [BuildingType.Road]: {
    type: BuildingType.Road, cost: 20, maintenance: 2,
    name: { en: 'Road', zh: '道路' },
    description: { en: 'Connects city.', zh: '连接城市。' },
    color: '#334155', popGen: 0, incomeGen: 0,
  },
  [BuildingType.Residential]: {
    type: BuildingType.Residential, cost: 200, maintenance: 10,
    name: { en: 'Residential', zh: '住宅区' },
    description: { en: 'Housing for 50 people.', zh: '提供50人居住。' },
    color: '#4ade80', popGen: 50, incomeGen: 0, powerReq: 10,
  },
  [BuildingType.Commercial]: {
    type: BuildingType.Commercial, cost: 500, maintenance: 50,
    name: { en: 'Commercial', zh: '商业区' },
    description: { en: 'Generates $150 tax.', zh: '产生$150税收。' },
    color: '#60a5fa', popGen: 0, incomeGen: 150, powerReq: 30,
  },
  [BuildingType.Industrial]: {
    type: BuildingType.Industrial, cost: 1000, maintenance: 150,
    name: { en: 'Industrial', zh: '工业区' },
    description: { en: 'High tax ($400).', zh: '高额税收 ($400)。' },
    color: '#fbbf24', popGen: 0, incomeGen: 400, powerReq: 100,
  },
  [BuildingType.Park]: {
    type: BuildingType.Park, cost: 300, maintenance: 80,
    name: { en: 'Park', zh: '公园' },
    description: { en: 'Boosts happiness.', zh: '提升幸福度。' },
    color: '#22c55e', popGen: 0, incomeGen: 0, powerReq: 5,
  },
  [BuildingType.PowerPlant]: {
    type: BuildingType.PowerPlant, cost: 2000, maintenance: 500,
    name: { en: 'Power Plant', zh: '发电站' },
    description: { en: 'Provides 1000 units.', zh: '提供1000单位电力。' },
    color: '#8b5cf6', popGen: 0, incomeGen: 0, powerGen: 1000,
  },
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'green_city',
    name: { en: 'Eco-City', zh: '生态城市' },
    description: { en: 'Happiness above 90%.', zh: '幸福度超过90%。' },
    condition: (s) => s.happiness >= 90 && s.population > 100,
    unlocked: false,
  },
  {
    id: 'megalopolis',
    name: { en: 'Megalopolis', zh: '巨型都市' },
    description: { en: 'Population reaches 5000.', zh: '人口达到5000。' },
    condition: (s) => s.population >= 5000,
    unlocked: false,
  }
];
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'build_road',
    text: { en: 'Welcome! Build a Road to start your city.', zh: '欢迎！请建造一条道路来开始你的城市。' },
    isComplete: (_, grid) => grid.some(row => row.some(t => t.buildingType === BuildingType.Road)),
  },
  {
    id: 'build_house',
    text: { en: 'Great! Now zone a Residential area.', zh: '很好！现在规划一个住宅区。' },
    isComplete: (_, grid) => grid.some(row => row.some(t => t.buildingType === BuildingType.Residential)),
  },
  {
    id: 'build_power',
    text: { en: 'People need power! Build a Power Plant.', zh: '人们需要电力！建造一个发电厂。' },
    isComplete: (_, grid) => grid.some(row => row.some(t => t.buildingType === BuildingType.PowerPlant)),
  },
  {
    id: 'growth',
    text: { en: 'Watch your population grow to 50.', zh: '看着你的城市人口增长到50。' },
    isComplete: (s) => s.population >= 50,
  },
  {
    id: 'zone_commercial',
    text: { en: 'We need jobs! Build a Commercial zone.', zh: '我们需要工作！规划一个商业区。' },
    isComplete: (_, grid) => grid.some(row => row.some(t => t.buildingType === BuildingType.Commercial)),
  },
  {
    id: 'reach_500',
    text: { en: 'Expand your city to 500 population.', zh: '将城市人口扩展到500。' },
    isComplete: (s) => s.population >= 500,
  }
];

export const UI_STRINGS: Record<string, Record<Language, string>> = {
  happiness: { en: 'Happiness', zh: '幸福度' },
  power: { en: 'Power', zh: '电力' },
  maintenance: { en: 'Maintenance', zh: '支出' },
  revenue: { en: 'Revenue', zh: '收入' },
  treasury: { en: 'Treasury', zh: '国库' },
  citizens: { en: 'Citizens', zh: '市民' },
  ai_advisor: { en: 'AI Consultant', zh: 'AI 顾问' },
};
