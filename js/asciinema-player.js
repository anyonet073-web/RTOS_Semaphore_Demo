/* ==========================================================================
   RTOS-CoreTerm: Asciinema Terminal Player Engine
   Enhanced for Embedded Systems classroom demonstration:
     - Live C code reference panel per event
     - Step counter (event X / total)
     - Glitch animation on race hazard events
     - Badge pulse on resource value change
   ========================================================================== */

class AsciinemaPlayer {
  constructor(config) {
    this.id = config.id;
    this.type = config.type; // 'race' or 'semaphore'

    // DOM Elements
    this.container       = document.getElementById(config.containerId);
    this.screen          = document.getElementById(config.screenId);
    this.playBtn         = document.getElementById(config.playBtnId);
    this.stepBtn         = document.getElementById(config.stepBtnId);
    this.resetBtn        = document.getElementById(config.resetBtnId);
    this.progressBar     = document.getElementById(config.progressBarId);
    this.progressFill    = document.getElementById(config.progressFillId);
    this.timeDisplay     = document.getElementById(config.timeDisplayId);
    this.badgeEl         = document.getElementById(config.badgeId);
    this.resourceValEl   = document.getElementById(config.resourceValId);
    this.codeContent     = document.getElementById(config.codeContentId);
    this.stepCountEl     = document.getElementById(config.stepCountId);
    this.speedBtns       = document.querySelectorAll(`[data-player-speed="${this.id}"]`);

    // Playback State
    this.currentTime       = 0;
    this.duration          = 10;
    this.speed             = 1.0;
    this.isPlaying         = false;
    this.events            = [];
    this.currentEventIndex = -1;
    this.lastFrameTimestamp = null;
    this.animationFrameId  = null;

    // Callbacks
    this.onStateChange = config.onStateChange || null;

    this._lastResourceValue = null;

    this.initListeners();
  }

