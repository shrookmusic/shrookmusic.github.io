const tracks = document.querySelectorAll('[data-track]');
const audioElements = document.querySelectorAll('[data-track] audio');

const formatTime = seconds => {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

for (const track of tracks) {
  const title = track.querySelector('h2, h3').textContent;
  const audio = track.querySelector('audio');
  const player = track.querySelector('.player');
  const play = track.querySelector('.play');
  const seek = track.querySelector('.seek input');
  const wave = track.querySelector('.wave');
  const elapsed = track.querySelector('.elapsed');
  const duration = track.querySelector('.duration');
  const status = track.querySelector('.player-status');

  const bars = waveformLevels[track.dataset.track].map(level => {
    const bar = document.createElement('i');
    bar.style.setProperty('--level', `${Math.max(9, level * 95)}%`);
    return bar;
  });
  wave.append(...bars);

  let pendingSeek = null;
  function renderProgress() {
    const length = Number.isFinite(audio.duration) ? audio.duration : Number(seek.max);
    const time = pendingSeek ?? audio.currentTime;
    elapsed.textContent = formatTime(time);
    duration.textContent = formatTime(length);
    seek.max = String(length);
    seek.value = String(time);
    seek.setAttribute('aria-valuetext', `${formatTime(time)} of ${formatTime(length)}`);
    const playedBars = Math.round(time / length * bars.length);
    bars.forEach((bar, index) => bar.classList.toggle('played', index < playedBars));
  }

  function renderPlayState() {
    const playing = !audio.paused && !audio.ended;
    play.setAttribute('data-playing', String(playing));
    play.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${title}`);
  }

  function showError() {
    status.hidden = false;
    status.textContent = 'Playback couldn’t start. Try pressing play again.';
    renderPlayState();
  }

  play.addEventListener('click', () => {
    status.hidden = true;
    if (!audio.paused && !audio.ended) {
      audio.pause();
      return;
    }
    if (audio.error) audio.load();
    audio.play().catch(error => {
      if (error.name !== 'AbortError' && audio.paused) showError();
    });
  });

  seek.addEventListener('input', () => {
    const time = Number(seek.value);
    if (audio.readyState) {
      audio.currentTime = time;
    } else {
      if (pendingSeek === null) audio.load();
      pendingSeek = time;
    }
    renderProgress();
  });

  audio.addEventListener('loadedmetadata', () => {
    if (pendingSeek !== null) {
      audio.currentTime = Math.min(pendingSeek, audio.duration);
      pendingSeek = null;
    }
    renderProgress();
  });
  audio.addEventListener('timeupdate', renderProgress);
  audio.addEventListener('play', () => {
    for (const other of audioElements) {
      if (other !== audio) other.pause();
    }
  });
  for (const event of ['play', 'pause', 'ended']) audio.addEventListener(event, renderPlayState);
  audio.addEventListener('error', showError);
  renderPlayState();
  audio.controls = false;
  audio.hidden = true;
  player.hidden = false;
}
