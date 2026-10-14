"use client";

/**
 * Timo Companion Audio & Speech Synthesis System
 * Provides organic Web Audio synthesized micro-cues and browser SpeechSynthesis.
 * 100% client-side, zero external audio asset dependencies.
 */

class TimoAudioEngine {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Play a cute, subtle, gentle chime synthesized with sine waves.
   */
  public play(type: "pop" | "send" | "success" | "confirm" | "blip") {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "pop") {
        // Soft bubble pop
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(740, now + 0.08);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === "send") {
        // Upward pleasant whoosh
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(580, now + 0.12);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === "success") {
        // Gentle two-tone chord
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.09); // E5
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === "confirm") {
        // Harmonious bell tone
        osc.frequency.setValueAtTime(880, now); // A5
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === "blip") {
        // Discrete focus blip
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.025, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Speak response aloud with tuned pitch and rate for Timo's warm personality.
   */
  public speak(text: string, onEnd?: () => void): boolean {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return false;
    }

    try {
      window.speechSynthesis.cancel();

      // Clean markdown symbols for natural speech
      const clean = text
        .replace(/[*_#`[\]()]/g, "")
        .replace(/\|\s*[^|]+\s*\|/g, "") // skip tables for speech
        .slice(0, 400); // speak summary

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.pitch = 1.15; // slightly friendly higher pitch
      utterance.rate = 1.05; // conversational speed

      // Pick an English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Samantha") ||
            v.name.includes("Natural") ||
            v.name.includes("Google") ||
            v.name.includes("Jenny"))
      );
      if (preferred) {
        utterance.voice = preferred;
      }

      if (onEnd) {
        utterance.onend = onEnd;
        utterance.onerror = onEnd;
      }

      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      return false;
    }
  }

  public stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const timoAudio = new TimoAudioEngine();
