import * as Tone from 'tone';
import { grooves, intervalMap } from './grooves.js';

class AudioEngine {
  constructor() {
    console.log('🎵 [AudioEngine] Constructor called');
    this.isPlaying = false;
    this.currentStep = 0;
    this.currentGroove = 'rock';
    this.rootNote = 'E2';
    this.bpm = 120;
    
    // Synth-ek NEM inicializálása itt - majd a start()-ban!
    this.synthsInitialized = false;
    
    // Sequencer inicializálása
    this.sequence = null;
    console.log('✅ [AudioEngine] Constructor completed (synths will be lazy-loaded)');
  }

  initSynths() {
    console.log('🎹 [AudioEngine] Initializing synths...');
    
    // Kick drum - mély basszusos synth
    this.kickSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
    }).toDestination();
    console.log('  ✓ Kick synth created');

    // Snare drum - zajosabb, magasabb hang
    this.snareSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
    }).toDestination();
    console.log('  ✓ Snare synth created');

    // Hi-hat - rövid, éles noise
    this.hihatSynth = new Tone.MetalSynth({
      frequency: 200,
      envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5
    }).toDestination();
    console.log('  ✓ Hi-hat synth created');

    // Bass synth - mély, gazdag basszus
    this.bassSynth = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.1 },
      filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.3, baseFrequency: 200, octaves: 2.5 }
    }).toDestination();
    console.log('  ✓ Bass synth created');

    // Hangerők beállítása
    this.kickSynth.volume.value = -10;
    this.snareSynth.volume.value = -20;
    this.hihatSynth.volume.value = -25;
    this.bassSynth.volume.value = -15;
    console.log('  ✓ Volumes set');
    console.log('✅ [AudioEngine] All synths initialized');
  }

  async start() {
    console.log('▶️ [AudioEngine] START called');
    console.log('📊 [AudioEngine] Browser info:', navigator.userAgent);
    
    // Tone.js context indítása (user interaction szükséges)
    try {
      console.log('🔊 [AudioEngine] Calling Tone.start()...');
      console.log('  - AudioContext state BEFORE:', Tone.context.state);
      console.log('  - AudioContext sample rate:', Tone.context.sampleRate);
      
      await Tone.start();
      
      console.log('✅ [AudioEngine] Tone.start() completed');
      console.log('  - AudioContext state AFTER:', Tone.context.state);
      console.log('  - AudioContext current time:', Tone.context.currentTime);
      console.log('  - Tone.Destination connected:', Tone.Destination.volume.value);
    } catch (error) {
      console.error('❌ [AudioEngine] Failed to start audio context:', error);
      throw new Error('Audio initialization failed. Please try again.');
    }

    // Lazy-load synths - csak első indításkor kell létrehozni
    if (!this.synthsInitialized) {
      console.log('🎹 [AudioEngine] First start - initializing synths now with user gesture...');
      this.initSynths();
      this.synthsInitialized = true;
    }

    const groove = grooves[this.currentGroove];
    const stepsPerBar = groove.stepsPerBar;
    console.log('🎼 [AudioEngine] Groove:', this.currentGroove, '- Steps:', stepsPerBar);

    // BPM beállítása
    Tone.Transport.bpm.value = this.bpm;
    console.log('⏱️ [AudioEngine] BPM set to:', this.bpm);
    console.log('  - Transport state:', Tone.Transport.state);

    // Sequence létrehozása
    console.log('🔁 [AudioEngine] Creating sequence...');
    this.sequence = new Tone.Sequence(
      (time, step) => {
        this.currentStep = step;
        console.log(`🎵 [AudioEngine] Step ${step} at time ${time.toFixed(3)}`);
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
    console.log('  ✓ Sequence started at position 0');
    
    Tone.Transport.start();
    console.log('  ✓ Transport started');
    console.log('  - Transport state NOW:', Tone.Transport.state);
    console.log('  - Transport position:', Tone.Transport.position);
    
    this.isPlaying = true;
    console.log('✅ [AudioEngine] Playback should now be running!');
  }

  playStep(time, step) {
    const groove = grooves[this.currentGroove];
    const triggers = [];

    // Dobszólamok lejátszása
    if (groove.drums.kick[step]) {
      this.kickSynth.triggerAttackRelease('C1', '8n', time);
      triggers.push('KICK');
    }
    
    if (groove.drums.snare[step]) {
      this.snareSynth.triggerAttackRelease('8n', time);
      triggers.push('SNARE');
    }
    
    if (groove.drums.hihat[step]) {
      this.hihatSynth.triggerAttackRelease('16n', time);
      triggers.push('HIHAT');
    }

    // Basszus lejátszása
    const bassNote = groove.bass.pattern[step];
    if (bassNote && bassNote !== '-') {
      const interval = intervalMap[bassNote];
      if (interval !== null) {
        const note = Tone.Frequency(this.rootNote).transpose(interval).toNote();
        this.bassSynth.triggerAttackRelease(note, '8n', time);
        triggers.push(`BASS(${note})`);
      }
    }
    
    if (triggers.length > 0) {
      console.log(`  🥁 Step ${step}: ${triggers.join(', ')}`);
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
