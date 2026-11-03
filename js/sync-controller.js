/* ==========================================================================
   RTOS-CoreTerm: Dual Asciinema Sync Controller
   Enhanced for Embedded Systems classroom demo:
     - Keyboard shortcuts (Space, →, R, 1/2/3, S, T, F)
     - Scenario description banner update
     - Resource declaration banner update
   ========================================================================== */

class SyncController {
  constructor() {
    this.currentScenarioId = 'counter';
    this.playerRace = null;
    this.playerSem  = null;

    this.masterPlayBtn    = document.getElementById('master-play-btn');
    this.masterResetBtn   = document.getElementById('master-reset-btn');
    this.masterStepBtn    = document.getElementById('master-step-btn');
    this.scenarioTabs     = document.querySelectorAll('.scenario-tab');
    this.soundToggleBtn   = document.getElementById('sound-toggle-btn');
    this.themeToggleBtn   = document.getElementById('theme-toggle-btn');
    this.fullscreenBtn    = document.getElementById('fullscreen-btn');

    this.bannerText     = document.getElementById('banner-text');
    this.bannerResource = document.getElementById('banner-resource');

    this.themes = ['slate', 'matrix', 'amber', 'cyber'];
    this.currentThemeIdx = 0;
  }

  init() {
    // ── Race Condition Player ───────────────────────────────────────────────
    this.playerRace = new AsciinemaPlayer({
      id:             'race',
      type:           'race',
      containerId:    'terminal-panel-race',
      screenId:       'terminal-screen-race',
      playBtnId:      'play-btn-race',
      stepBtnId:      'step-btn-race',
      resetBtnId:     'reset-btn-race',
      progressBarId:  'progress-bar-race',
      progressFillId: 'progress-fill-race',
      timeDisplayId:  'time-display-race',
      badgeId:        'badge-race',
      resourceValId:  'resource-val-race',
      codeContentId:  'code-content-race',
      stepCountId:    'step-count-race',
      onStateChange:  () => this.handlePlayerStateChange()
    });

    // ── Semaphore Player ────────────────────────────────────────────────────
    this.playerSem = new AsciinemaPlayer({
      id:             'semaphore',
      type:           'semaphore',
      containerId:    'terminal-panel-sem',
      screenId:       'terminal-screen-sem',
      playBtnId:      'play-btn-sem',
      stepBtnId:      'step-btn-sem',
      resetBtnId:     'reset-btn-sem',
      progressBarId:  'progress-bar-sem',
      progressFillId: 'progress-fill-sem',
      timeDisplayId:  'time-display-sem',
      badgeId:        'badge-sem',
      resourceValId:  'resource-val-sem',
      codeContentId:  'code-content-sem',
      stepCountId:    'step-count-sem',
      onStateChange:  () => this.handlePlayerStateChange()
    });

    this.bindMasterControls();
    this.bindKeyboard();
    this.loadScenario('counter');
  }

  // ── Master Button Controls ──────────────────────────────────────────────────

