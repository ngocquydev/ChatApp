export interface RekognitionModerationLabel {
  name: string;
  parentName?: string;
  confidence: number;
}

export interface RekognitionModerationResult {
  isUnsafe: boolean;
  action: 'ALLOW' | 'BLOCK' | 'FLAG_REVIEW';
  adultScore: number;
  violenceScore: number;
  labels: RekognitionModerationLabel[];
  reason?: string;
}

