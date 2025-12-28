
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { audioManager } from '../services/audioManager';
import { BuildingType, CityStats, Language, Season, Weather, AdvisorResponse } from '../types';
import { BUILDINGS, UI_STRINGS, ACHIEVEMENTS, TUTORIAL_STEPS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins,
  Users,
  Zap,
  Cloud,
  Sun,
  Moon,
  CloudRain,
  Snowflake,
  Trophy,
  X,
  Building2,
  Factory,
  Home,
  Trees,
  ShoppingBag,
  Lightbulb,
  Ban,
  Lock,
  Star,
  Target,
  Clock,
  ArrowRight
} from 'lucide-react';

interface UIOverlayProps {
  stats: CityStats;
  selectedTool: BuildingType;
  onSelectTool: (type: BuildingType) => void;
  lang: Language;
  onToggleLang: () => void;
  aiAnalysis: AdvisorResponse | null;
}

const NumberTicker = ({ value }: { value: number }) => {
  return (
    <motion.span
      key={value}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      className="inline-block"
    >
      {value.toLocaleString()}
    </motion.span>
  );
};

const UIOverlay: React.FC<UIOverlayProps> = ({ stats, selectedTool, onSelectTool, lang, onToggleLang, aiAnalysis }) => {
  const [showAchievements, setShowAchievements] = useState(false);
  const t = (key: string) => UI_STRINGS[key]?.[lang] || key;

  const powerPercentage = Math.min(100, (stats.powerGrid.used / (stats.powerGrid.total || 1)) * 100);
  const isPowerLow = stats.powerGrid.used > stats.powerGrid.total && stats.powerGrid.total > 0;

  const currentTutorialStep = TUTORIAL_STEPS[stats.currentTutorialStep];

  const WeatherIcon = () => {
    if (stats.time < 6 || stats.time > 18) return <Moon className="w-4 h-4 text-indigo-300" />;
    switch (stats.weather) {
      case Weather.Rainy: return <CloudRain className="w-4 h-4 text-blue-400" />;
      case Weather.Snowy: return <Snowflake className="w-4 h-4 text-white" />;
      case Weather.Cloudy: return <Cloud className="w-4 h-4 text-gray-400" />;
      default: return <Sun className="w-4 h-4 text-yellow-400" />;
    }
  };

  const BuildingIcon = ({ type }: { type: BuildingType }) => {
    switch (type) {
      case BuildingType.Residential: return <Home className="w-5 h-5 text-white" />;
      case BuildingType.Commercial: return <ShoppingBag className="w-5 h-5 text-white" />;
      case BuildingType.Industrial: return <Factory className="w-5 h-5 text-white" />;
      case BuildingType.Park: return <Trees className="w-5 h-5 text-white" />;
      case BuildingType.PowerPlant: return <Zap className="w-5 h-5 text-white" />;
      case BuildingType.Skyscraper: return <Building2 className="w-5 h-5 text-white" />; // Use Building2 for Skyscraper
      case BuildingType.NuclearPowerPlant: return <Zap className="w-5 h-5 text-rose-400" />;
      case BuildingType.Road: return <div className="w-5 h-5 border-2 border-white rounded-sm border-dashed" />;
      default: return <Ban className="w-5 h-5 text-white" />;
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10 font-sans text-slate-100 overflow-hidden">

      {/* Top Bar: Glassmorphism Dashboard */}
      <div className="flex justify-between items-start pointer-events-auto w-full max-w-7xl mx-auto">
        <div className="flex gap-4">
          {/* Stats Panel */}
          <motion.div
            initial={{ y: -100 }} animate={{ y: 0 }}
            className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-1 px-6 rounded-2xl shadow-xl flex gap-8 items-center h-16"
          >
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                <Star className="w-3 h-3" /> {t('level')} {stats.level}
              </span>
              <div className="w-24 bg-slate-800/50 h-1.5 rounded-full overflow-hidden border border-white/5 mt-1">
                <motion.div
                  className="h-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (stats.experience / stats.nextLevelExp) * 100)}%` }}
                />
              </div>
            </div>

            <div className="w-px h-8 bg-white/10" />

            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                <Coins className="w-3 h-3" /> {t('treasury')}
              </span>
              <span className="text-xl font-bold font-mono text-emerald-400 flex items-center">
                $<NumberTicker value={Math.floor(stats.money)} />
              </span>
            </div>

            <div className="w-px h-8 bg-white/10" />

            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                <Users className="w-3 h-3" /> {t('population')}
              </span>
              <span className="text-xl font-bold text-white flex items-center">
                <NumberTicker value={stats.population} />
              </span>
            </div>

            <div className="w-px h-8 bg-white/10" />

            <div className="flex flex-col min-w-[100px] gap-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                😊 {t('happiness')}
              </span>
              <div className="w-full bg-slate-800/50 h-2 rounded-full overflow-hidden border border-white/5">
                <motion.div
                  className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.happiness}%` }}
                  transition={{ type: 'spring', bounce: 0, duration: 1 }}
                />
              </div>
            </div>

            <div className="flex flex-col min-w-[120px] gap-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3" /> {t('power')}
              </span>
              <div className="w-full bg-slate-800/50 h-2 rounded-full overflow-hidden border border-white/5 relative">
                <motion.div
                  className={`h-full ${isPowerLow ? 'bg-red-500 animate-pulse' : 'bg-purple-500'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${powerPercentage}%` }}
                />
                <span className="absolute top-0 right-1 text-[8px] leading-[8px] font-mono opacity-60">
                  {stats.powerGrid.used}/{stats.powerGrid.total}
                </span>
              </div>
            </div>
          </motion.div>

          {/* AI Advisor Bubble */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            key={aiAnalysis?.analysis} // Re-animate on change
            className="bg-indigo-600/90 backdrop-blur-md text-white p-3 py-2 rounded-2xl shadow-lg border border-indigo-400/30 max-w-[240px] flex items-start gap-3 relative cursor-pointer hover:bg-indigo-600 transition-colors"
            title={t('ai_advisor')}
          >
            <div className="bg-white/10 p-1.5 rounded-lg">
              <Lightbulb className="w-4 h-4 text-yellow-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-indigo-200 tracking-wider mb-0.5">{t('ai_advisor')}</span>
              <p className="text-[11px] leading-snug font-medium opacity-90">{aiAnalysis?.analysis || "System online."}</p>
            </div>
          </motion.div>
        </div>

        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowAchievements(true)}
            className="w-12 h-12 rounded-xl bg-slate-800/60 backdrop-blur border border-white/10 flex items-center justify-center hover:bg-slate-700/60 transition-colors"
          >
            <Trophy className="w-5 h-5 text-yellow-500" />
          </motion.button>
          <motion.div
            className="h-12 px-4 rounded-xl bg-slate-900/80 backdrop-blur border border-white/10 flex items-center gap-3 text-xs font-mono text-slate-400"
          >
            <WeatherIcon />
            <span className="w-px h-4 bg-white/10" />
            <span>{t(stats.season)}</span>
            <span>Day {stats.day}</span>
            <span>{Math.floor(stats.time)}:00</span>
          </motion.div>
        </div>
      </div>

      {/* Challenge Notification/Tracker */}
      <AnimatePresence>
        {stats.activeChallenge && (
          <motion.div
            initial={{ x: 200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 200, opacity: 0 }}
            className="absolute top-24 right-6 pointer-events-auto w-[320px] z-20"
          >
            <div className="bg-slate-900/90 backdrop-blur-xl border border-rose-500/30 p-5 rounded-2xl shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-bl from-rose-500/10 to-transparent pointer-events-none" />

              <div className="flex items-start gap-3 relative z-10 mb-3">
                <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm tracking-tight">MAYOR CHALLENGE</h3>
                  <p className="text-xs text-rose-300 font-bold uppercase">{stats.activeChallenge.title}</p>
                </div>
              </div>

              <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                {stats.activeChallenge.description}
              </p>

              <div className="flex items-center justify-between text-xs font-mono bg-black/40 p-2 rounded-lg border border-white/5">
                <div className="flex items-center gap-2 text-rose-300">
                  <Clock className="w-3 h-3" />
                  <span>Deadline: Day {stats.activeChallenge.deadlineDay}</span>
                </div>
                <div className="text-emerald-400 font-bold">
                  Reward: ${stats.activeChallenge.reward}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tutorial Panel */}
      <AnimatePresence mode="wait">
        {currentTutorialStep && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            key={currentTutorialStep.id}
            className="absolute top-24 left-6 pointer-events-auto max-w-[320px] z-20"
          >
            <div className="bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 p-5 rounded-2xl shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
              <div className="flex gap-4 items-start relative z-10">
                <div className="mt-0.5 p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 shadow-lg shadow-indigo-500/10">
                  <ArrowRight className="w-5 h-5 absolute animate-subtle-pulse" style={{ opacity: 0.5 }} />
                  <ArrowRight className="w-5 h-5 relative z-10" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-white text-sm tracking-tight">Mission {stats.currentTutorialStep + 1}</h3>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded uppercase tracking-wider">{stats.currentTutorialStep + 1}/{TUTORIAL_STEPS.length}</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed font-medium">
                    {currentTutorialStep.text[lang]}
                  </p>
                  {currentTutorialStep.reward && (
                    <div className="mt-2 text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <Coins className="w-3 h-3" /> Reward: ${currentTutorialStep.reward}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((stats.currentTutorialStep) / TUTORIAL_STEPS.length) * 100}%` }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievements Modal */}
      <AnimatePresence>
        {showAchievements && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-50 p-4"
            onClick={() => setShowAchievements(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-white/10 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
              <button onClick={() => setShowAchievements(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>

              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-yellow-500/20 rounded-2xl border border-yellow-500/30">
                  <Trophy className="w-8 h-8 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">{t('achievements')}</h2>
                  <p className="text-slate-400 text-sm">Track your city's progress</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {ACHIEVEMENTS.map(ach => {
                  const unlocked = stats.unlockedAchievements.includes(ach.id);
                  return (
                    <div key={ach.id} className={`group p-4 rounded-2xl border transition-all ${unlocked ? 'bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'bg-slate-800/30 border-white/5 opacity-50 grayscale'}`}>
                      <div className="flex items-start justify-between mb-1">
                        <h3 className={`font-bold text-sm ${unlocked ? "text-indigo-200" : "text-slate-400"}`}>{ach.name[lang]}</h3>
                        {unlocked && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Unlocked</span>}
                      </div>
                      <p className="text-xs text-slate-400">{ach.description[lang]}</p>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom: Modern Building Dock */}
      <div className="flex justify-center pointer-events-auto pb-4">
        <motion.div
          initial={{ y: 100 }} animate={{ y: 0 }}
          className="flex items-end gap-2 p-3 bg-slate-900/70 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl relative"
        >
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent rounded-3xl pointer-events-none" />

          {[
            BuildingType.None, BuildingType.Road, BuildingType.Residential, BuildingType.Commercial,
            BuildingType.Industrial, BuildingType.Park, BuildingType.PowerPlant,
            BuildingType.Skyscraper, BuildingType.NuclearPowerPlant
          ].map((type) => {
            const isSelected = selectedTool === type;
            const config = BUILDINGS[type];
            const isLocked = stats.level < config.requiredLevel;

            return (
              <motion.button
                key={type}
                onClick={() => {
                  if (!isLocked) {
                    audioManager.playSFX('click');
                    onSelectTool(type);
                    // SInce we can't easily import audioManager here without creating a dep cycle or just importing it:
                    // But UIOverlay doesn't user services usually?
                    // Actually, let's just make onSelectTool trigger the sound in parent?
                    // Or better: import audioManager here.
                  }
                }}
                layout
                className={`group relative flex flex-col items-center gap-2 ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                whileHover={!isLocked ? { y: -10 } : {}}
              >
                {/* Price Tag on Hover */}
                {!isLocked && (
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-12 transition-all bg-slate-900 text-slate-200 text-[10px] px-2 py-1 rounded-lg border border-white/10 shadow-xl whitespace-nowrap z-20">
                    <div className="font-bold">{config.name[lang]}</div>
                    {config.cost > 0 && <div className="text-emerald-400">${config.cost}</div>}
                  </div>
                )}

                {isLocked && (
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-12 transition-all bg-slate-900 text-slate-200 text-[10px] px-2 py-1 rounded-lg border border-red-500/30 shadow-xl whitespace-nowrap z-20">
                    <div className="font-bold text-red-400 flex items-center gap-1"><Lock className="w-3 h-3" /> {t('locked')}</div>
                    <div className="text-slate-400">{t('req_level')} {config.requiredLevel}</div>
                  </div>
                )}

                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 border relative overflow-hidden ${isSelected ? 'shadow-[0_0_20px_rgba(79,70,229,0.5)] border-indigo-400 scale-110 -translate-y-2 z-10' : 'border-white/5 hover:border-white/20 bg-slate-800/40'}`}
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, ${config.color}, #1e293b)`
                      : (isLocked ? '#1e293b' : `linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))`)
                  }}
                >
                  {/* Inner Shine */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {isLocked ? <Lock className="w-5 h-5 text-slate-500" /> : <BuildingIcon type={type} />}
                </div>

                {isSelected && <motion.div layoutId="active-dot" className="w-1 h-1 bg-white rounded-full absolute -bottom-2" />}
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}; // End Component

export default UIOverlay;
