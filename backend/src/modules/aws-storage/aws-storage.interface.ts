export interface S3UploadOptions {
  folder?: string;
  filename?: string;
  mimetype?: string;
  metadata?: Record<string, string>;
}

export interface S3UploadResult {
  url: string;
  bucket: string;
  key: string;
  contentType?: string;
  bytes?: number;
}

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

