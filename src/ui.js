import { grooves } from './grooves.js';

class UIController {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.initElements();
    this.initStepDisplay();
    this.attachEventListeners();
    
    // Audio engine step callback
    this.audioEngine.onStepChange = (step) => this.updateStepDisplay(step);
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
    if (!this.audioEngine.isPlaying) {
      // Play
      await this.audioEngine.start();
      this.playButton.classList.add('playing');
      this.playIcon.textContent = '⏸';
      this.buttonText.textContent = 'STOP';
    } else {
      // Stop
      this.audioEngine.stop();
      this.playButton.classList.remove('playing');
      this.playIcon.textContent = '▶';
      this.buttonText.textContent = 'PLAY';
      
      // Step display visszaállítása
      this.updateStepDisplay(-1);
    }
  }
}

export default UIController;
