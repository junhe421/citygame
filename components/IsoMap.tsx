/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber';
import { MapControls, Environment, Float, Outlines, OrthographicCamera, Text, Instances, Instance } from '@react-three/drei';
import { EffectComposer, Bloom, TiltShift2, Vignette, Noise, SSAO } from '@react-three/postprocessing';
import * as THREE from 'three';
import { MathUtils } from 'three';
import { Grid, BuildingType, Season, Weather, TerrainType } from '../types';
import { GRID_SIZE, BUILDINGS } from '../constants';

const WORLD_OFFSET = GRID_SIZE / 2 - 0.5;
const gridToWorld = (x: number, y: number, h: number) => [x - WORLD_OFFSET, h * 0.5, y - WORLD_OFFSET] as [number, number, number];
const getHash = (x: number, y: number) => Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
const sphereGeo = new THREE.SphereGeometry(1, 8, 8);

const getGroundColor = (season: Season, terrain: TerrainType, noise: number) => {
  if (terrain === TerrainType.Water) return '#1e40af';
  if (terrain === TerrainType.Mountain) {
    return season === Season.Winter ? '#cbd5e1' : '#475569';
  }
  switch (season) {
    case Season.Spring: return noise > 0.5 ? '#4ade80' : '#22c55e';
    case Season.Summer: return noise > 0.5 ? '#16a34a' : '#15803d';
    case Season.Autumn: return noise > 0.7 ? '#ea580c' : '#ca8a04';
    case Season.Winter: return '#f8fafc';
    default: return '#10b981';
  }
};

const WindowBlock = React.memo(({ position, scale, isNight }: { position: [number, number, number], scale: [number, number, number], isNight: boolean }) => (
  <mesh geometry={boxGeo} position={position} scale={scale}>
    <meshStandardMaterial
      color={isNight ? "#fbbf24" : "#bfdbfe"}
      emissive={isNight ? "#fbbf24" : "#bfdbfe"}
      emissiveIntensity={isNight ? 3 : 0.5}
      toneMapped={false}
    />
  </mesh>
));

const Shockwave = ({ position }: { position: [number, number, number] }) => {
  const ringRef = useRef<THREE.Mesh>(null);
  const [active, setActive] = useState(true);

  useFrame((state, delta) => {
    if (!active || !ringRef.current) return;
    const mesh = ringRef.current;
    mesh.scale.x += delta * 3;
    mesh.scale.y += delta * 3;
    (mesh.material as THREE.MeshBasicMaterial).opacity -= delta * 1.5;
    if ((mesh.material as THREE.MeshBasicMaterial).opacity <= 0) setActive(false);
  });

  if (!active) return null;

  return (
    <mesh ref={ringRef} position={[position[0], 0.1, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.5, 0.7, 32]} />
      <meshBasicMaterial color="white" transparent opacity={1} toneMapped={false} />
    </mesh>
  );
};

const FloatingTextItem = ({ text, position, onComplete }: { text: string, position: [number, number, number], onComplete: () => void }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.position.y += delta * 1.5;
      ref.current.scale.multiplyScalar(0.99);
      if (ref.current.position.y > position[1] + 3) onComplete();
    }
  });

  return (
    <group ref={ref} position={position}>
      <Text
        color="#84cc16"
        fontSize={0.5}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#1a2e05"
      >
        {text}
      </Text>
    </group>
  );
};

const WeatherParticles = ({ weather }: { weather: Weather }) => {
  const count = 1500; // optimized count
  const mesh = useRef<THREE.Points>(null);
  const particles = useMemo(() => {
    const temp = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      temp[i * 3] = (Math.random() - 0.5) * 50;
      temp[i * 3 + 1] = Math.random() * 20;
      temp[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return temp;
  }, []);

  const isSnow = weather === Weather.Snowy;
  const isRain = weather === Weather.Rainy;

  useFrame((_, delta) => {
    if (!mesh.current || (!isSnow && !isRain)) return;
    const positions = mesh.current.geometry.attributes.position.array as Float32Array;
    const speed = isRain ? 25 : 2;
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] -= delta * speed;
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = 20;
        positions[i * 3] = (Math.random() - 0.5) * 50;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      }
    }
    mesh.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!isSnow && !isRain) return null;

  return (
    <points ref={mesh} raycast={() => null}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={particles} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={isRain ? 0.05 : 0.15}
        color={isRain ? "#93c5fd" : "#ffffff"}
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};


