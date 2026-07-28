import * as Tone from 'tone';
import { grooves, intervalMap } from './grooves.js';

class AudioEngine {
  constructor() {
    this.isPlaying = false;
    this.currentStep = 0;
    this.currentGroove = 'rock';
    this.rootNote = 'E2';
    this.bpm = 120;
    
    // Synth-ek inicializálása
    this.initSynths();
    
    // Sequencer inicializálása
    this.sequence = null;
  }

  initSynths() {
    // Kick drum - mély basszusos synth
    this.kickSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
    }).toDestination();

    // Snare drum - zajosabb, magasabb hang
    this.snareSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
    }).toDestination();

    // Hi-hat - rövid, éles noise
    this.hihatSynth = new Tone.MetalSynth({
      frequency: 200,
      envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5
    }).toDestination();

    // Bass synth - mély, gazdag basszus
    this.bassSynth = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.1 },
      filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.3, baseFrequency: 200, octaves: 2.5 }
    }).toDestination();

    // Hangerők beállítása
    this.kickSynth.volume.value = -10;
    this.snareSynth.volume.value = -20;
    this.hihatSynth.volume.value = -25;
    this.bassSynth.volume.value = -15;
  }

  async start() {
    // Tone.js context indítása (user interaction szükséges)
    try {
      await Tone.start();
      console.log('Audio context started successfully');
      console.log('Audio context state:', Tone.context.state);
    } catch (error) {
      console.error('Failed to start audio context:', error);
      throw new Error('Audio initialization failed. Please try again.');
    }

    const groove = grooves[this.currentGroove];
    const stepsPerBar = groove.stepsPerBar;

    // BPM beállítása
    Tone.Transport.bpm.value = this.bpm;

    // Sequence létrehozása
    this.sequence = new Tone.Sequence(
      (time, step) => {
        this.currentStep = step;
        this.playStep(time, step);
        
        // Callback a UI frissítéshez
        if (this.onStepChange) {
          this.onStepChange(step);
        }
      },
      [...Array(stepsPerBar).keys()],
      `${stepsPerBar}n`
    );

    this.sequence.start(0);
    Tone.Transport.start();
    this.isPlaying = true;
  }

  playStep(time, step) {
    const groove = grooves[this.currentGroove];

    // Dobszólamok lejátszása
    if (groove.drums.kick[step]) {
      this.kickSynth.triggerAttackRelease('C1', '8n', time);
    }
    
    if (groove.drums.snare[step]) {
      this.snareSynth.triggerAttackRelease('8n', time);
    }
    
    if (groove.drums.hihat[step]) {
      this.hihatSynth.triggerAttackRelease('16n', time);
    }

    // Basszus lejátszása
    const bassNote = groove.bass.pattern[step];
    if (bassNote && bassNote !== '-') {
      const interval = intervalMap[bassNote];
      if (interval !== null) {
        const note = Tone.Frequency(this.rootNote).transpose(interval).toNote();
        this.bassSynth.triggerAttackRelease(note, '8n', time);
      }
    }
  }

  stop() {
    if (this.sequence) {
      this.sequence.stop();
      this.sequence.dispose();
      this.sequence = null;
    }
    Tone.Transport.stop();
    this.isPlaying = false;
    this.currentStep = 0;
  }

  setGroove(grooveName) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.stop();
    }
    this.currentGroove = grooveName;
    if (wasPlaying) {
      this.start();
    }
  }

  setRootNote(note) {
    this.rootNote = note;
  }

  setBPM(bpm) {
    this.bpm = bpm;
    if (this.isPlaying) {
      Tone.Transport.bpm.value = bpm;
    }
  }
}

export default AudioEngine;
