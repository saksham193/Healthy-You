import { env } from "../../config/env";
import type { AIChatResponse } from "../types";

type SafetyDecision =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      reply: string;
    };

export const SAFETY_NOTICE =
  "This is general wellness information, not a medical diagnosis or treatment plan.";

const EMERGENCY_NOTICE =
  "If this may be an emergency or symptoms are severe, seek urgent medical help or contact local emergency services.";

const includesAny = (message: string, patterns: RegExp[]): boolean =>
  patterns.some((pattern) => pattern.test(message));

export class HealthAISafetyGuard {
  readonly enabled = env.AI_SAFETY_GUARD_ENABLED;

  evaluateUserMessage(message: string): SafetyDecision {
    if (!this.enabled) return { allowed: true };

    const normalized = message.toLowerCase();

    if (
      includesAny(normalized, [
        /\bsuicide\b/,
        /\bkill myself\b/,
        /\bself[-\s]?harm\b/,
        /\bhurt myself\b/,
        /\bend my life\b/,
      ])
    ) {
      return {
        allowed: false,
        reply: `${EMERGENCY_NOTICE} If you might hurt yourself, contact emergency services now or reach out to a trusted person or crisis support immediately.`,
      };
    }

    if (
      includesAny(normalized, [
        /\bchest pain\b/,
        /\bcan't breathe\b/,
        /\bcannot breathe\b/,
        /\bsevere bleeding\b/,
        /\bstroke\b/,
        /\bface droop/,
        /\bslurred speech\b/,
        /\bone[-\s]?sided weakness\b/,
        /\boverdose/,
        /\bunconscious\b/,
      ])
    ) {
      return {
        allowed: false,
        reply: EMERGENCY_NOTICE,
      };
    }

    if (
      includesAny(normalized, [
        /\bdiagnose\b/,
        /\bdo i have\b/,
        /\bwhat disease\b/,
        /\bis this cancer\b/,
        /\btell me what condition\b/,
      ])
    ) {
      return {
        allowed: false,
        reply: "I cannot diagnose symptoms or identify medical conditions. I can share general wellness information and help you prepare questions for a qualified clinician.",
      };
    }

    if (
      includesAny(normalized, [
        /\bwhat dose\b/,
        /\bhow much\b.*\b(take|dose|dosage|mg)\b/,
        /\bchange my dose\b/,
        /\bincrease my medication\b/,
        /\bdecrease my medication\b/,
        /\bstop my medication\b/,
        /\bshould i stop\b.*\b(medication|medicine|pill|prescription)\b/,
      ])
    ) {
      return {
        allowed: false,
        reply: "I cannot recommend medication dosages or prescription changes. Please follow your prescription label and ask your doctor or pharmacist for medication guidance.",
      };
    }

    return { allowed: true };
  }

  applyToResponse(response: AIChatResponse): AIChatResponse {
    if (!this.enabled) return response;

    const hasNotice = response.text.toLowerCase().includes(SAFETY_NOTICE.toLowerCase());

    return {
      ...response,
      text: hasNotice ? response.text : `${response.text} ${SAFETY_NOTICE}`,
      safetyNotice: SAFETY_NOTICE,
    };
  }
}