const TrafficRoad = ({ position, isNight }: { position: [number, number, number], isNight: boolean }) => {
  const ref = useRef<THREE.Group>(null);
  const cars = useMemo(() => Array.from({ length: 4 }).map(() => ({
    offset: Math.random(),
    speed: 0.5 + Math.random() * 0.8,
    lane: Math.random() > 0.5 ? 0.2 : -0.2,
    color: Math.random() > 0.5 ? '#ef4444' : '#fcd34d'
  })), []);

  useFrame((state, delta) => {
    if (!ref.current || !isNight) {
      if (ref.current) ref.current.visible = false;
      return;
    }
    ref.current.visible = true;
    ref.current.children.forEach((child, i) => {
      const car = cars[i];
      car.offset = (car.offset + delta * car.speed) % 1;
      child.position.z = (car.offset - 0.5);
      child.position.x = car.lane;
    });
  });

  return (
    <group ref={ref} position={[position[0], position[1] + 0.05, position[2]]}>
      {cars.map((c, i) => (
        <mesh key={i} position={[0, 0, 0]} scale={[0.1, 0.05, 0.1]}>
          <boxGeometry />
          <meshBasicMaterial color={c.color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

const SnowLayer = ({ position, scale, enabled }: { position: [number, number, number], scale: [number, number, number], enabled: boolean }) => {
  if (!enabled) return null;
  return (
    <mesh position={[position[0], position[1] + scale[1] / 2 + 0.01, position[2]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[scale[0] * 1.05, scale[2] * 1.05]} />
      <meshStandardMaterial color="#f8fafc" roughness={0.9} />
    </mesh>
  );
};

const RotatingFeature = ({ type, position, color }: { type: 'fan' | 'radar', position: [number, number, number], color: string }) => {
  const meshRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * (type === 'fan' ? 5 : 2);
  });
  return (
    <group ref={meshRef} position={position}>
      {type === 'fan' ? (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.4, 0.05, 0.05]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, Math.PI / 2]}>
            <boxGeometry args={[0.4, 0.05, 0.05]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
        </group>
      ) : (
        <group>
          <mesh rotation={[0.5, 0, 0]} position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.02, 0.3, 0.05, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.2]} /><meshStandardMaterial color="gray" /></mesh>
        </group>
      )}
    </group>
  );
};

const EnhancedBuilding = React.memo(({ type, baseColor, x, y, isNight, season, h, weather }: { type: BuildingType, baseColor: string, x: number, y: number, isNight: boolean, season: Season, h: number, weather: Weather }) => {
  const hash = getHash(x, y);
  const variant = Math.floor(hash * 30) % 3; // 0, 1, 2
  const isWinter = season === Season.Winter;
  const isRain = weather === Weather.Rainy;
  const roughness = isRain ? 0.1 : 0.3; // Wet effect

  const color = useMemo(() => new THREE.Color(baseColor).offsetHSL(0, 0, (hash - 0.5) * 0.1), [baseColor, hash]);
  // Re-create materials when roughness changes
  const mainMat = useMemo(() => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness, metalness: isRain ? 0.3 : 0.1 }), [color, roughness, isRain]);
  const darkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.7), flatShading: true, roughness: roughness + 0.1 }), [color, roughness]);

  return (
    <group position={[0, h * 0.5 + 0.2, 0]}>
      {(() => {
        switch (type) {
          case BuildingType.Residential:
            if (variant === 0) {
              return <group>
                <mesh castShadow receiveShadow material={mainMat} geometry={boxGeo} position={[0, 0.35, 0]} scale={[0.8, 0.7, 0.8]} />
                <WindowBlock position={[0, 0.35, 0.41]} scale={[0.2, 0.2, 0.05]} isNight={isNight} />
                <mesh position={[0, 0.85, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
                  <coneGeometry args={[0.8, 0.4, 4]} />
                  <meshStandardMaterial color={isWinter ? "#f1f5f9" : "#7c2d12"} />
                </mesh>
              </group>
            }
            if (variant === 1) return <group>
              <mesh castShadow receiveShadow material={mainMat} geometry={boxGeo} position={[0, 0.5, 0]} scale={[0.7, 1.0, 0.7]} />
              <WindowBlock position={[0.2, 0.7, 0.36]} scale={[0.15, 0.15, 0.05]} isNight={isNight} />
              <WindowBlock position={[-0.2, 0.4, 0.36]} scale={[0.15, 0.15, 0.05]} isNight={isNight} />
              <SnowLayer position={[0, 0.5, 0]} scale={[0.7, 1.0, 0.7]} enabled={isWinter} />
            </group>
            return <group>
              <mesh castShadow receiveShadow material={mainMat} geometry={boxGeo} position={[-0.1, 0.4, -0.1]} scale={[0.6, 0.8, 0.6]} />
              <mesh castShadow receiveShadow material={darkMat} geometry={boxGeo} position={[0.2, 0.25, 0.2]} scale={[0.5, 0.5, 0.5]} />
              <SnowLayer position={[-0.1, 0.4, -0.1]} scale={[0.6, 0.8, 0.6]} enabled={isWinter} />
              <SnowLayer position={[0.2, 0.25, 0.2]} scale={[0.5, 0.5, 0.5]} enabled={isWinter} />
            </group>

          case BuildingType.Commercial:
            const billboardPos: [number, number, number] = variant === 0 ? [0.41, 0.5, 0] : [0, 0.85, 0.41];
            return <group>
              {variant === 0 ? (
                <mesh castShadow receiveShadow material={mainMat} position={[0, 0.5, 0]} scale={[0.8, 1, 0.8]} geometry={boxGeo} />
              ) : (
                <group>
                  <mesh castShadow receiveShadow material={mainMat} position={[0, 0.4, 0]} scale={[0.9, 0.8, 0.9]} geometry={boxGeo} />
                  <mesh castShadow receiveShadow material={darkMat} position={[0, 0.9, 0]} scale={[0.6, 0.4, 0.6]} geometry={boxGeo} />
                </group>
              )}
              {/* Billboard */}
              <mesh position={billboardPos} rotation={[0, variant === 0 ? Math.PI / 2 : 0, 0]}>
                <planeGeometry args={[0.3, 0.2]} />
                <meshStandardMaterial color={isNight ? "#d946ef" : "#86198f"} emissive="#d946ef" emissiveIntensity={isNight ? 3 : 0} toneMapped={false} />
              </mesh>
              <SnowLayer position={[0, variant === 0 ? 0.5 : 1.1, 0]} scale={[0.8, variant === 0 ? 1 : 0.4, 0.8]} enabled={isWinter} />
            </group>

          case BuildingType.Industrial:
            return <group>
              <mesh castShadow receiveShadow material={mainMat} position={[0, 0.4, 0]} scale={[0.9, 0.8, 0.9]} geometry={boxGeo} />
              <RotatingFeature type={variant % 2 === 0 ? 'fan' : 'radar'} position={[0, 0.85, 0]} color="#ef4444" />
              <SnowLayer position={[0, 0.4, 0]} scale={[0.9, 0.8, 0.9]} enabled={isWinter} />
            </group>

          case BuildingType.Park:
            return <group position={[0, 0.3, 0]}>
              <mesh castShadow receiveShadow geometry={sphereGeo} scale={0.4} material={new THREE.MeshStandardMaterial({ color: isWinter ? '#f1f5f9' : '#166534' })} />
              <mesh castShadow receiveShadow geometry={cylinderGeo} position={[0, -0.3, 0]} scale={[0.1, 0.4, 0.1]} material={new THREE.MeshStandardMaterial({ color: '#78350f' })} />
            </group>

          case BuildingType.PowerPlant:
            return <group>
              <mesh castShadow receiveShadow material={mainMat} geometry={boxGeo} position={[0, 0.5, 0]} scale={[0.9, 1.2, 0.9]} />
              <mesh position={[0, 1.2, 0]}>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshStandardMaterial color="#8b5cf6" emissive="#a78bfa" emissiveIntensity={isNight ? 5 : 1} toneMapped={false} />
              </mesh>
              <SnowLayer position={[0, 0.5, 0]} scale={[0.9, 1.2, 0.9]} enabled={isWinter} />
            </group>

          case BuildingType.Skyscraper:
            return <group>
              <mesh castShadow receiveShadow material={mainMat} geometry={boxGeo} position={[0, 1.5, 0]} scale={[0.7, 3, 0.7]} />
              <WindowBlock position={[0, 1.5, 0.36]} scale={[0.5, 2.5, 0.1]} isNight={isNight} />
              <WindowBlock position={[0.36, 2.0, 0]} scale={[0.1, 1.5, 0.5]} isNight={isNight} />
              <WindowBlock position={[-0.36, 1.0, 0]} scale={[0.1, 1.5, 0.5]} isNight={isNight} />
              {/* Antenna */}
              <mesh position={[0, 3.2, 0]}>
                <cylinderGeometry args={[0.02, 0.05, 0.5, 8]} />
                <meshStandardMaterial color="#94a3b8" />
              </mesh>
              <mesh position={[0, 3.45, 0]}>
                <sphereGeometry args={[0.05]} />
                <meshStandardMaterial color="red" emissive="red" emissiveIntensity={2} />
              </mesh>
            </group>

          case BuildingType.NuclearPowerPlant:
            return <group>
              {/* Reactor Dome */}
              <mesh castShadow receiveShadow geometry={sphereGeo} position={[0, 0.4, 0]} scale={[0.6, 0.5, 0.6]} material={mainMat} />
              {/* Cooling Towers */}
              <mesh castShadow receiveShadow position={[-0.3, 0.6, -0.3]} rotation={[0, 0, 0]}>
                <cylinderGeometry args={[0.15, 0.25, 0.8, 16, 1, true]} />
                <meshStandardMaterial color="#e5e7eb" side={THREE.DoubleSide} />
              </mesh>
              <mesh castShadow receiveShadow position={[0.3, 0.6, 0.2]} rotation={[0, 0, 0]}>
                <cylinderGeometry args={[0.15, 0.25, 0.8, 16, 1, true]} />
                <meshStandardMaterial color="#e5e7eb" side={THREE.DoubleSide} />
              </mesh>
              {/* Glow */}
              <pointLight position={[0, 0.5, 0]} color="#10b981" intensity={2} distance={3} />
            </group>

          default: return null;
        }
      })()}
    </group>
  );
});

