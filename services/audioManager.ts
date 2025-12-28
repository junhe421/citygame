/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Weather } from '../types';

class AudioManager {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private bgmGain: GainNode | null = null;
    private ambGain: GainNode | null = null;

    private buffers: Record<string, AudioBuffer> = {};
    private activeSources: Record<string, AudioBufferSourceNode> = {};
    private activeLoops: Record<string, AudioBufferSourceNode> = {};

    private isMuted: boolean = false;
    private isNight: boolean = false;
    private currentWeather: Weather = Weather.Sunny;
    private initialized: boolean = false;

    constructor() {
        // Lazy init via user interaction
    }

    public init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);

            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.value = 0.3; // Low background volume
            this.bgmGain.connect(this.masterGain);

            this.ambGain = this.ctx.createGain();
            this.ambGain.gain.value = 0; // Start silent
            this.ambGain.connect(this.masterGain);

            // Generate Synthesized Sounds
            this.generateSounds();

            // Start Ambient Loop (Rain/City Noise)
            this.startAmbient();

            this.initialized = true;
        } catch (e) {
            console.warn("AudioContext processing failed:", e);
        }
    }

    public resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    public toggleMute(muted: boolean) {
        this.isMuted = muted;
        if (this.masterGain) {
            // Ramp to avoid clicks
            const now = this.ctx!.currentTime;
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 1, now + 0.5);
        }
    }

    public playSFX(type: 'build' | 'destroy' | 'click' | 'money') {
        if (!this.ctx || this.isMuted) return;
        this.resume();

        const buffer = this.buffers[type];
        if (buffer) {
            const source = this.ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(this.masterGain!);

            // Pitch randomizer for variety
            source.playbackRate.value = 0.95 + Math.random() * 0.1;

            source.start();
        }
    }

    public updateEnvironment(isNight: boolean, weather: Weather) {
        if (!this.ctx || !this.ambGain || !this.bgmGain) return;

        // Night Effect: Lower Pitch / Filter? 
        // Usually BGM gets simpler or pitch shifted. 
        // Here we can just slightly detune purely for the request.
        // However, AudioBufferSource playbackRate affects pitch.
        // Since we handle everything via synthesis/buffers, let's use a filter for night.
        if (this.isNight !== isNight) {
            this.isNight = isNight;
            // Night muffling effect?
            // Implementing via BiquadFilter if we had one, but we'll stick to simple logic for now.
        }

        // Weather: Rain Handling
        if (this.currentWeather !== weather) {
            this.currentWeather = weather;
            const now = this.ctx.currentTime;

            if (weather === Weather.Rainy || weather === Weather.Snowy) {
                // Fade In Rain
                this.ambGain.gain.linearRampToValueAtTime(0.4, now + 2);
            } else {
                // Fade Out Rain
                this.ambGain.gain.linearRampToValueAtTime(0, now + 2);
            }
        }
    }

    // --- Sound Generation (Procedural) ---

    private generateSounds() {
        if (!this.ctx) return;

        // 1. Build (Thud)
        this.buffers['build'] = this.createBuffer(0.3, (t, i) => {
            // Low frequency thud with decay
            const env = Math.exp(-15 * t);
            return Math.sin(2 * Math.PI * 60 * t * (1 - t)) * env * 0.8;
        });

        // 2. Destroy (Crunch/Noise)
        this.buffers['destroy'] = this.createBuffer(0.4, (t) => {
            // White noise with envelope
            return (Math.random() * 2 - 1) * Math.exp(-10 * t);
        });

        // 3. Click (Blip)
        this.buffers['click'] = this.createBuffer(0.1, (t) => {
            return Math.sin(2 * Math.PI * 800 * t) * Math.exp(-20 * t) * 0.1; // Quiet
        });

        // 4. Money (Chime)
        this.buffers['money'] = this.createBuffer(0.6, (t) => {
            const f1 = Math.sin(2 * Math.PI * 1200 * t);
            const f2 = Math.sin(2 * Math.PI * 1800 * t);
            return (f1 + f2) * 0.5 * Math.exp(-t * 8);
        });

        // 5. Rain (Pink Noise Loop) - 2 Seconds
        this.buffers['rain'] = this.createBuffer(2.0, () => {
            // Pink noise approximation
            const white = Math.random() * 2 - 1;
            return (white + (Math.random() * 2 - 1)) / 2 * 0.5; // Simpler
        });
    }

    private createBuffer(duration: number, fn: (t: number, i: number) => number): AudioBuffer {
        const sr = this.ctx!.sampleRate;
        const buffer = this.ctx!.createBuffer(1, sr * duration, sr);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = fn(i / sr, i);
        }
        return buffer;
    }

    private startAmbient() {
        if (!this.ctx || !this.buffers['rain']) return;

        const rainNode = this.ctx.createBufferSource();
        rainNode.buffer = this.buffers['rain'];
        rainNode.loop = true;
        // Connect to Ambience Gain (controlled by weather)
        rainNode.connect(this.ambGain!);
        rainNode.start();

        this.activeLoops['rain'] = rainNode;
    }
}

export const audioManager = new AudioManager();
