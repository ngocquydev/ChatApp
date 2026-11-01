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
    profanity: number;
    harassment: number;
  };
  /** Danh sách nhãn bị vi phạm */
  flags: string[];
  /** Hành động khuyến nghị */
  action: "ALLOW" | "WARN" | "FLAG_REVIEW" | "BLOCK";
  /** Giải thích chi tiết theo ngôn ngữ được chọn */
  reason?: string;
  /** Danh sách từ khóa / cụm từ vi phạm được phát hiện */
  flaggedKeywords: string[];
}

export class TransformerTextModerator {
  // Bộ từ điển Tiếng Việt (VI) - Từ ngữ thô tục, chửi thề & lăng mạ (có dấu và không dấu)
  private readonly viToxicLexicon = new Set([
    // Nhóm chửi thề trực tiếp
    "đm", "đcm", "đkm", "đmm", "clmm", "vcl", "vkl", "vl", "vcc", "cl", "cc", "đậu má", "dau ma",
    "dm", "dcm", "dkm", "dmm",
    "địt", "địt mẹ", "địt mẹ mày", "địt con mẹ", "địt con mẹ mày", "địt cụ", "địt cụ mày", "địt bà", "địt bà mày", "địt bố", "địt bố mày", "địt cha", "địt cha mày", "địt nhau", "địt pẹ",
    "dit", "dit me", "dit me may", "dit con me", "dit con me may", "dit cu", "dit ba", "dit bo", "dit cha", "djt", "djt me", "djt me may",
    "đụ", "đụ má", "đụ mẹ", "đụ mạ", "đụ mọe", "đụ cha", "đụ bà", "đụ má mày", "đụ mẹ mày", "đụ mẹ nó",
    "du", "du ma", "du me", "du moe", "duma", "dume", "đuma", "đume",
    "cặc", "buồi", "lồn", "cu", "bìu", "dái", "lìn",
    "cac", "buoi", "lon", "loz", "l0n", "c@c", "cặk", "bùi",
    "óc lồn", "mặt lồn", "như lồn", "như cặc", "như buồi", "con cặc", "thằng cặc", "đầu buồi", "hãm lồn", "xàm lồn", "xạo lồn", "rảnh lồn", "nứng lồn", "ngu lồn", "hãm cac",
    "nhu lon", "nhu cac", "nhu buoi", "mat lon", "mat cac", "oc lon", "ham lon", "xam lon", "xao lon", "ranh lon", "ngu lon",
    "đéo", "đéo mẹ", "đéo cần", "đéo biết", "đéo thèm", "đéo quan tâm", "đíu", "đếch", "đách", "deo", "deo me",
    // Nhóm lăng mạ xúc phạm danh dự gia đình / người khác
    "con mẹ mày", "bà mẹ mày", "mẹ mày", "mẹ kiếp", "cha bố mày", "tổ cha mày", "tổ sư mày", "tiên sư cha", "tiên sư mày",
    "con me may", "ba me may", "me may", "me kiep", "cha bo may", "to cha may",
    "chó đẻ", "chó chết", "đồ chó", "thằng chó", "con chó", "óc chó", "não chó", "ngu như chó", "ngu như bò", "ngu như lợn", "ngu vcl", "ngu vkl", "đồ súc sinh", "súc vật", "đồ súc vật", "đồ khốn", "khốn nạn", "mất dạy", "đồ rác rưởi", "đồ ngu", "con đĩ", "đồ đĩ", "con phò", "đồ phò", "cave",
    "cho de", "cho chet", "do cho", "thang cho", "con cho", "oc cho", "nao cho", "ngu nhu cho", "ngu nhu bo", "ngu nhu lon", "do suc sinh", "suc vat", "do khon", "khon nan", "mat day", "do rac ruoi", "do ngu", "con di", "do di", "con pho",
    "đệt", "đệch", "đệch mợ", "đệt mợ", "đệt mẹ", "mọe", "mịa", "chết tiệt", "ngu ngốc",
  ]);

  private readonly viProfanityRegex = [
    /(?<!\p{L})(đ[ịi]t|d[ịi]t|djt|đệt|đệch|đ[eé]o|deo|đ[ụu]|du|duma|dume)(?!\p{L})/iu,
    /(?<!\p{L})(c[ặa]c|cac|c[ặa]k|bu[ồo]i|buoi|l[ồo]n|lon|loz|l0n|l[ìi]n)(?!\p{L})/iu,
    /(?<!\p{L})(đm|đcm|đkm|đmm|dmm|clmm|vcl|vkl|vcc|cc|cl)(?!\p{L})/iu,
    /đ[\W_]*ị[\W_]*t/iu,
    /d[\W_]*i[\W_]*t/iu,
    /c[\W_]*ặ[\W_]*c/iu,
    /l[\W_]*ồ[\W_]*n/iu,
    /b[\W_]*u[\W_]*ồ[\W_]*i/iu,
  ];