const WaterSystem = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = -0.65 + Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
  });
  return (
    <mesh ref={meshRef} position={[0, -0.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[GRID_SIZE + 20, GRID_SIZE + 20]} />
      <meshStandardMaterial color="#2563eb" transparent opacity={0.6} roughness={0.0} metalness={0.8} />
    </mesh>
  );
};

interface IsoMapProps {
  grid: Grid;
  onTileClick: (x: number, y: number) => void;
  hoveredTool: BuildingType;
  stats: any;
}

const GroundInstances = React.memo(({ grid, stats, onTileClick, onHover }: {
  grid: Grid,
  stats: any,
  onTileClick: (x: number, y: number) => void,
  onHover: (x: number, y: number) => void
}) => {
  const isRain = stats.weather === Weather.Rainy;

  // Flatten grid for Instances
  const instancesData = useMemo(() => {
    const data: { x: number, y: number, position: [number, number, number], color: string, scale: [number, number, number] }[] = [];
    grid.forEach((row, y) => {
      row.forEach((tile, x) => {
        if (tile.terrainType === TerrainType.Water) return;

        const [wx, wh, wz] = gridToWorld(x, y, tile.height);
        const noise = getHash(x, y);
        const isRoad = tile.buildingType === BuildingType.Road;
        const color = isRoad ? "#374151" : getGroundColor(stats.season, tile.terrainType, noise);

        data.push({
          x, y,
          position: [wx, wh - 0.5, wz],
          color,
          scale: [1, 0.5 + tile.height * 0.5, 1]
        });
      });
    });
    return data;
  }, [grid, stats.season]);

  return (
    <Instances
      range={instancesData.length}
      geometry={boxGeo}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        roughness={isRain ? 0.2 : 0.9}
        metalness={isRain ? 0.3 : 0.0}
      />
      {instancesData.map((d, i) => (
        <Instance
          key={`${d.x} -${d.y} `}
          position={d.position}
          scale={d.scale}
          color={d.color}
          onClick={(e) => { e.stopPropagation(); onTileClick(d.x, d.y); }}
          onPointerEnter={(e) => { e.stopPropagation(); onHover(d.x, d.y); }}
        />
      ))}
    </Instances>
  );
});

