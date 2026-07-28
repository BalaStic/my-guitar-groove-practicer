import AudioEngine from './audio-engine.js';
import UIController from './ui.js';
import './styles.css';

// Az alkalmazás inicializálása
function init() {
  console.log('🎸 My Guitar Groove Practicer - Initializing...');
  
  // Audio engine létrehozása
  const audioEngine = new AudioEngine();
  
  // UI controller létrehozása
  const uiController = new UIController(audioEngine);
  
  console.log('✅ Ready to rock!');
  
  // Fejlesztői info
  console.log('%c🎵 Tip: Adjust the BPM and try different styles!', 'color: #667eea; font-weight: bold;');
}

// DOM betöltés után inicializálás
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
