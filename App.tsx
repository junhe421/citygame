
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Grid, TileData, BuildingType, CityStats, Language, Season, Weather, TerrainType } from './types';
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
  const [stats, setStats] = useState<CityStats>({
    money: INITIAL_MONEY, population: 0, populationCapacity: 0, happiness: 75,
    powerGrid: { total: 0, used: 0 },
    day: 1, time: 8, season: Season.Spring, weather: Weather.Sunny,
    unlockedAchievements: [],
    currentTutorialStep: 0,
  });
  const [selectedTool, setSelectedTool] = useState<BuildingType>(BuildingType.Road);
  const [aiAnalysis, setAiAnalysis] = useState("");

  const gridRef = useRef(grid);
  const statsRef = useRef(stats);
  useEffect(() => { gridRef.current = grid; statsRef.current = stats; }, [grid, stats]);

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
          if (t.buildingType === BuildingType.PowerPlant) totalPowerGen += config.powerGen || 0;

          if (t.buildingType !== BuildingType.Road && t.buildingType !== BuildingType.PowerPlant) {
            totalPowerReq += config.powerReq || 0;
            dailyRevenue += config.incomeGen / 48;
            totalCapacity += config.popGen;
            buildingCount++;
          } else {
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

        // Tutorial Check
        let nextTutorialStep = prev.currentTutorialStep;
        if (TUTORIAL_STEPS[nextTutorialStep] && TUTORIAL_STEPS[nextTutorialStep].isComplete({ ...prev, population: nextPop }, gridRef.current)) {
          nextTutorialStep++;
        }

        return {
          ...prev,
          money: prev.money + netIncome,
          population: nextPop,
          populationCapacity: totalCapacity,
          powerGrid: { total: totalPowerGen, used: totalPowerReq },
          time: nextTime, day: nextDay,
          happiness: Math.max(0, Math.min(100, 75 + (totalPowerGen < totalPowerReq ? -20 : 5) + (buildingCount > 0 ? 5 : 0))),
          currentTutorialStep: nextTutorialStep
        };
      });
    }, TICK_RATE_MS / 2);
    return () => clearInterval(interval);
  }, [gameStarted]);

  // AI Advisor Loop
  useEffect(() => {
    if (!gameStarted) return;
    const interval = setInterval(async () => {
      const analysis = await generateCityAnalysis(statsRef.current, gridRef.current, language);
      setAiAnalysis(analysis);
    }, 15000);
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
    if (stats.money >= config.cost && tile.buildingType === BuildingType.None) {
      setStats(prev => ({ ...prev, money: prev.money - config.cost }));
      setGrid(prev => {
        const next = [...prev];
        next[y][x] = { ...tile, buildingType: selectedTool };
        return next;
      });
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      <IsoMap grid={grid} onTileClick={handleTileClick} hoveredTool={selectedTool} stats={stats} />

      {!gameStarted && <StartScreen onStart={(_, l) => { setLanguage(l); setGameStarted(true); }} />}

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
