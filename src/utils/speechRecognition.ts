// Client-side real-time speech-to-text helper for candidate live captions

export class CandidateSpeechRecognizer {
  private recognition: any = null;
  private isRunning: boolean = false;
  public onTranscript?: (text: string, isFinal: boolean) => void;
  public onError?: (err: any) => void;

  constructor() {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript + ' ';
          } else {
            interimText += transcript;
          }
        }

        if (finalText.trim() && this.onTranscript) {
          this.onTranscript(finalText.trim(), true);
        } else if (interimText.trim() && this.onTranscript) {
          this.onTranscript(interimText.trim(), false);
        }
      };

      this.recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech' && this.onError) {
          this.onError(e);
        }
      };

      this.recognition.onend = () => {
        // Auto-restart if still flagged as running
        if (this.isRunning) {
          try {
            this.recognition.start();
          } catch {}
        }
      };
    }
  }

  start() {
    if (!this.recognition || this.isRunning) return;
    this.isRunning = true;
    try {
      this.recognition.start();
    } catch (e) {
      console.warn("SpeechRecognition start notice:", e);
    }
  }

  stop() {
    this.isRunning = false;
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch {}
  }
}
