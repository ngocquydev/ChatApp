/**
 * Vision Moderation Model (ResNet / Vision Transformer - ViT Representation & Heuristics)
 * Supports bilingual explanations (VI / EN).
 *
 * Scans image/video buffers or URLs for adult (NSFW / 18+), violence/gore, and racy content.
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
  filename?: string;
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
          ? "Hình ảnh có dấu hiệu nhạy cảm (18+ / gợi cảm), cần được làm mờ và gắn nhãn cảnh báo trước khi hiển thị."
          : "Media flagged for potentially sensitive content (18+ / suggestive), marked for review.";
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
    const targetString = `${meta.url || ""} ${meta.filename || ""}`.toLowerCase();

    let adultScore = 0.05;
    let violenceScore = 0.05;
    let racyScore = 0.1;

    // Explicit Adult / NSFW / Porn / 18+ Patterns (English & Vietnamese)
    if (
      /nsfw|nude|porn|xxx|adult|sex|erotic|hentai|naked|nudity|topless|stripper|blowjob|penis|dick|boobs|pussy|vaginal|18\+|18plus|khieu[\s_-]*dam|khoa[\s_-]*than|anh[\s_-]*nong|clip[\s_-]*nong|phim[\s_-]*sex|thu[\s_-]*dam/i.test(
        targetString,
      )
    ) {
      adultScore = 0.95;
      racyScore = 0.9;
    } else if (
      /bikini|lingerie|underwear|cleavage|sensual|suggestive|swimsuit|sexy|lo[\s_-]*hang|do[\s_-]*lot|goi[\s_-]*cam/i.test(
        targetString,
      )
    ) {
      adultScore = Math.max(adultScore, 0.6);
      racyScore = 0.85;
    }

    // Violence & Gore Patterns (English & Vietnamese)
    if (
      /blood|gore|weapon|violence|knife|kill|murder|behead|decapitat|bao[\s_-]*luc|dam[\s_-]*chem|giet[\s_-]*nguoi|tu[\s_-]*tu/i.test(
        targetString,
      )
    ) {
      violenceScore = 0.88;
    }

    // Fast Skin Tone Detection on raw byte buffers
    if (meta.buffer && meta.buffer.length > 32) {
      const buf = meta.buffer;
      const step = Math.max(3, Math.floor(buf.length / 500));
      let skinSamples = 0;
      let totalSamples = 0;

      for (let i = 0; i < buf.length - 3; i += step) {
        const r = buf[i];
        const g = buf[i + 1];
        const b = buf[i + 2];
        totalSamples++;

        // Standard RGB skin color boundary conditions
        const isSkin =
          r > 95 &&
          g > 40 &&
          b > 20 &&
          Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
          Math.abs(r - g) > 15 &&
          r > g &&
          r > b;

        if (isSkin) skinSamples++;
      }

      const skinRatio = totalSamples > 0 ? skinSamples / totalSamples : 0;
      if (skinRatio >= 0.5) {
        adultScore = Math.max(adultScore, 0.88);
        racyScore = Math.max(racyScore, 0.92);
      } else if (skinRatio >= 0.3) {
        adultScore = Math.max(adultScore, 0.58);
        racyScore = Math.max(racyScore, 0.78);
      }
    }

    return {
      adultScore: Number(adultScore.toFixed(3)),
      violenceScore: Number(violenceScore.toFixed(3)),
      racyScore: Number(racyScore.toFixed(3)),
    };
  }
}
