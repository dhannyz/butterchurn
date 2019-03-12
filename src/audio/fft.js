export default class FFT {
  /* eslint-disable no-bitwise */
  constructor (samplesIn, samplesOut, equalize = false) {
    this.samplesIn = samplesIn;
    this.samplesOut = samplesOut;
    this.equalize = equalize;
    this.NFREQ = samplesOut * 2;

    this.sqrt = Math.sqrt;

    this.real = new Float32Array(this.NFREQ);
    this.imag = new Float32Array(this.NFREQ);
    this.blank = new Float32Array(this.NFREQ);

    this.equalizeArr = new Float32Array(this.samplesOut);
    this.bitrevtable = new Uint16Array(this.NFREQ);

    // Initialise Tables
    if (this.equalize) {
      this.initEqualizeTable();
    }

    this.initBitRevTable();

    // Init CosSinTable
    let dftsize = 2;
    let tabsize = 0;
    while (dftsize <= this.NFREQ) {
      tabsize += 1;
      dftsize <<= 1;
    }
    this.cossintable = [new Float32Array(tabsize), new Float32Array(tabsize)];
    this.initCosSinTable();
  }

  initEqualizeTable () {
    const invHalfNFREQ = 1.0 / this.samplesOut;
    for (let i = 0; i < this.samplesOut; i++) {
      this.equalizeArr[i] = -0.02 * Math.log((this.samplesOut - i) * invHalfNFREQ);
    }
  }

  initBitRevTable () {
    for (let i = 0; i < this.NFREQ; i++) {
      this.bitrevtable[i] = i;
    }

    let j = 0;
    for (let i = 0; i < this.NFREQ; i++) {
      if (j > i) {
        const temp = this.bitrevtable[i];
        this.bitrevtable[i] = this.bitrevtable[j];
        this.bitrevtable[j] = temp;
      }

      let m = this.NFREQ >> 1;

      while (m >= 1 && j >= m) {
        j -= m;
        m >>= 1;
      }

      j += m;
    }
  }

  initCosSinTable () {
    let dftsize = 2;
    let i = 0;
    while (dftsize <= this.NFREQ) {
      const theta = (-2.0 * Math.PI) / dftsize;
      this.cossintable[0][i] = Math.cos(theta);
      this.cossintable[1][i] = Math.sin(theta);
      i += 1;
      dftsize <<= 1;
    }
  }

  /* eslint-disable no-param-reassign */
  timeToFrequencyDomain (waveDataIn, freqDataOut) {
    this.real.set(this.blank);
    this.imag.set(this.blank);

    for (let i = 0; i < this.NFREQ; i++) {
      const idx = this.bitrevtable[i];
      if (idx < this.samplesIn) {
        this.real[i] = waveDataIn[idx];
      }
    }

    let dftsize = 2;
    let t = 0;
    while (dftsize <= this.NFREQ) {
      const wpr = this.cossintable[0][t];
      const wpi = this.cossintable[1][t];
      let wr = 1.0;
      let wi = 0.0;
      const hdftsize = dftsize >> 1;

      for (let m = 0; m < hdftsize; m++) {
        for (let i = m; i < this.NFREQ; i += dftsize) {
          const j = i + hdftsize;
          const tempr = (wr * this.real[j]) - (wi * this.imag[j]);
          const tempi = (wr * this.imag[j]) + (wi * this.real[j]);
          this.real[j] = this.real[i] - tempr;
          this.imag[j] = this.imag[i] - tempi;
          this.real[i] += tempr;
          this.imag[i] += tempi;
        }

        const wtemp = wr;
        wr = (wtemp * wpr) - (wi * wpi);
        wi = (wi * wpr) + (wtemp * wpi);
      }

      dftsize <<= 1;
      t += 1;
    }

    if (this.equalize) {
      for (let i = 0; i < this.samplesOut; i++) {
        freqDataOut[i] = this.equalizeArr[i] *
                             this.sqrt((this.real[i] ** 2) + (this.imag[i] ** 2));
      }
    } else {
      for (let i = 0; i < this.samplesOut; i++) {
        freqDataOut[i] = this.sqrt((this.real[i] ** 2) + (this.imag[i] ** 2));
      }
    }
  }
/* eslint-enable no-bitwise */
/* eslint-enable no-param-reassign */
}
