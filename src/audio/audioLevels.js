export default class AudioLevels {
  constructor (audio) {
    // Re-scope
    this.audio = audio;
    this.freqArray = this.audio.freqArray;

    // Set up beat detection bins
    let sampleRate = 44100;
    if (this.audio.audioContext) {
      sampleRate = this.audio.audioContext.sampleRate;
    }
    const bucketHz = sampleRate / this.audio.fftSize;
    const bassLow = Math.clamp(Math.ceil(20 / bucketHz), 1, this.audio.numSamps - 1);
    const bassHigh = Math.clamp(Math.ceil(320 / bucketHz), 1, this.audio.numSamps - 1);
    const midHigh = Math.clamp(Math.ceil(2800 / bucketHz), 1, this.audio.numSamps - 1);
    const trebHigh = Math.clamp(Math.ceil(11025 / bucketHz), 1, this.audio.numSamps - 1);
    this.starts = [bassLow, bassHigh, midHigh];
    this.stops = [bassHigh, midHigh, trebHigh];

    // Initialise Arrays
    this.val = new Float32Array(3);
    this.att = new Float32Array(3);
    this.avg = new Float32Array(3);
    this.longAvg = new Float32Array(3);

    // Set sane starting values
    this.att.fill(1);
    this.avg.fill(1);
    this.longAvg.fill(1);
  }

  updateAudioLevels (fps, frame) {
    if (this.freqArray.length > 0) {
      let rateExponent; // Used for FPS corrections
      if (!Number.isFinite(fps) || fps < 15) {
        rateExponent = 2; // 30/15
      } else if (fps > 144) {
        rateExponent = 0.2083; // 30/144
      } else {
        rateExponent = 30 / fps;
      }


      for (let i = 0; i < 3; i++) {
        let rate;
        let imm = 0;
        // Sum the range
        for (let j = this.starts[i]; j < this.stops[i]; j++) {
          imm += this.freqArray[j];
        }

        if (imm > this.avg[i]) {
          rate = 0.2 ** rateExponent;
        } else {
          rate = 0.5 ** rateExponent;
        }
        this.avg[i] = (this.avg[i] * rate) + (imm * (1 - rate));

        if (frame < 50) {
          rate = 0.9 ** rateExponent;
        } else {
          rate = 0.992 ** rateExponent;
        }
        this.longAvg[i] = (this.longAvg[i] * rate) + (imm * (1 - rate));

        if (this.longAvg[i] < 0.001) {
          this.val[i] = 1.0;
          this.att[i] = 1.0;
        } else {
          this.val[i] = imm / this.longAvg[i];
          this.att[i] = this.avg[i] / this.longAvg[i];
        }
      }
    }
  }
}
