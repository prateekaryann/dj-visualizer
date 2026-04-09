/**
 * AudioMetrics — Advanced audio feature extraction engine.
 *
 * Extracts rich metrics from raw frequency + waveform data:
 *  - 7-band frequency decomposition (sub-bass → brilliance)
 *  - Vocal isolation (200Hz–4kHz)
 *  - Spectral centroid (perceived brightness)
 *  - Spectral flux (onset/change detection)
 *  - RMS energy (overall loudness)
 *  - Zero-crossing rate (noisiness vs tonal content)
 *  - Pitch estimate (dominant frequency via autocorrelation)
 *  - Silence gate (suppresses ambient noise)
 *  - Adaptive normalization per-band
 */
(function () {
  'use strict';

  // Frequency band definitions (bin indices for 64-bin FFT at 44100Hz sample rate)
  // Each bin ≈ 21.5Hz (44100 / 2048)
  // After downsampling 1024→64, each output bin covers ~16 raw bins ≈ 344Hz
  const BANDS = {
    subBass:    { start: 0,  end: 1  },   // ~0–344Hz (sub-bass, kick fundamentals)
    bass:       { start: 1,  end: 3  },   // ~344–1032Hz (bass, low punch)
    lowMid:     { start: 3,  end: 6  },   // ~1032–2064Hz (warmth, body)
    mid:        { start: 6,  end: 12 },   // ~2064–4128Hz (presence, vocals)
    upperMid:   { start: 12, end: 20 },   // ~4128–6880Hz (clarity, articulation)
    presence:   { start: 20, end: 35 },   // ~6880–12040Hz (definition, edge)
    brilliance: { start: 35, end: 64 },   // ~12040–22050Hz (air, shimmer)
  };

  // Vocal range: roughly bins 1–12 (200Hz–4kHz)
  const VOCAL_RANGE = { start: 1, end: 12 };

  class AudioMetrics {
    constructor() {
      // --- Raw extracted values (0–1) ---
      this.subBass    = 0;
      this.bass       = 0;
      this.lowMid     = 0;
      this.mid        = 0;
      this.upperMid   = 0;
      this.presence   = 0;
      this.brilliance = 0;
      this.vocals     = 0;

      // --- Derived metrics ---
      this.spectralCentroid = 0;  // 0–1 (dark → bright)
      this.spectralFlux     = 0;  // 0–1 (change magnitude)
      this.rmsEnergy        = 0;  // 0–1 (overall loudness)
      this.zeroCrossingRate = 0;  // 0–1 (noisy → tonal)
      this.pitchHz          = 0;  // estimated dominant frequency in Hz
      this.pitchNote        = ''; // nearest musical note

      // --- Composite helpers for visualizer ---
      this.isSilent      = true;   // true when no meaningful audio
      this.energy         = 0;      // master energy (gated)
      this.attackEnvelope = 0;      // fast attack, slow release envelope

      // --- Internal state ---
      this._prevSpectrum   = new Float32Array(64);
      this._bandPeaks      = {};    // adaptive peak per band
      this._bandFloors     = {};    // adaptive floor per band
      for (const name of Object.keys(BANDS)) {
        this._bandPeaks[name]  = 0.5;  // start high so early noise doesn't normalize to 1.0
        this._bandFloors[name] = 0.3;  // start at typical room noise level
      }
      this._bandPeaks.vocals  = 0.5;
      this._bandFloors.vocals = 0.3;

      this._silenceFrames   = 0;
      this._silenceThreshold = 0.08; // RMS below this = silence (raised for ×6 gain)
      this._silenceHoldFrames = 12;  // require 12 consecutive silent frames (~200ms)

      // Noise calibration: first N frames learn the room baseline
      this._calibrationFrames = 0;
      this._calibrationLength = 60;  // ~1 second at 60fps
      this._isCalibrating = true;
      this._calibrationRmsSum = 0;
      this._calibrationBandSums = {};
      for (const name of Object.keys(BANDS)) {
        this._calibrationBandSums[name] = 0;
      }
      this._calibrationBandSums.vocals = 0;
      this._noiseRms = 0.08;         // will be updated after calibration

      this._prevRmsEnergy   = 0;
      this._attackRelease   = 0;

      // Smoothing speeds (attack / release)
      this._smoothAttack = 0.3;
      this._smoothRelease = 0.06;
    }

    /**
     * Process one frame of audio data.
     * @param {Float32Array} freqData  - 64 bins in [-100, 0] dB range
     * @param {Float32Array} waveData  - 256 samples in [-1, 1] range
     * @param {number} sampleRate      - audio context sample rate (default 44100)
     */
    update(freqData, waveData, sampleRate = 44100) {
      if (!freqData || freqData.length < 64) return;

      // --- 1. RMS Energy from waveform ---
      this._computeRMS(waveData);

      // --- 1b. Noise calibration (first ~1s: learn room baseline) ---
      if (this._isCalibrating) {
        this._runCalibration(freqData);
        // During calibration, output silence
        this.isSilent = true;
        this._prevSpectrum.set(freqData);
        return;
      }

      // --- 2. Silence gate (uses calibrated noise floor) ---
      this._updateSilenceGate();

      // --- 3. Frequency band extraction with adaptive normalization ---
      this._extractBands(freqData);

      // --- 4. Vocal isolation ---
      this._extractVocals(freqData);

      // --- 5. Spectral centroid ---
      this._computeSpectralCentroid(freqData);

      // --- 6. Spectral flux ---
      this._computeSpectralFlux(freqData);

      // --- 7. Zero-crossing rate ---
      this._computeZeroCrossingRate(waveData);

      // --- 8. Pitch estimation ---
      this._estimatePitch(waveData, sampleRate);

      // --- 9. Master energy (gated + hard zero when silent) ---
      const rawEnergy = this.subBass * 0.25 + this.bass * 0.25 +
                        this.lowMid * 0.15 + this.mid * 0.15 +
                        this.upperMid * 0.1 + this.presence * 0.05 +
                        this.brilliance * 0.05;
      if (this.isSilent) {
        this.energy *= 0.88; // decay toward zero
        if (this.energy < 0.005) this.energy = 0;
      } else {
        this.energy = rawEnergy;
      }

      // --- 10. Attack envelope ---
      if (!this.isSilent && rawEnergy > this._attackRelease) {
        this._attackRelease += (rawEnergy - this._attackRelease) * 0.5;
      } else {
        this._attackRelease *= 0.95;
      }
      if (this.isSilent) {
        this.attackEnvelope *= 0.88;
        if (this.attackEnvelope < 0.005) this.attackEnvelope = 0;
      } else {
        this.attackEnvelope = this._attackRelease;
      }

      // Store spectrum for next frame's flux calculation
      this._prevSpectrum.set(freqData);
    }

    // ── Noise Calibration ────────────────────────────────────────────

    _runCalibration(freqData) {
      this._calibrationFrames++;
      this._calibrationRmsSum += this.rmsEnergy;

      // Accumulate per-band averages
      for (const [name, range] of Object.entries(BANDS)) {
        this._calibrationBandSums[name] += this._avgBins(freqData, range.start, range.end);
      }
      this._calibrationBandSums.vocals += this._avgBins(freqData, VOCAL_RANGE.start, VOCAL_RANGE.end);

      if (this._calibrationFrames >= this._calibrationLength) {
        // Set noise floor from calibration
        const n = this._calibrationLength;
        this._noiseRms = (this._calibrationRmsSum / n) * 1.8; // 80% headroom above measured noise

        // Set per-band floors to calibrated noise level + margin
        for (const name of Object.keys(BANDS)) {
          const avgNoise = this._calibrationBandSums[name] / n;
          this._bandFloors[name] = avgNoise * 1.2; // 20% above measured noise
          this._bandPeaks[name] = Math.max(this._bandPeaks[name], avgNoise * 3); // ensure headroom
        }
        const vocalNoise = this._calibrationBandSums.vocals / n;
        this._bandFloors.vocals = vocalNoise * 1.2;
        this._bandPeaks.vocals = Math.max(this._bandPeaks.vocals, vocalNoise * 3);

        // Update silence threshold based on actual room noise
        this._silenceThreshold = Math.max(0.05, this._noiseRms);

        this._isCalibrating = false;
      }
    }

    // ── Band Extraction ──────────────────────────────────────────────

    _extractBands(freqData) {
      for (const [name, range] of Object.entries(BANDS)) {
        const raw = this._avgBins(freqData, range.start, range.end);
        this[name] = this._smoothAndNormalize(name, raw);
      }
    }

    _extractVocals(freqData) {
      const raw = this._avgBins(freqData, VOCAL_RANGE.start, VOCAL_RANGE.end);
      this.vocals = this._smoothAndNormalize('vocals', raw);
    }

    _avgBins(freqData, start, end) {
      let sum = 0;
      const count = end - start;
      for (let i = start; i < end; i++) {
        // Convert from [-100, 0] dB to linear [0, 1]
        sum += Math.max(0, (freqData[i] + 100) / 100);
      }
      return sum / Math.max(1, count);
    }

    /**
     * Adaptive per-band normalization:
     * - Tracks running peak and floor per band
     * - Maps current value to [0, 1] relative to observed dynamic range
     * - Applies asymmetric smoothing (fast attack, slow release)
     */
    _smoothAndNormalize(bandName, rawLinear) {
      // Update adaptive peak/floor with slow tracking
      const peak = this._bandPeaks[bandName];
      const floor = this._bandFloors[bandName];

      if (rawLinear > peak) {
        this._bandPeaks[bandName] += (rawLinear - peak) * 0.1;
      } else {
        this._bandPeaks[bandName] *= 0.9995; // very slow decay (~14s to halve)
      }

      if (rawLinear < floor || floor < 0.001) {
        this._bandFloors[bandName] += (rawLinear - floor) * 0.05;
      } else {
        this._bandFloors[bandName] *= 1.0003; // slowly rise toward noise floor
      }

      // Ensure minimum dynamic range to avoid division issues
      const dynamicRange = Math.max(0.08, this._bandPeaks[bandName] - this._bandFloors[bandName]);
      let normalized = (rawLinear - this._bandFloors[bandName]) / dynamicRange;
      normalized = Math.max(0, Math.min(1, normalized));

      // Apply silence gate: fully suppress when silent
      if (this.isSilent) normalized = 0;

      // Asymmetric smoothing
      const current = this[bandName] || 0;
      if (normalized > current) {
        return current + (normalized - current) * this._smoothAttack;
      } else {
        // Faster decay toward zero when silent
        const releaseSpeed = this.isSilent ? 0.15 : this._smoothRelease;
        const result = current + (normalized - current) * releaseSpeed;
        return result < 0.005 ? 0 : result; // hard zero at threshold
      }
    }

    // ── RMS Energy ───────────────────────────────────────────────────

    _computeRMS(waveData) {
      if (!waveData || waveData.length === 0) { this.rmsEnergy = 0; return; }
      let sum = 0;
      for (let i = 0; i < waveData.length; i++) {
        sum += waveData[i] * waveData[i];
      }
      const rms = Math.sqrt(sum / waveData.length);
      // Smooth
      if (rms > this.rmsEnergy) {
        this.rmsEnergy += (rms - this.rmsEnergy) * 0.4;
      } else {
        this.rmsEnergy += (rms - this.rmsEnergy) * 0.1;
      }
    }

    // ── Silence Gate ─────────────────────────────────────────────────

    _updateSilenceGate() {
      if (this.rmsEnergy < this._silenceThreshold) {
        this._silenceFrames++;
      } else {
        this._silenceFrames = 0;
      }
      this.isSilent = this._silenceFrames > this._silenceHoldFrames;
    }

    // ── Spectral Centroid ────────────────────────────────────────────

    _computeSpectralCentroid(freqData) {
      let weightedSum = 0, totalWeight = 0;
      for (let i = 0; i < freqData.length; i++) {
        const linear = Math.max(0, (freqData[i] + 100) / 100);
        weightedSum += i * linear;
        totalWeight += linear;
      }
      const raw = totalWeight > 0.001 ? weightedSum / (totalWeight * freqData.length) : 0;
      // Smooth
      this.spectralCentroid += (raw - this.spectralCentroid) * 0.15;
    }

    // ── Spectral Flux ────────────────────────────────────────────────

    _computeSpectralFlux(freqData) {
      let flux = 0;
      for (let i = 0; i < freqData.length; i++) {
        const diff = ((freqData[i] + 100) / 100) - ((this._prevSpectrum[i] + 100) / 100);
        if (diff > 0) flux += diff; // only positive changes (onsets)
      }
      // Normalize: max possible flux ≈ 64 (all bins go from 0 to 1)
      flux = Math.min(1, flux / 8); // /8 for practical range
      if (this.isSilent) flux *= 0.1;
      this.spectralFlux += (flux - this.spectralFlux) * 0.3;
    }

    // ── Zero-Crossing Rate ───────────────────────────────────────────

    _computeZeroCrossingRate(waveData) {
      if (!waveData || waveData.length < 2) { this.zeroCrossingRate = 0; return; }
      let crossings = 0;
      for (let i = 1; i < waveData.length; i++) {
        if ((waveData[i] >= 0) !== (waveData[i - 1] >= 0)) crossings++;
      }
      // Normalize: theoretical max = waveData.length - 1
      const raw = crossings / (waveData.length - 1);
      this.zeroCrossingRate += (raw - this.zeroCrossingRate) * 0.15;
    }

    // ── Pitch Estimation (autocorrelation) ───────────────────────────

    _estimatePitch(waveData, sampleRate) {
      if (!waveData || waveData.length < 128 || this.isSilent) {
        this.pitchHz += (0 - this.pitchHz) * 0.1;
        this.pitchNote = '';
        return;
      }

      const len = waveData.length;
      // Downsample factor (waveData is already 256 samples from 2048)
      const effectiveSR = sampleRate / (2048 / 256); // ~3100 Hz effective

      let bestCorr = 0, bestLag = 0;
      // Search lags corresponding to 60Hz–800Hz
      const minLag = Math.floor(effectiveSR / 800);
      const maxLag = Math.min(len / 2, Math.floor(effectiveSR / 60));

      for (let lag = minLag; lag < maxLag; lag++) {
        let corr = 0;
        for (let i = 0; i < len - lag; i++) {
          corr += waveData[i] * waveData[i + lag];
        }
        if (corr > bestCorr) {
          bestCorr = corr;
          bestLag = lag;
        }
      }

      if (bestLag > 0 && bestCorr > 0.01) {
        const hz = effectiveSR / bestLag;
        this.pitchHz += (hz - this.pitchHz) * 0.12;
        this.pitchNote = this._hzToNote(this.pitchHz);
      }
    }

    _hzToNote(hz) {
      if (hz < 20) return '';
      const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const semitone = 12 * Math.log2(hz / 440) + 69;
      const noteIdx = Math.round(semitone) % 12;
      const octave = Math.floor(Math.round(semitone) / 12) - 1;
      return NOTES[(noteIdx + 12) % 12] + octave;
    }

    /**
     * Get a snapshot object of all current metrics (useful for debug overlay).
     */
    snapshot() {
      return {
        subBass: this.subBass,
        bass: this.bass,
        lowMid: this.lowMid,
        mid: this.mid,
        upperMid: this.upperMid,
        presence: this.presence,
        brilliance: this.brilliance,
        vocals: this.vocals,
        spectralCentroid: this.spectralCentroid,
        spectralFlux: this.spectralFlux,
        rmsEnergy: this.rmsEnergy,
        zeroCrossingRate: this.zeroCrossingRate,
        pitchHz: this.pitchHz,
        pitchNote: this.pitchNote,
        isSilent: this.isSilent,
        energy: this.energy,
        attackEnvelope: this.attackEnvelope,
      };
    }
  }

  window.AudioMetrics = AudioMetrics;
})();
