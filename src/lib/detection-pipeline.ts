/**
 * Detection Pipeline
 *
 * Implements temporal smoothing, confidence calibration, and post-processing
 * Research: "Temporal smoothing: Aggregate predictions over 2-3 seconds"
 * Research: "Multi-model consensus pipelines for improved reliability"
 */

import type { DetectionResult } from '@/types/detection';

export interface PipelineConfig {
  temporalWindow: number; // seconds
  confidenceThreshold: number; // 0-1
  minimumConfirmations: number; // frames
  smoothingEnabled: boolean;
  consensusEnabled: boolean;
}

export interface ProcessedDetection extends DetectionResult {
  isConfirmed: boolean;
  frameCount: number;
  averageConfidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * Detection History Manager
 * Maintains temporal window of detections for smoothing
 */
export class DetectionHistory {
  private history: Array<{ timestamp: number; result: DetectionResult }> = [];
  private maxAge: number; // milliseconds

  constructor(windowSeconds = 3) {
    this.maxAge = windowSeconds * 1000;
  }

  /**
   * Add detection result to history
   */
  public add(result: DetectionResult): void {
    this.history.push({
      timestamp: Date.now(),
      result,
    });

    this.cleanup();
  }

  /**
   * Remove old entries outside temporal window
   */
  private cleanup(): void {
    const now = Date.now();
    this.history = this.history.filter(
      (entry) => now - entry.timestamp <= this.maxAge
    );
  }

  /**
   * Get all results within temporal window
   */
  public getRecent(): DetectionResult[] {
    this.cleanup();
    return this.history.map((entry) => entry.result);
  }

  /**
   * Calculate average violence probability over window
   */
  public getAverageViolenceProbability(): number {
    const recent = this.getRecent();
    if (recent.length === 0) return 0;

    const sum = recent.reduce(
      (acc, result) => acc + result.violenceProbability,
      0
    );
    return sum / recent.length;
  }

  /**
   * Count detections above threshold in window
   */
  public countAboveThreshold(threshold: number): number {
    return this.getRecent().filter(
      (result) => result.violenceProbability >= threshold
    ).length;
  }

  /**
   * Get detection trend
   */
  public getTrend(): 'increasing' | 'decreasing' | 'stable' {
    const recent = this.getRecent();
    if (recent.length < 3) return 'stable';

    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));

    const firstAvg =
      firstHalf.reduce((acc, r) => acc + r.violenceProbability, 0) /
      firstHalf.length;
    const secondAvg =
      secondHalf.reduce((acc, r) => acc + r.violenceProbability, 0) /
      secondHalf.length;

    const diff = secondAvg - firstAvg;

    if (Math.abs(diff) < 0.05) return 'stable';
    return diff > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Clear history
   */
  public clear(): void {
    this.history = [];
  }

  /**
   * Get history size
   */
  public size(): number {
    this.cleanup();
    return this.history.length;
  }
}

/**
 * Temporal Smoothing Filter
 * Research: "Requires sustained detection across multiple frames before triggering alerts"
 */
export class TemporalSmoother {
  private history: DetectionHistory;
  private config: PipelineConfig;

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = {
      temporalWindow: config.temporalWindow || 3,
      confidenceThreshold: config.confidenceThreshold || 0.85,
      minimumConfirmations: config.minimumConfirmations || 3,
      smoothingEnabled: config.smoothingEnabled ?? true,
      consensusEnabled: config.consensusEnabled ?? true,
    };

    this.history = new DetectionHistory(this.config.temporalWindow);
  }

  /**
   * Process detection result with temporal smoothing
   */
  public process(result: DetectionResult): ProcessedDetection {
    this.history.add(result);

    const recentResults = this.history.getRecent();
    const averageConfidence = this.history.getAverageViolenceProbability();
    const confirmations = this.history.countAboveThreshold(
      this.config.confidenceThreshold
    );
    const trend = this.history.getTrend();

    // Require multiple confirmations before triggering alert
    const isConfirmed =
      confirmations >= this.config.minimumConfirmations &&
      averageConfidence >= this.config.confidenceThreshold;

    return {
      ...result,
      violenceProbability: this.config.smoothingEnabled
        ? averageConfidence
        : result.violenceProbability,
      isConfirmed,
      frameCount: recentResults.length,
      averageConfidence,
      trend,
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.temporalWindow) {
      this.history = new DetectionHistory(config.temporalWindow);
    }
  }

  /**
   * Reset smoother state
   */
  public reset(): void {
    this.history.clear();
  }
}

/**
 * Confidence Calibration
 * Research: "Display confidence scores and model agreement percentages"
 */
