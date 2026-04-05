/**
 * MicAnalyser — captures microphone audio and drives the visualizer.
 *
 * Key design decisions for real-world music-through-speakers:
 *  - GainNode amplifies the raw mic signal ×12 before analysis
 *  - smoothingTimeConstant = 0.55 — fast enough to catch transients
 *  - Normalisation uses the ACTUAL measured noise floor (dynamic calibration)
 *    so the full [0,1] range is used regardless of room volume
 *  - Output format matches AudioEngine.getFrequencyData() exactly so
 *    VisualizerBG.update() needs zero changes
 */
class MicAnalyser {
  constructor() {
    this.active = false;
    this._ctx      = null;
    this._source   = null;
    this._gain     = null;
    this._analyser = null;
    this._stream   = null;
    this._freqBuf  = null;   // raw Float32Array from analyser (full bins)
    this._waveBuf  = null;

    // Dynamic noise floor calibration
    this._noiseFloor  = -80;   // dB, updated continuously
    this._peakCeiling = -20;   // dB, updated continuously

    // Smoothed energy (for beat detection)
    this._prevBassEnergy = 0;
  }

  async start() {
    if (this.active) return;

    this._stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      video: false,
    });

    this._ctx    = new (window.AudioContext || window.webkitAudioContext)();
    this._source = this._ctx.createMediaStreamSource(this._stream);

    // Amplify the mic signal strongly before analysis
    this._gain      = this._ctx.createGain();
    this._gain.gain.value = 12;   // ×12 — compensates for air-gap attenuation

    this._analyser                      = this._ctx.createAnalyser();
    this._analyser.fftSize              = 2048;
    this._analyser.smoothingTimeConstant = 0.5;  // fast, responsive to transients

    this._source.connect(this._gain);
    this._gain.connect(this._analyser);
    // Do NOT connect to destination — no audio feedback

    this._freqBuf = new Float32Array(this._analyser.frequencyBinCount); // 1024
    this._waveBuf = new Float32Array(this._analyser.fftSize);           // 2048
    this.active   = true;
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    try { this._source && this._source.disconnect(); } catch (_) {}
    try { this._gain   && this._gain.disconnect();   } catch (_) {}
    this._stream && this._stream.getTracks().forEach(t => t.stop());
    this._ctx && this._ctx.state !== 'closed' && this._ctx.close();
    this._source = this._gain = this._stream = this._ctx = this._analyser = null;
  }

  /**
   * Returns a Float32Array(64) of dB values in roughly [-100, 0] range
   * matching the format Tone.js FFT.getValue() produces, so VisualizerBG
   * can consume it without any changes.
   */
  getFrequencyData() {
    if (!this.active || !this._analyser) return new Float32Array(64).fill(-100);

    this._analyser.getFloatFrequencyData(this._freqBuf);

    // Update dynamic range calibration using a slow lerp
    let maxVal = -Infinity, minVal = Infinity;
    for (let i = 2; i < this._freqBuf.length * 0.8; i++) {
      const v = this._freqBuf[i];
      if (isFinite(v)) {
        if (v > maxVal) maxVal = v;
        if (v < minVal) minVal = v;
      }
    }
    if (isFinite(maxVal)) this._peakCeiling += (maxVal  - this._peakCeiling) * 0.05;
    if (isFinite(minVal)) this._noiseFloor  += (minVal   - this._noiseFloor)  * 0.02;

    // Downsample 1024 → 64 bins, taking RMS in each bucket
    const out  = new Float32Array(64);
    const step = Math.floor(this._freqBuf.length / 64);
    const range = Math.max(20, this._peakCeiling - this._noiseFloor);

    for (let i = 0; i < 64; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        const v = this._freqBuf[i * step + j];
        sum += isFinite(v) ? v : this._noiseFloor;
      }
      const avg = sum / step;

      // Remap to [-100, 0] so the visualiser's `(v + 100) / 100` formula
      // gives a clean [0, 1] output calibrated to THIS room's levels
      out[i] = ((avg - this._noiseFloor) / range) * 100 - 100;
    }
    return out;
  }

  /**
   * Returns Float32Array(256) of normalised waveform samples [-1, 1].
   */
  getWaveformData() {
    if (!this.active || !this._analyser) return new Float32Array(256);
    this._analyser.getFloatTimeDomainData(this._waveBuf);

    const out  = new Float32Array(256);
    const step = Math.floor(this._waveBuf.length / 256);
    for (let i = 0; i < 256; i++) {
      out[i] = this._waveBuf[i * step];
    }
    return out;
  }
}

window.MicAnalyser = MicAnalyser;
