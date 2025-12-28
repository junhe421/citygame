
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Grid, TileData, BuildingType, CityStats, Language, Season, Weather, TerrainType, AdvisorResponse } from './types';
import { GRID_SIZE, BUILDINGS, TICK_RATE_MS, INITIAL_MONEY, ACHIEVEMENTS, TUTORIAL_STEPS } from './constants';
import IsoMap from './components/IsoMap';
import UIOverlay from './components/UIOverlay';
import StartScreen from './components/StartScreen';
import { generateCityAnalysis } from './services/geminiService';

const createInitialGrid = (): Grid => {
  const grid: Grid = [];
  const getHeight = (x: number, y: number) => Math.max(-1, Math.round(Math.sin(x * 0.2) * Math.cos(y * 0.2) * 2));
  const riverX = Array.from({ length: GRID_SIZE }, (_, i) => Math.floor(GRID_SIZE / 2 + Math.sin(i * 0.3) * 5));

  for (let y = 0; y < GRID_SIZE; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      let height = getHeight(x, y);
      let terrain = TerrainType.Grass;
      if (x === riverX[y] || x === riverX[y] + 1) { terrain = TerrainType.Water; height = -1.5; }
      else if (height > 1) { terrain = TerrainType.Mountain; }
      row.push({ x, y, height, terrainType: terrain, buildingType: BuildingType.None, isConnected: false, hasPower: false });
    }
    grid.push(row);
  }
  return grid;
};

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [grid, setGrid] = useState<Grid>(createInitialGrid);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    const save = localStorage.getItem('cityGameSave');
    if (save) setHasSave(true);
  }, []);

  const [stats, setStats] = useState<CityStats>({
    money: INITIAL_MONEY, population: 0, populationCapacity: 0, happiness: 75,
    powerGrid: { total: 0, used: 0 },
    day: 1, time: 8, season: Season.Spring, weather: Weather.Sunny,
    unlockedAchievements: [],
    currentTutorialStep: 0,
    level: 1, experience: 0, nextLevelExp: 1000,
  });
  const [selectedTool, setSelectedTool] = useState<BuildingType>(BuildingType.Road);
  const [aiAnalysis, setAiAnalysis] = useState<AdvisorResponse | null>(null);

  const gridRef = useRef(grid);
  const statsRef = useRef(stats);
  useEffect(() => { gridRef.current = grid; statsRef.current = stats; }, [grid, stats]);

  // Auto-save system
  useEffect(() => {
    if (!gameStarted) return;
    const interval = setInterval(() => {
      localStorage.setItem('cityGameSave', JSON.stringify({ grid: gridRef.current, stats: statsRef.current }));
      // console.log("Game saved");
    }, 30000);
    return () => clearInterval(interval);
  }, [gameStarted]);

  // City Management Loop
  useEffect(() => {
    if (!gameStarted) return;
    const interval = setInterval(() => {
      setStats(prev => {
        let nextTime = (prev.time + 0.5) % 24;
        let nextDay = prev.day;
        if (nextTime < prev.time) nextDay++;

        let dailyRevenue = 0, dailyExpense = 0, totalCapacity = 0, totalPowerGen = 0, totalPowerReq = 0;
        let roadCount = 0, buildingCount = 0;

        gridRef.current.flat().forEach(t => {
          if (t.buildingType === BuildingType.None) return;
          const config = BUILDINGS[t.buildingType];

          dailyExpense += config.maintenance / 48; // split by ticks
          if (t.buildingType === BuildingType.PowerPlant || t.buildingType === BuildingType.NuclearPowerPlant) {
            totalPowerGen += config.powerGen || 0;
          }

          if (t.buildingType !== BuildingType.Road && t.buildingType !== BuildingType.PowerPlant && t.buildingType !== BuildingType.NuclearPowerPlant) {
            totalPowerReq += config.powerReq || 0;
            dailyRevenue += config.incomeGen / 48;
            totalCapacity += config.popGen;
            buildingCount++;
          } else if (t.buildingType === BuildingType.Road) {
            roadCount++;
          }
        });

        const powerFactor = totalPowerGen >= totalPowerReq ? 1.0 : (totalPowerGen / Math.max(1, totalPowerReq));
        const revenue = dailyRevenue * powerFactor; // Industry needs power to make money
        const netIncome = revenue - dailyExpense;

        // Dynamic Population Growth
        const targetPop = Math.floor(totalCapacity * powerFactor);
        let nextPop = prev.population;
        if (prev.population < targetPop && prev.happiness > 50) {
          nextPop += Math.ceil((targetPop - prev.population) * 0.1); // Grow 10% of remaining capacity
        } else if (prev.population > targetPop) {
          nextPop -= Math.ceil((prev.population - targetPop) * 0.2); // Shrink faster
        }

        return {
          ...prev,
          money: prev.money + netIncome,
          population: nextPop,
          populationCapacity: totalCapacity,
          powerGrid: { total: totalPowerGen, used: totalPowerReq },
          time: nextTime, day: nextDay,
          happiness: Math.max(0, Math.min(100, 75 + (totalPowerGen < totalPowerReq ? -20 : 5) + (buildingCount > 0 ? 5 : 0))),
          // currentTutorialStep handled by separate effect
        };
      });
    }, TICK_RATE_MS / 2);
    return () => clearInterval(interval);
  }, [gameStarted]);

  // Progression Watcher (Tutorial & Achievements & Challenges)
  useEffect(() => {
    if (!gameStarted) return;

    // 1. Check Tutorial
    const step = TUTORIAL_STEPS[stats.currentTutorialStep];
    if (step && step.isComplete(stats, grid)) {
      setStats(prev => ({
        ...prev,
        currentTutorialStep: prev.currentTutorialStep + 1,
        money: prev.money + (step.reward || 0),
        // Optional: Add XP?
        experience: prev.experience + 50
      }));
    }

    // 2. Check Achievements
    const newAchievements: string[] = [];
    ACHIEVEMENTS.forEach(ach => {
      if (!stats.unlockedAchievements.includes(ach.id) && ach.condition(stats, grid)) {
        newAchievements.push(ach.id);
      }
    });

    if (newAchievements.length > 0) {
      setStats(prev => ({
        ...prev,
        unlockedAchievements: [...prev.unlockedAchievements, ...newAchievements]
      }));
    }

    // 3. Check Active Challenge
    if (stats.activeChallenge) {
      const chal = stats.activeChallenge;
      let complete = false;

      // Deadline Check
      if (stats.day >= chal.deadlineDay) {
        // FAILED
        setStats(prev => ({ ...prev, activeChallenge: undefined }));
        // TODO: Notification "Challenge Failed"
        return;
      }

      switch (chal.targetType) {
        case 'population': complete = stats.population >= chal.targetValue; break;
        case 'happiness': complete = stats.happiness >= chal.targetValue; break;
        case 'money': complete = stats.money >= chal.targetValue; break;
        case 'power_surplus': complete = (stats.powerGrid.total - stats.powerGrid.used) >= chal.targetValue; break;
        case 'park_count':
          const parks = grid.flat().filter(t => t.buildingType === BuildingType.Park).length;
          complete = parks >= chal.targetValue;
          break;
      }

      if (complete) {
        setStats(prev => ({
          ...prev,
          money: prev.money + chal.reward,
          activeChallenge: undefined,
          // Add a little XP too?
          experience: prev.experience + 100
        }));
        // TODO: Notification "Challenge Complete!"
      }
    }

  }, [grid, stats.population, stats.happiness, stats.currentTutorialStep, gameStarted, stats.money, stats.powerGrid, stats.activeChallenge, stats.day]);

  // AI Advisor Loop
  useEffect(() => {
    if (!gameStarted) return;
    const interval = setInterval(async () => {
      const response = await generateCityAnalysis(statsRef.current, gridRef.current, language);
      setAiAnalysis(response); // Store the full object

      // If there's a new challenge and we don't have one, accept it
      if (response.challenge && !statsRef.current.activeChallenge) {
        setStats(prev => ({
          ...prev,
          activeChallenge: {
            ...response.challenge!,
            deadlineDay: prev.day + response.challenge!.deadlineDuration
          }
        }));
      }

    }, 20000); // Check every 20s
    return () => clearInterval(interval);
  }, [gameStarted, language]);

  const handleTileClick = (x: number, y: number) => {
    if (!gameStarted) return;
    const tile = grid[y][x];
    if (tile.terrainType === TerrainType.Water && selectedTool !== BuildingType.Road && selectedTool !== BuildingType.None) return;

    if (selectedTool === BuildingType.None) {
      setGrid(prev => {
        const next = [...prev];
        next[y][x] = { ...tile, buildingType: BuildingType.None };
        return next;
      });
      return;
    }

    const config = BUILDINGS[selectedTool];

    // Check Level Requirement
    if (stats.level < config.requiredLevel) {
      // Optionally show feedback
      return;
    }

    if (stats.money >= config.cost && tile.buildingType === BuildingType.None) {
      // Logic for Level Up
      let xpGain = Math.max(10, Math.floor(config.cost / 5)); // Gain ~20% of cost as XP

      setStats(prev => {
        let { experience, level, nextLevelExp } = prev;
        experience += xpGain;

        while (experience >= nextLevelExp) {
          level++;
          experience -= nextLevelExp;
          nextLevelExp = Math.floor(nextLevelExp * 1.5);
        }

        return {
          ...prev,
          money: prev.money - config.cost,
          experience,
          level,
          nextLevelExp
        };
      });

      setGrid(prev => {
        const next = [...prev];
        next[y][x] = { ...tile, buildingType: selectedTool };
        return next;
      });
    }
  };

  const handleStart = (ai: boolean, lang: Language) => {
    setLanguage(lang);
    setGameStarted(true);
  };

  const handleContinue = (lang: Language) => {
    try {
      const saveStr = localStorage.getItem('cityGameSave');
      if (saveStr) {
        const save = JSON.parse(saveStr);
        if (save.grid && save.stats) {
          setGrid(save.grid);
          // Ensure new fields exist in loaded stats if migrating
          setStats({
            ...save.stats,
            level: save.stats.level || 1,
            experience: save.stats.experience || 0,
            nextLevelExp: save.stats.nextLevelExp || 1000
          });
          setLanguage(lang);
          setGameStarted(true);
        }
      }
    } catch (e) {
      console.error("Load failed", e);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      <IsoMap grid={grid} onTileClick={handleTileClick} hoveredTool={selectedTool} stats={stats} />

      {!gameStarted && <StartScreen onStart={(_, l) => handleStart(true, l)} hasSave={hasSave} onContinue={(_, l) => handleContinue(l)} />}

      {gameStarted && (
        <UIOverlay
          stats={stats}
          selectedTool={selectedTool}
          onSelectTool={setSelectedTool}
          lang={language}
          onToggleLang={() => setLanguage(l => l === 'en' ? 'zh' : 'en')}
          aiAnalysis={aiAnalysis}
        />
      )}
    </div>
  );
}

export default App;