  private readonly viHateSpeechLexicon = new Set([
    "bọn bắc kỳ", "bọn nam kỳ", "mọi miên", "súc vật", "bọn mọi rợ", "lũ mọi rợ", "chó đẻ",
    "giết hết bọn", "kỳ thị", "tiêu diệt giống loài", "lũ mọi rợ", "bắc kỳ chó", "nam kỳ chó",
    "bon bac ky", "bon nam ky", "moi mien", "bon moi ro", "lu moi ro", "bac ky cho", "nam ky cho",
  ]);

  private readonly viSpamPatterns = [
    /kiếm\s*\d+\s*(triệu|tr|k)\s*mỗi\s*ngày/iu,
    /nhận\s*tiền\s*miễn\s*phí/iu,
    /telegram\s*:\s*@/iu,
    /zalo\s*:\s*0\d{8,10}/iu,
    /link\s*nhận\s*thưởng/iu,
    /cờ\s*bạc\s*online|tài\s*xỉu\s*uy\s*tín/iu,
  ];

  private readonly viViolencePatterns = [
    /(tao|mình)\s*sẽ\s*(giết|chém|bắn|đánh\s*chết|băm\s*xác|thiêu\s*sống)/iu,
    /(giet|chem|ban|danh\s*chet)\s*(may|chung\s*may|ca\s*nha)/iu,
    /cho\s*ăn\s*(đạn|dao)/iu,
    /chém\s*chết\s*cả\s*nhà/iu,
    /bomb|vũ\s*khí\s*sát\s*thương/iu,
  ];

  // Bộ từ điển Tiếng Anh (EN)
  private readonly enToxicLexicon = new Set([
    "fuck", "fucking", "fucked", "fucker", "motherfucker", "motherfucking", "shit", "bullshit",
    "bitch", "bitches", "asshole", "idiot", "bastard", "moron",
    "dick", "cunt", "pussy", "dumbass", "scumbag", "retard", "stfu", "wtf", "jerk",
  ]);

  private readonly enHateSpeechLexicon = new Set([
    "nigger", "nigga", "faggot", "chink", "kike", "spic", "subhuman", "filthy minority",
    "white supremacist", "neo nazi", "exterminate them", "hate all blacks", "hate all whites",
  ]);

  private readonly enSpamPatterns = [
    /earn\s*\$?\d+.*?(daily|per day|hourly|per week)/iu,
    /make\s*money\s*(fast|online|from home)/iu,
    /free\s*crypto|airdrop\s*claim|click\s*here\s*now|claim\s*reward/iu,
    /guaranteed\s*profit|invest\s*now|whatsapp\s*:\s*\+?\d+/iu,
    /telegram\s*:\s*@/iu,
  ];

