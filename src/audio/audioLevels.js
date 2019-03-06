export default class AudioLevels {
  constructor (audio) {
    this.audio = audio;
    // this.starts = new Uint8Array([0, 85, 170]); // Original
    // this.stops = new Uint8Array([85, 170, 255]);
    this.starts = new Uint8Array([0, 8, 72]);
    this.stops = new Uint8Array([8, 72, 255]);

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
      let effectiveFPS = fps;
      if (!AudioLevels.isFiniteNumber(effectiveFPS) || effectiveFPS < 15) {
        effectiveFPS = 15;
      } else if (effectiveFPS > 120) {
        effectiveFPS = 120;
      }

      for (let i = 0; i < 3; i++) {
        this.imm[i] = 0; // Clear for next loop
        for (let j = this.starts[i]; j < this.stops[i]; j++) {
          this.imm[i] += this.audio.freqArray[j];
        }
      }

      for (let i = 0; i < 3; i++) {
        let rate;
        if (this.imm[i] > this.avg[i]) {
          rate = 0.2;
        } else {
          rate = 0.5;
        }
        rate = AudioLevels.adjustRateToFPS(rate, 30.0, effectiveFPS);
        this.avg[i] = (this.avg[i] * rate) + (this.imm[i] * (1 - rate));

        if (frame < 50) {
          rate = 0.9;
        } else {
          rate = 0.992;
        }
        rate = AudioLevels.adjustRateToFPS(rate, 30.0, effectiveFPS);
        this.longAvg[i] = (this.longAvg[i] * rate) + (this.imm[i] * (1 - rate));

        if (this.longAvg[i] < 0.001) {
          this.val[i] = 1.0;
          this.att[i] = 1.0;
        } else {
          this.val[i] = this.imm[i] / this.longAvg[i];
          this.att[i] = this.avg[i] / this.longAvg[i];
        }
      }
    }
  }
}
