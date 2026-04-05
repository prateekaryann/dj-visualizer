// --- Constants ---

const SCENE_GENRE = {
  TECHNO:  'hardtechno',
  TRANCE:  'trance',
  HOUSE:   'deephouse',
  MINIMAL: 'minimal',
  ACID:    'acid'
};

const SCENE_THEME = {
  TECHNO:  'beta',
  TRANCE:  'alpha',
  HOUSE:   'theta',
  MINIMAL: 'theta',
  ACID:    'gamma'
};

const SCENE_KEYS = ['TECHNO', 'TRANCE', 'HOUSE', 'MINIMAL', 'ACID'];

// --- State ---

let vizBG = null;
let micAnalyser = null;
let currentScene = 'TECHNO';
let currentBpm = null;

let tapTimes = [];
let tapResetTimer = null;

let uiHideTimer = null;
let micButtonHovered = false;

let mouseNX = 0;
let mouseNY = 0;

// --- Init ---

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('viz-container');

  vizBG = new VisualizerBG(container);
  micAnalyser = new MicAnalyser();

  applyScene('TECHNO');
  startAnimationLoop();
  setupMicButton();
  setupSceneTabs();
  setupTapBpm();
  setupUiAutoHide();
  setupMouseInteraction();
  setupFullscreen();
  setupKeyboard();
  setupResize();
  setupObsMode();
});

// --- Animation Loop ---

const startAnimationLoop = () => {
  const EMPTY_FREQ = new Float32Array(64).fill(-100);
  const EMPTY_WAVE = new Float32Array(256);

  const loop = () => {
    requestAnimationFrame(loop);

    if (micAnalyser.active) {
      vizBG.update(micAnalyser.getFrequencyData(), micAnalyser.getWaveformData());
    } else {
      vizBG.update(EMPTY_FREQ, EMPTY_WAVE);
    }
  };

  loop();
};

// --- Scene ---

let sceneToastTimer = null;

const applyScene = (scene) => {
  currentScene = scene;
  vizBG.setGenre(SCENE_GENRE[scene]);
  vizBG.setTheme(SCENE_THEME[scene]);

  document.querySelectorAll('.scene-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.scene === scene);
  });

  // Show scene name toast briefly
  showSceneToast(scene);
};

const showSceneToast = (scene) => {
  let toast = document.getElementById('scene-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'scene-toast';
    document.getElementById('ui').appendChild(toast);
  }
  toast.textContent = scene;
  toast.classList.remove('hide');
  toast.classList.add('show');
  clearTimeout(sceneToastTimer);
  sceneToastTimer = setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
  }, 1200);
};

// --- Mic ---

const setupMicButton = () => {
  const btn = document.getElementById('btn-mic');

  btn.addEventListener('mouseenter', () => { micButtonHovered = true; });
  btn.addEventListener('mouseleave', () => { micButtonHovered = false; });

  btn.addEventListener('click', toggleMic);
};

const toggleMic = async () => {
  const btn = document.getElementById('btn-mic');
  const dot = document.getElementById('status-dot');

  if (!micAnalyser.active) {
    try {
      await micAnalyser.start();
      btn.classList.add('active');
      btn.querySelector('span').textContent = '● LIVE';
      btn.setAttribute('aria-pressed', 'true');
      vizBG.setMicMode(true);
      dot.classList.add('listening');
    } catch {
      alert('Mic access denied — check browser permissions.');
    }
  } else {
    micAnalyser.stop();
    btn.classList.remove('active');
    btn.querySelector('span').textContent = 'TAP MIC';
    btn.setAttribute('aria-pressed', 'false');
    vizBG.setMicMode(false);
    dot.classList.remove('listening');
  }
};

// --- Scene Tabs ---

const setupSceneTabs = () => {
  const container = document.getElementById('scene-tabs');

  container.addEventListener('click', (e) => {
    const tab = e.target.closest('.scene-tab');
    if (!tab) return;

    const scene = tab.dataset.scene;
    if (scene && SCENE_GENRE[scene]) {
      applyScene(scene);
    }
  });
};

// --- Tap BPM ---

const setupTapBpm = () => {
  document.getElementById('btn-tap').addEventListener('click', handleTap);
};

const handleTap = () => {
  const now = Date.now();

  clearTimeout(tapResetTimer);
  tapResetTimer = setTimeout(resetTap, 3000);

  tapTimes.push(now);
  if (tapTimes.length > 4) tapTimes = tapTimes.slice(-4);

  if (tapTimes.length >= 2) {
    let totalInterval = 0;
    for (let i = 1; i < tapTimes.length; i++) {
      totalInterval += tapTimes[i] - tapTimes[i - 1];
    }
    const avgInterval = totalInterval / (tapTimes.length - 1);
    currentBpm = 60000 / avgInterval;
    document.getElementById('bpm-display').textContent = Math.round(currentBpm) + ' BPM';
  }
};

const resetTap = () => {
  tapTimes = [];
  currentBpm = null;
  document.getElementById('bpm-display').textContent = '-- BPM';
};

// --- UI Auto-hide ---

const setupUiAutoHide = () => {
  const ui = document.getElementById('ui');

  const showUi = () => {
    ui.classList.remove('fade-out');
    clearTimeout(uiHideTimer);

    if (!micButtonHovered) {
      uiHideTimer = setTimeout(() => {
        ui.classList.add('fade-out');
      }, 4000);
    }
  };

  window.addEventListener('mousemove', showUi);
  window.addEventListener('touchstart', showUi);
};

// --- Mouse Interaction ---

const setupMouseInteraction = () => {
  window.addEventListener('mousemove', (e) => {
    mouseNX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseNY = -((e.clientY / window.innerHeight) * 2 - 1);
    vizBG.setMousePosition(mouseNX, mouseNY);
  });

  document.getElementById('viz-container').addEventListener('click', (e) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -((e.clientY / window.innerHeight) * 2 - 1);
    vizBG.triggerClick(nx, ny);
  });
};

// --- Fullscreen ---

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
};

const setupFullscreen = () => {
  document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);
};

// --- Keyboard Shortcuts ---

const setupKeyboard = () => {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        toggleMic();
        break;

      case 'KeyF':
        toggleFullscreen();
        break;

      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5': {
        const index = parseInt(e.code.replace('Digit', ''), 10) - 1;
        if (SCENE_KEYS[index]) applyScene(SCENE_KEYS[index]);
        break;
      }

      case 'KeyT':
        handleTap();
        break;
    }
  });
};

// --- Resize ---

const setupResize = () => {
  window.addEventListener('resize', () => vizBG.resize());
};

// --- OBS Mode ---

const setupObsMode = () => {
  if (new URLSearchParams(location.search).get('obs') === '1') {
    document.body.classList.add('obs-mode');
  }
};