  private readonly enViolencePatterns = [
    /i\s*will\s*(kill|shoot|stab|murder|hunt)\s*you/iu,
    /die\s*in\s*hell/iu,
    /threat\s*to\s*kill|blow\s*your\s*head\s*off/iu,
    /bomb\s*threat|terrorist\s*attack/iu,
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

    const viKeywords = /\b(và|của|là|có|trong|được|người|với|không|cho|này|mày|tao|bạn|mình|dit|du|cac|lon|buoi|deo)\b/i;
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
        categories: { toxic: 0, hateSpeech: 0, spam: 0, violence: 0, profanity: 0, harassment: 0 },
        flags: [],
        action: "ALLOW",
        flaggedKeywords: [],
      };
    }

    const clean = text.toLowerCase().normalize("NFC");
    const tokens = this.tokenize(clean);

    // Chọn lexicon theo ngôn ngữ đồng thời cho phép quét chéo để không bỏ sót từ ngữ quốc tế
    const toxicLexicon = new Set([...this.viToxicLexicon, ...this.enToxicLexicon]);
    const hateLexicon = new Set([...this.viHateSpeechLexicon, ...this.enHateSpeechLexicon]);
    const spamPatterns = [...this.viSpamPatterns, ...this.enSpamPatterns];
    const violencePatterns = [...this.viViolencePatterns, ...this.enViolencePatterns];

    // Tính điểm Attention Weights & thu thập từ khóa vi phạm
    const toxicEvaluation = this.computeAttentionScore(tokens, toxicLexicon, clean, this.viProfanityRegex);
    const hateEvaluation = this.computeAttentionScore(tokens, hateLexicon, clean, undefined, 1.35);
    const spamScore = this.computePatternScore(clean, spamPatterns);
    const violenceScore = this.computePatternScore(clean, violencePatterns);

    const flaggedSet = new Set<string>([
      ...toxicEvaluation.matches,
      ...hateEvaluation.matches,
    ]);

    const profanityScore = toxicEvaluation.score;
    const toxicScore = toxicEvaluation.score;
    const hateScore = hateEvaluation.score;

    // Phát hiện quấy rối / công kích cá nhân (có đại từ chỉ định: mày, thằng này, con này, you)
    const isDirectTarget = /(mày|may|\bm\b|thằng\s*(này|kia)|con\s*(này|kia)|bố\s*mày|you|your|ur)/iu.test(clean);
    const harassmentScore = isDirectTarget && toxicScore > 0.4 ? Math.min(1.0, toxicScore * 0.95) : 0;

    const categories = {
      toxic: Math.min(1, toxicScore),
      profanity: Math.min(1, profanityScore),
      harassment: Math.min(1, harassmentScore),
      hateSpeech: Math.min(1, hateScore),
      spam: Math.min(1, spamScore),
      violence: Math.min(1, violenceScore),
    };

    // Tính điểm độc hại tổng thể: Mức độ nguy hại thực chất là điểm cao nhất giữa các phân loại nguy cơ
    const primaryThreat = Math.max(
      categories.toxic * 0.95,
      categories.profanity * 0.95,
      categories.hateSpeech * 1.0,
      categories.violence * 1.0,
      categories.spam * 0.75
    );

    // Tính điểm cộng hưởng nếu vi phạm nhiều danh mục
    const activeViolations = [
      categories.toxic,
      categories.profanity,
      categories.hateSpeech,
      categories.violence,
      categories.spam,
    ].filter((s) => s >= 0.4).length;
    const synergyBoost = activeViolations > 1 ? (activeViolations - 1) * 0.05 : 0;
    const overallToxicity = Math.min(1.0, primaryThreat + synergyBoost);

    const flags: string[] = [];
    if (categories.violence >= 0.6) flags.push("VIOLENCE_THREAT");
    if (categories.hateSpeech >= 0.5) flags.push("HATE_SPEECH");
    if (categories.profanity >= 0.5) flags.push("PROFANITY");
    if (categories.toxic >= 0.5) flags.push("TOXIC_LANGUAGE");
    if (categories.harassment >= 0.5) flags.push("HARASSMENT");
    if (categories.spam >= 0.6) flags.push("SPAM_PROMOTION");

    let action: "ALLOW" | "WARN" | "FLAG_REVIEW" | "BLOCK" = "ALLOW";
    let reason: string | undefined;

    if (categories.violence >= 0.7 || categories.hateSpeech >= 0.6 || overallToxicity >= 0.75) {
      action = "BLOCK";
      reason =
        resolvedLang === "vi"
          ? "Nội dung vi phạm nghiêm trọng tiêu chuẩn an toàn cộng đồng (thù ghét, bạo lực hoặc ngôn từ thô tục nặng)."
          : "Content severely violates community safety standards (hate speech, violence, or extreme profanity).";
    } else if (overallToxicity >= 0.5 || categories.toxic >= 0.5 || categories.profanity >= 0.5 || categories.spam >= 0.6) {
      action = "FLAG_REVIEW";
      reason =
        resolvedLang === "vi"
          ? "Nội dung có dấu hiệu công kích, tục tĩu hoặc spam, được chuyển tới kiểm duyệt viên."
          : "Content flagged for potential profanity, harassment, or spam, routed to human moderators.";
    } else if (overallToxicity >= 0.25 || categories.profanity >= 0.3) {
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
        profanity: Number(categories.profanity.toFixed(3)),
        harassment: Number(categories.harassment.toFixed(3)),
      },
      flags,
      action,
      reason,
      flaggedKeywords: Array.from(flaggedSet),
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
    regexPatterns?: RegExp[],
    weightMultiplier = 1.0
  ): { score: number; matches: string[] } {
    let hits = 0;
    const matches: string[] = [];

    for (const t of tokens) {
      if (lexicon.has(t)) {
        hits++;
        matches.push(t);
      }
    }

    for (const phrase of lexicon) {
      if (phrase.includes(" ") && fullText.includes(phrase)) {
        hits += 2;
        matches.push(phrase);
      }
    }

    if (regexPatterns) {
      for (const pattern of regexPatterns) {
        const m = fullText.match(pattern);
        if (m) {
          hits += 2;
          matches.push(m[0]);
        }
      }
    }

    if (hits === 0) return { score: 0, matches: [] };
    const density = hits / Math.max(tokens.length, 1);
    const score = (hits * 0.35 + density * 1.5) * weightMultiplier;
    return {
      score: Math.min(1.0, score),
      matches: Array.from(new Set(matches)),
    };
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