  bindMasterControls() {
    if (this.masterPlayBtn) {
      this.masterPlayBtn.addEventListener('click', () => {
        const isEitherPlaying = this.playerRace.isPlaying || this.playerSem.isPlaying;
        if (isEitherPlaying) {
          this.playerRace.pause();
          this.playerSem.pause();
        } else {
          this.playerRace.play();
          this.playerSem.play();
        }
        this.updateMasterPlayBtnUI();
      });
    }

    if (this.masterResetBtn) {
      this.masterResetBtn.addEventListener('click', () => {
        this.playerRace.restart();
        this.playerSem.restart();
        this.updateMasterPlayBtnUI();
      });
    }

    if (this.masterStepBtn) {
      this.masterStepBtn.addEventListener('click', () => {
        this.playerRace.step();
        this.playerSem.step();
        this.updateMasterPlayBtnUI();
      });
    }

    if (this.scenarioTabs) {
      this.scenarioTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const scenarioId = tab.dataset.scenario;
          if (scenarioId && SCENARIOS[scenarioId]) {
            this.scenarioTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            this.loadScenario(scenarioId);
          }
        });
      });
    }

    if (this.soundToggleBtn) {
      this.soundToggleBtn.addEventListener('click', () => this.toggleSound());
    }

    if (this.themeToggleBtn) {
      this.themeToggleBtn.addEventListener('click', () => this.cycleTheme());
    }

    if (this.fullscreenBtn) {
      this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    }
  }

  // ── Keyboard Shortcuts ──────────────────────────────────────────────────────

  bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Don't fire if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          this.masterPlayBtn && this.masterPlayBtn.click();
          break;

        case 'ArrowRight':
          e.preventDefault();
          this.playerRace.step();
          this.playerSem.step();
          this.updateMasterPlayBtnUI();
          break;

        case 'r':
        case 'R':
          this.playerRace.restart();
          this.playerSem.restart();
          this.updateMasterPlayBtnUI();
          break;

        case '1':
          this.switchScenarioByKey('counter');
          break;

        case '2':
          this.switchScenarioByKey('bank');
          break;

        case '3':
          this.switchScenarioByKey('uart');
          break;

        case 's':
        case 'S':
          this.toggleSound();
          break;

        case 't':
        case 'T':
          this.cycleTheme();
          break;

        case 'f':
        case 'F':
          this.toggleFullscreen();
          break;
      }
    });
  }

  switchScenarioByKey(scenarioId) {
    if (!SCENARIOS[scenarioId]) return;
    this.scenarioTabs.forEach(t => {
      t.classList.toggle('active', t.dataset.scenario === scenarioId);
    });
    this.loadScenario(scenarioId);
  }

  // ── Scenario Loading ────────────────────────────────────────────────────────

  loadScenario(scenarioId) {
    this.currentScenarioId = scenarioId;
    const scenario = SCENARIOS[scenarioId];
    if (!scenario) return;

    this.playerRace.loadScenario(scenario, 'race');
    this.playerSem.loadScenario(scenario, 'semaphore');

    this.updateScenarioLabels(scenario);
    this.updateScenarioBanner(scenario);
    this.updateMasterPlayBtnUI();
  }

  updateScenarioLabels(scenario) {
    const res1 = document.getElementById('resource-val-race');
    const res2 = document.getElementById('resource-val-sem');
    if (res1 && scenario.initialDisplay) res1.textContent = scenario.initialDisplay;
    if (res2 && scenario.initialDisplay) res2.textContent = scenario.initialDisplay;
  }

  updateScenarioBanner(scenario) {
    if (this.bannerText && scenario.desc) {
      this.bannerText.innerHTML = scenario.desc;
    }
    if (this.bannerResource && scenario.resource) {
      this.bannerResource.textContent = scenario.resource;
    }
  }

  // ── Utility Actions ─────────────────────────────────────────────────────────

  toggleSound() {
    if (window.rtosAudio) {
      const enabled = window.rtosAudio.toggleSound();
      if (this.soundToggleBtn) {
        this.soundToggleBtn.textContent = enabled ? '🔊' : '🔇';
        this.soundToggleBtn.title = enabled ? 'Sound ON [S]' : 'Sound OFF [S]';
      }
    }
  }

  cycleTheme() {
    this.currentThemeIdx = (this.currentThemeIdx + 1) % this.themes.length;
    document.body.className = `theme-${this.themes[this.currentThemeIdx]}`;
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen && document.exitFullscreen();
    }
  }

  // ── State Sync ──────────────────────────────────────────────────────────────

  handlePlayerStateChange() {
    this.updateMasterPlayBtnUI();
  }

  updateMasterPlayBtnUI() {
    if (!this.masterPlayBtn) return;
    const isEitherPlaying = (this.playerRace && this.playerRace.isPlaying) ||
                            (this.playerSem  && this.playerSem.isPlaying);
    this.masterPlayBtn.innerHTML = isEitherPlaying ? '❚❚ Pause' : '▶ Play';
    this.masterPlayBtn.title     = isEitherPlaying ? 'Pause [Space]' : 'Play [Space]';
    this.masterPlayBtn.classList.toggle('is-playing', isEitherPlaying);
  }
}

// ── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  window.syncController = new SyncController();
  window.syncController.init();
});