  initListeners() {
    if (this.playBtn)  this.playBtn.addEventListener('click',  () => this.togglePlay());
    if (this.stepBtn)  this.stepBtn.addEventListener('click',  () => this.step());
    if (this.resetBtn) this.resetBtn.addEventListener('click', () => this.restart());

    if (this.progressBar) {
      this.progressBar.addEventListener('click', (e) => {
        const rect     = this.progressBar.getBoundingClientRect();
        const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        this.seek(fraction * this.duration);
      });
    }

    if (this.speedBtns && this.speedBtns.length > 0) {
      this.speedBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const spd = parseFloat(btn.dataset.speed || '1');
          this.setSpeed(spd);
        });
      });
    }
  }

  setSpeed(spd) {
    this.speed = spd;
    if (this.speedBtns) {
      this.speedBtns.forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.dataset.speed) === spd);
      });
    }
  }

  loadScenario(scenario, type) {
    this.pause();
    this.scenario = scenario;
    this.type     = type;

    const data      = scenario[type];
    this.events      = data.events || [];
    this.duration    = data.duration || 10;
    this.initialState = data.initialState || {};

    this.currentTime       = 0;
    this.currentEventIndex = -1;
    this._lastResourceValue = null;

    this.applyState(this.initialState);
    this.renderBootBanner();
    this.updateTimelineUI();
    this.resetCodePanel();
    this.updateStepCounter();
  }

  renderBootBanner() {
    if (!this.screen) return;
    this.screen.innerHTML = `
      <div class="term-line term-dim"><span class="term-prompt">$</span> rtos-sim ready</div>
      <div class="term-cursor-line" id="${this.id}-cursor-line"><span class="term-cursor">█</span></div>
    `;
  }

  applyState(st) {
    if (!st) return;
    if (this.resourceValEl && st.resourceValue !== undefined) {
      const prev = this._lastResourceValue;
      this.resourceValEl.textContent = st.resourceValue;
      if (prev !== null && prev !== st.resourceValue) {
        this.pulseBadge();
      }
      this._lastResourceValue = st.resourceValue;
    }
  }

  // ── Playback ──────────────────────────────────────────────────────────────

  play() {
    if (this.currentTime >= this.duration) {
      this.currentTime       = 0;
      this.currentEventIndex = -1;
      this.renderBootBanner();
      this.resetCodePanel();
      this.updateStepCounter();
    }
    this.isPlaying = true;
    this.lastFrameTimestamp = performance.now();
    this.updatePlayBtnUI();
    if (this.onStateChange) this.onStateChange(this);

    const loop = (now) => {
      if (!this.isPlaying) return;
      const deltaSec = (now - this.lastFrameTimestamp) / 1000;
      this.lastFrameTimestamp = now;
      this.tick(deltaSec * this.speed);

      if (this.currentTime < this.duration) {
        this.animationFrameId = requestAnimationFrame(loop);
      } else {
        this.pause();
        this.currentTime = this.duration;
        this.updateTimelineUI();
      }
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  pause() {
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.updatePlayBtnUI();
    if (this.onStateChange) this.onStateChange(this);
  }

  togglePlay() {
    if (this.isPlaying) { this.pause(); } else { this.play(); }
  }

  restart() {
    this.pause();
    this.currentTime       = 0;
    this.currentEventIndex = -1;
    this._lastResourceValue = null;
    this.applyState(this.initialState);
    this.renderBootBanner();
    this.updateTimelineUI();
    this.resetCodePanel();
    this.updateStepCounter();
  }

  step() {
    this.pause();
    const nextIdx = this.currentEventIndex + 1;
    if (nextIdx < this.events.length) {
      const evt = this.events[nextIdx];
      this.currentTime = evt.time;
      this.printEvent(evt, true);
      this.currentEventIndex = nextIdx;
      this.applyState(evt.state);
      this.updateTimelineUI();
      this.updateStepCounter();
    } else {
      this.currentTime = this.duration;
      this.updateTimelineUI();
    }
  }

  seek(targetTime) {
    targetTime  = Math.max(0, Math.min(this.duration, targetTime));
    const wasPlaying = this.isPlaying;
    this.pause();

    this.currentTime       = targetTime;
    this._lastResourceValue = null;
    this.renderBootBanner();
    this.currentEventIndex = -1;
    let lastState = this.initialState;

    for (let i = 0; i < this.events.length; i++) {
      const evt = this.events[i];
      if (evt.time <= targetTime) {
        this.printEvent(evt, false);
        this.currentEventIndex = i;
        if (evt.state) lastState = evt.state;
        if (evt.code)  this.setCodePanel(evt.code);
      } else {
        break;
      }
    }

    this.applyState(lastState);
    this.updateTimelineUI();
    this.updateStepCounter();

    if (wasPlaying && this.currentTime < this.duration) this.play();
  }

  tick(deltaSec) {
    this.currentTime = Math.min(this.duration, this.currentTime + deltaSec);

    while (
      this.currentEventIndex + 1 < this.events.length &&
      this.events[this.currentEventIndex + 1].time <= this.currentTime
    ) {
      this.currentEventIndex++;
      const evt = this.events[this.currentEventIndex];
      this.printEvent(evt, true);
      this.applyState(evt.state);
    }

    this.updateTimelineUI();
    this.updateStepCounter();
  }

  printEvent(evt, playAudio = true) {
    if (!this.screen) return;
    const cursor = document.getElementById(`${this.id}-cursor-line`);

    const line = document.createElement('div');
    line.className = 'term-line';
    line.innerHTML  = evt.html;

    if (cursor && cursor.parentNode === this.screen) {
      this.screen.insertBefore(line, cursor);
    } else {
      this.screen.appendChild(line);
    }

    this.screen.scrollTop = this.screen.scrollHeight;

    // Update C code reference panel
    if (evt.code) this.setCodePanel(evt.code);

    // Audio
    if (playAudio && window.rtosAudio && evt.sound) {
      window.rtosAudio.playSound(evt.sound);
    }

    // Glitch effect on race hazard (race panel only)
    if (playAudio && evt.sound === 'hazard' && this.container) {
      this.triggerGlitch();
    }
  }

  // ── Code Reference Panel ──────────────────────────────────────────────────

  setCodePanel(code) {
    if (!this.codeContent) return;
    this.codeContent.textContent = code;
    this.codeContent.classList.remove('code-updated');
    // Force reflow to restart animation
    void this.codeContent.offsetWidth;
    this.codeContent.classList.add('code-updated');
  }

  resetCodePanel() {
    if (!this.codeContent) return;
    this.codeContent.textContent = '// Press Play or Step to begin...';
    this.codeContent.classList.remove('code-updated');
  }

  // ── Step Counter ──────────────────────────────────────────────────────────

  updateStepCounter() {
    if (!this.stepCountEl) return;
    const total   = this.events.length;
    const current = this.currentEventIndex + 1;
    if (current <= 0) {
      this.stepCountEl.textContent = `0/${total}`;
    } else {
      this.stepCountEl.textContent = `${current}/${total}`;
    }
  }

  // ── Glitch Animation ──────────────────────────────────────────────────────

  triggerGlitch() {
    if (!this.container) return;
    this.container.classList.remove('panel-glitch');
    void this.container.offsetWidth; // force reflow
    this.container.classList.add('panel-glitch');
    this.container.addEventListener(
      'animationend',
      () => this.container.classList.remove('panel-glitch'),
      { once: true }
    );
  }

  // ── Badge Pulse ───────────────────────────────────────────────────────────

  pulseBadge() {
    if (!this.resourceValEl) return;
    this.resourceValEl.classList.remove('badge-changed');
    void this.resourceValEl.offsetWidth;
    this.resourceValEl.classList.add('badge-changed');
    this.resourceValEl.addEventListener(
      'animationend',
      () => this.resourceValEl.classList.remove('badge-changed'),
      { once: true }
    );
  }

  // ── Timeline UI ───────────────────────────────────────────────────────────

  updateTimelineUI() {
    const fraction = this.duration > 0 ? (this.currentTime / this.duration) : 0;
    if (this.progressFill) {
      this.progressFill.style.width = `${Math.min(100, fraction * 100)}%`;
    }
    if (this.timeDisplay) {
      this.timeDisplay.textContent = `${this.formatTime(this.currentTime)} / ${this.formatTime(this.duration)}`;
    }
  }

  updatePlayBtnUI() {
    if (!this.playBtn) return;
    this.playBtn.innerHTML = this.isPlaying ? '❚❚' : '▶';
    this.playBtn.title     = this.isPlaying ? 'Pause simulation' : 'Play simulation';
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms   = Math.floor((seconds % 1) * 10);
    return `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}.${ms}`;
  }
}
