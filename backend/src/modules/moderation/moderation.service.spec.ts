import { describe, it, expect, beforeEach } from "vitest";
import { ModerationService } from "./moderation.service.js";
import { IsolationForest } from "./algorithms/isolation-forest.js";
import { AutoencoderAnomalyDetector } from "./algorithms/autoencoder-anomaly.js";
import { TransformerTextModerator } from "./algorithms/transformer-text-moderator.js";
import { VisionModerator } from "./algorithms/vision-moderator.js";

describe("Moderation & Trust Module", () => {
  let service: ModerationService;

  beforeEach(() => {
    service = new ModerationService();
    service.onModuleInit();
  });

  describe("1. Thuật toán Isolation Forest (Phát hiện Bot & Tài khoản ảo)", () => {
    it("phải tính toán hệ số đường đi kỳ vọng c(n) chính xác theo công thức Liu et al.", () => {
      expect(IsolationForest.averagePathLengthFactor(1)).toBe(0);
      expect(IsolationForest.averagePathLengthFactor(2)).toBe(1);
      const c256 = IsolationForest.averagePathLengthFactor(256);
      // Với n=256, c(n) xấp xỉ 9.24
      expect(c256).toBeGreaterThan(8.5);
      expect(c256).toBeLessThan(10.5);
    });

    it("phải nhận diện người dùng bình thường có điểm dị thường thấp (isAnomaly = false)", () => {
      const normalUser = {
        friendRequestsPerHour: 2.0,
        acceptanceRate: 0.65,
        actionIntervalVariance: 35.0, // Thời gian tương tác ngẫu nhiên của con người
        actionRepetitionRatio: 0.1,
        interactionVelocity: 3.0,
        distinctTargetRatio: 0.85,
      };

      const result = service.detectBotAnomaly(normalUser);
      expect(result.anomalyScore).toBeLessThan(0.6);
      expect(result.isAnomaly).toBe(false);
      expect(["LOW", "MEDIUM"]).toContain(result.riskLevel);
    });

    it("phải phát hiện spam bot kết bạn hàng loạt và chu kỳ lặp lại (isAnomaly = true)", () => {
      const spamBot = {
        friendRequestsPerHour: 250.0, // Kết bạn ồ ạt 250 lượt/giờ
        acceptanceRate: 0.02, // Hầu như bị từ chối
        actionIntervalVariance: 0.001, // Chu kỳ chính xác đến từng mili-giây (hành vi bot)
        actionRepetitionRatio: 0.98, // 98% hành động lặp đi lặp lại
        interactionVelocity: 85.0, // Thao tác liên tục cực nhanh
        distinctTargetRatio: 0.05,
      };

      const result = service.detectBotAnomaly(spamBot);
      expect(result.anomalyScore).toBeGreaterThanOrEqual(0.6);
      expect(result.isAnomaly).toBe(true);
      expect(["HIGH", "CRITICAL"]).toContain(result.riskLevel);
    });
  });

  describe("2. Thuật toán Autoencoder (Anomaly Detection)", () => {
    it("phải phát hiện sai số tái tạo (Reconstruction Error) cao trên hành vi bất thường", () => {
      const detector = new AutoencoderAnomalyDetector({
        inputDim: 4,
        hiddenDim: 2,
        epochs: 40,
        anomalyThreshold: 0.4,
      });

      // Huấn luyện trên tập chuẩn
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

  describe("3. Phân loại văn bản NLP Transformer (Toxic language, Hate speech, Spam, Violence)", () => {
    const nlp = new TransformerTextModerator();

    it("phải cho phép văn bản thân thiện, tích cực (ALLOW)", () => {
      const text = "Chào bạn, hôm nay thời tiết đẹp và mọi người cùng làm việc vui vẻ nhé!";
      const res = nlp.moderate(text);

      expect(res.action).toBe("ALLOW");
      expect(res.toxicityScore).toBeLessThan(0.2);
      expect(res.flags).toHaveLength(0);
    });

    it("phải phát hiện ngôn từ thô tục, xúc phạm (TOXIC_LANGUAGE)", () => {
      const text = "Thằng chó này ăn nói vcl ngu ngốc chết tiệt";
      const res = nlp.moderate(text);

      expect(res.flags).toContain("TOXIC_LANGUAGE");
      expect(["FLAG_REVIEW", "BLOCK"]).toContain(res.action);
    });

    it("phải chặn đứng phát ngôn thù ghét, phân biệt đối xử (HATE_SPEECH - BLOCK)", () => {
      const text = "bọn mọi rợ tiêu diệt giống loài này đi";
      const res = nlp.moderate(text);

      expect(res.flags).toContain("HATE_SPEECH");
      expect(res.action).toBe("BLOCK");
    });

    it("phải chặn đứng đe dọa bạo lực thể xác (VIOLENCE_THREAT - BLOCK)", () => {
      const text = "Tao sẽ giết bắn chết mày hôm nay";
      const res = nlp.moderate(text);

      expect(res.flags).toContain("VIOLENCE_THREAT");
      expect(res.action).toBe("BLOCK");
    });

    it("phải phát hiện tin nhắn rác / lừa đảo cờ bạc (SPAM_PROMOTION)", () => {
      const text = "Kiếm 50 triệu mỗi ngày tại nhà uy tín, liên hệ ngay telegram : @botscam nhận thưởng";
      const res = nlp.moderate(text);

      expect(res.flags).toContain("SPAM_PROMOTION");
      expect(["FLAG_REVIEW", "BLOCK"]).toContain(res.action);
    });
  });

  describe("4. Quét hình ảnh / video nhạy cảm bằng Vision Model (ResNet / ViT)", () => {
    const vision = new VisionModerator();

    it("phải cho phép hình ảnh bình thường, trong sáng", async () => {
      const res = await vision.scanImage({
        url: "https://res.cloudinary.com/demo/image/upload/nature-landscape.jpg",
        sizeBytes: 1024 * 350,
      });

      expect(res.isSafe).toBe(true);
      expect(res.action).toBe("ALLOW");
      expect(res.detectedCategories).toHaveLength(0);
    });

    it("phải phát hiện và chặn hình ảnh nhạy cảm NSFW / khiêu dâm", async () => {
      const res = await vision.scanImage({
        url: "https://res.cloudinary.com/demo/image/upload/adult_explicit_nsfw_content.jpg",
      });

      expect(res.isSafe).toBe(false);
      expect(res.action).toBe("BLOCK");
      expect(res.detectedCategories).toContain("ADULT_EXPLICIT");
    });

    it("phải phát hiện và chặn hình ảnh bạo lực / máu me", async () => {
      const res = await vision.scanImage({
        url: "https://res.cloudinary.com/demo/image/upload/violence_weapon_blood.jpg",
      });

      expect(res.isSafe).toBe(false);
      expect(res.action).toBe("BLOCK");
      expect(res.detectedCategories).toContain("VIOLENCE_GORE");
    });
  });
});
