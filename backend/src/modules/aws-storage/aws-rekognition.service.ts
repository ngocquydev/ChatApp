import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RekognitionClient, DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition';
import type { RekognitionModerationResult, RekognitionModerationLabel } from './aws-storage.interface.js';

@Injectable()
export class AwsRekognitionService {
  private readonly logger = new Logger(AwsRekognitionService.name);
  private readonly rekognitionClient: RekognitionClient;
  private readonly region: string;
  private readonly configured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION') || 'ap-southeast-2';
    try {
      this.rekognitionClient = new RekognitionClient({
        region: this.region,
      });
      this.configured = Boolean(this.region);
      if (this.configured) {
        this.logger.log(`Amazon Rekognition Moderation đã sẵn sàng tại vùng: ${this.region}`);
      }
    } catch (err: unknown) {
      this.configured = false;
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Không thể khởi tạo RekognitionClient: ${message}`);
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Quét và phân loại nội dung hình ảnh bằng Amazon Rekognition
   */
  async detectModeration(
    buffer: Buffer,
    minConfidence = 55,
  ): Promise<RekognitionModerationResult> {
    if (!this.configured || !buffer || buffer.length === 0) {
      return {
        isUnsafe: false,
        action: 'ALLOW',
        adultScore: 0,
        violenceScore: 0,
        labels: [],
      };
    }

    try {
      const command = new DetectModerationLabelsCommand({
        Image: {
          Bytes: buffer,
        },
        MinConfidence: minConfidence,
      });

      const response = await this.rekognitionClient.send(command);
      const rawLabels = response.ModerationLabels || [];

      const labels: RekognitionModerationLabel[] = rawLabels.map((lbl) => ({
        name: lbl.Name || '',
        parentName: lbl.ParentName || '',
        confidence: lbl.Confidence || 0,
      }));

      let adultScore = 0;
      let violenceScore = 0;
      let isExplicitNudity = false;
      let isSuggestive = false;
      let isViolence = false;

      const violatedNames: string[] = [];

      for (const lbl of labels) {
        const confRatio = lbl.confidence / 100;
        const name = lbl.name.toLowerCase();
        const parent = (lbl.parentName || '').toLowerCase();

        // 1. Phân loại nội dung khiêu dâm / khỏa thân trực tiếp (Explicit Nudity)
        if (
          parent === 'explicit' ||
          parent === 'explicit nudity' ||
          name === 'explicit nudity' ||
          name === 'explicit' ||
          name.includes('genitalia') ||
          name.includes('nipple') ||
          name.includes('sexual activity') ||
          name.includes('pornography')
        ) {
          isExplicitNudity = true;
          adultScore = Math.max(adultScore, confRatio >= 0.65 ? 0.98 : confRatio);
          violatedNames.push(lbl.name);
        }
        // 2. Nội dung gợi dục (Suggestive)
        else if (parent === 'suggestive' || name === 'suggestive') {
          isSuggestive = true;
          adultScore = Math.max(adultScore, confRatio * 0.85);
          if (confRatio >= 0.85) {
            violatedNames.push(lbl.name);
          }
        }
        // 3. Nội dung bạo lực / thù địch (Violence)
        else if (
          parent === 'violence' ||
          name === 'violence' ||
          name.includes('gore') ||
          name.includes('weapon violence') ||
          name.includes('visually disturbing')
        ) {
          isViolence = true;
          violenceScore = Math.max(violenceScore, confRatio);
          violatedNames.push(lbl.name);
        }
      }

      let action: 'ALLOW' | 'BLOCK' | 'FLAG_REVIEW' = 'ALLOW';
      let reason: string | undefined;

      if (isExplicitNudity || isViolence || adultScore >= 0.75 || violenceScore >= 0.8) {
        action = 'BLOCK';
        const labelText = violatedNames.slice(0, 3).join(', ');
        reason = `Hình ảnh bị Amazon Rekognition chặn do vi phạm tiêu chuẩn nghiêm ngặt về nội dung người lớn/18+ (${labelText}).`;
      } else if (isSuggestive || adultScore >= 0.5 || violenceScore >= 0.5) {
        action = 'FLAG_REVIEW';
        reason = `Hình ảnh chứa yếu tố nhạy cảm (${violatedNames.slice(0, 3).join(', ')}), cần gắn cờ xem xét.`;
      }

      return {
        isUnsafe: action === 'BLOCK',
        action,
        adultScore,
        violenceScore,
        labels,
        reason,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Lỗi khi gọi Amazon Rekognition detect-moderation: ${message}`);
      // Lỗi Rekognition không làm sập ứng dụng, để fallback sang local vision moderator
      return {
        isUnsafe: false,
        action: 'ALLOW',
        adultScore: 0,
        violenceScore: 0,
        labels: [],
      };
    }
  }
}
