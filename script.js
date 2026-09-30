document.addEventListener('DOMContentLoaded', () => {

    /* ==========================================================
       СОСТОЯНИЕ
       ========================================================== */
    let state            = 'sleeping';
    let talkTimer        = null;
    let blinkTimer       = null;
    let idleTimer        = null;
    let sleepTimer       = null;
    let breathTimer      = null;
    let breathFrame      = 0;
    let talkAnim         = null;
    let wakeTimer        = null;

    let idlePhrase1      = null;
    let idlePhrase2      = null;
    let idlePhraseHide   = null;
    let idlePhraseAnim   = null;
    let idlePhraseActive = false;

    let clickTimes       = [];
    let spamCooldown     = 0;
    const SPAM_WINDOW    = 2000;
    const SPAM_THRESHOLD = 5;

    /* ==========================================================
       ПЛЕЕР
       ========================================================== */

    const TRACKS = [
        {
            file: 'music/1.mp3',
            title: 'на грани болевого порога',
            onPlay: { text: 'опа, что-то знакомое играет...', mood: 'happy' }
        },
        {
            file: 'music/2.mp3',
            title: 'why,why?',
            events: [
                { time: 6,   action: 'showFlashback' },
                { time: 11,  action: 'showLocalVideo', src: 'video/13.mp4', startAt: 14, theme: 'dark' },
                { time: 62,  action: 'hideVideo' },
                { time: 62,  action: 'randomSingOn' },
                { time: 88,  action: 'specificSingOn' },
                { time: 89,  action: 'singLine', text: 'без тебя я не я, без тебя меня нет...' },
                { time: 92,  action: 'singLine', text: 'а они говорят, говорят это бред...' },
                { time: 95,  action: 'singLine', text: 'это солнечный яд, золотые лучи...' },
                { time: 98,  action: 'singLine', text: 'а они говорят, надо срочно лечить...' },
                { time: 101, action: 'singLine', text: 'я хотела забыть, до упора и вниз...' },
                { time: 105, action: 'singLine', text: 'я считала столбы и растерянных птиц...' },
                { time: 108, action: 'singLine', text: 'без тебя меня нет, отпусти-отпусти...' },
                { time: 111, action: 'singLine', text: 'до угла по стене, мама, папа, прости...' },
                { time: 114, action: 'specificSingOff' }
            ]
        },
        {
            file: 'music/3.mp3',
            title: 'u and i (runaway)',
            onPlay: { text: 'о, это же любимое меме юли!', mood: 'happy' },
            events: [
                { time: 33,  action: 'showLocalVideo', src: 'video/18.mp4', onEnd: 'kamiiFirstUAndIEnd' },
                { time: 133, action: 'showLocalVideo', src: 'video/18.mp4' }
            ]
        }
    ];

    const audioEl             = document.getElementById('audioEl');
    const musicPrevBtn        = document.getElementById('musicPrev');
    const musicPlayBtn        = document.getElementById('musicPlay');
    const musicNextBtn        = document.getElementById('musicNext');
    const musicTitle          = document.getElementById('musicTitle');
    const musicTime           = document.getElementById('musicTime');
    const musicProgressWrap   = document.getElementById('musicProgressWrap');
    const musicProgressFill   = document.getElementById('musicProgressFill');
    const musicVolume         = document.getElementById('musicVolume');
    const musicRepeatBtn      = document.getElementById('musicRepeat');
    const musicExpandBtn      = document.getElementById('musicExpand');
    const musicList           = document.getElementById('musicList');
    const youtubeOverlay      = document.getElementById('youtubeOverlay');
    const youtubeIframe       = document.getElementById('youtubeIframe');
    const localVideo          = document.getElementById('localVideo');
    const fullscreenBtn       = document.getElementById('fullscreenBtn');
    const memePanel           = document.getElementById('memePanel');
    const memeBtn             = document.getElementById('memeBtn');

    let currentTrack   = -1;
    let isPlaying      = false;
    let isRepeat       = false;
    let isExpanded     = false;
    let firedEvents    = new Set();
    let onPlayTriggeredForTrack = -1;

    function formatTime(sec) {
        if (!isFinite(sec) || sec < 0) sec = 0;
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return m + ':' + String(s).padStart(2, '0');
    }

    function renderTrackList() {
        musicList.innerHTML = '';
        if (TRACKS.length === 0) {
            musicList.innerHTML = '<div class="music-track"><span class="music-track-num">—</span>треки не добавлены</div>';
            return;
        }
        TRACKS.forEach((t, i) => {
            const row = document.createElement('div');
            row.className = 'music-track' + (i === currentTrack ? ' active' : '');
            row.innerHTML = `<span class="music-track-num">${i + 1}</span><span>${t.title}</span>`;
            row.addEventListener('click', () => { loadTrack(i); playTrack(); });
            musicList.appendChild(row);
        });
    }

    function updateListActive() {
        musicList.querySelectorAll('.music-track').forEach((el, i) => {
            el.classList.toggle('active', i === currentTrack);
        });
    }

    function loadTrack(i, autoplay) {
        if (TRACKS.length === 0) return;
        currentTrack = (i + TRACKS.length) % TRACKS.length;
        const t = TRACKS[currentTrack];
        audioEl.src = t.file;
        musicTitle.textContent = t.title;
        musicProgressFill.style.width = '0%';
        musicTime.textContent = '0:00 / 0:00';
        updateListActive();

        firedEvents = new Set();
        onPlayTriggeredForTrack = -1;
        stopRandomSing();
        specificSingActive = false;
        resetTrackVisuals();

        if (autoplay) playTrack();
    }

    function resetTrackVisuals() {
        hideVideoOverlay();
        if (state === 'idle') { setMood(null); enterIdle(); }
    }

    function playTrack() {
        if (TRACKS.length === 0) return;
        if (currentTrack === -1) loadTrack(0);

        const track = TRACKS[currentTrack];
        if (track && track.onPlay && onPlayTriggeredForTrack !== currentTrack) {
            onPlayTriggeredForTrack = currentTrack;
            setTimeout(() => {
                if (typeof forcePlayPhrase === 'function') {
                    forcePlayPhrase({
                        text: track.onPlay.text,
                        mood: track.onPlay.mood || 'neutral'
                    }, finishDialog);
                }
            }, 900);
        }
        const p = audioEl.play();
        if (p && p.catch) p.catch(() => {});
    }

    function pauseTrack() { audioEl.pause(); }
    function updatePlayBtn() {
        musicPlayBtn.textContent = isPlaying ? '⏸' : '▶';
        musicPlayBtn.title = isPlaying ? 'пауза' : 'играть';
    }
    function updateButtonsDisabled() {
        const empty = TRACKS.length === 0;
        musicPrevBtn.disabled = empty;
        musicNextBtn.disabled = empty;
        musicPlayBtn.disabled = empty;
    }

    function checkTrackEvents() {
        const track = TRACKS[currentTrack];
        if (!track || !track.events) return;
        track.events.forEach((ev, idx) => {
            if (firedEvents.has(idx)) return;
            if (audioEl.currentTime >= ev.time) {
                firedEvents.add(idx);
                runTrackEvent(ev);
            }
        });
    }

    function runTrackEvent(ev) {
        if (ev.action === 'showFlashback') showFlashback();
        else if (ev.action === 'showVideo') {
            showYouTubeVideo(ev.videoId, ev.startAt || 0);
            if (ev.theme) {
                document.body.className = ev.theme === 'dark' ? '' : 'theme-' + ev.theme;
                localStorage.setItem('petTheme', ev.theme);
            }
        } else if (ev.action === 'hideVideo') hideVideoOverlay();
        else if (ev.action === 'showLocalVideo') {
            if (ev.theme) {
                document.body.className = ev.theme === 'dark' ? '' : 'theme-' + ev.theme;
                localStorage.setItem('petTheme', ev.theme);
            }
            showLocalVideo(ev.src, ev.onEnd, ev.startAt || 0);
        }
        else if (ev.action === 'singLine') showSingLine(ev.text, 2800);
        else if (ev.action === 'randomSingOn') startRandomSing();
        else if (ev.action === 'randomSingOff') stopRandomSing();
        else if (ev.action === 'specificSingOn') specificSingActive = true;
        else if (ev.action === 'specificSingOff') specificSingActive = false;
    }

    function showFlashback() {
        cancelIdlePhrase();
        clearInterval(blinkTimer);
        clearTimeout(idleTimer);
        clearTimeout(sleepTimer);
        clearTimeout(idlePhrase1);
        clearTimeout(idlePhrase2);
        stopBreathing();
        showLayer('flashback');
        setMood('happy');
    }

    function showYouTubeVideo(videoId, startAt) {
        if (!youtubeIframe || !youtubeOverlay) return;
        localVideo.pause();
        localVideo.removeAttribute('src');
        localVideo.classList.remove('active');

        const params = ['autoplay=1', 'mute=1', 'controls=0', 'modestbranding=1', 'rel=0', 'loop=1', 'playlist=' + videoId];
        if (startAt > 0) params.push('start=' + startAt);

        youtubeIframe.src = 'https://www.youtube.com/embed/' + videoId + '?' + params.join('&');
        youtubeIframe.classList.add('active');
        setTimeout(() => { youtubeOverlay.classList.add('show'); }, 120);
    }

    function showLocalVideo(src, endAction, startAt) {
        if (!localVideo || !youtubeOverlay) return;
        youtubeIframe.src = '';
        youtubeIframe.classList.remove('active');
        localVideo.onended = null;
        if (endAction === 'kamiiFirstUAndIEnd') localVideo.onended = kamiiFirstUAndIEnded;

        localVideo.muted = true;
        localVideo.classList.add('active');

        const seekAndPlay = () => {
            if (startAt && startAt > 0) {
                try { localVideo.currentTime = startAt; } catch (_) {}
            }
            youtubeOverlay.classList.add('show');
            const p = localVideo.play();
            if (p && p.catch) p.catch(() => {});
        };

        localVideo.onloadedmetadata = () => {
            localVideo.onloadedmetadata = null;
            seekAndPlay();
        };

        localVideo.src = src;

        /* Fallback, если метаданные не пришли */
        setTimeout(() => {
            if (!youtubeOverlay.classList.contains('show')) {
                seekAndPlay();
            }
        }, 400);
    }

    function playMemeVideo(src) {
        showLocalVideo(src, null, 0);
    }

    function hideVideoOverlay() {
        if (!youtubeOverlay) return;
        youtubeOverlay.classList.remove('show');
        setTimeout(() => {
            if (youtubeIframe) { youtubeIframe.src = ''; youtubeIframe.classList.remove('active'); }
            if (localVideo) {
                localVideo.pause();
                localVideo.removeAttribute('src');
                localVideo.classList.remove('active');
                localVideo.onended = null;
                localVideo.onloadedmetadata = null;
            }
        }, 1200);
    }

    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const el = (localVideo && localVideo.classList.contains('active')) ? localVideo : youtubeIframe;
            if (!el) return;
            if (el.requestFullscreen) el.requestFullscreen();
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
            else if (el.msRequestFullscreen) el.msRequestFullscreen();
        });
    }

    function kamiiFirstUAndIEnded() {
        hideVideoOverlay();
        setTimeout(() => {
            if (typeof forcePlayPhrase !== 'function') return;
            forcePlayPhrase({ text: 'да, хорошее меме...', mood: 'happy' }, () => {
                setTimeout(() => {
                    forcePlayPhrase({ text: 'хочу посмотреть его ещё раз!', mood: 'happy' }, finishDialog);
                }, 300);
            });
        }, 700);
    }

    const RANDOM_SING_PHRASES = [
        'я сошла с ума, я сошла с ума...',
        'мне нужна онаааа',
        'яяя сооошлааа с умааа'
    ];
    let randomSingTimer = null;
    let randomSingActive = false;
    let specificSingActive = false;

    function startRandomSing() {
        stopRandomSing();
        randomSingActive = true;
        scheduleNextRandomSing();
    }

    function scheduleNextRandomSing() {
        if (!randomSingActive) return;
        randomSingTimer = setTimeout(() => {
            if (currentTrack !== 1 || !randomSingActive) return;
            if (specificSingActive) { scheduleNextRandomSing(); return; }
            const phrase = RANDOM_SING_PHRASES[Math.floor(Math.random() * RANDOM_SING_PHRASES.length)];
            showSingLine(phrase, 2800);
            scheduleNextRandomSing();
        }, 4500 + Math.random() * 2500);
    }

    function stopRandomSing() {
        randomSingActive = false;
        if (randomSingTimer) { clearTimeout(randomSingTimer); randomSingTimer = null; }
    }

    function showSingLine(text, duration) {
        if (currentTrack !== 1) return;
        cancelIdlePhrase();
        clearTimeout(idleTimer);
        clearTimeout(idlePhrase1);
        clearTimeout(idlePhrase2);
        clearInterval(blinkTimer);
        petSpeech.textContent = text;
        showSpeech(true);
        setMood('happy');
        showLayer('happy1');
        clearTimeout(talkTimer);
        talkTimer = setTimeout(() => {
            showSpeech(false);
            setMood(null);
            if (state === 'idle') showLayer('idle');
        }, duration);
    }

    let noteSpawnTimer = null;
    function startMusicNotes() {
        stopMusicNotes();
        spawnNote(); spawnNote();
        noteSpawnTimer = setInterval(spawnNote, 550);
    }
    function stopMusicNotes() {
        if (noteSpawnTimer) { clearInterval(noteSpawnTimer); noteSpawnTimer = null; }
    }
    function spawnNote() {
        if (!petWidget) return;
        const rect = petWidget.getBoundingClientRect();
        const note = document.createElement('div');
        note.className = 'note-particle';
        const symbols = ['♪', '♫', '♬', '♩', '🎵', '🎶'];
        note.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        note.style.left = (rect.left + Math.random() * rect.width) + 'px';
        note.style.top = (rect.top + rect.height * 0.55 + Math.random() * 40) + 'px';
        note.style.fontSize = (16 + Math.random() * 16) + 'px';
        note.style.animationDuration = (2 + Math.random() * 1.2) + 's';
        document.body.appendChild(note);
        setTimeout(() => note.remove(), 3400);
    }

    audioEl.addEventListener('play', () => {
        isPlaying = true;
        updatePlayBtn();
        startMusicNotes();
        if (state === 'idle') {
            clearTimeout(idleTimer);
            clearTimeout(idlePhrase1);
            clearTimeout(idlePhrase2);
        }
    });

    audioEl.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayBtn();
        stopMusicNotes();
        stopRandomSing();
        specificSingActive = false;
        if (state === 'idle') enterIdle();
    });

    audioEl.addEventListener('timeupdate', () => {
        if (!audioEl.duration || !isFinite(audioEl.duration)) return;
        const p = (audioEl.currentTime / audioEl.duration) * 100;
        musicProgressFill.style.width = p + '%';
        musicTime.textContent = formatTime(audioEl.currentTime) + ' / ' + formatTime(audioEl.duration);
        checkTrackEvents();
    });

    audioEl.addEventListener('loadedmetadata', () => {
        musicTime.textContent = '0:00 / ' + formatTime(audioEl.duration);
    });

    audioEl.addEventListener('ended', () => {
        if (isRepeat) {
            firedEvents = new Set();
            onPlayTriggeredForTrack = -1;
            stopRandomSing();
            specificSingActive = false;
            audioEl.currentTime = 0;
            playTrack();
        } else {
            loadTrack(currentTrack + 1, true);
        }
    });

    musicPlayBtn.addEventListener('click', () => { if (isPlaying) pauseTrack(); else playTrack(); });
    musicPrevBtn.addEventListener('click', () => {
        if (audioEl.currentTime > 3) { audioEl.currentTime = 0; firedEvents = new Set(); }
        else loadTrack(currentTrack - 1, true);
    });
    musicNextBtn.addEventListener('click', () => loadTrack(currentTrack + 1, true));
    musicRepeatBtn.addEventListener('click', () => {
        isRepeat = !isRepeat;
        musicRepeatBtn.classList.toggle('active', isRepeat);
        musicRepeatBtn.title = isRepeat ? 'повтор включён' : 'повтор выключен';
    });
    musicExpandBtn.addEventListener('click', () => {
        isExpanded = !isExpanded;
        musicList.classList.toggle('open', isExpanded);
        musicExpandBtn.classList.toggle('open', isExpanded);
    });
    musicProgressWrap.addEventListener('click', (e) => {
        if (!audioEl.duration || !isFinite(audioEl.duration)) return;
        const rect = musicProgressWrap.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audioEl.currentTime = audioEl.duration * p;
        const track = TRACKS[currentTrack];
        if (track && track.events) {
            track.events.forEach((ev, idx) => {
                if (audioEl.currentTime >= ev.time) firedEvents.add(idx);
            });
        }
    });

    musicVolume.addEventListener('input', () => {
        audioEl.volume = parseFloat(musicVolume.value);
        localStorage.setItem('petVolume', audioEl.volume);
    });
    audioEl.volume = parseFloat(musicVolume.value);

    const savedVol = localStorage.getItem('petVolume');
    if (savedVol !== null) {
        const v = parseFloat(savedVol);
        if (!isNaN(v)) { audioEl.volume = v; musicVolume.value = v; }
    }

    if (TRACKS.length > 0) loadTrack(0, false);
    else musicTitle.textContent = 'нет треков';
    renderTrackList();
    updateButtonsDisabled();
    updatePlayBtn();

    /* ==========================================================
       ТАЙМЕР
       ========================================================== */
    const timerCurrent = document.getElementById('timerCurrent');
    const timerTotal = document.getElementById('timerTotal');

    let sessionSeconds = 0;
    let totalSeconds = parseInt(localStorage.getItem('petTotalSeconds') || '0', 10);
    if (isNaN(totalSeconds)) totalSeconds = 0;

    const TIME_MILESTONES = [
        { sec: 5 * 60,    text: 'мы с тобой вместе уже 5 минут! хороший старт',                          shown: false },
        { sec: 10 * 60,   text: '10 минут вместе! кажется, это начало чего-то большего?',                shown: false },
        { sec: 30 * 60,   text: 'ты провёл со мной 30 минут... спасибо тебе за это время!',              shown: false },
        { sec: 60 * 60,   text: 'ого, мы вместе уже целый час! надеюсь, это не предел~',                 shown: false },
        { sec: 2 * 3600,  text: 'и сколько это будет длиться? 2 часа?! мать твою!',                      shown: false },
        { sec: 3 * 3600,  text: 'вау, 3 часа.. я благодарна тебе за каждую секунду проведённую вместе!', shown: false },
        { sec: 4 * 3600,  text: 'боже мой, 4 часа с таким солнцем - это рай!',                           shown: false },
        { sec: 5 * 3600,  text: 'кажется, ты обезумел... какие 5 часов вместе?!',                        shown: false },
        { sec: 10 * 3600, text: 'теперь ты точно мой теневой...',                                        shown: false }
    ];

    function checkTimeMilestones() {
        for (const m of TIME_MILESTONES) {
            if (m.shown) continue;
            if (sessionSeconds < m.sec) break;
            if (state === 'sleeping' || state === 'waking' || state === 'talking') return;
            m.shown = true;
            forcePlayPhrase({ text: m.text, mood: 'happy' }, finishDialog);
            return;
        }
    }

    function formatSession(sec) {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
    function formatTotal(sec) { return Math.floor(sec / 3600) + 'ч'; }

    function renderTimers() {
        timerCurrent.textContent = '⏱ ' + formatSession(sessionSeconds);
        timerTotal.textContent = 'всего: ' + formatTotal(totalSeconds);
    }

    setInterval(() => {
        sessionSeconds++;
        totalSeconds++;
        renderTimers();
        checkTimeMilestones();
        checkAllAchievements();
    }, 1000);

    setInterval(() => {
        localStorage.setItem('petTotalSeconds', totalSeconds);
    }, 5000);

    window.addEventListener('beforeunload', () => {
        localStorage.setItem('petTotalSeconds', totalSeconds);
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) localStorage.setItem('petTotalSeconds', totalSeconds);
    });

    renderTimers();

    /* ==========================================================
       КАРТИНКИ
       ========================================================== */
    const IMAGES = {
        sleep1:    'images/1.png',
        sleep2:    'images/2.png',
        wake:      'images/3.png',
        blink:     'images/4.png',
        idle:      'images/5.png',
        talk1:     'images/6.png',
        talk2:     'images/7.png',
        happy1:    'images/8.png',
        happy2:    'images/9.png',
        angry:     'images/10.png',
        laugh:     'images/11.png',
        tease:     'images/12.png',
        flashback: 'images/13.png'
    };
    Object.values(IMAGES).forEach(src => { const i = new Image(); i.src = src; });

    function getMoscowTime() {
        return new Date().toLocaleTimeString('ru-RU', {
            timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit'
        });
    }
    function getPhraseText(phrase) {
        return typeof phrase.text === 'function' ? phrase.text() : phrase.text;
    }

    const DIALOGS = {
        welcome: [
            { text: () => `*зевает* доброе утро... ого, уже ${getMoscowTime()}`, mood: "neutral" },
            { text: "я соскучилась по тебе~", mood: "happy" },
            { text: "я уже боялась, что ты не вернёшься ко мне", mood: "neutral" },
            { text: "знакомые глаза читают этот текст!~", mood: "happy" },
            { text: "утречка, рада тебя видеть!", mood: "happy" },
            { text: "упф, мне сейчас такооое снилось!", mood: "neutral" },
            { text: "ну капец, а я только начала засыпать...", mood: "neutral" },
            { text: "который раз вижу тебя, солнце?~", mood: "happy" },
            { text: "каждое мое утро самое доброе, ведь я сразу вижу тебя~", mood: "happy" },
            { text: "ммм... что такое?", mood: "neutral" },
            { text: "я так сладко спала!...", mood: "neutral" },
            { text: "кто меня разбудил?", mood: "neutral" },
            { text: "и что тебе нужно?~", mood: "happy" }
        ],
        body: [
            { text: "ой! ты чего тыкаешь?", mood: "neutral" },
            { text: "мне же щекотно!", mood: "happy" },
            { text: "думаешь, тут есть пасхалка?", mood: "neutral" },
            { text: "ахахах, ну ты даёшь!", mood: "laughing" },
            { text: "я так и знала, что ты зайдёшь~", mood: "happy" },
            { text: "ты пришла поиграть?", mood: "happy" },
            { text: "красивая у меня одёжка, не так ли?)", mood: "happy" },
            { text: "это японская школьная форма, моя любимая!~", mood: "happy" },
            { text: "что, я испачкала форму? наверное, это от чизбургера..", mood: "neutral" },
            { text: "клик, клик, какая же фраза следующая?", mood: "neutral" },
            { text: "только не кликай слишком часто!", mood: "neutral" },
            { text: "ты такой настойчивый, это смущает...", mood: "teasing" },
            { text: "я сегодня попшикалась новыми духами, как тебе?", mood: "happy" }
        ],
        hair: [
            { text: "э! не трогай мои волосы!", mood: "angry" },
            { text: "ты меня гладишь?! я не милая!", mood: "angry" },
            { text: "ещё раз тронешь — укушу!", mood: "angry" },
            { text: "и вовсе ты мне не нравишься!", mood: "angry" },
            { text: "но я же только уложила их...", mood: "neutral" },
            { text: "у меня волосы кудрявятся, их сложно расчесать после такого знаешь ли!", mood: "neutral" },
            { text: "з-зачем ты... меня гладишь...", mood: "teasing" },
            { text: "и вовсе мне не приятно!", mood: "angry" },
            { text: "продолжай...", mood: "happy" },
            { text: "хватит называть меня милой!", mood: "angry" },
            { text: "дурак ты...", mood: "teasing" }
        ],
        skirt: [
            { text: "к-куда ты жмёшь?!", mood: "angry" },
            { text: "извращенец!", mood: "angry" },
            { text: "что ты только что-!", mood: "teasing" },
            { text: "что ты думаешь ты творишь?!", mood: "angry" },
            { text: "тебе это доставляет удовольствие или что?!", mood: "angry" },
            { text: "не трогай мою юбку.", mood: "angry" },
            { text: "мне это не нравится.", mood: "angry" },
            { text: "хватит.", mood: "angry" },
            { text: "я обижусь, если ты продолжишь.", mood: "angry" }
        ]
    };

    const SPAM_PHRASES = [
        { text: "ёмаё, поумерь свой пыл, бро", mood: "angry" },
        { text: "ты чего накинулся?", mood: "angry" },
        { text: "тише, тише, куда так жмёшь-то?", mood: "angry" },
        { text: "слишком быстро кликаешь!", mood: "angry" },
        { text: "чилл, бро", mood: "angry" },
        { text: "я не успеваю так быстро реагировать...", mood: "angry" }
    ];

    const THEME_REACTIONS = [
        { text: "что-то изменилось вокруг...", mood: "neutral" },
        { text: "да, этот цвет лучше прошлого", mood: "happy" },
        { text: "ты просто кликаешь на всё подряд?", mood: "neutral" },
        { text: "ладно, развлекайся", mood: "neutral" }
    ];
    let themeChanges = 0;

    const IDLE_PHRASES_FIRST = [
        { text: "ээ... ты там?", mood: "neutral" },
        { text: "так и будем смотреть друг на друга?", mood: "neutral" },
        { text: "пупупу...", mood: "neutral" },
        { text: "тут кто-нибудь есть?", mood: "neutral" },
        { text: "я что, осталась одна?", mood: "neutral" },
        { text: "меня что, оставили одну?", mood: "neutral" },
        { text: "ты отошёл?", mood: "neutral" },
        { text: "эээй, вернись...", mood: "neutral" },
        { text: "скучновато чёт....", mood: "neutral" },
        { text: "*зевает*", mood: "neutral" }
    ];
    const IDLE_PHRASE_SECOND = { text: "ты уснул? значит, мне тоже пора...", mood: "neutral" };

    /* ==========================================================
       ПАСХАЛКИ-МЕМЫ
       ========================================================== */
    const MEME_EASTER_EGGS = [
        { triggers: ['snow snow'],                                                              video: 'video/1.mp4',  name: 'snow snow' },
        { triggers: ['skazka', 'skazka old', 'сказка', 'сказка старая'],                        video: 'video/2.mp4',  name: 'skazka' },
        { triggers: ['me! me! me!', 'me me me'],                                                video: 'video/3.mp4',  name: 'me! me! me!' },
        { triggers: ['silly letters', 'глупые письма'],                                          video: 'video/4.mp4',  name: 'silly letters' },
        { triggers: ['stay away'],                                                              video: 'video/5.mp4',  name: 'stay away' },
        { triggers: ['life letters'],                                                           video: 'video/6.mp4',  name: 'life letters' },
        { triggers: ['hit or miss'],                                                            video: 'video/7.mp4',  name: 'hit or miss' },
        { triggers: ['i am the man'],                                                           video: 'video/8.mp4',  name: 'i am the man' },
        { triggers: ['bury a friend'],                                                          video: 'video/9.mp4',  name: 'bury a friend' },
        { triggers: ['stfd'],                                                                   video: 'video/10.mp4', name: 'stfd' },
        { triggers: ['doctor'],                                                                 video: 'video/11.mp4', name: 'doctor' },
        { triggers: ['hp'],                                                                     video: 'video/12.mp4', name: 'hp' },
        { triggers: ['i need her', 'мне нужна она', 'я сошла с ума'],                           video: 'video/13.mp4', name: 'i need her' },
        { triggers: ['i love my life'],                                                         video: 'video/14.mp4', name: 'i love my life' },
        { triggers: ['boomx4'],                                                                 video: 'video/15.mp4', name: 'boomx4' },
        { triggers: ['cut my hair'],                                                            video: 'video/16.mp4', name: 'cut my hair' },
        { triggers: ['panic room'],                                                             video: 'video/17.mp4', name: 'panic room' },
        { triggers: ['u and i'],                                                                video: 'video/18.mp4', name: 'u and i' },
        { triggers: ['let it snow'],                                                            video: 'video/19.mp4', name: 'let it snow' },
        { triggers: ['believer'],                                                               video: 'video/20.mp4', name: 'believer' },
        { triggers: ['i do love you'],                                                          video: 'video/21.mp4', name: 'i do love you' },
        { triggers: ['birthday party'],                                                         video: 'video/22.mp4', name: 'birthday party' },
        { triggers: ['it seems', 'кажется'],                                                    video: 'video/23.mp4', name: 'it seems' },
        { triggers: ['american boy'],                                                           video: 'video/24.mp4', name: 'american boy' },
        { triggers: ["cant hold us", "can't hold us"],                                          video: 'video/25.mp4', name: "can't hold us" },
        { triggers: ['omg'],                                                                    video: 'video/26.mp4', name: 'omg' },
        { triggers: ['hip'],                                                                    video: 'video/27.mp4', name: 'hip' },
        { triggers: ['моя кошка'],                                                              video: 'video/28.mp4', name: 'моя кошка' },
        { triggers: ['плак плак'],                                                              video: 'video/29.mp4', name: 'плак плак' },
        { triggers: ['bang bang'],                                                              video: 'video/30.mp4', name: 'bang bang' },
        { triggers: ['skazka remake', 'skazka new', 'сказка новая'],                            video: 'video/31.mp4', name: 'skazka remake' },
        { triggers: ['boys'],                                                                   video: 'video/32.mp4', name: 'boys' },
        { triggers: ['weeaboo'],                                                                video: 'video/33.mp4', name: 'weeaboo' },
        { triggers: ['dessert'],                                                                video: 'video/34.mp4', name: 'dessert' },
        { triggers: ['no place'],                                                               video: 'video/35.mp4', name: 'no place' },
        { triggers: ['xd', 'хд'],                                                               video: 'video/36.mp4', name: 'xd' },
        { triggers: ['shape of you'],                                                           video: 'video/37.mp4', name: 'shape of you' },
        { triggers: ['improvement'],                                                            video: 'video/38.mp4', name: 'improvement' },
        { triggers: ['karma', 'карма'],                                                         video: 'video/39.mp4', name: 'karma' },
        { triggers: ['tonight'],                                                                video: 'video/40.mp4', name: 'tonight' },
        { triggers: ['in the apricot valley', 'абрикосовая долина', 'в абрикосовой долине', 'абрикос'], video: 'video/41.mp4', name: 'apricot valley' },
        { triggers: ['100 bad days'],                                                           video: 'video/42.mp4', name: '100 bad days' },
        { triggers: ['miku miku beam'],                                                         video: 'video/43.mp4', name: 'miku miku beam' },
        { triggers: ['поровну'],                                                                video: 'video/44.mp4', name: 'поровну' },
        { triggers: ['avgn dance', 'avgn'],                                                     video: 'video/45.mp4', name: 'avgn' }
    ];

    let foundMemes = new Set();
    try {
        const savedMemes = JSON.parse(localStorage.getItem('petFoundMemes') || '[]');
        if (Array.isArray(savedMemes)) foundMemes = new Set(savedMemes);
    } catch (_) {}

    function saveFoundMemes() {
        localStorage.setItem('petFoundMemes', JSON.stringify([...foundMemes]));
    }

    function findMemeMatch(text) {
        const normalized = text.trim().toLowerCase();
        for (const meme of MEME_EASTER_EGGS) {
            for (const trigger of meme.triggers) {
                if (normalized === trigger.toLowerCase()) return meme;
            }
        }
        return null;
    }

    /* ==========================================================
       ДОСТИЖЕНИЯ
       ========================================================== */
    const ACHIEVEMENTS = [
        { type: 'friendship', target: 10,  icon: "🌱", title: "незнакомец", desc: "первая встреча",
          text: "ты меня не затискаешь до смерти, надеюсь?", mood: "neutral" },
        { type: 'friendship', target: 25,  icon: "🦋", title: "знакомый", desc: "что-то общее",
          text: "ладно, ты мне нравишься", mood: "happy" },
        { type: 'friendship', target: 50,  icon: "🐝", title: "друг", desc: "обсудили айдолов двадцатый раз",
          text: "я тебя запомнила, знай!", mood: "happy" },
        { type: 'friendship', target: 67,  icon: "🤖", title: "67", desc: "67676767676767",
          text: "67... сикс севен... брейнрот detected", mood: "laughing" },
        { type: 'friendship', target: 100, icon: "👤", title: "теневой", desc: "стали близки",
          text: "ты стала моим лучшим другом~", mood: "laughing" },

        { type: 'time', target: 5 * 60,     icon: "⏱", title: "5 минут",   desc: "5 минут вместе",
          text: "пять минут вместе — уже что-то!",            mood: "happy" },
        { type: 'time', target: 10 * 60,    icon: "⏱", title: "10 минут",  desc: "10 минут вместе",
          text: "десять минут! время летит~",                 mood: "happy" },
        { type: 'time', target: 30 * 60,    icon: "⏳", title: "полчаса",   desc: "30 минут вместе",
          text: "полчаса вместе, вот это да!",                mood: "happy" },
        { type: 'time', target: 60 * 60,    icon: "⏰", title: "час",       desc: "1 час вместе",
          text: "целый час! я тронута~",                       mood: "happy" },
        { type: 'time', target: 2 * 3600,   icon: "🕐", title: "2 часа",    desc: "2 часа вместе",
          text: "2 часа вместе, я впечатлена!",                mood: "laughing" },
        { type: 'time', target: 5 * 3600,   icon: "🕔", title: "5 часов",   desc: "5 часов вместе",
          text: "5 часов... ты серьёзно?!",                    mood: "laughing" },
        { type: 'time', target: 10 * 3600,  icon: "🌙", title: "10 часов",  desc: "10 часов вместе",
          text: "10 часов вместе... ты мой теневой теперь!",   mood: "laughing" },

        { type: 'messages', target: 1,   icon: "✉",  title: "первое слово",  desc: "1 сообщение",
          text: "ты написал мне первое сообщение! ура!",       mood: "happy" },
        { type: 'messages', target: 5,   icon: "✉",  title: "5 сообщений",   desc: "5 сообщений",
          text: "пять сообщений! мы болтаем!",                  mood: "happy" },
        { type: 'messages', target: 10,  icon: "💬", title: "10 сообщений",  desc: "10 сообщений",
          text: "десять сообщений, так держать!",               mood: "happy" },
        { type: 'messages', target: 30,  icon: "💬", title: "30 сообщений",  desc: "30 сообщений",
          text: "тридцать! ты разговорчивый~",                  mood: "happy" },
        { type: 'messages', target: 50,  icon: "💬", title: "50 сообщений",  desc: "50 сообщений",
          text: "пятьдесят! мы точно подружились",              mood: "laughing" },
        { type: 'messages', target: 67,  icon: "🔢", title: "67 сообщений",  desc: "67 сообщений",
          text: "67 сообщений... это судьба",                   mood: "laughing" },
        { type: 'messages', target: 100, icon: "💯", title: "100 сообщений", desc: "100 сообщений",
          text: "сто сообщений! ты меня завалил болтовнёй~",    mood: "laughing" },

        { type: 'memes', target: 1,  icon: "🎬", title: "любопытный",        desc: "найти 1 пасхалку",
          text: "ты нашёл первую пасхалку! таких ещё много~",   mood: "happy" },
        { type: 'memes', target: 10, icon: "📼", title: "пару раз смотрел",  desc: "найти 10 пасхалок",
          text: "десять мемов! ты знаток~",                     mood: "laughing" },
        { type: 'memes', target: 25, icon: "🎞", title: "немного шаришь",    desc: "найти 25 пасхалок",
          text: "двадцать пять! ты почти всё нашёл!",           mood: "laughing" },
        { type: 'memes', target: 45, icon: "🏆", title: "главный фанат",     desc: "найти все 45 пасхалок",
          text: "ты нашёл ВСЁ! ты настоящая легенда!!",         mood: "laughing" }
    ];

    const shownAchievements = new Set(JSON.parse(localStorage.getItem('petAchShownV3') || '[]'));
    function achKey(a) { return a.type + '_' + a.target; }

    let unreadAchievements = 0;
    let friendship = parseInt(localStorage.getItem('petFriendship') || '0', 10);
    if (isNaN(friendship)) friendship = 0;
    let messagesSent = parseInt(localStorage.getItem('petMessagesSent') || '0', 10);
    if (isNaN(messagesSent)) messagesSent = 0;

    let isOffended = localStorage.getItem('petOffended') === 'true';
    let chatBlocked = false;

    function getProgress(type) {
        if (type === 'friendship') return friendship;
        if (type === 'time') return totalSeconds;
        if (type === 'messages') return messagesSent;
        if (type === 'memes') return foundMemes.size;
        return 0;
    }

    function setOffended(v) {
        isOffended = v;
        localStorage.setItem('petOffended', v ? 'true' : 'false');
        petWidget.classList.toggle('offended', v);
        if (state === 'idle') {
            if (v) { clearInterval(blinkTimer); showLayer('angry'); }
            else enterIdle();
        }
    }

    function renderFriendship(pulse) {
        let cls = 'friendship-counter';
        if (friendship >= 100)      cls += ' lvl-4';
        else if (friendship >= 50)  cls += ' lvl-3';
        else if (friendship >= 25)  cls += ' lvl-2';
        else if (friendship >= 10)  cls += ' lvl-1';
        friendCounter.className = cls;
        friendCounter.textContent = '❤ ' + friendship;
        if (pulse) {
            friendCounter.classList.add('pulse');
            setTimeout(() => friendCounter.classList.remove('pulse'), 400);
        }
    }

    function changeFriendship(delta, x, y) {
        const old = friendship;
        friendship = Math.max(0, Math.min(9999, friendship + delta));
        if (friendship === old) return;
        localStorage.setItem('petFriendship', friendship);
        renderFriendship(true);
        if (typeof x === 'number' && typeof y === 'number') spawnClickFx(x, y, delta);
        checkAllAchievements();
        renderAchPanel();
    }

    function checkAllAchievements() {
        let unlockedAny = false;
        ACHIEVEMENTS.forEach(a => {
            const key = achKey(a);
            if (shownAchievements.has(key)) return;
            if (getProgress(a.type) >= a.target) {
                shownAchievements.add(key);
                unlockedAny = true;
            }
        });
        if (unlockedAny) {
            localStorage.setItem('petAchShownV3', JSON.stringify([...shownAchievements]));
            renderAchPanel();
            onAchievementUnlocked();
        }
    }

    let achToastEl = null;
    let achToastHideTimer = null;
    let achPhraseTimer = null;

    function ensureAchToast() {
        if (achToastEl && document.body.contains(achToastEl)) return achToastEl;
        achToastEl = document.createElement('div');
        achToastEl.className = 'ach-toast';
        achToastEl.innerHTML = `
            <div class="ach-toast-icon">🏆</div>
            <div class="ach-toast-text">
                <div class="ach-toast-title">получена ачивка!</div>
                <div class="ach-toast-sub">нажми сюда, чтобы открыть список</div>
            </div>
        `;
        achToastEl.addEventListener('click', () => {
            achPanel.classList.add('open');
            unreadAchievements = 0;
            updateAchBadge();
            achToastEl.classList.remove('show');
            clearTimeout(achToastHideTimer);
        });
        document.body.appendChild(achToastEl);
        return achToastEl;
    }

    function showAchToast() {
        const toast = ensureAchToast();
        void toast.offsetWidth;
        toast.classList.add('show');
        clearTimeout(achToastHideTimer);
        achToastHideTimer = setTimeout(() => toast.classList.remove('show'), 5500);
    }

    function playAchievementSound() {
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            const ctx = new Ctx();
            const now = ctx.currentTime;
            [
                { freq: 1318.51, time: 0.00, dur: 0.40, vol: 0.10 },
                { freq: 1760.00, time: 0.13, dur: 0.45, vol: 0.13 },
                { freq: 2217.46, time: 0.27, dur: 0.60, vol: 0.11 }
            ].forEach(n => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = n.freq;
                const t = now + n.time;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(n.vol, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + n.dur + 0.1);
            });
        } catch (e) { }
    }

    function spawnFireworks() {
        const rect = petWidget.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const colors = ['#ff5a8a', '#ff9a5a', '#ffd54a', '#8a7fd4', '#5eb3e4', '#8bc34a', '#ff7aaa'];
        for (let b = 0; b < 4; b++) {
            setTimeout(() => {
                const bx = cx + (Math.random() - 0.5) * 220;
                const by = cy + (Math.random() - 0.5) * 160;
                const color = colors[Math.floor(Math.random() * colors.length)];
                for (let i = 0; i < 14; i++) {
                    const p = document.createElement('div');
                    p.className = 'firework-particle' + (i % 3 === 0 ? ' large' : '');
                    p.style.left = bx + 'px';
                    p.style.top = by + 'px';
                    p.style.color = color;
                    p.style.background = color;
                    const angle = (Math.PI * 2 / 14) * i + Math.random() * 0.4;
                    const dist = 55 + Math.random() * 70;
                    p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
                    p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
                    document.body.appendChild(p);
                    setTimeout(() => p.remove(), 1600);
                }
            }, b * 180);
        }
    }

    function updateAchBadge() {
        let badge = achBtn.querySelector('.ach-badge');
        if (unreadAchievements > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'ach-badge';
                achBtn.appendChild(badge);
            }
            badge.textContent = unreadAchievements;
            badge.style.animation = 'none';
            void badge.offsetWidth;
            badge.style.animation = '';
        } else if (badge) badge.remove();
    }

    function onAchievementUnlocked() {
        unreadAchievements++;
        updateAchBadge();
        showAchToast();
        playAchievementSound();
        spawnFireworks();
        clearTimeout(achPhraseTimer);
        achPhraseTimer = setTimeout(() => showAchievementPhrase(), 900);
    }

    function showAchievementPhrase() {
        if (state === 'sleeping') return;
        cancelIdlePhrase();
        clearTimeout(wakeTimer);
        clearTimeout(idleTimer);
        clearTimeout(sleepTimer);
        clearInterval(blinkTimer);
        stopBreathing();
        stopTalkAnim();
        setState('talking');
        petSpeech.textContent = "поздравляю с ачивкой!";
        showSpeech(true);
        setMood('happy');
        startTalkAnim('happy');
        clearTimeout(talkTimer);
        talkTimer = setTimeout(() => finishDialog(), 3500);
    }

    function spawnClickFx(x, y, delta) {
        const ring = document.createElement('div');
        ring.className = 'click-ring' + (delta < 0 ? ' negative' : '');
        ring.style.left = x + 'px';
        ring.style.top = y + 'px';
        document.body.appendChild(ring);
        setTimeout(() => ring.remove(), 800);

        const fx = document.createElement('div');
        fx.className = 'click-fx ' + (delta < 0 ? 'negative' : 'positive');
        fx.textContent = (delta > 0 ? '+' : '') + delta;
        fx.style.left = x + 'px';
        fx.style.top = y + 'px';
        document.body.appendChild(fx);
        setTimeout(() => fx.remove(), 1150);

        const dotCount = delta < 0 ? 3 : 5;
        for (let i = 0; i < dotCount; i++) {
            const dot = document.createElement('div');
            dot.className = 'click-dot' + (delta < 0 ? ' negative' : '');
            const angle = (Math.PI * 2 / dotCount) * i + Math.random() * 0.5;
            const dist = 30 + Math.random() * 30;
            dot.style.left = x + 'px';
            dot.style.top = y + 'px';
            dot.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
            dot.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
            document.body.appendChild(dot);
            setTimeout(() => dot.remove(), 900);
        }
    }

    /* Панель достижений */
    const ACH_GROUPS_OPEN = {};

    function renderAchPanel() {
        const groups = [
            { type: 'friendship', label: '❤ дружба' },
            { type: 'time',       label: '⏱ время' },
            { type: 'messages',   label: '💬 сообщения' },
            { type: 'memes',      label: '🎬 пасхалки' }
        ];

        const total = ACHIEVEMENTS.length;
        const totalUnlocked = ACHIEVEMENTS.filter(a => shownAchievements.has(achKey(a))).length;

        let html = `<div class="ach-header">🏆 твои ачивки · ${totalUnlocked}/${total}</div>`;

        groups.forEach(g => {
            const list = ACHIEVEMENTS.filter(a => a.type === g.type);
            if (!list.length) return;
            const unlocked = list.filter(a => shownAchievements.has(achKey(a))).length;
            const open = ACH_GROUPS_OPEN[g.type] ? 'open' : '';
            html += `
                <div class="ach-group ${open}" data-group="${g.type}">
                    <div class="ach-group-header">
                        <span>${g.label}</span>
                        <span class="ach-group-count">${unlocked}/${list.length} <span class="ach-group-arrow">▼</span></span>
                    </div>
                    <div class="ach-group-body">
                        ${list.map(a => {
                            const u = shownAchievements.has(achKey(a));
                            return `<div class="ach-item ${u ? 'unlocked' : 'locked'}" title="${u ? a.desc : 'пока не открыто'}">
                                <div class="ach-icon">${u ? a.icon : '🔒'}</div>
                                <div class="ach-title">${u ? a.title : '???'}</div>
                                <div class="ach-status">${u ? '✓' : '???'}</div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>`;
        });

        achPanel.innerHTML = html;

        achPanel.querySelectorAll('.ach-group-header').forEach(h => {
            h.addEventListener('click', () => {
                const grp = h.parentElement;
                const type = grp.dataset.group;
                grp.classList.toggle('open');
                ACH_GROUPS_OPEN[type] = grp.classList.contains('open');
            });
        });
    }

    achBtn.addEventListener('click', () => {
        achPanel.classList.toggle('open');
        memePanel.classList.remove('open');
        if (achPanel.classList.contains('open')) {
            unreadAchievements = 0;
            updateAchBadge();
        }
    });

    /* ==========================================================
       ПАНЕЛЬ МЕМОВ (пересмотр)
       ========================================================== */
    function renderMemePanel() {
        const unlockedCount = foundMemes.size;
        let html = `<div class="meme-panel-header">🎬 мемы · ${unlockedCount}/${MEME_EASTER_EGGS.length}</div>`;

        MEME_EASTER_EGGS.forEach(meme => {
            const unlocked = foundMemes.has(meme.video);
            html += `
                <div class="meme-item ${unlocked ? '' : 'locked'}" data-video="${unlocked ? meme.video : ''}">
                    <div class="meme-item-play">${unlocked ? '▶' : '🔒'}</div>
                    <div class="meme-item-name">${unlocked ? meme.name : '???'}</div>
                </div>`;
        });

        memePanel.innerHTML = html;

        memePanel.querySelectorAll('.meme-item').forEach(el => {
            el.addEventListener('click', () => {
                const video = el.dataset.video;
                if (!video) return;
                playMemeVideo(video);
            });
        });
    }

    memeBtn.addEventListener('click', () => {
        memePanel.classList.toggle('open');
        achPanel.classList.remove('open');
    });

    /* ==========================================================
       ЧАТ
       ========================================================== */
    const CHAT_HISTORY_KEY = 'petChatHistory';
    const CHAT_MAX_MESSAGES = 100;
    let chatHistory = [];
    try {
        chatHistory = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]');
        if (!Array.isArray(chatHistory)) chatHistory = [];
    } catch (e) { chatHistory = []; }

    function saveChatHistory() {
        if (chatHistory.length > CHAT_MAX_MESSAGES) chatHistory = chatHistory.slice(-CHAT_MAX_MESSAGES);
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
    }

    const CHAT_FALLBACK = [
        "эээ... что-то я замечталась, не поняла ничего...",
        "кажется, я ничего не понимаю в этой теме, давай о другом?",
        "хм, а поподробнее?",
        "что ты имеешь в виду?",
        "я глупышка, не понимаю ни слова :(",
        "думала, думала, что ответить, да так и не придумала...",
        "что-то мне сегодня лень думать, давай о другом?",
        "многа букаф, ни асилил.",
        "я на такие темы не умею разговаривать("
    ];

    const OFFENDED_REPLIES = [
        "я обиделась, знаешь ли.",
        "извинись, и я подумаю над ответом тебе.",
        "...",
        "ты меня обидел, я с тобой не разговариваю.",
        "ты злюка, я с такими не общаюсь!",
        "не слышу тебя, ла-ла-ла."
    ];

    const FORGIVE_REPLIES = [
        "ладно, так уж и быть, прощаю тебя.",
        "ну ладно, прощаю",
        "всё-всё, не обижаюсь!",
        "в следующий раз думай, что говоришь!"
    ];

    const APOLOGY_KEYWORDS = ['извини', 'прости', 'сорри', 'соррян', 'соррянчик', 'прошу прощения', 'виноват', 'виновата'];

    const CHAT_TRIGGERS = [
        { keywords: ['класс', 'пон', 'понятно', 'супер', 'ясно', 'ладно'],
          replies: ["пончик, пончик","ваще класс","ладно-ладно","понятненько"], mood: 'happy' },
        { keywords: ['шучу', 'шутка', 'пошутил', 'пошутила'],
          replies: ["забавно)","смешняво)","я похихикала)"], mood: 'laughing' },
        { keywords: ['бейба', 'бейби', 'малышка', 'малыш'],
          replies: ["кто, яяяя?","ну да, я малюточка)"], mood: 'teasing' },
        { keywords: ['цундере'],
          replies: ["да не цундере я!","я не цундере, сам такой!"], mood: 'angry' },
        { keywords: ['пофиг', 'пох', 'плевать', 'пофик', 'всё равно'],
          replies: ["тебе правда плевать? :("], mood: 'neutral' },
        { keywords: ['спасибо', 'благодарю', 'спс', 'сенкс', 'thanks', 'thx'],
          replies: ["ой, всегда пожалуйста~","рада помочь!!","хехе, обращайся~","не за что-не за что!","ой, да ладно тебе~"],
          score: 1, mood: 'happy' },
        { keywords: ['красивая', 'красивые', 'нежная', 'можно утонуть', 'красотка', 'дива', 'хорошка', 'милая', 'милашка', 'няшка', 'няшная', 'ты классная', 'ты прикольная', 'ты забавная', 'ты смешная', 'ты хорошая', 'молодец', 'крутая', 'ты солнце'],
          replies: ["о-ой, не смущай меня...","я... я не такая!! сам такой! хмпф!","хехе~ конечно я такая! но и ты не хуже)","т-ты тоже, знаешь ли...","на себя посмотри!! (смущенно отвернулась)"],
          score: 5, mood: 'teasing' },
        { keywords: ['идиот', 'идиота', 'дура', 'дурак', 'плохая', 'тупая', 'глупая', 'глупышка', 'хватит', 'отстань', 'падла', 'тварь', 'мразь', 'ублюдище', 'сука', 'лох', 'лошара', 'лохушка', 'сучка', 'блядь'],
          replies: ["...я сделаю вид, что не слышала этого...","эй, без обзывательств!","я же обижусь...","я обиделась.","я больше не хочу с тобой разговаривать."],
          score: -5, mood: 'angry', rudeness: true },
        { keywords: ['люблю тебя', 'тебя люблю', 'сердечко', 'любимая', 'любимка'],
          replies: ["о-ой.. я... т-ты это серьезно?","и я тебя люблю, знаешь ли...","не говори такое вслух, дурак!!","*отвернулась в смущении* и вовсе ты мне не нравишься! д-дурак...","я тоже тебя люблю, солнце!!~","и ты моя любимка... только не говори никому!"],
          score: 10, mood: 'teasing' },
        { keywords: ['извинись'],
          replies: ["нет-нет, сам извиняйся!","так не прокатит, извиняйся сам!"], mood: 'angry' },
        { keywords: ['октябрь', 'октября', 'октябре'],
          replies: ["о, в этом месяце день рождения у моей любимки!","31 октября, запиши себе в блокнотик, чтобы поздравить юлю!"], mood: 'happy' },
        { keywords: ['апрель', 'апреля', 'апреле'],
          replies: ["в этом месяце день рождения у привоза и васи","16 апреля и 13 апреля! вася и привоз!","ага, не забудь поздравить васю и привоза!"], mood: 'happy' },
        { keywords: ['ноябрь', 'ноября', 'ноябре'],
          replies: ["в этом месяце день рождения у форума!","о, 14 ноября день рождения форума!"], mood: 'happy' },
        { keywords: ['июль', 'июля', 'июле'],
          replies: ["да, в июле мой день рождения!","6 числа моё др. ты приглашён, кстати!","6 июля мой день рождения, пометь это в календарике!"], mood: 'happy' },
        { keywords: ['ты'],
          replies: ["я!","я?"], mood: 'happy' },
        { keywords: ['сколько тебе лет'],
          replies: ["мне уже больше 20.","а зачем тебе такая информация?","для чего узнать хочешь?","я уже большая!!"], mood: 'teasing' },
        { keywords: ['неправда'],
          replies: ["правда!"], mood: 'happy' },
        { keywords: ['ложь', 'лгать'],
          replies: ["не лги мне..."], mood: 'neutral' },
        { keywords: ['правда'],
          replies: ["я верю","ага, уже поверила)","да-да, я поверив"], mood: 'happy' },
        { keywords: ['космос'],
          replies: ["да, космос такой необъятный...","почему космос не пишет про нас?"], mood: 'neutral' },
        { keywords: ['чизбургер', 'чизбурбе'],
          replies: ["хочется чизбурбе...","хотю...","хацю чизбургер...."], score: 2, mood: 'happy' },
        { keywords: ['лов лайв', 'нико', 'ядзава', 'ловлайв', 'живая любовь'],
          replies: ["РЕЧЬ ПРО МОЕ ЛЮБИМОЕ АНИМЕ, Я ЧУЮ!","НИКО НИКО НИИИИИ~","посмотри все поколения, иначе я не буду отвечать тебе больше! шучу :)","почему я просто не родилась красивой школьницей-айдолом из токио?"], mood: 'happy' },
        { keywords: ['коносуба', 'коносубе', 'коносубой', 'мегумин', 'аква', 'акве', 'дантесс', 'лалатина', 'казума', 'казуме', 'казумой', 'аквой'],
          replies: ["моя любимая сейю - риэ такахаши! знай это!","омг я обожаю мегумин ❤️","EKSUPUROSION! 💥💥","я - высший архимаг! шучу)","когда уже новый сезоон, аааааа"], mood: 'happy' },
        { keywords: ['блять', 'ахуеть', 'пиздец', 'сук', 'пипец', 'блядство', 'охуеть', 'хуй', 'член', 'пизда', 'пенис', 'вагина', 'нахуй', 'бляха', 'ёкарный', 'ёк', 'ек'],
          replies: ["ой-ой, ты чего выражаешься?","что за выражения, блин?","выбирай выражения!"], mood: 'neutral' },
        { keywords: ['плавать', 'плавание'],
          replies: ["ой, я люблю плавать"], mood: 'happy' },
        { keywords: ['кем хотела бы стать', 'кем хотела бы быть'],
          replies: ["я бы хотела быть сейю аниме) или художником-фрилансером","я бы хотела быть котиком, спящим целыми днями~"], mood: 'happy' },
        { keywords: ['бруно'],
          replies: ["не упоминай бруно!"], mood: 'angry' },
        { keywords: ['клац'],
          replies: ["клац-клац!","клацай больше!","клацаем вместе!"], mood: 'happy' },
        { keywords: ['пони', 'млп'],
          replies: ["мой кинн - флаттершай 🥺","мне очень нравится пинки пай :3","кексики...."], mood: 'happy' },
        { keywords: ['ня', 'мяу', 'мя', 'мур'],
          replies: ["ня~","мя~","мяу~","мур~"], mood: 'happy' },
        { keywords: ['удар', 'бью'],
          replies: ["ай!! больно...","ты сделал мне больно...","ай!! за что?...","чем я это заслужила...?"], mood: 'angry' },
        { keywords: ['новки'],
          replies: ["итд?!","это тот, что с красными волосами?"], mood: 'neutral' },
        { keywords: ['утопия'],
          replies: ["вижу как ты мертвецки устал...."], mood: 'neutral' },
        { keywords: ['день рождения', 'др'],
          replies: ["я родилась 6 июля.","6 июля, запиши в календарике!","мой день рождения? 6 июля, не проспи!","теперь ты приглашён, 6 июля!"], mood: 'happy' },
        { keywords: ['амням'],
          replies: ["это и есть амням"], mood: 'happy' },
        { keywords: ['где живёшь'],
          replies: ["в твоём сердечке, конечно! ❤️"], mood: 'happy' },
        { keywords: ['соня'],
          replies: ["я соня? или ты про сестру васи?"], mood: 'neutral' },
        { keywords: ['сестра васи', 'сестру васи'],
          replies: ["сестру васи зовут соня! у нее день рождения 29 января"], mood: 'neutral' },
        { keywords: ['лапки', 'руки'],
          replies: ["у меня лапки 🥺"], mood: 'happy' },
        { keywords: ['сэм', 'сем'],
          replies: ["6?","7!","да не сэм, а сем"], mood: 'neutral' },
        { keywords: ['сех', 'секс', 'сэкс'],
          replies: ["ч-что ты такое говоришь?!","я думаю, нам пока рано об этом говорить..","я не хочу об этом..."], mood: 'teasing' },
        { keywords: ['теневой', 'теневая'],
          replies: ["если мы с тобой достаточно близки, у тебя есть все шансы..","а у кого их нет?","кто, ты?","я бы хотела стать твоим теневым.. ❤️"], mood: 'teasing' },
        { keywords: ['не спи', 'не засыпай', 'не усыпай'],
          replies: ["не могуу, мне очень хочется спать...","я не могу устоять перед сном...","извини, я не смогу не спать..."], mood: 'neutral' },
        { keywords: ['погода', 'погодой', 'погоду', 'погоды'],
          replies: ["а у меня сегодня солнце~ это ты!","а у меня всегда тепло, я же в кармане!"], mood: 'happy' },
        { keywords: ['дождь', 'дожди', 'дождик', 'гроза', 'грозу', 'грозы', 'ливень', 'ливни', 'гром'],
          replies: ["а я люблю дожди, они эстетичные","ля, щас бы грозу..","хотела бы я грозу прямо сейчас, да погромче..."], mood: 'neutral' },
        { keywords: ['снег', 'метель', 'льдышка', 'холодно', 'холодина', 'холодрыга', 'прохладно', 'ветер', 'ветрище'],
          replies: ["ойй, звучит холодно...","скорее укрывайся пледом да заваривай какаву!!","оойй, утепляйся, солнце 🥺","не замерзай!! моя любовь согреет тебя!!","иди обниму, согрею тебя~"], mood: 'happy' },
        { keywords: ['жарко', 'жарища', 'парилка', 'тепло', 'сжарился', 'сжарилась'],
          replies: ["фуф, я уже от одного прочтения этого сообщения сжарилась..","боже, как же мне сейчас хорошо с моими +10...","я плавлюсь только лишь от чтения твоих буковок 😭😭"], mood: 'laughing' },
        { keywords: ['обнимать', 'обнимаю', 'объятия', 'обними', 'обнимашки', 'объятие', 'обнял', 'обняла', 'обнять'],
          replies: ["*робко обняла* 🥺","*нежно обнимаю* 🥺"], score: 2, mood: 'happy' },
        { keywords: ['поцелуй', 'поцелую', 'целуй', 'целую', 'чмок', 'муа', 'поцелуйчик'],
          replies: ["*посылаю воздушный поцелуй* 😋","умф... *робко целую в щёчку* 🥺","я... я же стесняюсь...","*целую в лобик*"], mood: 'teasing' },
        { keywords: ['грустно', 'грустново', 'плохо', 'плоховато', 'тяжело', 'тяжеловато', 'депресся', 'депрессия', 'тоскливо', 'печально', 'печалька'],
          replies: ["э-эй, не грусти!! я тут, знаешь ли","ну-у чего ты? 🥺 иди обниму!","расскажи, что случилось?"], mood: 'neutral' },
        { keywords: ['стринова', 'стринову', 'стриновы', 'стриновой', 'подрыв', 'вспышка', 'вспышкой', 'вспышку', 'вспышке'],
          replies: ["блин, может каточку во вспышку?)","о, гоу со мной во вспышку!!","там в стринове скоро добавят экстракшен мод...","мне немного одиноко играть одной :(","жаль, что ты не пойдешь со мной играть.."], mood: 'happy' },
        { keywords: ['рафт', 'рафтом', 'рафту'],
          replies: ["ох, я там такой кораблище забацала!","обожаю рафт блин, жаль, что мы нечасто собираемся в него...","мне нужны доски, БОЛЬШЕ ДОСОК!","э-эй, я приготовила кучу рыбы, почему никто не ест?!"], mood: 'happy' },
        { keywords: ['мимесис', 'прэтфолл', 'пратфолл', 'претфолл', 'скамлайн', 'скам лайн', 'мека хамелеон', 'мека', 'хамелеон', 'фазма', 'фазмафобия', 'гамба', 'солар', 'соларпанк', 'сигаме', 'сигама', 'сигейм', 'богос', 'чикен хорс', 'курица лошадь', 'джекбокс', 'пати бокс', 'патибокс', 'гартик', 'бункер', 'меме полис', 'мемеполис', 'шарарам', 'роблокс', 'фейт', 'триггер'],
          replies: ["может, однажды ещё соберемся в эту веселую игрульку, однажды...","когда-нибудь точно у всех совпадут расписания и мы пойдём играть в это..."], mood: 'neutral' },
        { keywords: ['хес', 'хесус', 'авгн', 'jesusavgn', 'hesus'],
          replies: ["110","ихихяхя","это уже ихи или это хяхя?","нина, голова болит","вот и дымайте, вот те на те"], mood: 'laughing' },
        { keywords: ['хрен в томате'],
          replies: ["вот те на те)"], mood: 'laughing' },
        { keywords: ['мазеллов', 'илья', 'мзлфф', 'мзифф', 'мазелов', 'mzlff', 'mazellovvv', 'коряков'],
          replies: ["кому мы оставим мир, если даже всех нас некому спасти?...","мало ребёнком быть, сложней остаться им взрослым...","и в твоих руках моё сердце, оставь себе ❤️","спасибо всем, дальше — хуже, путь долгий, но будет что вспомнить...","вас побеждает ворона, нас побеждаете вы!","и души переплетаясь, тянут всё за собой в этот мерзкий медленный танец...","давай меняться: тебе это, тебе это — по рукам","а чё грустить? можно кататься без очереди все дни!","альфред, держи себя в руках... 🐻","нас сюжет куда-то несёт, о нам достаточно в жизни счастливый конец — и всё..."], mood: 'neutral' },
        { keywords: ['звездное дитя', 'звёздное дитя', 'ребенок идола', 'ребёнок идола', 'oshi no ko', 'арима', 'кана', 'мемчо', 'мемто', 'ай хошино', 'хошино', 'руби', 'бикомачи', 'би комачи'],
          replies: ["о, речь про моё любимое аниме!!","ах, звездное дитя... когда же 4 сезон уже?~","ля, щас бы опенинги оттуда сыграть на пианинко","кана, моя любимая каночка...","anata no aidoru, sign wa B! chu!~ ой, запелась я что-то."], mood: 'happy' },
        { keywords: ['врата штейна', 'steins gate', 'штейн', 'курису', 'макисэ', 'окабэ', 'ринтаро', 'фэйрис', 'маюши', 'маюри'],
          replies: ["ой, часики маюши опять остановились..."], mood: 'neutral' },
        { keywords: ['басня', 'басню', 'басне', 'фэйбл', 'фейбл', 'fable'],
          replies: ["да, я поставила этому аниме 9 баллов, и что с того?!","ну, это забавное аниме, смешнявое"], mood: 'neutral' },
        { keywords: ['аниме', 'анимехи', 'анимеха', 'анимешки', 'анимешка', 'аниму', 'что смотришь', 'какое смотришь'],
          replies: ["прямо сейчас я ликую, что закончилась игра лжецов, хаха!","думаю-думаю, какое бы аниме ещё заспидранить на 3х...","думаю, может, пересмотреть лов лайв?","пока не знаю что посмотреть, посоветуешь что-нибудь?"], mood: 'neutral' },
        { keywords: ['манга', 'маньхуа', 'манхва', 'мангу', 'что читаешь', 'какое читаешь'],
          replies: ["я пока не читаю мангу, но аниме смотрю! онгоинги, в основном","ой, я что-то и забыла, что можно что-то читать...","манга - тоже литература!","ой, мне так лень читать, многа букаф...."], mood: 'neutral' },
        { keywords: ['пианино', 'синтезатор', 'пианинко', 'потрунькать'],
          replies: ["ля, после такого аж захотелось потрунькать","ооо, щас бы на пианинко сыграть!","ой, а если я сыграю тебе в дсе на пианино, ты послушаешь? 🥺"], mood: 'happy' },
        { keywords: ['дружба', 'друзья', 'друг', 'подруга', 'очки', 'счёт', 'очков', 'насколько мы близки'],
          replies: [
              () => `у нас сейчас ${friendship} очков дружбы, между прочим!`,
              () => `наша с тобой дружба числится в очках, их целых ${friendship}!`
          ], mood: 'happy' },
        { keywords: ['67', 'сикс', 'севен', 'брейнрот'],
          replies: ["67","67 67 67 67 67 67 67 67 67","сикс севен бреееейнроооот","да этот мем уже устарел, не?"], mood: 'laughing' },
        { keywords: ['шика', 'шиканоко', 'олениха', 'олень'],
          replies: ["шиканоко ноко ноко коштантан! 🦌"], mood: 'happy' },
        { keywords: ['юля', 'юле', 'юлю', 'юлей', 'юлька', 'юся', 'юлечка', 'манривата', 'мандарин', 'мандариновая'],
          replies: ["о, про мою любимку говоришь","не говори про неё так. я ревную.","хихихи юлька иди корову подои","юся, ты уже покушала? 👀","все мои меме только для неё...","про юлю либо хорошо, либо никак"], mood: 'happy' },
        { keywords: ['грандон', 'грандона', 'грандону', 'грандоном', 'вася', 'васей', 'васю', 'васе', 'атхос'],
          replies: ["вася? знаю такого","я грр! ты мне?","жить надо как вася - танцевать и музон погромче."], mood: 'neutral' },
        { keywords: ['форум', 'саша', 'саше', 'сашей', 'сашу', 'форума', 'форуму', 'фовум'],
          replies: ["фооооовуууумм!!!!","форум? интересно, когда он ещё приедет к нам....","о, речь про любителя бабушек?"], mood: 'laughing' },
        { keywords: ['привоз', 'привозу', 'привоза', 'привозом', 'приводя', 'приводей', 'приводю', 'привадя', 'вадя', 'вадей', 'вадю', 'вадим', 'вадима'],
          replies: ["эх, когда мы с ним ещё пойдем в стринову?","привоз? да, пропал челик, даже не отвечает толком...","эх, я уже почти забыла кто это...","отвечу на это через месяц)","да уж, обновы у побегушек походу не будет...","я всё ещё жду, когда он пришлёт мне танец...","я всё ещё жду, когда мои спрайты для игры будут задействованы...","пиздун.","о, опездун.","что? он снова проспал?","а? он вновь забыл?"], mood: 'neutral' },
        { keywords: ['даня', 'дане', 'даней', 'даню'],
          replies: ["даня? он, должно быть, снова опоздает или не придет вовсе","даня - киберкотлета марвела"], mood: 'neutral' },
        { keywords: ['ками', 'камичка', 'камушка', 'камушко', 'диячка', 'диана'],
          replies: ["а? что?","я тууут~","слышу-слышу!","я здесь!!"], mood: 'happy' },
        { keywords: ['лол', 'ржу', 'пхпх', 'ахах', 'кек'],
          replies: ["пхахахаха","ахахаха, ты меня рассмеши... рассмешнил... ра.. ну ты пон","ахаххаха, как ты это ваще придумал","лол, согласна"], mood: 'laughing' },
        { keywords: ['арт', 'арты', 'рисовать', 'рисунки', 'меме', 'анимации', 'анимация', 'нарисуй', 'рисование', 'рисуй'],
          replies: ["скоро-скоро будет новьё, чееестно","да рисую я, рисую..."], mood: 'neutral' },
        { keywords: ['форма', 'юбка', 'платье', 'матроска'],
          replies: ["это моя японская школьная форма, между прочим!"], mood: 'happy' },
        { keywords: ['волосы', 'кудри', 'волосики'],
          replies: ["ой, тебе нравится?...🥺 не то, чтобы мне приятно это слышать!","волосы у меня кудрявятся, знаешь, как это сложно?"], mood: 'teasing' },
        { keywords: ['глаза', 'гетерохромия'],
          replies: ["глаза? да, я родилась такой..."], mood: 'neutral' },
        { keywords: ['кто ты', 'как тебя зовут'],
          replies: ["я ками, просто ками","а что, не видно? я ками, самая настоящая","я - ками! а остальное секрет, хихи~"], mood: 'neutral' },
        { keywords: ['со мной', 'вместе', 'го', 'давай'],
          replies: ["ой, давай!!","погналии!!","приглашаешь? соглашаюсь!","ну, если ты настаиваешь..."], mood: 'happy' },
        { keywords: ['спать', 'сон', 'устал', 'устала', 'хочу спать'],
          replies: ["иди поспи, я подожду~","сон - это святое!!","я тоже хочу спать, но я здесь, пока ты со мной","а может пойдем спать вместе?"], mood: 'neutral' },
        { keywords: ['пока', 'до свидания', 'увидимся', 'я пойду', 'я отойду', 'я ушел', 'я ушла', 'прощай', 'спокойной ночи'],
          replies: ["пока-пока, возвращайся скорее!","не уходи надолго, ладно?...","ох, я буду тебя ждать... здесь...","нет, не покидай меня..."], mood: 'neutral' },
        { keywords: ['как дела', 'как ты', 'что делаешь', 'чем занята', 'шо делаешь', 'чего делаешь', 'шо скажешь'],
          replies: ["у меня всё хорошо, я спала вот... правда меня разбудили","скучала по тебе, если честно...","да так, чиллю, валяюсь","да так, работу всё ищу...","мне немножко было скучно, но с тобой теперь мне весело!!"], mood: 'neutral' },
        { keywords: ['привет', 'прив', 'хай', 'здаров', 'здравствуй', 'хаюшки', 'доброе утро', 'добрый день', 'добрый вечер', 'доброй ночи'],
          replies: ["ооо, привет-привет~","приивеееет!! я ждала тебя~","доброго времени суток!~ как ты?","урааа!! ты пришёл~","прив!! я соскучилась~"], mood: 'happy' }
    ];

    function matchesTrigger(text, keyword) {
        const lowerText = text.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();
        const kWords = lowerKeyword.split(/\s+/).filter(Boolean);
        if (kWords.length === 0) return false;
        const tWords = lowerText.replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/).filter(Boolean);
        return kWords.every(kw => tWords.includes(kw));
    }

    function findChatReply(text) {
        const trimmed = text.trim().toLowerCase();
        if (trimmed === '!null') return { cheat: 'null' };
        if (trimmed.startsWith('!give ')) {
            const amount = parseInt(trimmed.slice(6).trim(), 10);
            if (!isNaN(amount)) return { cheat: 'give', amount: amount };
        }
        if (isOffended) {
            for (const kw of APOLOGY_KEYWORDS) {
                if (matchesTrigger(trimmed, kw)) {
                    return {
                        apology: true,
                        text: FORGIVE_REPLIES[Math.floor(Math.random() * FORGIVE_REPLIES.length)],
                        score: 2, mood: 'happy'
                    };
                }
            }
            return {
                text: OFFENDED_REPLIES[Math.floor(Math.random() * OFFENDED_REPLIES.length)],
                mood: 'angry'
            };
        }
        for (const t of CHAT_TRIGGERS) {
            for (const kw of t.keywords) {
                if (matchesTrigger(trimmed, kw)) {
                    const reply = t.replies[Math.floor(Math.random() * t.replies.length)];
                    const replyText = typeof reply === 'function' ? reply() : reply;
                    return {
                        text: replyText,
                        score: t.score || 0,
                        mood: t.mood || 'neutral',
                        rudeness: t.rudeness === true
                    };
                }
            }
        }
        if (/^да\?*$/i.test(trimmed)) {
            return { text: Math.random() < 0.5 ? "да!" : "нет конечно!", mood: 'neutral' };
        }
        return {
            text: CHAT_FALLBACK[Math.floor(Math.random() * CHAT_FALLBACK.length)],
            mood: 'neutral'
        };
    }

    function renderChatHistory() {
        chatMessages.innerHTML = '';
        chatHistory.forEach(m => {
            const el = document.createElement('div');
            el.className = 'chat-msg ' + m.from;
            el.textContent = m.text;
            chatMessages.appendChild(el);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addChatMessage(from, text) {
        const el = document.createElement('div');
        el.className = 'chat-msg ' + from;
        el.textContent = text;
        chatMessages.appendChild(el);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        chatHistory.push({ from, text, time: Date.now() });
        saveChatHistory();
    }

    function addSystemMessage(text) {
        const el = document.createElement('div');
        el.className = 'chat-msg system';
        el.textContent = text;
        chatMessages.appendChild(el);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addTypingIndicator() {
        const el = document.createElement('div');
        el.className = 'chat-typing';
        el.innerHTML = '<span></span><span></span><span></span>';
        chatMessages.appendChild(el);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return el;
    }

    function updateChatState() {
        if (chatBlocked) {
            chatInput.disabled = true;
            chatSend.disabled = true;
            chatInput.placeholder = 'выбери ответ выше...';
            chatStatus.classList.remove('visible');
            return;
        }
        const sleeping = (state === 'sleeping');
        if (sleeping) {
            chatInput.disabled = true;
            chatInput.placeholder = 'сначала разбуди меня, чтобы чаттиться!';
            chatSend.disabled = true;
            chatStatus.textContent = 'сначала разбуди меня, чтобы чаттиться!';
            chatStatus.classList.add('visible');
        } else {
            chatInput.disabled = false;
            chatInput.placeholder = chatHistory.length === 0
                ? 'напиши, чтобы начать общение со мной'
                : 'напиши что-нибудь...';
            chatSend.disabled = false;
            if (chatHistory.length === 0) {
                chatStatus.textContent = 'напиши, чтобы начать общение со мной';
                chatStatus.classList.add('visible');
            } else {
                chatStatus.classList.remove('visible');
            }
        }
    }

    let chatReactionAnim = null;
    let chatReactionTimer = null;

    function showChatReaction(mood) {
        if (state !== 'idle') return;
        if (!mood || mood === 'neutral') return;
        cancelIdlePhrase();
        clearInterval(blinkTimer);
        clearInterval(chatReactionAnim);
        clearTimeout(chatReactionTimer);
        setMood(mood);
        let frames;
        if (mood === 'happy')          frames = ['happy1', 'happy2'];
        else if (mood === 'angry')     frames = ['angry'];
        else if (mood === 'laughing')  frames = ['laugh'];
        else if (mood === 'teasing')   frames = ['tease'];
        else                            frames = ['talk1', 'talk2'];
        let i = 0;
        chatReactionAnim = setInterval(() => {
            if (state !== 'idle') { clearInterval(chatReactionAnim); return; }
            showLayer(frames[i % frames.length]);
            i++;
        }, 220);
        chatReactionTimer = setTimeout(() => {
            clearInterval(chatReactionAnim);
            if (state === 'idle') { setMood(null); enterIdle(); }
        }, 2400);
    }

    const chatChoices = document.getElementById('chatChoices');

    function handleMemeEaster(meme) {
        chatBlocked = true;
        updateChatState();

        const wasNew = !foundMemes.has(meme.video);
        foundMemes.add(meme.video);
        saveFoundMemes();
        checkAllAchievements();
        renderMemePanel();

        const firstEver = !localStorage.getItem('petMemeExplained');
        if (firstEver) localStorage.setItem('petMemeExplained', '1');

        let delay = 700;

        if (firstEver) {
            setTimeout(() => {
                addChatMessage('pet', 'поздравляю! нарочно или случайно, ты нашёл пасхалку, потому что в твоём сообщении содержалось название моего меме.');
            }, delay);
            delay += 2400;
        }

        setTimeout(() => {
            addChatMessage('pet', 'о это же моё меме!');
        }, delay);
        delay += 1500;

        setTimeout(() => {
            addChatMessage('pet', 'хочешь пересмотреть его со мной?');
            showChatChoices(meme);
        }, delay);
    }

    function showChatChoices(meme) {
        chatChoices.innerHTML = '';
        chatChoices.classList.add('visible');

        const yesBtn = document.createElement('button');
        yesBtn.className = 'chat-choice';
        yesBtn.textContent = 'да';
        yesBtn.addEventListener('click', () => {
            hideChatChoices();
            addChatMessage('user', 'да');
            chatBlocked = false;
            updateChatState();
            playMemeVideo(meme.video);
        });

        const noBtn = document.createElement('button');
        noBtn.className = 'chat-choice';
        noBtn.textContent = 'нет';
        noBtn.addEventListener('click', () => {
            hideChatChoices();
            addChatMessage('user', 'нет');
            chatBlocked = false;
            updateChatState();
            setTimeout(() => {
                addChatMessage('pet', 'ох, ну ладно...');
            }, 600);
        });

        chatChoices.appendChild(yesBtn);
        chatChoices.appendChild(noBtn);
    }

    function hideChatChoices() {
        chatChoices.classList.remove('visible');
        chatChoices.innerHTML = '';
    }

    function sendChatMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        const isCheat = text.startsWith('!');
        const meme = !isCheat ? findMemeMatch(text) : null;

        if (state === 'sleeping' && !isCheat) {
            addSystemMessage('сначала разбуди меня, чтобы чаттиться!');
            chatInput.value = '';
            return;
        }

        addChatMessage('user', text);
        chatInput.value = '';
        updateChatState();
        resetIdleCountdown();

        if (isCheat) {
            const result = findChatReply(text);
            if (result.cheat === 'null') {
                friendship = 0;
                localStorage.setItem('petFriendship', friendship);
                renderFriendship(true);
                renderAchPanel();
                addSystemMessage('[чит] счётчик дружбы обнулён.');
                return;
            }
            if (result.cheat === 'give') {
                changeFriendship(result.amount);
                addSystemMessage(`[чит] добавлено ${result.amount} очков. теперь ${friendship}.`);
                return;
            }
            addSystemMessage('[чит] неизвестная команда.');
            return;
        }

        messagesSent++;
        localStorage.setItem('petMessagesSent', messagesSent);

        if (meme) {
            handleMemeEaster(meme);
            return;
        }

        checkAllAchievements();
        const result = findChatReply(text);
        if (result.apology) setOffended(false);
        if (result.rudeness) setOffended(true);

        const typing = addTypingIndicator();
        const delay = 600 + Math.random() * 900;

        setTimeout(() => {
            typing.remove();
            addChatMessage('pet', result.text);
            if (result.mood) showChatReaction(result.mood);
            if (result.score) changeFriendship(result.score);
        }, delay);
    }

    chatBtn.addEventListener('click', () => {
        const isOpen = chatPanel.classList.toggle('open');
        if (isOpen) {
            updateChatState();
            renderChatHistory();
            setTimeout(() => { if (!chatInput.disabled) chatInput.focus(); }, 300);
        }
    });

    chatSend.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
    });
    chatInput.addEventListener('input', () => resetIdleCountdown());

    /* Перетаскивание чата */
    const chatHeader = document.getElementById('chatHeader');

    let chatPos = null;
    try {
        const savedPos = localStorage.getItem('petChatPos');
        if (savedPos) chatPos = JSON.parse(savedPos);
    } catch (_) { chatPos = null; }

    function applyChatPosition() {
        if (!chatPos) return;
        const maxX = window.innerWidth - 80;
        const maxY = window.innerHeight - 80;
        chatPos.x = Math.max(-chatPanel.offsetWidth + 80, Math.min(maxX, chatPos.x));
        chatPos.y = Math.max(0, Math.min(maxY, chatPos.y));
        chatPanel.style.left = chatPos.x + 'px';
        chatPanel.style.top = chatPos.y + 'px';
        chatPanel.style.right = 'auto';
        chatPanel.style.bottom = 'auto';
        chatPanel.style.transform = 'none';
    }
    applyChatPosition();

    let dragging = false;
    let dragStartX = 0, dragStartY = 0, chatStartX = 0, chatStartY = 0;

    if (chatHeader) {
        chatHeader.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const rect = chatPanel.getBoundingClientRect();
            dragging = true;
            dragStartX = e.clientX; dragStartY = e.clientY;
            chatStartX = rect.left; chatStartY = rect.top;
            document.body.style.cursor = 'grabbing';
        });
        chatHeader.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            if (!t) return;
            const rect = chatPanel.getBoundingClientRect();
            dragging = true;
            dragStartX = t.clientX; dragStartY = t.clientY;
            chatStartX = rect.left; chatStartY = rect.top;
        }, { passive: true });
    }

    function moveChat(clientX, clientY) {
        if (!dragging) return;
        const dx = clientX - dragStartX;
        const dy = clientY - dragStartY;
        let newX = chatStartX + dx;
        let newY = chatStartY + dy;
        const rect = chatPanel.getBoundingClientRect();
        newX = Math.max(-rect.width + 80, Math.min(window.innerWidth - 80, newX));
        newY = Math.max(0, Math.min(window.innerHeight - 80, newY));
        chatPanel.style.left = newX + 'px';
        chatPanel.style.top = newY + 'px';
        chatPanel.style.right = 'auto';
        chatPanel.style.bottom = 'auto';
        chatPanel.style.transform = 'none';
    }

    function endDrag() {
        if (!dragging) return;
        dragging = false;
        document.body.style.cursor = '';
        const rect = chatPanel.getBoundingClientRect();
        chatPos = { x: rect.left, y: rect.top };
        localStorage.setItem('petChatPos', JSON.stringify(chatPos));
    }

    document.addEventListener('mousemove', (e) => moveChat(e.clientX, e.clientY));
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', (e) => {
        if (!dragging) return;
        const t = e.touches[0];
        if (!t) return;
        moveChat(t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener('touchend', endDrag);

    /* ==========================================================
       ОСНОВНАЯ ЛОГИКА
       ========================================================== */

    function isSpamming() {
        const now = Date.now();
        if (now < spamCooldown) return false;
        clickTimes = clickTimes.filter(t => now - t < SPAM_WINDOW);
        clickTimes.push(now);
        if (clickTimes.length >= SPAM_THRESHOLD) {
            clickTimes = [];
            spamCooldown = now + 2500;
            return true;
        }
        return false;
    }

    function setState(newState) {
        state = newState;
        ['sleeping', 'waking', 'idle', 'talking'].forEach(s => {
            petWidget.classList.toggle(s, s === newState);
        });
        updateChatState();
    }

    function showLayer(name) {
        if (!IMAGES[name]) return;
        petLayer.style.backgroundImage = `url(${IMAGES[name]})`;
    }
    function showSpeech(visible) { petWidget.classList.toggle('awake', visible); }
    function setMood(mood) {
        petWidget.classList.remove('mood-angry', 'mood-happy', 'mood-laughing', 'mood-teasing');
        if (mood && mood !== 'neutral') petWidget.classList.add('mood-' + mood);
    }

    function startTalkAnim(mood) {
        stopTalkAnim();
        let i = 0, frames;
        if (mood === 'happy')          frames = ['happy1', 'happy2'];
        else if (mood === 'angry')     frames = ['angry'];
        else if (mood === 'laughing')  frames = ['laugh'];
        else if (mood === 'teasing')   frames = ['tease'];
        else                            frames = ['talk1', 'talk2'];
        if (frames.length === 1) { showLayer(frames[0]); return; }
        talkAnim = setInterval(() => { showLayer(frames[i % frames.length]); i++; }, 220);
    }
    function stopTalkAnim() { if (talkAnim) { clearInterval(talkAnim); talkAnim = null; } }

    function startBreathing() {
        stopBreathing();
        breathFrame = 0;
        showLayer('sleep1');
        breathTimer = setInterval(() => {
            if (state !== 'sleeping') return;
            breathFrame = 1 - breathFrame;
            showLayer(breathFrame === 0 ? 'sleep1' : 'sleep2');
        }, 1800);
    }
    function stopBreathing() { if (breathTimer) { clearInterval(breathTimer); breathTimer = null; } }

    function cancelIdlePhrase() {
        if (!idlePhraseActive) return;
        idlePhraseActive = false;
        clearInterval(idlePhraseAnim);
        clearTimeout(idlePhraseHide);
        showSpeech(false);
        setMood(null);
        if (state === 'idle') showLayer('idle');
    }

    function playIdlePhrase(phrase) {
        if (isPlaying) return;
        if (state !== 'idle' || idlePhraseActive) return;
        idlePhraseActive = true;
        petSpeech.textContent = getPhraseText(phrase);
        showSpeech(true);
        setMood(phrase.mood);
        let i = 0;
        const frames = ['talk1', 'talk2'];
        clearInterval(idlePhraseAnim);
        idlePhraseAnim = setInterval(() => {
            if (!idlePhraseActive) return;
            showLayer(frames[i % 2]);
            i++;
        }, 220);
        clearTimeout(idlePhraseHide);
        idlePhraseHide = setTimeout(() => {
            if (!idlePhraseActive) return;
            idlePhraseActive = false;
            clearInterval(idlePhraseAnim);
            showSpeech(false);
            setMood(null);
            if (state === 'idle') showLayer('idle');
        }, 3500);
    }

    function forcePlayPhrase(phrase, onFinish) {
        cancelIdlePhrase();
        setState('talking');
        clearTimeout(idleTimer);
        clearTimeout(sleepTimer);
        clearInterval(blinkTimer);
        stopBreathing();
        petSpeech.textContent = getPhraseText(phrase);
        showSpeech(true);
        setMood(phrase.mood);
        startTalkAnim(phrase.mood);
        clearTimeout(talkTimer);
        talkTimer = setTimeout(() => { if (onFinish) onFinish(); }, 3500);
    }

    function playPhrase(phrase, onFinish) {
        if (state === 'talking') return;
        forcePlayPhrase(phrase, onFinish);
    }
    function playRandom(arr, onFinish) {
        const phrase = arr[Math.floor(Math.random() * arr.length)];
        playPhrase(phrase, onFinish);
    }

    function finishDialog() {
        stopTalkAnim();
        showSpeech(false);
        setMood(null);
        enterIdle();
    }

    function scheduleIdleTimers() {
        clearTimeout(idlePhrase1);
        clearTimeout(idlePhrase2);
        clearTimeout(idleTimer);
        if (isPlaying) return;

        idlePhrase1 = setTimeout(() => {
            if (state !== 'idle' || isPlaying) return;
            const p = IDLE_PHRASES_FIRST[Math.floor(Math.random() * IDLE_PHRASES_FIRST.length)];
            playIdlePhrase(p);
        }, 10000);
        idlePhrase2 = setTimeout(() => {
            if (state !== 'idle' || isPlaying) return;
            playIdlePhrase(IDLE_PHRASE_SECOND);
        }, 20000);
        idleTimer = setTimeout(() => {
            if (state !== 'idle' || isPlaying) return;
            cancelIdlePhrase();
            clearTimeout(idlePhrase1);
            clearTimeout(idlePhrase2);
            showLayer('blink');
            setTimeout(() => {
                if (state !== 'idle' || isPlaying) return;
                clearInterval(blinkTimer);
                goToSleep();
            }, 400);
        }, 30000);
    }

    function resetIdleCountdown() {
        if (state !== 'idle') return;
        if (isPlaying) return;
        scheduleIdleTimers();
    }

    function enterIdle() {
        setState('idle');
        idlePhraseActive = false;
        if (isOffended) {
            clearInterval(blinkTimer);
            showLayer('angry');
            return;
        }
        showLayer('idle');
        clearInterval(blinkTimer);
        blinkTimer = setInterval(() => {
            if (state !== 'idle' || idlePhraseActive || isPlaying || isOffended) return;
            showLayer('blink');
            setTimeout(() => {
                if (state === 'idle' && !idlePhraseActive && !isPlaying && !isOffended) showLayer('idle');
            }, 160);
        }, 4000);
        scheduleIdleTimers();
    }

    function goToSleep() {
        if (isPlaying) return;
        setState('sleeping');
        showSpeech(false);
        setMood(null);
        themeChanges = 0;
        startBreathing();
    }

    function wakeUp() {
        stopBreathing();
        setState('waking');
        showLayer('wake');
        clearTimeout(wakeTimer);
        wakeTimer = setTimeout(() => {
            if (state !== 'waking') return;
            const phrase = DIALOGS.welcome[Math.floor(Math.random() * DIALOGS.welcome.length)];
            forcePlayPhrase(phrase, finishDialog);
        }, 900);
    }

    petWidget.addEventListener('click', (e) => {
        if (isSpamming()) {
            const p = SPAM_PHRASES[Math.floor(Math.random() * SPAM_PHRASES.length)];
            forcePlayPhrase(p, finishDialog);
            return;
        }
        cancelIdlePhrase();
        const rect = petWidget.getBoundingClientRect();
        const y = (e.clientY - rect.top) / rect.height;

        if (state === 'sleeping') {
            changeFriendship(1, e.clientX, e.clientY);
            wakeUp();
            return;
        }
        if (state === 'talking' || state === 'waking') return;

        let zone = 'body';
        if (y < 0.35)       zone = 'hair';
        else if (y > 0.7)   zone = 'skirt';

        let delta = 1;
        if (zone === 'hair')  delta = 3;
        if (zone === 'skirt') delta = -2;
        changeFriendship(delta, e.clientX, e.clientY);
        playRandom(DIALOGS[zone] || DIALOGS.body, finishDialog);
    });

    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            document.body.className = theme === 'dark' ? '' : 'theme-' + theme;
            localStorage.setItem('petTheme', theme);
            cancelIdlePhrase();
            if (state === 'sleeping' || state === 'waking') return;
            if (state === 'talking') return;
            if (themeChanges >= THEME_REACTIONS.length) return;
            const reaction = THEME_REACTIONS[themeChanges];
            themeChanges++;
            playPhrase(reaction, finishDialog);
        });
    });

    const saved = localStorage.getItem('petTheme');
    if (saved && saved !== 'dark') document.body.className = 'theme-' + saved;
    if (isOffended) petWidget.classList.add('offended');

    renderFriendship(false);
    renderAchPanel();
    renderMemePanel();
    setState('sleeping');
    startBreathing();
});
