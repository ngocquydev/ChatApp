/**
 * Autoencoder-based Anomaly Detector
 *
 * Trains a lightweight feed-forward neural autoencoder (Encoder -> Bottleneck -> Decoder)
 * on normal user interaction profiles. Anomalous bot traffic yields high reconstruction error.
 */

export interface AutoencoderConfig {
  inputDim: number;
  hiddenDim?: number;
  learningRate?: number;
  epochs?: number;
  anomalyThreshold?: number;
}

export class AutoencoderAnomalyDetector {
  private readonly inputDim: number;
  private readonly hiddenDim: number;
  private readonly lr: number;
  private readonly epochs: number;
  private readonly threshold: number;

  // Trọng số encoder và decoder
  private W1: number[][] = [];
  private b1: number[] = [];
  private W2: number[][] = [];
  private b2: number[] = [];

  // Thống kê chuẩn hóa (Mean & Std)
  private means: number[] = [];
  private stds: number[] = [];

  constructor(config: AutoencoderConfig) {
    this.inputDim = config.inputDim;
    this.hiddenDim = config.hiddenDim ?? Math.max(2, Math.floor(config.inputDim / 2));
    this.lr = config.learningRate ?? 0.01;
    this.epochs = config.epochs ?? 50;
    this.threshold = config.anomalyThreshold ?? 0.45;
    this.initWeights();
  }

  private initWeights(): void {
    // Khởi tạo trọng số Xavier / He
    const scale1 = Math.sqrt(2 / (this.inputDim + this.hiddenDim));
    this.W1 = Array.from({ length: this.hiddenDim }, () =>
      Array.from({ length: this.inputDim }, () => (Math.random() * 2 - 1) * scale1)
    );
    this.b1 = Array.from({ length: this.hiddenDim }, () => 0);

    const scale2 = Math.sqrt(2 / (this.hiddenDim + this.inputDim));
    this.W2 = Array.from({ length: this.inputDim }, () =>
      Array.from({ length: this.hiddenDim }, () => (Math.random() * 2 - 1) * scale2)
    );
    this.b2 = Array.from({ length: this.inputDim }, () => 0);
  }

  private relu(x: number): number {
    return Math.max(0, x);
  }

  private reluDeriv(x: number): number {
    return x > 0 ? 1 : 0;
  }

  public fit(dataset: number[][]): void {
    if (dataset.length === 0) return;

    // Tính Mean và Std để chuẩn hóa Z-score
    this.means = Array.from({ length: this.inputDim }, () => 0);
    this.stds = Array.from({ length: this.inputDim }, () => 0);

    for (const row of dataset) {
      for (let j = 0; j < this.inputDim; j++) {
        this.means[j] += row[j];
      }
    }
    for (let j = 0; j < this.inputDim; j++) {
      this.means[j] /= dataset.length;
    }

    for (const row of dataset) {
      for (let j = 0; j < this.inputDim; j++) {
        this.stds[j] += Math.pow(row[j] - this.means[j], 2);
      }
    }
    for (let j = 0; j < this.inputDim; j++) {
      this.stds[j] = Math.sqrt(this.stds[j] / dataset.length) || 1e-6;
    }

    const normalizedData = dataset.map((row) =>
      row.map((val, j) => (val - this.means[j]) / this.stds[j])
    );

    // Huấn luyện SGD đơn giản
    for (let epoch = 0; epoch < this.epochs; epoch++) {
      for (const x of normalizedData) {
        // Forward pass
        const h: number[] = Array.from({ length: this.hiddenDim }, () => 0);
        for (let i = 0; i < this.hiddenDim; i++) {
          let sum = this.b1[i];
          for (let j = 0; j < this.inputDim; j++) {
            sum += this.W1[i][j] * x[j];
          }
          h[i] = this.relu(sum);
        }

        const out: number[] = Array.from({ length: this.inputDim }, () => 0);
        for (let i = 0; i < this.inputDim; i++) {
          let sum = this.b2[i];
          for (let j = 0; j < this.hiddenDim; j++) {
            sum += this.W2[i][j] * h[j];
          }
          out[i] = sum; // Linear output
        }

        // Backward pass (MSE Loss)
        const dOut = out.map((o, i) => 2 * (o - x[i]) / this.inputDim);

        const dH: number[] = Array.from({ length: this.hiddenDim }, () => 0);
        for (let j = 0; j < this.hiddenDim; j++) {
          let grad = 0;
          for (let i = 0; i < this.inputDim; i++) {
            grad += dOut[i] * this.W2[i][j];
          }
          dH[j] = grad * this.reluDeriv(h[j]);
        }

        // Cập nhật W2, b2
        for (let i = 0; i < this.inputDim; i++) {
          this.b2[i] -= this.lr * dOut[i];
          for (let j = 0; j < this.hiddenDim; j++) {
            this.W2[i][j] -= this.lr * dOut[i] * h[j];
          }
        }

        // Cập nhật W1, b1
        for (let i = 0; i < this.hiddenDim; i++) {
          this.b1[i] -= this.lr * dH[i];
          for (let j = 0; j < this.inputDim; j++) {
            this.W1[i][j] -= this.lr * dH[i] * x[j];
          }
        }
      }
    }
  }

  public predict(sample: number[]): { reconstructionError: number; isAnomaly: boolean } {
    const x = sample.map((v, i) => (v - (this.means[i] ?? 0)) / (this.stds[i] ?? 1));

    // Encode
    const h: number[] = Array.from({ length: this.hiddenDim }, () => 0);
    for (let i = 0; i < this.hiddenDim; i++) {
      let sum = this.b1[i];
      for (let j = 0; j < this.inputDim; j++) {
        sum += this.W1[i][j] * x[j];
      }
      h[i] = this.relu(sum);
    }

    // Decode
    const out: number[] = Array.from({ length: this.inputDim }, () => 0);
    let mse = 0;
    for (let i = 0; i < this.inputDim; i++) {
      let sum = this.b2[i];
      for (let j = 0; j < this.hiddenDim; j++) {
        sum += this.W2[i][j] * h[j];
      }
      out[i] = sum;
      mse += Math.pow(out[i] - x[i], 2);
    }

    const reconstructionError = mse / this.inputDim;
    return {
      reconstructionError,
      isAnomaly: reconstructionError >= this.threshold,
    };
  }
}
