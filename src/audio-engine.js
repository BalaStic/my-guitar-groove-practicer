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

    // Tone.js referencia (statikus import - iOS gesture unlock miatt NEM dinamikus!)
    this.Tone = Tone;

    // Synth-ek NEM inicializálása itt - majd a start()-ban!
    this.synthsInitialized = false;
    this.audioUnlocked = false;

    // Sequencer inicializálása
    this.sequence = null;
    console.log('✅ [AudioEngine] Constructor completed (synths will be lazy-loaded)');
  }

  /**
   * iOS/Safari audio unlock. FONTOS: ezt SZINKRONBAN kell hívni egy user
   * gesture (tap/click) call-stack-jén belül, BÁRMILYEN await ELŐTT.
   * A Tone.start() belül szinkronban meghívja az AudioContext.resume()-ot.
   */
  unlock() {
    if (this.audioUnlocked) return Promise.resolve();
    console.log('🔓 [AudioEngine] Unlocking audio (Tone.start)...');
    // iOS: némító (mute) kapcsoló megkerülése - "playback" audio session kikényszerítése
    this.unmuteIOS();
    const p = Tone.start();
    this.audioUnlocked = true;
    return p;
  }

  /**
   * iOS "unmute" trükk: iOS-en a Web Audio alapból követi a fizikai némító
   * kapcsolót (silent switch). Ha egy rövid, néma, inline <audio> elemet
   * lejátszunk egy user gesture-ön belül, az iOS "playback" audio session
   * kategóriába vált, így a Web Audio akkor is szól, ha a csengő némítva van.
   * A néma WAV egy data URI-ként van beágyazva (nincs külső fájl).
   */
  unmuteIOS() {
    if (this._iosUnmuted) return;
    try {
      const silentWav =
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAAAA';
      const el = document.createElement('audio');
      el.setAttribute('playsinline', '');
      el.setAttribute('webkit-playsinline', '');
      el.preload = 'auto';
      el.loop = true;
      el.src = silentWav;
      el.volume = 0.001;
      const playPromise = el.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            console.log('  ✓ iOS silent audio playing (playback session engaged)');
          })
          .catch((err) => {
            console.warn('  ⚠️ iOS silent audio play failed:', err);
          });
      }
      // Megtartjuk a referenciát, hogy ne törölje a GC és folytonos maradjon a session.
      this._iosUnmuteEl = el;
      this._iosUnmuted = true;
    } catch (e) {
      console.warn('  ⚠️ unmuteIOS failed:', e);
    }
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

    // Tone.js context indítása (user interaction szükséges).
    // FIGYELEM: ne legyen await ez ELŐTT ebben a hívási láncban (iOS miatt)!
    try {
      console.log('🔊 [AudioEngine] Calling Tone.start()...');
      
      await Tone.start();
      this.audioUnlocked = true;
      
      console.log('✅ [AudioEngine] Tone.start() completed');
      console.log('  - AudioContext state:', Tone.context.state);
      console.log('  - AudioContext sample rate:', Tone.context.sampleRate);
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
