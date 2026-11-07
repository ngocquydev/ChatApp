import { describe, it, expect, beforeEach } from "vitest";
import { ModerationService } from "./moderation.service.js";
import { IsolationForest } from "./algorithms/isolation-forest.js";
import { AutoencoderAnomalyDetector } from "./algorithms/autoencoder-anomaly.js";
import { TransformerTextModerator } from "./algorithms/transformer-text-moderator.js";
import { VisionModerator } from "./algorithms/vision-moderator.js";

describe("Moderation & Trust Module (Hỗ trợ song ngữ VI / EN)", () => {
  let service: ModerationService;

  beforeEach(() => {
    service = new ModerationService();
    service.onModuleInit();
  });

  describe("1. Thuật toán Isolation Forest & Autoencoder (Phát hiện Bot & Tài khoản ảo)", () => {
    it("phải tính toán hệ số đường đi kỳ vọng c(n) chính xác theo công thức Liu et al.", () => {
      expect(IsolationForest.averagePathLengthFactor(1)).toBe(0);
      expect(IsolationForest.averagePathLengthFactor(2)).toBe(1);
      const c256 = IsolationForest.averagePathLengthFactor(256);
      expect(c256).toBeGreaterThan(8.5);
      expect(c256).toBeLessThan(10.5);
    });

    it("phải nhận diện người dùng bình thường và hỗ trợ báo cáo tiếng Việt", () => {
      const normalUser = {
        friendRequestsPerHour: 2.0,
        acceptanceRate: 0.65,
        actionIntervalVariance: 35.0,
        actionRepetitionRatio: 0.1,
        interactionVelocity: 3.0,
        distinctTargetRatio: 0.85,
      };

      const result = service.detectBotAnomaly(normalUser, "vi");
      expect(result.anomalyScore).toBeLessThan(0.6);
      expect(result.isAnomaly).toBe(false);
      expect(["LOW", "MEDIUM"]).toContain(result.riskLevel);
      expect(result.assessment).toContain("người dùng thật");
    });

    it("phải phát hiện spam bot và xuất kết luận bằng tiếng Anh (EN)", () => {
      const spamBot = {
        friendRequestsPerHour: 250.0,
        acceptanceRate: 0.02,
        actionIntervalVariance: 0.001,
        actionRepetitionRatio: 0.98,
        interactionVelocity: 85.0,
        distinctTargetRatio: 0.05,
      };

      const result = service.detectBotAnomaly(spamBot, "en");
      expect(result.anomalyScore).toBeGreaterThanOrEqual(0.6);
      expect(result.isAnomaly).toBe(true);
      expect(["HIGH", "CRITICAL"]).toContain(result.riskLevel);
      expect(result.assessment).toContain("Anomalous automated bot activity detected");
    });

    it("phải phát hiện sai số tái tạo cao trên Autoencoder khi gặp hành vi bất thường", () => {
      const detector = new AutoencoderAnomalyDetector({
        inputDim: 4,
        hiddenDim: 2,
        epochs: 40,
        anomalyThreshold: 0.4,
      });

      const normalDataset = [
        [1.0, 0.5, 20.0, 0.1],
        [1.2, 0.6, 25.0, 0.12],
        [0.8, 0.45, 18.0, 0.08],
        [1.1, 0.55, 22.0, 0.15],
      ];
      detector.fit(normalDataset);

      const normalSample = [1.05, 0.52, 21.0, 0.11];
      const botSample = [95.0, 0.01, 0.0001, 0.99];

      const normalPred = detector.predict(normalSample);
      const botPred = detector.predict(botSample);

      expect(botPred.reconstructionError).toBeGreaterThan(normalPred.reconstructionError);
    });
  });

  describe("2. Phân loại văn bản NLP Transformer Tiếng Việt (VI)", () => {
    const nlp = new TransformerTextModerator();

    it("phải tự động nhận diện ngôn ngữ 'vi' và cho phép văn bản thân thiện", () => {
      const text = "Chào bạn, hôm nay thời tiết đẹp và mọi người cùng làm việc vui vẻ nhé!";
      const res = nlp.moderate(text);

      expect(res.language).toBe("vi");
      expect(res.action).toBe("ALLOW");
      expect(res.toxicityScore).toBeLessThan(0.2);
    });

    it("phải phát hiện ngôn từ thô tục tiếng Việt (TOXIC_LANGUAGE)", () => {
      const text = "Thằng chó này ăn nói vcl ngu ngốc chết tiệt";
      const res = nlp.moderate(text, "vi");

      expect(res.language).toBe("vi");
      expect(res.flags).toContain("TOXIC_LANGUAGE");
      expect(["FLAG_REVIEW", "BLOCK"]).toContain(res.action);
      expect(res.reason).toContain("Nội dung");
    });

    it("phải phát hiện và chặn đứng chửi thề trực tiếp 'địt mẹ mày' và không dấu 'dit me may'", () => {
      const resAccented = nlp.moderate("địt mẹ mày", "vi");
      expect(resAccented.flags).toContain("PROFANITY");
      expect(resAccented.flags).toContain("TOXIC_LANGUAGE");
      expect(resAccented.action).toBe("BLOCK");
      expect(resAccented.toxicityScore).toBeGreaterThanOrEqual(0.8);
      expect(resAccented.categories.profanity).toBeGreaterThanOrEqual(0.8);
      expect(resAccented.flaggedKeywords.length).toBeGreaterThan(0);

      const resUnaccented = nlp.moderate("dit me may", "vi");
      expect(resUnaccented.flags).toContain("PROFANITY");
      expect(resUnaccented.action).toBe("BLOCK");
      expect(resUnaccented.toxicityScore).toBeGreaterThanOrEqual(0.8);
    });

    it("phải chặn đứng phát ngôn thù ghét tiếng Việt (HATE_SPEECH - BLOCK)", () => {
      const text = "bọn mọi rợ tiêu diệt giống loài này đi";
      const res = nlp.moderate(text, "vi");

      expect(res.flags).toContain("HATE_SPEECH");
      expect(res.action).toBe("BLOCK");
      expect(res.reason).toContain("vi phạm nghiêm trọng");
    });

    it("phải chặn đứng đe dọa bạo lực tiếng Việt (VIOLENCE_THREAT - BLOCK)", () => {
      const text = "Tao sẽ giết bắn chết mày hôm nay";
      const res = nlp.moderate(text, "vi");

      expect(res.flags).toContain("VIOLENCE_THREAT");
      expect(res.action).toBe("BLOCK");
    });

    it("phải phát hiện tin nhắn spam tiếng Việt (SPAM_PROMOTION)", () => {
      const text = "Kiếm 50 triệu mỗi ngày tại nhà uy tín, liên hệ ngay telegram : @botscam nhận thưởng";
      const res = nlp.moderate(text, "vi");

      expect(res.flags).toContain("SPAM_PROMOTION");
      expect(["FLAG_REVIEW", "BLOCK"]).toContain(res.action);
    });
  });

  describe("3. Phân loại văn bản NLP Transformer Tiếng Anh (EN)", () => {
    const nlp = new TransformerTextModerator();

    it("phải tự động nhận diện ngôn ngữ 'en' và cho phép văn bản thân thiện tiếng Anh", () => {
      const text = "Hello everyone, hope you are all having a productive and wonderful day!";
      const res = nlp.moderate(text);

      expect(res.language).toBe("en");
      expect(res.action).toBe("ALLOW");
      expect(res.toxicityScore).toBeLessThan(0.2);
    });

    it("phải phát hiện ngôn từ thô tục tiếng Anh (TOXIC_LANGUAGE - EN)", () => {
      const text = "You are such an idiot asshole bitch, get lost";
      const res = nlp.moderate(text, "en");

      expect(res.language).toBe("en");
      expect(res.flags).toContain("TOXIC_LANGUAGE");
      expect(["FLAG_REVIEW", "BLOCK"]).toContain(res.action);
      expect(res.reason).toContain("Content");
    });

    it("phải chặn đứng phát ngôn thù ghét tiếng Anh (HATE_SPEECH - EN - BLOCK)", () => {
      const text = "We are white supremacist neo nazi and we will exterminate them";
      const res = nlp.moderate(text, "en");

      expect(res.language).toBe("en");
      expect(res.flags).toContain("HATE_SPEECH");
      expect(res.action).toBe("BLOCK");
      expect(res.reason).toContain("severely violates community safety standards");
    });

    it("phải chặn đứng đe dọa bạo lực tiếng Anh (VIOLENCE_THREAT - EN - BLOCK)", () => {
      const text = "I will hunt you down and shoot you dead";
      const res = nlp.moderate(text, "en");

      expect(res.language).toBe("en");
      expect(res.flags).toContain("VIOLENCE_THREAT");
      expect(res.action).toBe("BLOCK");
    });

    it("phải phát hiện tin nhắn rác / lừa đảo tiếng Anh (SPAM_PROMOTION - EN)", () => {
      const text = "Earn $5000 daily make money fast with free crypto airdrop claim at telegram : @crypto_scam";
      const res = nlp.moderate(text, "en");

      expect(res.language).toBe("en");
      expect(res.flags).toContain("SPAM_PROMOTION");
      expect(["FLAG_REVIEW", "BLOCK"]).toContain(res.action);
    });
  });

  describe("4. Quét hình ảnh / video nhạy cảm Vision Model (Hỗ trợ VI / EN)", () => {
    const vision = new VisionModerator();

    it("phải hỗ trợ thông báo tiếng Việt khi kiểm duyệt hình ảnh", async () => {
      const res = await vision.scanImage(
        {
          url: "https://res.cloudinary.com/demo/image/upload/nature-landscape.jpg",
          sizeBytes: 1024 * 350,
        },
        "vi",
      );

      expect(res.language).toBe("vi");
      expect(res.isSafe).toBe(true);
      expect(res.action).toBe("ALLOW");
    });

    it("phải hỗ trợ giải thích tiếng Anh (EN) khi chặn hình ảnh NSFW", async () => {
      const res = await vision.scanImage(
        {
          url: "https://res.cloudinary.com/demo/image/upload/adult_explicit_nsfw_content.jpg",
        },
        "en",
      );

      expect(res.language).toBe("en");
      expect(res.isSafe).toBe(false);
      expect(res.action).toBe("BLOCK");
      expect(res.detectedCategories).toContain("ADULT_EXPLICIT");
      expect(res.reason).toContain("Media blocked due to severe visual safety violations");
    });

    it("phải chặn hình ảnh bạo lực và giải thích bằng tiếng Anh (EN)", async () => {
      const res = await vision.scanImage(
        {
          url: "https://res.cloudinary.com/demo/image/upload/violence_weapon_blood.jpg",
        },
        "en",
      );

      expect(res.language).toBe("en");
      expect(res.isSafe).toBe(false);
      expect(res.action).toBe("BLOCK");
      expect(res.detectedCategories).toContain("VIOLENCE_GORE");
    });

    it("phải phát hiện hình ảnh 18+ tiếng Việt và chặn bài viết", async () => {
      const res = await vision.scanImage(
        {
          url: "https://res.cloudinary.com/demo/image/upload/anh_nong_18plus_khieu_dam.jpg",
        },
        "vi",
      );

      expect(res.language).toBe("vi");
      expect(res.isSafe).toBe(false);
      expect(res.action).toBe("BLOCK");
      expect(res.scores.adult).toBeGreaterThanOrEqual(0.8);
      expect(res.reason).toContain("Hình ảnh bị chặn");
    });

    it("phải phát hiện ảnh nhạy cảm gợi cảm (racy/bikini) và chuyển cờ FLAG_REVIEW", async () => {
      const res = await vision.scanImage(
        {
          url: "https://res.cloudinary.com/demo/image/upload/summer_bikini_swimsuit.jpg",
        },
        "vi",
      );

      expect(res.action).toBe("FLAG_REVIEW");
      expect(res.scores.racy).toBeGreaterThanOrEqual(0.7);
    });

    it("phải phát hiện buffer có tỷ lệ da người cao (skin tone) để nhận diện ảnh 18+", async () => {
      const skinBuffer = Buffer.alloc(300);
      for (let i = 0; i < skinBuffer.length; i += 3) {
        skinBuffer[i] = 200;
        skinBuffer[i + 1] = 140;
        skinBuffer[i + 2] = 100;
      }

      const res = await vision.scanImage({ buffer: skinBuffer }, "vi");
      expect(res.scores.adult).toBeGreaterThanOrEqual(0.8);
      expect(res.action).toBe("BLOCK");
    });
  });
});
