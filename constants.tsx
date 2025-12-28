
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
    color: '#ef4444', popGen: 0, incomeGen: 0, requiredLevel: 1,
  },
  [BuildingType.Road]: {
    type: BuildingType.Road, cost: 20, maintenance: 2,
    name: { en: 'Road', zh: '道路' },
    description: { en: 'Connects city.', zh: '连接城市。' },
    color: '#334155', popGen: 0, incomeGen: 0, requiredLevel: 1,
  },
  [BuildingType.Residential]: {
    type: BuildingType.Residential, cost: 200, maintenance: 10,
    name: { en: 'Residential', zh: '住宅区' },
    description: { en: 'Housing for 50 people.', zh: '提供50人居住。' },
    color: '#4ade80', popGen: 50, incomeGen: 0, powerReq: 10, requiredLevel: 1,
  },
  [BuildingType.Commercial]: {
    type: BuildingType.Commercial, cost: 500, maintenance: 50,
    name: { en: 'Commercial', zh: '商业区' },
    description: { en: 'Generates $150 tax.', zh: '产生$150税收。' },
    color: '#60a5fa', popGen: 0, incomeGen: 150, powerReq: 30, requiredLevel: 2,
  },
  [BuildingType.Industrial]: {
    type: BuildingType.Industrial, cost: 1000, maintenance: 150,
    name: { en: 'Industrial', zh: '工业区' },
    description: { en: 'High tax ($400).', zh: '高额税收 ($400)。' },
    color: '#fbbf24', popGen: 0, incomeGen: 400, powerReq: 100, requiredLevel: 3,
  },
  [BuildingType.Park]: {
    type: BuildingType.Park, cost: 300, maintenance: 80,
    name: { en: 'Park', zh: '公园' },
    description: { en: 'Boosts happiness.', zh: '提升幸福度。' },
    color: '#22c55e', popGen: 0, incomeGen: 0, powerReq: 5, requiredLevel: 2,
  },
  [BuildingType.PowerPlant]: {
    type: BuildingType.PowerPlant, cost: 2000, maintenance: 500,
    name: { en: 'Power Plant', zh: '发电站' },
    description: { en: 'Provides 1000 units.', zh: '提供1000单位电力。' },
    color: '#8b5cf6', popGen: 0, incomeGen: 0, powerGen: 1000, requiredLevel: 1,
  },
  [BuildingType.Skyscraper]: {
    type: BuildingType.Skyscraper, cost: 5000, maintenance: 400,
    name: { en: 'Skyscraper', zh: '摩天大楼' },
    description: { en: 'Luxury housing (500 pop).', zh: '豪华住宅 (500人口)。' },
    color: '#0ea5e9', popGen: 500, incomeGen: 0, powerReq: 200, requiredLevel: 5,
  },
  [BuildingType.NuclearPowerPlant]: {
    type: BuildingType.NuclearPowerPlant, cost: 10000, maintenance: 2000,
    name: { en: 'Nuclear Plant', zh: '核电站' },
    description: { en: 'Massive power (5000).', zh: '巨量电力 (5000)。' },
    color: '#f43f5e', popGen: 0, incomeGen: 0, powerGen: 5000, requiredLevel: 8,
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
    text: { en: 'Build 3 Road tiles to start your city.', zh: '建造 3 个道路块来开始你的城市。' },
    isComplete: (_, grid) => grid.flat().filter(t => t.buildingType === BuildingType.Road).length >= 3,
    reward: 500
  },
  {
    id: 'zone_residential',
    text: { en: 'Zone 2 Residential areas for people to live.', zh: '规划 2 个住宅区供人居住。' },
    isComplete: (_, grid) => grid.flat().filter(t => t.buildingType === BuildingType.Residential).length >= 2,
    reward: 800
  },
  {
    id: 'power_up',
    text: { en: 'Build a Wind Power Plant to provide electricity.', zh: '建造 1 个风力发电厂提供电力。' },
    isComplete: (_, grid) => grid.flat().some(t => t.buildingType === BuildingType.PowerPlant),
    reward: 1000
  },
  {
    id: 'grow_pop',
    text: { en: 'Reach a population of 50.', zh: '人口达到 50 人。' },
    isComplete: (stats) => stats.population >= 50,
    reward: 1500
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
  continue_game: { en: 'Continue Game', zh: '继续游戏' },
  start_building: { en: 'Start New City', zh: '创建新城市' },
  level: { en: 'Level', zh: '等级' },
  xp: { en: 'XP', zh: '经验' },
  locked: { en: 'Locked', zh: '未解锁' },
  req_level: { en: 'Req. Level', zh: '需要等级' },
};
