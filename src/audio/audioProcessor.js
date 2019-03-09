import FFT from './fft';

export default class AudioProcessor {
  constructor (context) {
    this.numSamps = 512;
    this.fftSize = this.numSamps * 2;

    this.fft = new FFT(this.fftSize, 512, false);

    if (context) {
      this.audioContext = context;
      this.audible = context.createDelay();

      this.analyser = context.createAnalyser();
      this.analyser.smoothingTimeConstant = 0.0;
      this.analyser.fftSize = this.fftSize;
      this.analyser.minDecibels = -100;
      this.analyser.maxDecibels = 0;

      this.audible.connect(this.analyser);

      // Split channels
      this.analyserL = context.createAnalyser();
      this.analyserL.smoothingTimeConstant = 0.0;
      this.analyserL.fftSize = this.fftSize;
      this.analyserL.minDecibels = -100;
      this.analyserL.maxDecibels = 0;

      this.analyserR = context.createAnalyser();
      this.analyserR.smoothingTimeConstant = 0.0;
      this.analyserR.fftSize = this.fftSize;
      this.analyserR.minDecibels = -100;
      this.analyserR.maxDecibels = 0;

      this.splitter = context.createChannelSplitter(2);

      this.audible.connect(this.splitter);
      this.splitter.connect(this.analyserL, 0);
      this.splitter.connect(this.analyserR, 1);

      // Initialised once as typed arrays
      // Used for webaudio API raw (time domain) samples. 0 -> 255
      this.timeByteArray = new Uint8Array(this.fftSize);
      this.timeByteArrayL = new Uint8Array(this.fftSize);
      this.timeByteArrayR = new Uint8Array(this.fftSize);

      // Signed raw samples shifted to -128 -> 127
      this.timeArray = new Int8Array(this.fftSize);
      this.timeByteArraySignedL = new Int8Array(this.fftSize);
      this.timeByteArraySignedR = new Int8Array(this.fftSize);

      // Undersampled from this.fftSize to this.numSamps
      this.timeArrayL = new Int8Array(this.numSamps);
      this.timeArrayR = new Int8Array(this.numSamps);

      this.freqArray = new Float32Array(this.numSamps);
      this.freqArrayL = new Float32Array(this.numSamps);
      this.freqArrayR = new Float32Array(this.numSamps);

      this.equaliser = new Float32Array(this.numSamps);
      const invHalfNFREQ = 1.0 / this.numSamps;
      for (let i = 0; i < this.numSamps; i++) {
        this.equaliser[i] = -this.fftSize * Math.log((this.numSamps - i) * invHalfNFREQ);
      }
    }
  }
  /* eslint-disable no-bitwise */
  sampleAudio () {
    // Scope for Speedup
    const timeByteArray = this.timeByteArray;
    const timeByteArrayL = this.timeByteArrayL;
    const timeByteArrayR = this.timeByteArrayR;
    const timeArrayL = this.timeArrayL;
    const timeArrayR = this.timeArrayR;
    const freqArray = this.freqArray;
    const freqArrayL = this.freqArrayL;
    const freqArrayR = this.freqArrayL;
    const equaliser = this.equaliser;

    this.analyser.getByteTimeDomainData(timeByteArray);
    this.analyserL.getByteTimeDomainData(timeByteArrayL);
    this.analyserR.getByteTimeDomainData(timeByteArrayR);

    this.analyser.getFloatFrequencyData(freqArray);
    this.analyserL.getFloatFrequencyData(freqArrayL);
    this.analyserR.getFloatFrequencyData(freqArrayR);

    for (let i = 0, j = 1; i < this.numSamps; i++) {
      // Undersampled
      timeArrayL[i] = timeByteArrayL[j] - 128;
      timeArrayR[i] = timeByteArrayR[j] - 128;
      // dB to linear + equalise
      freqArray[i] = (10 ** (0.05 * freqArray[i]));
      freqArrayL[i] = (10 ** (0.05 * freqArrayL[i])) * equaliser[i];
      freqArrayR[i] = (10 ** (0.05 * freqArrayR[i])) * equaliser[i];
      j += 2;
    }
    freqArray[0] = 0;
    freqArrayL[0] = 0;
    freqArrayR[0] = 0;
  }

  updateAudio (timeByteArray, timeByteArrayL, timeByteArrayR) {
    this.timeByteArray.set(timeByteArray);
    this.timeByteArrayL.set(timeByteArrayL);
    this.timeByteArrayR.set(timeByteArrayR);

    for (let i = 0, j = 0; i < this.fftSize; i++) {
      // Shift Unsigned to Signed about 0
      this.timeArray[i] = this.timeByteArray[i] - 128;
      this.timeByteArraySignedL[i] = this.timeByteArrayL[i] - 128;
      this.timeByteArraySignedR[i] = this.timeByteArrayR[i] - 128;

      // Undersampled
      if (i & 2) { // Equivalent to i % 2
        this.timeArrayL[j] = this.timeByteArraySignedL[i];
        this.timeArrayR[j] = this.timeByteArraySignedR[i];
        j += 1;
      }
    }

    // Use full width samples for the FFT
    this.freqArray = this.fft.timeToFrequencyDomain(this.timeArray);
    this.freqArrayL = this.fft.timeToFrequencyDomain(this.timeByteArraySignedL);
    this.freqArrayR = this.fft.timeToFrequencyDomain(this.timeByteArraySignedR);
  }

  connectAudio (audionode) {
    audionode.connect(this.audible);
  }

  disconnectAudio (audionode) {
    audionode.disconnect(this.audible);
  }
/* eslint-enable no-bitwise */
}
