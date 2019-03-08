export default class AudioLevels {
  constructor (audio) {
    this.audio = audio;

    let sampleRate;
    if (this.audio.audioContext) {
      sampleRate = this.audio.audioContext.sampleRate;
    } else {
      sampleRate = 44100;
    }

    const bucketHz = sampleRate / this.audio.fftSize;

    const bassLow = Math.clamp(Math.ceil(20 / bucketHz), 1, this.audio.numSamps - 1);
    const bassHigh = Math.clamp(Math.round(320 / bucketHz), 1, this.audio.numSamps - 1);
    const midHigh = Math.clamp(Math.round(2800 / bucketHz), 1, this.audio.numSamps - 1);
    const trebHigh = Math.clamp(Math.round(11025 / bucketHz), 1, this.audio.numSamps - 1);

    this.starts = [bassLow, bassHigh, midHigh];
    this.stops = [bassHigh, midHigh, trebHigh];

    this.val = new Float32Array(3);
    this.imm = new Float32Array(3);
    this.att = new Float32Array(3);
    this.avg = new Float32Array(3);
    this.longAvg = new Float32Array(3);

    this.att.fill(1);
    this.avg.fill(1);
    this.longAvg.fill(1);
  }

  static isFiniteNumber (num) {
    return (Number.isFinite(num) && !Number.isNaN(num));
  }

  static adjustRateToFPS (rate, baseFPS, FPS) {
    const ratePerSecond = rate ** baseFPS;
    const ratePerFrame = ratePerSecond ** (1.0 / FPS);

    return ratePerFrame;
  }

  updateAudioLevels (fps, frame) {
    if (this.audio.freqArray.length > 0) {
      // Rescope; ~4% performance gain
      const val = this.val;
      const att = this.att;
      const avg = this.avg;
      const longAvg = this.longAvg;
      const imm = this.imm;
      const starts = this.starts;
      const stops = this.stops;
      const freqArray = this.audio.freqArray;

      let effectiveFPS = fps;
      if (!AudioLevels.isFiniteNumber(effectiveFPS) || effectiveFPS < 15) {
        effectiveFPS = 15;
      } else if (effectiveFPS > 144) {
        effectiveFPS = 144;
      }

      for (let i = 0; i < 3; i++) {
        imm[i] = 0; // Clear for next loop
        for (let j = starts[i]; j < stops[i]; j++) {
          imm[i] += freqArray[j];
        }
      }

      for (let i = 0; i < 3; i++) {
        let rate;
        if (imm[i] > avg[i]) {
          rate = 0.2;
        } else {
          rate = 0.5;
        }
        rate = AudioLevels.adjustRateToFPS(rate, 30.0, effectiveFPS);
        avg[i] = (avg[i] * rate) + (imm[i] * (1 - rate));

        if (frame < 50) {
          rate = 0.9;
        } else {
          rate = 0.992;
        }
        rate = AudioLevels.adjustRateToFPS(rate, 30.0, effectiveFPS);
        longAvg[i] = (longAvg[i] * rate) + (imm[i] * (1 - rate));

        if (longAvg[i] < 0.001) {
          val[i] = 1.0;
          att[i] = 1.0;
        } else {
          // dB to linear
          val[i] = imm[i] / longAvg[i];
          att[i] = avg[i] / longAvg[i];
        }
      }
    }
  }
}