export class ConfidenceCalibrator {
  /**
   * Calibrate confidence score based on model characteristics
   * Different models may have different confidence distributions
   */
  public calibrate(
    rawConfidence: number,
    modelType: 'legacy' | 'modern' | 'experimental'
  ): number {
    // Legacy VGG19 model tends to be overconfident
    if (modelType === 'legacy') {
      // Apply sigmoid calibration to reduce overconfidence
      const adjusted = 1 / (1 + Math.exp(-10 * (rawConfidence - 0.5)));
      return Math.max(0, Math.min(1, adjusted * 0.9));
    }

    // Modern models are typically well-calibrated
    if (modelType === 'modern') {
      return rawConfidence;
    }

    // Experimental models may need conservative calibration
    if (modelType === 'experimental') {
      return rawConfidence * 0.95;
    }

    return rawConfidence;
  }

  /**
   * Get confidence level label
   */
  public getConfidenceLevel(
    confidence: number
  ): 'very-low' | 'low' | 'medium' | 'high' | 'very-high' {
    if (confidence < 0.2) return 'very-low';
    if (confidence < 0.4) return 'low';
    if (confidence < 0.7) return 'medium';
    if (confidence < 0.9) return 'high';
    return 'very-high';
  }

  /**
   * Get visual representation of confidence
   */
  public getConfidenceColor(confidence: number): string {
    if (confidence < 0.3) return 'var(--success-green)';
    if (confidence < 0.7) return 'var(--warning-yellow)';
    return 'var(--danger-red)';
  }
}

/**
 * Multi-Model Consensus
 * Research: "Run three diverse models with agreement-based outputs"
 */
export class ConsensusValidator {
  private results: Map<string, DetectionResult[]> = new Map();
  private maxModels = 3;

  /**
   * Add model result
   */
  public addResult(modelId: string, result: DetectionResult): void {
    if (!this.results.has(modelId)) {
      this.results.set(modelId, []);
    }

    const modelResults = this.results.get(modelId)!;
    modelResults.push(result);

    // Keep only recent results (last 10)
    if (modelResults.length > 10) {
      modelResults.shift();
    }
  }

  /**
   * Get consensus prediction
   */
  public getConsensus(): {
    violenceProbability: number;
    agreement: number;
    modelCount: number;
  } | null {
    const modelIds = Array.from(this.results.keys());

    if (modelIds.length === 0) {
      return null;
    }

    // Get latest result from each model
    const latestResults = modelIds
      .map((id) => {
        const results = this.results.get(id)!;
        return results[results.length - 1];
      })
      .filter((r) => r !== undefined);

    if (latestResults.length === 0) {
      return null;
    }

    // Calculate average probability
    const avgProbability =
      latestResults.reduce((sum, r) => sum + r.violenceProbability, 0) /
      latestResults.length;

    // Calculate agreement (inverse of standard deviation)
    const variance =
      latestResults.reduce(
        (sum, r) => sum + Math.pow(r.violenceProbability - avgProbability, 2),
        0
      ) / latestResults.length;
    const stdDev = Math.sqrt(variance);

    // Agreement: 1 = perfect agreement, 0 = high disagreement
    const agreement = Math.max(0, 1 - stdDev * 2);

    return {
      violenceProbability: avgProbability,
      agreement,
      modelCount: latestResults.length,
    };
  }

  /**
   * Check if models agree on violence detection
   */
  public hasAgreement(threshold = 0.7): boolean {
    const consensus = this.getConsensus();
    return consensus !== null && consensus.agreement >= threshold;
  }

  /**
   * Clear all results
   */
  public clear(): void {
    this.results.clear();
  }
}

/**
 * Complete Detection Pipeline
 * Combines all post-processing steps
 */
export class DetectionPipeline {
  private smoother: TemporalSmoother;
  private calibrator: ConfidenceCalibrator;
  private consensus: ConsensusValidator;

  constructor(config: Partial<PipelineConfig> = {}) {
    this.smoother = new TemporalSmoother(config);
    this.calibrator = new ConfidenceCalibrator();
    this.consensus = new ConsensusValidator();
  }

  /**
   * Process raw detection result through pipeline
   */
  public process(
    result: DetectionResult,
    modelType: 'legacy' | 'modern' | 'experimental' = 'legacy',
    modelId?: string
  ): ProcessedDetection {
    // 1. Calibrate confidence
    const calibratedResult = {
      ...result,
      violenceProbability: this.calibrator.calibrate(
        result.violenceProbability,
        modelType
      ),
    };

    // 2. Add to consensus if model ID provided
    if (modelId) {
      this.consensus.addResult(modelId, calibratedResult);
    }

    // 3. Apply temporal smoothing
    const processed = this.smoother.process(calibratedResult);

    return processed;
  }

  /**
   * Get consensus across multiple models
   */
  public getConsensus() {
    return this.consensus.getConsensus();
  }

  /**
   * Update pipeline configuration
   */
  public updateConfig(config: Partial<PipelineConfig>): void {
    this.smoother.updateConfig(config);
  }

  /**
   * Reset pipeline state
   */
  public reset(): void {
    this.smoother.reset();
    this.consensus.clear();
  }

  /**
   * Get confidence visual properties
   */
  public getConfidenceVisuals(confidence: number) {
    return {
      level: this.calibrator.getConfidenceLevel(confidence),
      color: this.calibrator.getConfidenceColor(confidence),
    };
  }
}
