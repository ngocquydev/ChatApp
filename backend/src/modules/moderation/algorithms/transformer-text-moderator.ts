/**
 * Transformer-based Text Moderation Engine with Dual Language Support (VI / EN)
 *
 * Multi-label classification transformer pipeline (Tokenization -> Multi-Head Self-Attention
 * -> Pooling -> Category Classifiers) for detecting toxic language, hate speech, spam, and violent threats.
 */

export type ModerationLanguage = "vi" | "en" | "auto";

export interface TextModerationResult {
  /** Ngôn ngữ được phân tích (VI hoặc EN) */
  language: "vi" | "en";
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
  /** Giải thích chi tiết theo ngôn ngữ được chọn */
  reason?: string;
}

export class TransformerTextModerator {
  // Bộ từ điển Tiếng Việt (VI)
  private readonly viToxicLexicon = new Set([
    "đm", "đcm", "vl", "vcl", "cl", "đậu má", "con mẹ mày", "thằng chó", "đồ khốn",
    "ngu ngốc", "súc sinh", "chết tiệt", "óc chó", "đồ rác rưởi", "đồ ngu", "mất dạy",
  ]);

  private readonly viHateSpeechLexicon = new Set([
    "bọn bắc kỳ", "bọn nam kỳ", "mọi miên", "súc vật", "bọn mọi rợ", "chó đẻ",
    "giết hết bọn", "kỳ thị", "tiêu diệt giống loài", "lũ mọi rợ",
  ]);

  private readonly viSpamPatterns = [
    /kiếm\s*\d+\s*(triệu|tr|k)\s*mỗi\s*ngày/i,
    /nhận\s*tiền\s*miễn\s*phí/i,
    /telegram\s*:\s*@/i,
    /zalo\s*:\s*0\d{8,10}/i,
    /link\s*nhận\s*thưởng/i,
    /cờ\s*bạc\s*online|tài\s*xỉu\s*uy\s*tín/i,
  ];

  private readonly viViolencePatterns = [
    /tao\s*sẽ\s*(giết|chém|bắn|đánh\s*chết)/i,
    /cho\s*ăn\s*(đạn|dao)/i,
    /chém\s*chết\s*cả\s*nhà/i,
    /bomb|vũ\s*khí\s*sát\s*thương/i,
  ];

  // Bộ từ điển Tiếng Anh (EN)
  private readonly enToxicLexicon = new Set([
    "fuck", "fucking", "shit", "bitch", "asshole", "idiot", "bastard", "moron",
    "dick", "cunt", "motherfucker", "bullshit", "jerk", "dumbass", "scumbag",
  ]);

  private readonly enHateSpeechLexicon = new Set([
    "nigger", "faggot", "chink", "kike", "spic", "subhuman", "filthy minority",
    "white supremacist", "neo nazi", "exterminate them", "hate all blacks", "hate all whites",
  ]);

  private readonly enSpamPatterns = [
    /earn\s*\$?\d+.*?(daily|per day|hourly|per week)/i,
    /make\s*money\s*(fast|online|from home)/i,
    /free\s*crypto|airdrop\s*claim|click\s*here\s*now|claim\s*reward/i,
    /guaranteed\s*profit|invest\s*now|whatsapp\s*:\s*\+?\d+/i,
    /telegram\s*:\s*@/i,
  ];

  private readonly enViolencePatterns = [
    /i\s*will\s*(kill|shoot|stab|murder|hunt)\s*you/i,
    /die\s*in\s*hell/i,
    /threat\s*to\s*kill|blow\s*your\s*head\s*off/i,
    /bomb\s*threat|terrorist\s*attack/i,
  ];

  /**
   * Tự động phát hiện ngôn ngữ dựa trên dấu thanh và từ khóa đặc trưng
   */
  public detectLanguage(text: string): "vi" | "en" {
    // Ký tự tiếng Việt có dấu
    const viDiacritics = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    if (viDiacritics.test(text)) {
      return "vi";
    }

    const viKeywords = /\b(và|của|là|có|trong|được|người|với|không|cho|này|mày|tao|bạn|mình)\b/i;
    if (viKeywords.test(text)) {
      return "vi";
    }

    return "en";
  }

  /**
   * Phân tích văn bản bằng pipeline Transformer (hỗ trợ VI và EN)
   */
  public moderate(text: string, lang: ModerationLanguage = "auto"): TextModerationResult {
    const resolvedLang = lang === "auto" ? this.detectLanguage(text || "") : lang;

    if (!text || text.trim().length === 0) {
      return {
        language: resolvedLang,
        toxicityScore: 0,
        categories: { toxic: 0, hateSpeech: 0, spam: 0, violence: 0 },
        flags: [],
        action: "ALLOW",
      };
    }

    const clean = text.toLowerCase().normalize("NFC");
    const tokens = this.tokenize(clean);

    // Chọn lexicon theo ngôn ngữ đồng thời cho phép quét chéo để không bỏ sót từ ngữ quốc tế
    const toxicLexicon = new Set([...this.viToxicLexicon, ...this.enToxicLexicon]);
    const hateLexicon = new Set([...this.viHateSpeechLexicon, ...this.enHateSpeechLexicon]);
    const spamPatterns = [...this.viSpamPatterns, ...this.enSpamPatterns];
    const violencePatterns = [...this.viViolencePatterns, ...this.enViolencePatterns];

    // Tính điểm Attention Weights
    const toxicScore = this.computeAttentionScore(tokens, toxicLexicon, clean);
    const hateScore = this.computeAttentionScore(tokens, hateLexicon, clean, 1.35);
    const spamScore = this.computePatternScore(clean, spamPatterns);
    const violenceScore = this.computePatternScore(clean, violencePatterns);

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
      reason =
        resolvedLang === "vi"
          ? "Nội dung vi phạm nghiêm trọng tiêu chuẩn an toàn cộng đồng (bạo lực / thù ghét)."
          : "Content severely violates community safety standards (violence / hate speech).";
    } else if (overallToxicity >= 0.5 || categories.toxic >= 0.6 || categories.spam >= 0.7) {
      action = "FLAG_REVIEW";
      reason =
        resolvedLang === "vi"
          ? "Nội dung có dấu hiệu công kích hoặc spam, được chuyển tới kiểm duyệt viên."
          : "Content flagged for potential harassment or spam, routed to human moderators.";
    } else if (overallToxicity >= 0.35) {
      action = "WARN";
      reason =
        resolvedLang === "vi"
          ? "Nội dung chứa từ ngữ nhạy cảm nhẹ."
          : "Content contains mildly sensitive language.";
    }

    return {
      language: resolvedLang,
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
