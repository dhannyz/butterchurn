export default class AudioProcessor {
  constructor (context) {
    this.numSamps = 512;
    this.fftSize = this.numSamps * 2;

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


      this.timeByteArrayL = new Uint8Array(this.numSamps);
      this.timeByteArrayR = new Uint8Array(this.numSamps);

      this.freqArray = new Float32Array(this.numSamps);
      this.freqArrayL = new Float32Array(this.numSamps);
      this.freqArrayR = new Float32Array(this.numSamps);

      // Signed shifted -128
      this.timeArrayL = new Int8Array(this.numSamps);
      this.timeArrayR = new Int8Array(this.numSamps);

      this.equaliser = new Float32Array(this.numSamps);
      for (let i = 0; i < this.numSamps; i++) {
        this.equaliser[i] = -this.fftSize * Math.log((this.numSamps - i) / this.numSamps);
      }
      this.equaliser[0] = 0; // Swap from -0
    }
  }
  /* eslint-disable no-bitwise */
  sampleAudio () {
    this.analyser.getFloatFrequencyData(this.freqArray);

    this.analyserL.getByteTimeDomainData(this.timeByteArrayL);
    this.analyserL.getFloatFrequencyData(this.freqArrayL);

    this.analyserR.getByteTimeDomainData(this.timeByteArrayR);
    this.analyserR.getFloatFrequencyData(this.freqArrayR);

    for (let i = 0; i < this.numSamps; i++) {
      // Shift to signed about 0
      this.timeArrayL[i] = this.timeByteArrayL[i] - 128;
      this.timeArrayR[i] = this.timeByteArrayR[i] - 128;

      // dB to normalised linear + equalise
      this.freqArray[i] = (10 ** (0.05 * this.freqArray[i]));
      this.freqArrayL[i] = (10 ** (0.05 * this.freqArrayL[i])) * this.equaliser[i];
      this.freqArrayR[i] = (10 ** (0.05 * this.freqArrayR[i])) * this.equaliser[i];
    }
  }

  connectAudio (audionode) {
    audionode.connect(this.audible);
  }

  disconnectAudio (audionode) {
    audionode.disconnect(this.audible);
  }
/* eslint-enable no-bitwise */
}