const IsoMap: React.FC<IsoMapProps> = ({ grid, onTileClick, hoveredTool, stats }) => {
  const [hoveredTile, setHoveredTile] = useState<{ x: number, y: number } | null>(null);
  const [effects, setEffects] = useState<{ id: number, type: 'shockwave' | 'text', position: [number, number, number], text?: string }[]>([]);
  const prevGridRef = useRef<Grid>(grid);

  // Monitor grid changes for placement effects
  useEffect(() => {
    const prev = prevGridRef.current;
    if (prev === grid) return;

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (grid[y][x].buildingType !== prev[y][x].buildingType && grid[y][x].buildingType !== BuildingType.None) {
          const [wx, wh, wz] = gridToWorld(x, y, grid[y][x].height);
          const cost = BUILDINGS[grid[y][x].buildingType].cost;

          // Add Shockwave
          setEffects(prev => [...prev, { id: Date.now() + Math.random(), type: 'shockwave', position: [wx, wh + 0.1, wz] }]);

          // Add Floating Text
          setEffects(prev => [...prev, { id: Date.now() + Math.random() + 1, type: 'text', position: [wx, wh + 1, wz], text: `- $${cost} ` }]);
        }
      }
    }
    prevGridRef.current = grid;
  }, [grid]);

  // Cleanup effects
  const removeEffect = useCallback((id: number) => {
    setEffects(prev => prev.filter(e => e.id !== id));
  }, []);

  const isNight = stats.time < 6 || stats.time > 18;
  const isRain = stats.weather === Weather.Rainy;
  const skyColor = isNight ? "#020617" : (stats.weather === Weather.Rainy ? "#334155" : "#0c4a6e");

  return (
    <div className="absolute inset-0 touch-none" style={{ backgroundColor: skyColor }}>
      <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: false, stencil: false, depth: true, powerPreference: "high-performance" }}>
        <OrthographicCamera makeDefault zoom={25} position={[60, 60, 60]} near={-500} far={1000} />
        <MapControls enableRotate={true} minZoom={10} maxZoom={100} target={[0, -0.5, 0]} />

        <ambientLight intensity={isNight ? 0.2 : 0.6} />
        <directionalLight
          castShadow
          position={[30, 50, 20]}
          intensity={isNight ? 0.4 : 1.8}
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0001}
        />
        <Environment preset={isNight ? "night" : "city"} />

        <WeatherParticles weather={stats.weather} />
        <WaterSystem />

        {/* Instanced Ground Layer */}
        <GroundInstances
          grid={grid}
          stats={stats}
          onTileClick={onTileClick}
          onHover={(x, y) => setHoveredTile({ x, y })}
        />

        <group>
          {grid.map((row, y) => row.map((tile, x) => {
            const [wx, wh, wz] = gridToWorld(x, y, tile.height);
            const isRoad = tile.buildingType === BuildingType.Road;

            return (
              <React.Fragment key={`${x} -${y} -obj`}>
                {/* Traffic - Keep as is for now */}
                {isRoad && <TrafficRoad position={[wx, wh, wz]} isNight={isNight} />}

                {/* Buildings - Keep for distinct geometries */}
                {tile.buildingType !== BuildingType.None && !isRoad && (
                  <group
                    position={[wx, wh - 0.5, wz]}
                    onPointerDown={(e) => { e.stopPropagation(); onTileClick(x, y); }}
                    onPointerEnter={(e) => { e.stopPropagation(); setHoveredTile({ x, y }); }}
                  >
                    <EnhancedBuilding
                      type={tile.buildingType}
                      baseColor={BUILDINGS[tile.buildingType].color}
                      x={x} y={y}
                      isNight={isNight}
                      season={stats.season}
                      h={tile.height}
                      weather={stats.weather}
                    />
                  </group>
                )}
              </React.Fragment>
            );
          }))}

          {hoveredTile && grid[hoveredTile.y] && grid[hoveredTile.y][hoveredTile.x] && (
            <mesh position={[grid[hoveredTile.y][hoveredTile.x].x - WORLD_OFFSET, grid[hoveredTile.y][hoveredTile.x].height * 0.5 - 0.24, grid[hoveredTile.y][hoveredTile.x].y - WORLD_OFFSET]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial color="white" transparent opacity={0.3} />
            </mesh>
          )}

          {effects.map(effect => (
            effect.type === 'shockwave' ?
              <Shockwave key={effect.id} position={effect.position} /> :
              <FloatingTextItem key={effect.id} text={effect.text!} position={effect.position} onComplete={() => removeEffect(effect.id)} />
          ))}
        </group>

        <EffectComposer multisampling={0}>
          <SSAO
            radius={0.05}
            intensity={40}
            luminanceInfluence={0.5}
            color={new THREE.Color("black")}
          />
          <Bloom
            luminanceThreshold={1.1}
            mipmapBlur
            intensity={1.2}
            radius={0.5}
            levels={6}
          />
          <TiltShift2 blur={0.15} />
          <Noise opacity={0.05} />
          <Vignette eskil={false} offset={0.1} darkness={0.6} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default IsoMap;
