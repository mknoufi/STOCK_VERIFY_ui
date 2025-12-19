/**
 * Voice Control Service
 * Enables hands-free operation through voice commands
 * Uses Expo Speech for recognition and feedback
 */

import { Platform } from "react-native";

// Dynamic import for expo-speech to handle optional dependency
let Speech: any = null;

// Try to load expo-speech if available
try {
  Speech = require("expo-speech");
} catch (error) {
  console.warn("expo-speech not available, voice features will be disabled");
}

export type VoiceCommand =
  | "scan"
  | "submit"
  | "cancel"
  | "next"
  | "previous"
  | "help"
  | "repeat";

export interface VoiceCommandResult {
  command: VoiceCommand | null;
  confidence: number;
  rawText: string;
}

export interface VoiceControlOptions {
  language?: string;
  feedbackEnabled?: boolean;
  continuousListening?: boolean;
}

class VoiceControlService {
  private isListening = false;
  private options: VoiceControlOptions = {
    language: "en-US",
    feedbackEnabled: true,
    continuousListening: false,
  };

  // Command patterns for recognition
  private commandPatterns: Record<VoiceCommand, RegExp[]> = {
    scan: [/scan/i, /start scan/i, /begin scan/i],
    submit: [/submit/i, /save/i, /confirm/i, /done/i],
    cancel: [/cancel/i, /stop/i, /abort/i, /back/i],
    next: [/next/i, /forward/i, /continue/i],
    previous: [/previous/i, /back/i, /go back/i],
    help: [/help/i, /what can i say/i, /commands/i],
    repeat: [/repeat/i, /say again/i, /what did you say/i],
  };

  async initialize(options?: VoiceControlOptions): Promise<void> {
    this.options = { ...this.options, ...options };

    if (!Speech) {
      console.warn("Voice control not available - expo-speech not installed");
      return;
    }

    // Check if speech is available
    try {
      const available = await Speech.isSpeakingAsync();
      console.log("Voice control initialized. Speech available:", !available);
    } catch (error) {
      console.warn("Voice control initialization check failed:", error);
    }
  }

  async speak(
    text: string,
    options?: { rate?: number; pitch?: number },
  ): Promise<void> {
    if (!this.options.feedbackEnabled || !Speech) return;

    try {
      await Speech.speak(text, {
        language: this.options.language,
        rate: options?.rate ?? 1.0,
        pitch: options?.pitch ?? 1.0,
      });
    } catch (error) {
      console.warn("Speech synthesis failed:", error);
    }
  }

  async stop(): Promise<void> {
    if (!Speech) return;

    try {
      await Speech.stop();
      this.isListening = false;
    } catch (error) {
      console.warn("Failed to stop speech:", error);
    }
  }

  parseCommand(text: string): VoiceCommandResult {
    const normalizedText = text.toLowerCase().trim();

    // Try to match against known command patterns
    for (const [command, patterns] of Object.entries(this.commandPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(normalizedText)) {
          return {
            command: command as VoiceCommand,
            confidence: 0.9,
            rawText: text,
          };
        }
      }
    }

    // No command matched
    return {
      command: null,
      confidence: 0,
      rawText: text,
    };
  }

  async provideFeedback(
    message: string,
    type: "success" | "error" | "info" = "info",
  ): Promise<void> {
    if (!this.options.feedbackEnabled) return;

    const pitch = type === "success" ? 1.2 : type === "error" ? 0.8 : 1.0;
    await this.speak(message, { pitch });
  }

  getAvailableCommands(): string[] {
    return Object.keys(this.commandPatterns);
  }

  isAvailable(): boolean {
    return Platform.OS !== "web"; // Voice recognition works better on native
  }

  setFeedbackEnabled(enabled: boolean): void {
    this.options.feedbackEnabled = enabled;
  }
}

// Singleton instance
export const voiceControlService = new VoiceControlService();

// Utility functions
export const speakText = async (text: string): Promise<void> => {
  return voiceControlService.speak(text);
};

export const parseVoiceCommand = (text: string): VoiceCommandResult => {
  return voiceControlService.parseCommand(text);
};

export const initializeVoiceControl = async (
  options?: VoiceControlOptions,
): Promise<void> => {
  return voiceControlService.initialize(options);
};

export default voiceControlService;
