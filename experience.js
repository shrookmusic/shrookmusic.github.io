(() => {
  const bar = document.querySelector('.sticky-player');
  const button = bar.querySelector('.sticky-play');
  const range = bar.querySelector('.sticky-progress input');
  const rangeWrap = bar.querySelector('.sticky-progress');
  const nativeSlot = bar.querySelector('.sticky-native-audio');
  const title = bar.querySelector('.sticky-title');
  const subtitle = bar.querySelector('.sticky-subtitle');
  const bpm = bar.querySelector('.sticky-bpm');
  const time = bar.querySelector('.sticky-time');
  const sources = [];
  let active = null;
  let dockedAudio = null;
  let scrubbing = false;

  const stamp = seconds => {
    const value = Math.max(0, Math.floor(seconds || 0));
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
  };

  function restoreAudio(source) {
    if (!source?.audio || source.audio.parentElement !== nativeSlot) return;
    source.audio.controls = false;
    source.audio.hidden = true;
    source.home.insertBefore(source.audio, source.homeAnchor?.parentNode === source.home ? source.homeAnchor : null);
    if (dockedAudio === source) dockedAudio = null;
  }

  function showSourceControls(source) {
    if (source.audio) {
      if (dockedAudio && dockedAudio !== source) restoreAudio(dockedAudio);
      nativeSlot.append(source.audio);
      source.audio.setAttribute('controlslist', 'nodownload');
      source.audio.controls = true;
      source.audio.hidden = false;
      nativeSlot.hidden = false;
      rangeWrap.hidden = true;
      button.hidden = true;
      dockedAudio = source;
    } else {
      if (dockedAudio) restoreAudio(dockedAudio);
      nativeSlot.hidden = true;
      rangeWrap.hidden = false;
      button.hidden = false;
    }
  }

  function paint(source) {
    if (active !== source) return;
    title.querySelector('strong').textContent = source.title;
    title.href = source.href;
    subtitle.textContent = source.subtitle;
    bpm.textContent = source.bpm || source.kind.toUpperCase();
    button.textContent = source.playing ? 'Pause' : 'Play';
    button.setAttribute('aria-label', `${source.playing ? 'Pause' : 'Play'} ${source.title}`);
    range.max = source.duration || 1;
    if (!scrubbing) range.value = source.position || 0;
    range.disabled = !source.duration;
    range.setAttribute('aria-valuetext', `${stamp(source.position)} of ${stamp(source.duration)}`);
    time.textContent = `${stamp(source.position)} / ${stamp(source.duration)}`;
  }

  function activate(source) {
    if (active !== source) {
      sources.forEach(other => {
        if (other !== source) {
          other.pause();
          restoreAudio(other);
        }
      });
    }
    active = source;
    showSourceControls(source);
    source.playing = true;
    bar.hidden = false;
    document.body.classList.add('has-player');
    paint(source);
  }

  function navigate(delta) {
    if (!active || sources.length < 2) return;
    const index = sources.indexOf(active);
    sources[(index + delta + sources.length) % sources.length].play();
  }

  document.querySelectorAll('[data-track]').forEach(track => {
    const audio = track.querySelector('audio');
    // Do not abort the rest of this script when a track is streamed via SoundCloud.
    if (!audio) return;
    const rawMeta = track.querySelector('.track-meta')?.textContent.trim() || '';
    const bpmText = rawMeta.match(/\b\d+\s*BPM\b/i)?.[0] || '';
    const source = {
      title: track.querySelector('h2,h3').textContent,
      href: `#${track.getAttribute('aria-labelledby')}`,
      kind: 'Track',
      subtitle: rawMeta.replace(/\s*\/\s*\d+\s*BPM\b/i, '').trim(),
      bpm: bpmText,
      duration: Number(track.querySelector('.seek input').max),
      position: 0,
      playing: false,
      audio,
      home: audio.parentElement,
      homeAnchor: audio.nextSibling,
      pendingSeek: undefined,
      pause: () => audio.pause(),
      play: () => track.querySelector('.play').click(),
      toggle: () => track.querySelector('.play').click(),
      seek: value => {
        const length = Number.isFinite(audio.duration) ? audio.duration : source.duration;
        const target = Math.max(0, Math.min(Number(value), length));
        source.pendingSeek = target;
        if (audio.readyState >= 1) {
          try {
            audio.currentTime = target;
            source.pendingSeek = undefined;
          } catch (_) {
            audio.load();
          }
        } else {
          audio.load();
        }
      }
    };
    sources.push(source);
    audio.addEventListener('play', () => activate(source));
    audio.addEventListener('loadedmetadata', () => {
      source.duration = Number.isFinite(audio.duration) ? audio.duration : source.duration;
      if (Number.isFinite(source.pendingSeek)) {
        try {
          audio.currentTime = Math.min(source.pendingSeek, audio.duration);
          source.pendingSeek = undefined;
        } catch (_) {}
      }
      paint(source);
    });
    audio.addEventListener('seeked', () => {
      source.position = audio.currentTime;
      paint(source);
    });
    ['timeupdate', 'pause', 'ended'].forEach(event => audio.addEventListener(event, () => {
      source.position = audio.currentTime;
      source.duration = Number.isFinite(audio.duration) ? audio.duration : source.duration;
      source.playing = !audio.paused && !audio.ended;
      paint(source);
    }));
  });

  const previous = bar.querySelector('.sticky-prev');
  const next = bar.querySelector('.sticky-next');
  previous.addEventListener('click', () => navigate(-1));
  next.addEventListener('click', () => navigate(1));
  button.addEventListener('click', () => active?.toggle());

  const commitSeek = () => {
    if (active && scrubbing && !active.audio) {
      active.seek(Number(range.value));
      active.position = Number(range.value);
      scrubbing = false;
      paint(active);
    }
  };
  range.addEventListener('pointerdown', () => { scrubbing = true; });
  range.addEventListener('focus', () => { scrubbing = true; });
  range.addEventListener('input', () => {
    if (active && !active.audio) {
      active.position = Number(range.value);
      time.textContent = `${stamp(active.position)} / ${stamp(active.duration)}`;
      range.setAttribute('aria-valuetext', `${stamp(active.position)} of ${stamp(active.duration)}`);
    }
  });
  range.addEventListener('change', commitSeek);
  range.addEventListener('pointerup', commitSeek);
  range.addEventListener('blur', commitSeek);

  bar.querySelector('.sticky-close').addEventListener('click', () => {
    active?.pause();
    if (dockedAudio) restoreAudio(dockedAudio);
    active = null;
    bar.hidden = true;
    document.body.classList.remove('has-player');
  });

  const api = document.createElement('script');
  api.src = 'https://w.soundcloud.com/player/api.js';
  api.onload = () => {
    document.querySelectorAll('.mix iframe, .track-stream iframe').forEach(frame => {
      const widget = SC.Widget(frame);
      const trackCard = frame.closest('[data-track]');
      const mixCard = frame.closest('.mix');
      const card = trackCard || mixCard;
      const meta = trackCard?.querySelector('.track-meta')?.textContent.trim() || '';
      const bpm = meta.match(/\b\d+\s*BPM\b/i)?.[0] || '';
      const source = {
        title: card.querySelector('h2,h3').textContent,
        href: trackCard ? `#${trackCard.getAttribute('aria-labelledby')}` : '#mixes',
        kind: trackCard ? 'Track' : 'DJ set',
        subtitle: trackCard ? meta.replace(/\s*\/\s*\d+\s*BPM\b/i, '').trim() : 'SoundCloud mix',
        bpm: trackCard ? bpm : 'DJ set',
        position: 0, duration: 0, playing: false, ready: false,
        pause: () => widget.pause(),
        play: () => source.ready && widget.play(),
        toggle: () => source.playing ? widget.pause() : source.play(),
        seek: value => widget.seekTo(value * 1000)
      };
      sources.push(source);
      widget.bind(SC.Widget.Events.READY, () => {
        source.ready = true;
        widget.getDuration(milliseconds => { source.duration = milliseconds / 1000; paint(source); });
      });
      widget.bind(SC.Widget.Events.PLAY, () => {
        activate(source);
        widget.getDuration(milliseconds => { source.duration = milliseconds / 1000; paint(source); });
      });
      [SC.Widget.Events.PAUSE, SC.Widget.Events.FINISH].forEach(event => widget.bind(event, () => {
        source.playing = false;
        paint(source);
      }));
      [SC.Widget.Events.PLAY_PROGRESS, SC.Widget.Events.SEEK].forEach(event => widget.bind(event, data => {
        source.position = data.currentPosition / 1000;
        paint(source);
      }));
    });
  };
  document.head.append(api);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.video-frame').forEach(frame => {
    const video = frame.querySelector('video');
    const toggle = frame.querySelector('button');
    let loaded = false;
    let userPaused = false;
    let visible = false;
    function play() {
      if (!loaded) {
        video.load();
        loaded = true;
      }
      video.play().catch(() => { toggle.textContent = 'Tap to play footage'; });
    }
    const update = () => { toggle.textContent = video.paused ? 'Play footage' : 'Pause footage'; };
    video.addEventListener('play', update);
    video.addEventListener('pause', update);
    video.addEventListener('error', () => { toggle.textContent = 'Video unavailable'; });
    toggle.addEventListener('click', () => {
      if (video.paused) { userPaused = false; play(); }
      else { userPaused = true; video.pause(); }
    });
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible && !reduce.matches && !userPaused && !document.hidden) play();
      else video.pause();
    }, {threshold: .2}).observe(video);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) video.pause();
      else if (visible && !reduce.matches && !userPaused) play();
    });
    reduce.addEventListener('change', () => { if (reduce.matches) video.pause(); });
  });
})();
