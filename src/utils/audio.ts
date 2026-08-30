// Utility for Audio Recording (16kHz PCM mono) & Audio Playback (24kHz PCM mono)

export class LiveAudioEngine {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  
  // Playback queue
  private playbackContext: AudioContext | null = null;
  private nextPlayTime: number = 0;
  private activeSourceNodes: AudioBufferSourceNode[] = [];
  
  public onAudioChunk?: (pcm16Base64: string) => void;
  public onVolumeUpdate?: (volume: number, isAi: boolean) => void;
  private volumeInterval: any = null;

  async requestMicrophone(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      this.mediaStream = stream;
      return true;
    } catch (err) {
      console.error("Microphone access denied or error:", err);
      return false;
    }
  }

  async startRecording(onChunk: (base64: string) => void) {
    this.onAudioChunk = onChunk;

    if (!this.mediaStream) {
      const granted = await this.requestMicrophone();
      if (!granted) throw new Error("Microphone permission was not granted.");
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass({ sampleRate: 16000 });

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream!);
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.sourceNode.connect(this.analyserNode);

    // Buffer size 2048 or 4096 gives ~128ms - 256ms audio slices
    this.processorNode = this.audioContext.createScriptProcessor(2048, 1, 1);

    this.processorNode.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = this.floatTo16BitPCM(inputData);
      const base64 = this.arrayBufferToBase64(pcm16.buffer);
      if (this.onAudioChunk) {
        this.onAudioChunk(base64);
      }
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);

    // Start volume monitoring
    this.startVolumeMonitoring();
  }

  private startVolumeMonitoring() {
    if (this.volumeInterval) clearInterval(this.volumeInterval);
    const dataArray = new Uint8Array(this.analyserNode?.frequencyBinCount || 128);

    this.volumeInterval = setInterval(() => {
      if (this.analyserNode && this.onVolumeUpdate) {
        this.analyserNode.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 80);
        this.onVolumeUpdate(normalized, false);
      }
    }, 50);
  }

  stopRecording() {
    if (this.volumeInterval) {
      clearInterval(this.volumeInterval);
      this.volumeInterval = null;
    }

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  // Playback incoming PCM 24kHz audio from Gemini Live API
  initPlayback() {
    if (!this.playbackContext || this.playbackContext.state === "closed") {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.playbackContext = new AudioContextClass({ sampleRate: 24000 });
      this.nextPlayTime = this.playbackContext.currentTime;
    }
    if (this.playbackContext.state === "suspended") {
      this.playbackContext.resume();
    }
  }

  playPCM24Chunk(pcm24Base64: string) {
    try {
      this.initPlayback();
      if (!this.playbackContext) return;

      const binaryString = atob(pcm24Base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit signed PCM to float32
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = this.playbackContext.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = this.playbackContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.playbackContext.destination);

      const currentTime = this.playbackContext.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
      this.activeSourceNodes.push(source);

      source.onended = () => {
        const index = this.activeSourceNodes.indexOf(source);
        if (index > -1) {
          this.activeSourceNodes.splice(index, 1);
        }
      };
    } catch (e) {
      console.error("Error playing audio chunk:", e);
    }
  }

  // Barge-in: immediately stop all currently playing audio chunks
  stopPlayback() {
    for (const src of this.activeSourceNodes) {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    }
    this.activeSourceNodes = [];
    if (this.playbackContext) {
      this.nextPlayTime = this.playbackContext.currentTime;
    }
  }

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
