import { grooves } from './grooves.js';

class UIController {
  constructor(audioEngine) {
    console.log('🎛️ [UIController] Constructor called');
    this.audioEngine = audioEngine;
    this.initElements();
    this.initStepDisplay();
    this.attachEventListeners();
    
    // Audio engine step callback
    this.audioEngine.onStepChange = (step) => this.updateStepDisplay(step);
    console.log('✅ [UIController] Initialized');
  }

  initElements() {
    this.playButton = document.getElementById('play-button');
    this.playIcon = this.playButton.querySelector('.play-icon');
    this.buttonText = this.playButton.querySelector('.button-text');
    this.styleSelect = document.getElementById('style-select');
    this.rootSelect = document.getElementById('root-select');
    this.bpmSlider = document.getElementById('bpm-slider');
    this.bpmValue = document.getElementById('bpm-value');
    this.stepDisplay = document.getElementById('step-display');
    this.audioStatus = document.getElementById('audio-status');
    this.audioStatusText = this.audioStatus
      ? this.audioStatus.querySelector('.audio-status-text')
      : null;
  }

  updateAudioStatus() {
    if (!this.audioStatus) return;
    const state = this.audioEngine.getContextState();
    this.audioStatus.classList.remove('ready', 'suspended');
    if (state === 'running') {
      this.audioStatus.classList.add('ready');
      if (this.audioStatusText) this.audioStatusText.textContent = '🔊 Audio ready';
    } else if (state === 'suspended') {
      this.audioStatus.classList.add('suspended');
      if (this.audioStatusText)
        this.audioStatusText.textContent = '🔇 Audio paused — tap the screen (check the mute switch)';
    } else {
      if (this.audioStatusText) this.audioStatusText.textContent = 'Tap PLAY to enable audio';
    }
  }


  initStepDisplay() {
    // Kezdetben 16 lépés létrehozása (rock groove)
    this.createSteps(16);
  }

  createSteps(count) {
    this.stepDisplay.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const step = document.createElement('div');
      step.className = 'step';
      step.textContent = i + 1;
      step.dataset.step = i;
      this.stepDisplay.appendChild(step);
    }
  }

  updateStepDisplay(activeStep) {
    const steps = this.stepDisplay.querySelectorAll('.step');
    steps.forEach((step, index) => {
      if (index === activeStep) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });
  }

  attachEventListeners() {
    // Play/Stop button
    this.playButton.addEventListener('click', () => this.togglePlayback());

    // iOS/Safari: az AudioContext-et az ELSŐ user gesture-ön belül,
    // SZINKRONBAN kell feloldani (bármilyen await előtt). Egyszeri unlock
    // bármilyen érintésre/kattintásra az egész oldalon.
    const unlockOnce = () => {
      try {
        Promise.resolve(this.audioEngine.unlock()).finally(() => this.updateAudioStatus());
      } catch (e) {
        console.warn('Audio unlock attempt failed:', e);
      }
      document.removeEventListener('touchend', unlockOnce);
      document.removeEventListener('pointerdown', unlockOnce);
      document.removeEventListener('click', unlockOnce);
    };

    document.addEventListener('touchend', unlockOnce, { once: false });
    document.addEventListener('pointerdown', unlockOnce, { once: false });
    document.addEventListener('click', unlockOnce, { once: false });


    // Style selector
    this.styleSelect.addEventListener('change', (e) => {
      const grooveName = e.target.value;
      this.audioEngine.setGroove(grooveName);
      
      // Step display frissítése az új groove step számához
      const groove = grooves[grooveName];
      this.createSteps(groove.stepsPerBar);
    });

    // Root note selector
    this.rootSelect.addEventListener('change', (e) => {
      this.audioEngine.setRootNote(e.target.value);
    });

    // BPM slider
    this.bpmSlider.addEventListener('input', (e) => {
      const bpm = parseInt(e.target.value);
      this.bpmValue.textContent = bpm;
      this.audioEngine.setBPM(bpm);
    });
  }

  async togglePlayback() {
    console.log('🔘 [UIController] Play button clicked');
    console.log('  - Current playing state:', this.audioEngine.isPlaying);
    
    if (!this.audioEngine.isPlaying) {
      // Play
      try {
        console.log('▶️ [UIController] Starting playback...');
        this.playButton.disabled = true;
        this.buttonText.textContent = 'STARTING...';
        
        await this.audioEngine.start();
        
        console.log('✅ [UIController] Playback started successfully');
        this.playButton.classList.add('playing');
        this.playIcon.textContent = '⏸';
        this.buttonText.textContent = 'STOP';
        this.playButton.disabled = false;
        this.updateAudioStatus();

      } catch (error) {
        console.error('❌ [UIController] Error starting playback:', error);
        alert('Failed to start audio. Please make sure you clicked the button and your browser allows audio playback.');
        this.playButton.disabled = false;
        this.playIcon.textContent = '▶';
        this.buttonText.textContent = 'PLAY';
      }
    } else {
      // Stop
      console.log('⏹️ [UIController] Stopping playback...');
      this.audioEngine.stop();
      this.playButton.classList.remove('playing');
      this.playIcon.textContent = '▶';
      this.buttonText.textContent = 'PLAY';
      
      // Step display visszaállítása
      this.updateStepDisplay(-1);
      console.log('✅ [UIController] Playback stopped');
    }
  }
}

export default UIController;
