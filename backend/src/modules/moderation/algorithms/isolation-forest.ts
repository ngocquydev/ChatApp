/**
 * Isolation Forest (iForest) Anomaly Detection Algorithm
 * Paper: Liu, Ting, Zhou (2008) - "Isolation Forest"
 *
 * Used for detecting anomalous behavior in user activities (spam bots, rapid friend requests,
 * cyclic automated like/follow patterns).
 */

export interface IsolationForestConfig {
  /** Số lượng Isolation Tree trong ensemble (mặc định: 100) */
  numTrees?: number;
  /** Kích thước tập mẫu ngẫu nhiên cho mỗi cây (mặc định: 256) */
  subsampleSize?: number;
  /** Ngưỡng điểm dị thường để đánh dấu là Bot (mặc định: 0.6) */
  anomalyThreshold?: number;
}

export interface AnomalyPrediction {
  /** Điểm số dị thường từ 0.0 đến 1.0 (càng gần 1 càng bất thường / giống Bot) */
  anomalyScore: number;
  /** True nếu anomalyScore >= anomalyThreshold */
  isAnomaly: boolean;
  /** Độ sâu trung bình trên toàn bộ các cây */
  averagePathLength: number;
  /** Độ sâu kỳ vọng của tập dữ liệu */
  expectedPathLength: number;
}

interface IsolationTreeNode {
  isLeaf: boolean;
  size: number;
  splitFeature?: number;
  splitValue?: number;
  left?: IsolationTreeNode;
  right?: IsolationTreeNode;
}

export class IsolationForest {
  private trees: IsolationTreeNode[] = [];
  private readonly numTrees: number;
  private readonly subsampleSize: number;
  private readonly anomalyThreshold: number;
  private maxDepth: number = 8;
  private isTrained: boolean = false;

  constructor(config: IsolationForestConfig = {}) {
    this.numTrees = config.numTrees ?? 100;
    this.subsampleSize = config.subsampleSize ?? 256;
    this.anomalyThreshold = config.anomalyThreshold ?? 0.6;
  }

  /**
   * Tính độ dài đường đi kỳ vọng c(n) theo công thức của Liu et al. (2008)
   * c(n) = 2 * (ln(n - 1) + 0.5772156649) - (2 * (n - 1) / n)
   */
  public static averagePathLengthFactor(n: number): number {
    if (n <= 1) return 0;
    if (n === 2) return 1;
    const eulerMascheroni = 0.5772156649;
    return 2 * (Math.log(n - 1) + eulerMascheroni) - (2 * (n - 1)) / n;
  }

  /**
   * Huấn luyện mô hình Isolation Forest từ tập dữ liệu hành vi người dùng
   * @param data Mảng các vector đặc trưng số (mỗi vector là 1 người dùng)
   */
  public fit(data: number[][]): void {
    if (data.length === 0 || data[0].length === 0) {
      throw new Error("Dữ liệu huấn luyện không được để trống");
    }

    const n = Math.min(data.length, this.subsampleSize);
    this.maxDepth = Math.ceil(Math.log2(Math.max(n, 2)));
    this.trees = [];

    for (let i = 0; i < this.numTrees; i++) {
      const sample = this.getRandomSubsample(data, n);
      const tree = this.buildTree(sample, 0, this.maxDepth);
      this.trees.push(tree);
    }

    this.isTrained = true;
  }

  /**
   * Dự đoán mức độ bất thường của một vector đặc trưng
   * @param x Vector đặc trưng của người dùng cần kiểm tra
   */
  public predict(x: number[]): AnomalyPrediction {
    if (!this.isTrained || this.trees.length === 0) {
      throw new Error("Mô hình chưa được huấn luyện. Hãy gọi fit() trước.");
    }

    let totalPathLength = 0;
    for (const tree of this.trees) {
      totalPathLength += this.getPathLength(x, tree, 0);
    }

    const avgPathLength = totalPathLength / this.trees.length;
    const cN = IsolationForest.averagePathLengthFactor(this.subsampleSize);

    // Công thức tính Anomaly Score: s(x, n) = 2^(-E(h(x)) / c(n))
    const exponent = -avgPathLength / (cN || 1);
    const anomalyScore = Math.pow(2, exponent);

    return {
      anomalyScore: Math.min(1, Math.max(0, anomalyScore)),
      isAnomaly: anomalyScore >= this.anomalyThreshold,
      averagePathLength: avgPathLength,
      expectedPathLength: cN,
    };
  }

  private buildTree(data: number[][], currentDepth: number, maxDepth: number): IsolationTreeNode {
    if (currentDepth >= maxDepth || data.length <= 1) {
      return { isLeaf: true, size: data.length };
    }

    const numFeatures = data[0].length;
    // Chọn ngẫu nhiên 1 feature
    const featureIdx = Math.floor(Math.random() * numFeatures);

    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const row of data) {
      const val = row[featureIdx];
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }

    // Nếu tất cả các giá trị feature bằng nhau, tạo lá
    if (minVal === maxVal) {
      return { isLeaf: true, size: data.length };
    }

    // Chọn ngẫu nhiên ngưỡng phân tách trong khoảng (minVal, maxVal)
    const splitValue = minVal + Math.random() * (maxVal - minVal);

    const leftData: number[][] = [];
    const rightData: number[][] = [];

    for (const row of data) {
      if (row[featureIdx] < splitValue) {
        leftData.push(row);
      } else {
        rightData.push(row);
      }
    }

    return {
      isLeaf: false,
      size: data.length,
      splitFeature: featureIdx,
      splitValue,
      left: this.buildTree(leftData, currentDepth + 1, maxDepth),
      right: this.buildTree(rightData, currentDepth + 1, maxDepth),
    };
  }

  private getPathLength(x: number[], node: IsolationTreeNode, currentDepth: number): number {
    if (node.isLeaf) {
      return currentDepth + IsolationForest.averagePathLengthFactor(node.size);
    }

    const feature = node.splitFeature!;
    const val = x[feature];

    if (val < node.splitValue!) {
      return this.getPathLength(x, node.left!, currentDepth + 1);
    } else {
      return this.getPathLength(x, node.right!, currentDepth + 1);
    }
  }

  private getRandomSubsample(data: number[][], sampleSize: number): number[][] {
    if (data.length <= sampleSize) return [...data];
    const shuffled = [...data];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, sampleSize);
  }
}

