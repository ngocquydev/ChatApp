import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  IsolationForest,
  type AnomalyPrediction,
} from "./algorithms/isolation-forest.js";
import { AutoencoderAnomalyDetector } from "./algorithms/autoencoder-anomaly.js";
import {
  TransformerTextModerator,
  type TextModerationResult,
} from "./algorithms/transformer-text-moderator.js";
import {
  VisionModerator,
  type VisionModerationResult,
  type ImageInputMetadata,
} from "./algorithms/vision-moderator.js";
import type { UserBehaviorSample } from "./moderation.dto.js";

@Injectable()
export class ModerationService implements OnModuleInit {
  private readonly logger = new Logger(ModerationService.name);
  private readonly textModerator = new TransformerTextModerator();
  private readonly visionModerator = new VisionModerator();
  private readonly isolationForest = new IsolationForest({
    numTrees: 100,
    subsampleSize: 128,
    anomalyThreshold: 0.6,
  });
  private autoencoder: AutoencoderAnomalyDetector | null = null;

  onModuleInit() {
    this.logger.log("Khởi tạo mô hình Kiểm duyệt & An toàn (Moderation & Trust)...");
    this.initDefaultBaselineModel();
  }

  /**
   * Khởi tạo và huấn luyện mô hình Isolation Forest từ dữ liệu mẫu người dùng thông thường
   */
  public initDefaultBaselineModel(): void {
    const normalSamples: number[][] = [];

    // Sinh 150 mẫu hành vi người dùng thật (human baseline)
    for (let i = 0; i < 150; i++) {
      normalSamples.push([
        Math.random() * 5 + 0.5, // 0.5 - 5.5 friend requests/hour
        Math.random() * 0.4 + 0.4, // 0.4 - 0.8 acceptance rate
        Math.random() * 50 + 10, // phương sai thời gian lớn (hành vi người không đều)
        Math.random() * 0.2 + 0.05, // ít lặp lại
        Math.random() * 6 + 1, // 1 - 7 likes/min
        Math.random() * 0.3 + 0.7, // tương tác đa dạng bạn bè
      ]);
    }

    this.isolationForest.fit(normalSamples);

    this.autoencoder = new AutoencoderAnomalyDetector({
      inputDim: 6,
      hiddenDim: 3,
      epochs: 30,
      anomalyThreshold: 0.5,
    });
    this.autoencoder.fit(normalSamples);

    this.logger.log("Mô hình Isolation Forest & Autoencoder đã sẵn sàng.");
  }

  /**
   * Kiểm duyệt văn bản (NLP Transformer)
   */
  public moderateText(text: string): TextModerationResult {
    return this.textModerator.moderate(text);
  }

  /**
   * Quét hình ảnh / video nhạy cảm (Vision ResNet / ViT)
   */
  public async moderateImage(meta: ImageInputMetadata): Promise<VisionModerationResult> {
    return this.visionModerator.scanImage(meta);
  }

  /**
   * Phát hiện Bot & Tài khoản ảo (Anomaly Detection bằng Isolation Forest)
   */
  public detectBotAnomaly(sample: UserBehaviorSample): AnomalyPrediction & {
    autoencoderAnomaly?: boolean;
    autoencoderError?: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  } {
    const featureVector = [
      sample.friendRequestsPerHour,
      sample.acceptanceRate,
      sample.actionIntervalVariance,
      sample.actionRepetitionRatio,
      sample.interactionVelocity,
      sample.distinctTargetRatio,
    ];

    const ifResult = this.isolationForest.predict(featureVector);

    let aeResult: { reconstructionError: number; isAnomaly: boolean } | undefined;
    if (this.autoencoder) {
      aeResult = this.autoencoder.predict(featureVector);
    }

    let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    if (ifResult.anomalyScore >= 0.75) {
      riskLevel = "CRITICAL";
    } else if (ifResult.anomalyScore >= 0.6) {
      riskLevel = "HIGH";
    } else if (ifResult.anomalyScore >= 0.5) {
      riskLevel = "MEDIUM";
    }

    return {
      ...ifResult,
      autoencoderAnomaly: aeResult?.isAnomaly,
      autoencoderError: aeResult?.reconstructionError,
      riskLevel,
    };
  }
}
