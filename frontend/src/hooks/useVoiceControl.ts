/**
 * React Hook for Voice Control
 * Provides easy integration of voice commands in components
 */

import { useState, useEffect, useCallback } from "react";
import {
  voiceControlService,
  type VoiceCommand,
  type VoiceControlOptions,
} from "@/services/voiceControlService";

interface UseVoiceControlReturn {
  isListening: boolean;
  lastCommand: VoiceCommand | null;
  speak: (text: string) => Promise<void>;
  startListening: () => void;
  stopListening: () => void;
  isAvailable: boolean;
  availableCommands: string[];
}

export const useVoiceControl = (
  onCommand?: (command: VoiceCommand) => void,
  options?: VoiceControlOptions,
): UseVoiceControlReturn => {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [isAvailable] = useState(voiceControlService.isAvailable());

  useEffect(() => {
    const init = async () => {
      try {
        await voiceControlService.initialize(options);
      } catch (error) {
        console.warn("Voice control initialization failed:", error);
      }
    };

    init();

    return () => {
      voiceControlService.stop();
    };
  }, [options]);

  const speak = useCallback(async (text: string) => {
    try {
      await voiceControlService.speak(text);
    } catch (error) {
      console.warn("Speech failed:", error);
    }
  }, []);

  const startListening = useCallback(() => {
    setIsListening(true);
    voiceControlService.speak("Listening for command");
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
    voiceControlService.stop();
  }, []);

  const _handleCommand = useCallback(
    (command: VoiceCommand) => {
      setLastCommand(command);
      if (onCommand) {
        onCommand(command);
      }
    },
    [onCommand],
  );

  return {
    isListening,
    lastCommand,
    speak,
    startListening,
    stopListening,
    isAvailable,
    availableCommands: voiceControlService.getAvailableCommands(),
  };
};
