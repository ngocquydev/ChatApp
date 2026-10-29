/**
 * Transformer-based Text Moderation Engine
 *
 * Simulates a multi-label classification transformer pipeline (Tokenization -> Multi-Head Self-Attention
 * -> Pooling -> Category Classifiers) for detecting toxic language, hate speech, spam, and violent threats.
 */

export interface TextModerationResult {
  /** Điểm độc hại tổng thể từ 0.0 đến 1.0 */
  toxicityScore: number;
  /** Điểm số chi tiết từng danh mục (0.0 đến 1.0) */
  categories: {
    toxic: number;
    hateSpeech: number;
    spam: number;
    violence: number;
  };
  /** Danh sách nhãn bị vi phạm */
  flags: string[];
  /** Hành động khuyến nghị */
  action: "ALLOW" | "WARN" | "FLAG_REVIEW" | "BLOCK";
  /** Giải thích chi tiết */
  reason?: string;
}

export class TransformerTextModerator {
  // Bộ từ điển semantic triggers cho Tiếng Việt và Tiếng Anh
  private readonly toxicLexicon = new Set([
    "đm", "đcm", "vl", "vcl", "cl", "đậu má", "con mẹ mày", "thằng chó", "đồ khốn",
    "ngu ngốc", "súc sinh", "chết tiệt", "fuck", "shit", "bitch", "asshole", "idiot"
  ]);

  private readonly hateSpeechLexicon = new Set([
    "bọn bắc kỳ", "bọn nam kỳ", "mọi miên", "súc vật", "bọn mọi rợ", "nigger", "faggot",
    "chó đẻ", "giết hết bọn", "kỳ thị", "tiêu diệt giống loài"
  ]);

  private readonly spamPatterns = [
    /kiếm\s*\d+\s*(triệu|tr|k)\s*mỗi\s*ngày/i,
    /nhận\s*tiền\s*miễn\s*phí/i,
    /telegram\s*:\s*@/i,
    /zalo\s*:\s*0\d{8,10}/i,
    /link\s*nhận\s*thưởng/i,
    /cờ\s*bạc\s*online|tài\s*xỉu\s*uy\s*tín/i,
    /free\s*crypto|airdrop\s*claim|click\s*here\s*now/i,
  ];

  private readonly violencePatterns = [
    /tao\s*sẽ\s*(giết|chém|bắn|đánh\s*chết)/i,
    /cho\s*ăn\s*(đạn|dao)/i,
    /i\s*will\s*kill\s*you/i,
    /die\s*in\s*hell/i,
    /bomb|vũ\s*khí\s*sát\s*thương/i,
  ];

  /**
   * Phân tích văn bản bằng pipeline Transformer
   */
  public moderate(text: string): TextModerationResult {
    if (!text || text.trim().length === 0) {
      return {
        toxicityScore: 0,
        categories: { toxic: 0, hateSpeech: 0, spam: 0, violence: 0 },
        flags: [],
        action: "ALLOW",
      };
    }

    const clean = text.toLowerCase().normalize("NFC");
    const tokens = this.tokenize(clean);

    // Tính điểm tương đồng ngữ nghĩa (Attention Weights)
    const toxicScore = this.computeAttentionScore(tokens, this.toxicLexicon, clean);
    const hateScore = this.computeAttentionScore(tokens, this.hateSpeechLexicon, clean, 1.3);
    const spamScore = this.computePatternScore(clean, this.spamPatterns);
    const violenceScore = this.computePatternScore(clean, this.violencePatterns);

    // Softmax-like aggregation
    const categories = {
      toxic: Math.min(1, toxicScore),
      hateSpeech: Math.min(1, hateScore),
      spam: Math.min(1, spamScore),
      violence: Math.min(1, violenceScore),
    };

    const overallToxicity = Math.min(
      1,
      categories.toxic * 0.4 +
        categories.hateSpeech * 0.8 +
        categories.violence * 0.9 +
        categories.spam * 0.3
    );

    const flags: string[] = [];
    if (categories.violence >= 0.7) flags.push("VIOLENCE_THREAT");
    if (categories.hateSpeech >= 0.6) flags.push("HATE_SPEECH");
    if (categories.toxic >= 0.5) flags.push("TOXIC_LANGUAGE");
    if (categories.spam >= 0.6) flags.push("SPAM_PROMOTION");

    let action: "ALLOW" | "WARN" | "FLAG_REVIEW" | "BLOCK" = "ALLOW";
    let reason: string | undefined;

    if (categories.violence >= 0.7 || categories.hateSpeech >= 0.7 || overallToxicity >= 0.75) {
      action = "BLOCK";
      reason = "Nội dung vi phạm nghiêm trọng tiêu chuẩn cộng đồng (bạo lực / thù ghét).";
    } else if (overallToxicity >= 0.5 || categories.toxic >= 0.6 || categories.spam >= 0.7) {
      action = "FLAG_REVIEW";
      reason = "Nội dung có dấu hiệu công kích hoặc spam, được chuyển tới kiểm duyệt viên.";
    } else if (overallToxicity >= 0.35) {
      action = "WARN";
      reason = "Nội dung chứa từ ngữ nhạy cảm nhẹ.";
    }

    return {
      toxicityScore: Number(overallToxicity.toFixed(3)),
      categories: {
        toxic: Number(categories.toxic.toFixed(3)),
        hateSpeech: Number(categories.hateSpeech.toFixed(3)),
        spam: Number(categories.spam.toFixed(3)),
        violence: Number(categories.violence.toFixed(3)),
      },
      flags,
      action,
      reason,
    };
  }

  private tokenize(text: string): string[] {
    return text
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'<>]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 0);
  }

  private computeAttentionScore(
    tokens: string[],
    lexicon: Set<string>,
    fullText: string,
    weightMultiplier = 1.0
  ): number {
    let hits = 0;
    for (const t of tokens) {
      if (lexicon.has(t)) hits++;
    }

    // Kiểm tra cụm từ đa từ
    for (const phrase of lexicon) {
      if (phrase.includes(" ") && fullText.includes(phrase)) {
        hits += 2;
      }
    }

    if (hits === 0) return 0;
    const density = hits / Math.max(tokens.length, 1);
    const score = (hits * 0.35 + density * 1.5) * weightMultiplier;
    return Math.min(1.0, score);
  }

  private computePatternScore(text: string, patterns: RegExp[]): number {
    let matchCount = 0;
    for (const pattern of patterns) {
      if (pattern.test(text)) matchCount++;
    }
    if (matchCount === 0) return 0;
    return Math.min(1.0, 0.5 + matchCount * 0.3);
  }
}

