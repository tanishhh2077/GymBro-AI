import type { ProcessingFailureKind, ProcessingStage } from "@/types";

export class PoseEngineError extends Error {
  constructor(
    message: string,
    readonly kind: ProcessingFailureKind = "detect",
    readonly stage?: ProcessingStage,
  ) {
    super(message);
    this.name = "PoseEngineError";
  }
}
