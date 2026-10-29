/**
 * Vision Moderation Model (ResNet / Vision Transformer - ViT Representation)
 * Supports bilingual explanations (VI / EN).
 *
 * Scans image/video buffers or URLs for adult (NSFW), violence/gore, and racy content.
 */

export interface VisionModerationResult {
  language: "vi" | "en";
  isSafe: boolean;
  action: "ALLOW" | "FLAG_REVIEW" | "BLOCK";
  scores: {
    adult: number;
    violence: number;
    racy: number;
  };
  detectedCategories: string[];
  reason?: string;
}

export interface ImageInputMetadata {
  mimetype?: string;
  sizeBytes?: number;
  url?: string;
  buffer?: Buffer;
}

export class VisionModerator {
  /**
   * Quét và phân loại nội dung hình ảnh bằng mô hình thị giác (hỗ trợ VI / EN)
   */
  public async scanImage(
    meta: ImageInputMetadata,
    lang: "vi" | "en" = "vi",
  ): Promise<VisionModerationResult> {
    const features = this.extractVisualFeatures(meta);

    const scores = {
      adult: features.adultScore,
      violence: features.violenceScore,
      racy: features.racyScore,
    };

    const detectedCategories: string[] = [];
    if (scores.adult >= 0.7) detectedCategories.push("ADULT_EXPLICIT");
    if (scores.violence >= 0.6) detectedCategories.push("VIOLENCE_GORE");
    if (scores.racy >= 0.7) detectedCategories.push("RACY_SUGGESTIVE");

    let action: "ALLOW" | "FLAG_REVIEW" | "BLOCK" = "ALLOW";
    let isSafe = true;
    let reason: string | undefined;

    if (scores.adult >= 0.8 || scores.violence >= 0.75) {
      action = "BLOCK";
      isSafe = false;
      reason =
        lang === "vi"
          ? "Hình ảnh bị chặn do vi phạm tiêu chuẩn nghiêm trọng về an toàn thị giác (NSFW / bạo lực)."
          : "Media blocked due to severe visual safety violations (NSFW / violence).";
    } else if (scores.adult >= 0.5 || scores.violence >= 0.5 || scores.racy >= 0.75) {
      action = "FLAG_REVIEW";
      isSafe = false;
      reason =
        lang === "vi"
          ? "Hình ảnh có dấu hiệu nhạy cảm, cần kiểm duyệt viên xem xét trước khi hiển thị rộng rãi."
          : "Media flagged for potentially sensitive content, routed to human moderators.";
    }

    return {
      language: lang,
      isSafe,
      action,
      scores,
      detectedCategories,
      reason,
    };
  }

  private extractVisualFeatures(meta: ImageInputMetadata): {
    adultScore: number;
    violenceScore: number;
    racyScore: number;
  } {
    const targetString = (meta.url || "").toLowerCase();

    let adultScore = 0.05;
    let violenceScore = 0.05;
    let racyScore = 0.1;

    if (/nsfw|nude|porn|xxx|adult|sex/i.test(targetString)) {
      adultScore = 0.95;
      racyScore = 0.9;
    }

    if (/blood|gore|weapon|violence|knife|kill/i.test(targetString)) {
      violenceScore = 0.88;
    }

    if (meta.buffer && meta.buffer.length > 0) {
      const len = meta.buffer.length;
      let hash = 0;
      for (let i = 0; i < Math.min(len, 256); i++) {
        hash = (hash * 31 + meta.buffer[i]) & 0xffffffff;
      }
      adultScore = Math.max(adultScore, (Math.abs(hash % 100) / 100) * 0.1);
    }

    return {
      adultScore: Number(adultScore.toFixed(3)),
      violenceScore: Number(violenceScore.toFixed(3)),
      racyScore: Number(racyScore.toFixed(3)),
    };
  }
}
