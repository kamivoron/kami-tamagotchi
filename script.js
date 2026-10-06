document.addEventListener('DOMContentLoaded', () => {

    /* ==========================================================
       КОНСТАНТЫ СОСТОЯНИЯ
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
    let isVideoPlaying   = false;
    let pianoMode        = false;
    let pianoAudio       = null;
    let lastPianoIndex   = -1;
    let themeLock = localStorage.getItem('petThemeLock') === '1';

    /* ===== СТАТЫ ===== */
    const STATS_KEY = 'petStatsV1';
    const LAST_INTERACTION_KEY = 'petLastInteraction';

    let stats = { mood: 70, fullness: 70, cleanliness: 70, lastUpdate: Date.now() };
    try {
        const s = JSON.parse(localStorage.getItem(STATS_KEY) || 'null');
        if (s && typeof s === 'object') {
            stats = { mood: 70, fullness: 70, cleanliness: 70, lastUpdate: Date.now(), ...s };
        }
    } catch(_) {}

    let lastInteraction = parseInt(localStorage.getItem(LAST_INTERACTION_KEY) || String(Date.now()), 10);
    if (isNaN(lastInteraction)) lastInteraction = Date.now();

    function saveStats() { stats.lastUpdate = Date.now(); localStorage.setItem(STATS_KEY, JSON.stringify(stats)); }
    function touchInteraction() { lastInteraction = Date.now(); localStorage.setItem(LAST_INTERACTION_KEY, String(lastInteraction)); }

    function applyDecay() {
        const now = Date.now();
        const elapsed = Math.max(0, (now - stats.lastUpdate) / 1000);
        const awayHours = Math.max(0, (now - lastInteraction) / 3600000);

                /* Голод: -1 каждые 5 минут */
        if (elapsed >= 300) stats.fullness = Math.max(0, stats.fullness - Math.floor(elapsed / 300));
        /* Чистота: -2 каждые 25 минут */
        if (elapsed >= 1500) stats.cleanliness = Math.max(0, stats.cleanliness - Math.floor(elapsed / 1500) * 2);
        if ((stats.fullness === 0 || stats.cleanliness === 0) && elapsed >= 300) {
            stats.mood = Math.max(0, stats.mood - Math.floor(elapsed / 300));
        }
        if (awayHours >= 3) stats.mood = Math.max(0, stats.mood - Math.floor(awayHours * 12));
        stats.lastUpdate = now;
        saveStats();
    }
    applyDecay();

    const clampStat = v => Math.max(0, Math.min(100, Math.round(v)));
    function addStat(name, amount) {
        stats[name] = clampStat(stats[name] + amount);
        stats.lastUpdate = Date.now();
        saveStats();
        renderStats();
    }

    const statMoodFill = document.getElementById('statMoodFill');
    const statHungerFill = document.getElementById('statHungerFill');
    const statCleanFill = document.getElementById('statCleanFill');
    const statMoodVal = document.getElementById('statMoodVal');
    const statHungerVal = document.getElementById('statHungerVal');
    const statCleanVal = document.getElementById('statCleanVal');

    function renderStats() {
        statMoodFill.style.width = stats.mood + '%';
        statHungerFill.style.width = stats.fullness + '%';
        statCleanFill.style.width = stats.cleanliness + '%';
        statMoodVal.textContent = stats.mood;
        statHungerVal.textContent = stats.fullness;
        statCleanVal.textContent = stats.cleanliness;
    }
    setInterval(() => { applyDecay(); renderStats(); }, 60000);

    /* ===== ПЛЕЕР ===== */
    const TRACKS = [
        { file: 'music/1.mp3', title: 'на грани болевого порога',
          onPlay: { text: 'опа, что-то знакомое играет...', mood: 'happy' } },
        { file: 'music/2.mp3', title: 'why,why?',
          events: [
              { time: 6,   action: 'showFlashback' },
              { time: 11,  action: 'showLocalVideo', src: 'video/13.mp4', startAt: 11, theme: 'dark' },
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
          ] },
        { file: 'music/3.mp3', title: 'u and i (runaway)',
          onPlay: { text: 'о, это же любимое меме юли!', mood: 'happy' },
          events: [
              { time: 33,  action: 'showLocalVideo', src: 'video/18.mp4', onEnd: 'kamiiFirstUAndIEnd' },
              { time: 133, action: 'showLocalVideo', src: 'video/18.mp4' }
          ] },
        { file: 'music/4.mp3', title: 'looping the rooms',
          events: [
              { time: 3,  action: 'backroomsBegin' },
              { time: 12, action: 'singLine', text: 'кажется, я попала в бекрумс...', duration: 3500 }
          ],
          onEnd: 'backroomsEnd' },
        { file: 'music/5.mp3', title: 'ヤラララ / YARARARA',
          onPlay: { text: 'о, мне нравится эта песенка!', mood: 'happy' },
          events: [
              { time: 5, action: 'yarararaBegin' }
          ],
          onEnd: 'yarararaEnd' },
        { file: 'music/6.mp3', title: 'любовная любовь',
          hidden: true,
          events: [
              { time: 1, action: 'loveSongBegin' }
          ],
          onEnd: 'loveSongEnd' },
                { file: 'music/7.m4a', title: "who's ready for tomorrow",
          events: [
              { time: 1, action: 'tomorrowBegin' }
          ],
          onEnd: 'tomorrowEnd' },

        /* ===== mzlff ===== */
        { file: 'music/8.mp3', title: 'mzlff - бессмертен' },
        { file: 'music/9.mp3', title: 'mzlff - страбоскоп' },
        { file: 'music/10.mp3', title: 'mzlff - руку на пульсе' },
        { file: 'music/11.mp3', title: 'mzlff - станционный смотритель' },
        { file: 'music/12.mp3', title: 'mzlff - эдемово яблоко' },
        { file: 'music/13.mp3', title: 'mzlff - смерть на перепутье' },
        { file: 'music/14.mp3', title: 'mzlff - история о семействе мушек с хорошей концовкой' },
        { file: 'music/15.mp3', title: 'mzlff - отражение' },
        { file: 'music/16.mp3', title: 'mzlff - город за горизонтом' },
        { file: 'music/17.mp3', title: 'mzlff - графиками выходных' },
        { file: 'music/18.mp3', title: 'mzlff - бес концепта' },
        { file: 'music/19.mp3', title: 'mzlff - девочка из аптечной' },
        { file: 'music/20.mp3', title: 'mzlff - неудачный фильм' },
        { file: 'music/21.mp3', title: 'mzlff - космоцветок' },
        { file: 'music/22.mp3', title: 'mzlff - новая муза' },
        { file: 'music/23.mp3', title: 'mzlff - шестьдесят минут' },
        { file: 'music/24.mp3', title: 'mzlff - эвкалиптова ветвь' },
        { file: 'music/25.mp3', title: 'mzlff - диана' },
        { file: 'music/26.mp3', title: 'mzlff - сказка о теневом мире' },
        { file: 'music/27.mp3', title: 'mzlff, ксх - противоречие выборов' },
        { file: 'music/28.mp3', title: 'mzlff - люцифер стихотворное' },
        { file: 'music/29.mp3', title: 'mzlff - в абрикосовой долине' },
        { file: 'music/30.mp3', title: 'mzlff - оттепель' },
        { file: 'music/31.mp3', title: 'mzlff, всегдамечтал - это моя весна' },
        { file: 'music/32.mp3', title: 'mzlff - увидимся следующим летом' },
        { file: 'music/33.mp3', title: 'mzlff - капель' },
        { file: 'music/34.mp3', title: 'mzlff - бумажный самолет' },
        { file: 'music/35.mp3', title: 'firstfeel, beatcaster, юг 404, n.masteroff, mzlff, фрик пати, monrau, золотое перо, booker, delorenzy, skurt - atm 3' },
        { file: 'music/36.mp3', title: 'mzlff, стинт - первый секс' },
        { file: 'music/37.mp3', title: 'mzlff - беспорядочная сказка' },
        { file: 'music/38.mp3', title: 'mzlff - который ищет маяк' },
        { file: 'music/39.mp3', title: 'mzlff - позже будет больнее' },
        { file: 'music/40.mp3', title: 'mzlff - человейники' },
        { file: 'music/41.mp3', title: 'mzlff - глобальный вайп' },
        { file: 'music/42.mp3', title: 'mzlff - аэростат' },
        { file: 'music/43.mp3', title: 'mzlff - тэм на коллеж' },
        { file: 'music/44.mp3', title: 'mzlff - кто-то должен опылять цветок' },
        { file: 'music/45.mp3', title: 'mzlff - рожденный умереть' },
        { file: 'music/46.mp3', title: 'mzlff, qwiza - ты рядом' },
        { file: 'music/47.mp3', title: 'mzlff - не то, что ты хотела бы слышать под лоуфай' },
        { file: 'music/48.mp3', title: 'mzlff - оттепели не быть' },
        { file: 'music/49.mp3', title: 'mzlff - тебе понравится' },
        { file: 'music/50.mp3', title: 'mzlff - царапка' },
        { file: 'music/51.mp3', title: 'mzlff, серега пират - я не боюсь ошибаться' },
        { file: 'music/52.mp3', title: 'mzlff - почему космос не пишет про нас' },
        { file: 'music/53.mp3', title: 'mzlff, sted.d - однополярности' },
        { file: 'music/54.mp3', title: 'mzlff - дорога из миннесоты' },
        { file: 'music/55.mp3', title: 'mzlff - родинки' },
        { file: 'music/56.mp3', title: 'mzlff - снежинка' },
        { file: 'music/57.mp3', title: 'mzlff - мое имя' },
        { file: 'music/58.mp3', title: 'mzlff - анабиоз' },
        { file: 'music/59.mp3', title: 'mzlff - красивая красота' },
        { file: 'music/60.mp3', title: 'mzlff - новогодний' },
        { file: 'music/61.mp3', title: 'mzlff, слава кпсс - старая панк волна' },
        { file: 'music/62.mp3', title: 'mzlff - ракушки и ракушки' },
        { file: 'music/63.mp3', title: 'mzlff, стинт - ты не поймешь' },
        { file: 'music/64.mp3', title: 'mzlff, cmh - catharsis' },
        { file: 'music/65.mp3', title: 'mzlff, изтолпы - пойдем со мной' },
        { file: 'music/66.mp3', title: 'mzlff, cmh - бэйслайн бизнес' },
        { file: 'music/67.mp3', title: 'mzlff - привет' },
        { file: 'music/68.mp3', title: 'mzlff, sted.d, канги - буря, метель и мгла' },
        { file: 'music/69.mp3', title: 'mzlff - для тебя' },
        { file: 'music/70.mp3', title: 'mzlff - всем вернется' },
        { file: 'music/71.mp3', title: 'mzlff - поровну' },
        { file: 'music/72.mp3', title: 'mzlff - в пряничном домике' },
        { file: 'music/73.mp3', title: 'mzlff - сейв' },
        { file: 'music/74.mp3', title: 'mzlff, екатерина яшникова - почемучка' },
        { file: 'music/75.mp3', title: 'mzlff - примагнитило' },
        { file: 'music/76.mp3', title: 'mzlff - кто убил лирический рэп' },
        { file: 'music/77.mp3', title: 'mzlff - ящики' },
        { file: 'music/78.mp3', title: 'mzlff, слава кпсс - hate core' },
        { file: 'music/79.mp3', title: 'mzlff, playingtheangel - не создать цветы' },
        { file: 'music/80.mp3', title: 'mzlff - кладбище спасательных кругов' },
        { file: 'music/81.mp3', title: 'mzlff, sted.d - другая сторона' },
        { file: 'music/82.mp3', title: 'mzlff - мои маленькие кошмары' },
        { file: 'music/83.mp3', title: 'booker, cmh, mzlff, слава кпсс - gde papa longmix' },
        { file: 'music/84.mp3', title: 'mzlff - чёртово колесо' },
        { file: 'music/85.mp3', title: 'слава кпсс, skurt, mzlff - rolls royce phantom' },
        { file: 'music/86.mp3', title: 'mzlff - откат (2025)' },
        { file: 'music/87.mp3', title: 'mzlff - цветочек маленький (2025)' },
        { file: 'music/88.mp3', title: 'mzlff - космоцветок (2025)' },
        { file: 'music/89.mp3', title: 'mzlff - эвкалиптова ветвь (2025)' },
        { file: 'music/90.mp3', title: 'mzlff - графиками выходных (2025)' },
        { file: 'music/91.mp3', title: 'mzlff - станционный смотритель (2025)' },
        { file: 'music/92.mp3', title: 'mzlff - руку на пульсе (2025)' },
        { file: 'music/93.mp3', title: 'наше последнее лето, mzlff - я устал' },
        { file: 'music/94.mp3', title: 'mzlff - 1212' },
        { file: 'music/95.mp3', title: 'mzlff, gspd - мы не станем другими' },
        { file: 'music/96.mp3', title: 'mzlff, изтолпы, ксх - trinity cypher' },
        { file: 'music/97.mp3', title: 'mzlff - во дворе' },
        { file: 'music/98.mp3', title: 'mzlff - с самим собой' },
        { file: 'music/99.mp3', title: 'mzlff - невыносимо' },
        { file: 'music/100.mp3', title: 'mzlff - мало-помалу' },
        { file: 'music/101.mp3', title: 'mzlff - медленный танец' },
        { file: 'music/102.mp3', title: 'mzlff - phantasmagoria' },
        { file: 'music/103.mp3', title: 'mzlff - карусель' },
        { file: 'music/104.mp3', title: 'mzlff - комната смеха' },
        { file: 'music/105.mp3', title: 'mzlff - автодром' },
        { file: 'music/106.mp3', title: 'mzlff - свободное падение' },
        { file: 'music/107.mp3', title: 'mzlff - эпилог' },
        { file: 'music/108.mp3', title: 'mzlff - айзек' },
        { file: 'music/109.mp3', title: 'mzlff - культурный слой' },
        { file: 'music/110.mp3', title: 'mzlff, pyrokinesis - оставь себе' },
        { file: 'music/111.mp3', title: 'mzlff - обыкновенная жизнь' },
        { file: 'music/112.mp3', title: 'mzlff - ворона' },
        { file: 'music/113.mp3', title: 'mzlff - запой' },
        { file: 'music/114.mp3', title: 'mzlff - разрешаю запрещаю' },
        { file: 'music/115.mp3', title: 'mzlff - смартик' },

        /* ===== стинт ===== */
        { file: 'music/116.mp3', title: 'стинт - девочка' },
        { file: 'music/117.mp3', title: 'стинт - идиот' },
        { file: 'music/118.mp3', title: 'стинт, mellsher - холода' },
        { file: 'music/119.mp3', title: 'стинт - хрясь!' },
        { file: 'music/120.mp3', title: 'стинт - армагеддон' },
        { file: 'music/121.mp3', title: 'стинт - разбивай' },
        { file: 'music/122.mp3', title: 'стинт - это не мой вайб' },
        { file: 'music/123.mp3', title: 'стинт - телепорт' },
        { file: 'music/124.mp3', title: 'стинт - свистит башка' },
        { file: 'music/125.mp3', title: 'стинт - выходные' },
        { file: 'music/126.mp3', title: 'стинт, братишкин - пить тупить' },
        { file: 'music/127.mp3', title: 'стинт - туда-сюда' },
        { file: 'music/128.mp3', title: 'стинт - фура' },
        { file: 'music/129.mp3', title: 'стинт - фуджи' },
        { file: 'music/130.mp3', title: 'стинт, lida - plastic' },
        { file: 'music/131.mp3', title: 'стинт - питер-москва' },
        { file: 'music/132.mp3', title: 'стинт, mzlff - черным по белому' },
        { file: 'music/133.mp3', title: 'стинт - я ждал тебя вечность' },
        { file: 'music/134.mp3', title: 'стинт - ля ля ля' }
    ];

    const audioEl = document.getElementById('audioEl');
    const musicPrevBtn = document.getElementById('musicPrev');
    const musicPlayBtn = document.getElementById('musicPlay');
    const musicNextBtn = document.getElementById('musicNext');
    const musicTitle = document.getElementById('musicTitle');
    const musicTime = document.getElementById('musicTime');
    const musicProgressWrap = document.getElementById('musicProgressWrap');
    const musicProgressFill = document.getElementById('musicProgressFill');
    const musicVolume = document.getElementById('musicVolume');
    const musicRepeatBtn = document.getElementById('musicRepeat');
    const musicExpandBtn = document.getElementById('musicExpand');
    const musicList = document.getElementById('musicList');
    const musicShuffleBtn = document.getElementById('musicShuffle');
    const musicSearchWrap = document.getElementById('musicSearchWrap');
    const musicSearchInput = document.getElementById('musicSearch');
    const youtubeOverlay = document.getElementById('youtubeOverlay');
    const youtubeIframe = document.getElementById('youtubeIframe');
    const localVideo = document.getElementById('localVideo');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const overlayDragHandle = document.getElementById('overlayDragHandle');
    const memePanel = document.getElementById('memePanel');
    const memeBtn = document.getElementById('memeBtn');
    const carePanel = document.getElementById('carePanel');
    const careBtn = document.getElementById('careBtn');
    const shopPanel = document.getElementById('shopPanel');
    const dailyPanel = document.getElementById('dailyPanel');
    const dailyBtn = document.getElementById('dailyBtn');
    const invPanel = document.getElementById('invPanel');
    const invBtn = document.getElementById('invBtn');
    const vitrinaPanel = document.getElementById('vitrinaPanel');

    let currentTrack = -1;
    let isPlaying = false;
    let isRepeat = false;
    let isExpanded = false;
    let firedEvents = new Set();
    let onPlayTriggeredForTrack = -1;
    let isShuffled = false;
    let backroomsActive = false;
    let yarararaActive = false;
    let tomorrowActive = false;

    /* Фикс кликов по видео */
    ['click', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'dblclick'].forEach(evt => {
        youtubeOverlay.addEventListener(evt, (e) => e.stopPropagation());
    });

    /* ПОЗИЦИЯ И РАЗМЕР ОВЕРЛЕЯ */
    let overlayPos = null, overlaySize = null;
    try { const sp = localStorage.getItem('petOverlayPos'); if (sp) overlayPos = JSON.parse(sp); } catch(_) {}
    try { const ss = localStorage.getItem('petOverlaySize'); if (ss) overlaySize = JSON.parse(ss); } catch(_) {}

    function applyOverlaySize() {
        if (overlaySize) {
            youtubeOverlay.style.width = overlaySize.w + 'px';
            youtubeOverlay.style.height = overlaySize.h + 'px';
        }
    }
    function applyOverlayPosition() {
        if (overlayPos) {
            youtubeOverlay.style.left = overlayPos.x + 'px';
            youtubeOverlay.style.top = overlayPos.y + 'px';
            youtubeOverlay.style.transform = 'none';
        }
    }
    function ensureOverlayLayout() {
        applyOverlaySize();
        if (!overlayPos) {
            const rect = petWidget.getBoundingClientRect();
            const w = overlaySize ? overlaySize.w : 400;
            const h = overlaySize ? overlaySize.h : 225;
            overlayPos = { x: Math.max(10, rect.left + rect.width / 2 - w / 2), y: Math.max(10, rect.top - h - 30) };
            localStorage.setItem('petOverlayPos', JSON.stringify(overlayPos));
        }
        applyOverlayPosition();
    }
    applyOverlaySize();
    if (overlayPos) applyOverlayPosition();

    if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => {
            const w = youtubeOverlay.offsetWidth, h = youtubeOverlay.offsetHeight;
            if (w > 50 && h > 30) {
                overlaySize = { w, h };
                localStorage.setItem('petOverlaySize', JSON.stringify(overlaySize));
            }
        });
        ro.observe(youtubeOverlay);
    }

    let overlayDragging = false, odStartX = 0, odStartY = 0, odInitX = 0, odInitY = 0;
    if (overlayDragHandle) {
        overlayDragHandle.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation();
            const rect = youtubeOverlay.getBoundingClientRect();
            overlayDragging = true;
            odStartX = e.clientX; odStartY = e.clientY;
            odInitX = rect.left; odInitY = rect.top;
            document.body.style.cursor = 'grabbing';
        });
        overlayDragHandle.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            const t = e.touches[0]; if (!t) return;
            const rect = youtubeOverlay.getBoundingClientRect();
            overlayDragging = true;
            odStartX = t.clientX; odStartY = t.clientY;
            odInitX = rect.left; odInitY = rect.top;
        }, { passive: true });
    }
    function moveOverlay(clientX, clientY) {
        if (!overlayDragging) return;
        const dx = clientX - odStartX, dy = clientY - odStartY;
        const w = youtubeOverlay.offsetWidth, h = youtubeOverlay.offsetHeight;
        let newX = odInitX + dx, newY = odInitY + dy;
        newX = Math.max(-w + 80, Math.min(window.innerWidth - 80, newX));
        newY = Math.max(0, Math.min(window.innerHeight - 40, newY));
        youtubeOverlay.style.left = newX + 'px';
        youtubeOverlay.style.top = newY + 'px';
        youtubeOverlay.style.transform = 'none';
    }
    function endOverlayDrag() {
        if (!overlayDragging) return;
        overlayDragging = false;
        document.body.style.cursor = '';
        const rect = youtubeOverlay.getBoundingClientRect();
        overlayPos = { x: rect.left, y: rect.top };
        localStorage.setItem('petOverlayPos', JSON.stringify(overlayPos));
    }
    document.addEventListener('mousemove', (e) => {
        /* Защита от «залипания»: если кнопка мыши уже отпущена — сбрасываем */
        if (overlayDragging && e.buttons === 0) {
            endOverlayDrag();
            return;
        }
        moveOverlay(e.clientX, e.clientY);
    }, true);
    document.addEventListener('mouseup', endOverlayDrag, true);
    document.addEventListener('touchmove', (e) => {
        if (!overlayDragging) return;
        const t = e.touches[0]; if (!t) return;
        moveOverlay(t.clientX, t.clientY);
    }, { passive: true, capture: true });
    document.addEventListener('touchend', endOverlayDrag, true);
    document.addEventListener('touchcancel', endOverlayDrag, true);
    window.addEventListener('blur', endOverlayDrag);

    /* ==========================================================
       ФУНКЦИИ ПЛЕЕРА
       ========================================================== */
    function formatTime(sec) {
        if (!isFinite(sec) || sec < 0) sec = 0;
        const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
        return m + ':' + String(s).padStart(2, '0');
    }

    function renderTrackList() {
        musicList.innerHTML = '';
        if (TRACKS.length === 0) {
            musicList.innerHTML = '<div class="music-track"><span class="music-track-num">—</span>треки не добавлены</div>';
            return;
        }
        const query = (musicSearchInput && musicSearchInput.value ? musicSearchInput.value : '').trim().toLowerCase();
        let hasVisible = false;
        TRACKS.forEach((t, i) => {
            if (t.hidden) return;
            if (query && !t.title.toLowerCase().includes(query)) return;
            hasVisible = true;
            const row = document.createElement('div');
            row.className = 'music-track' + (i === currentTrack ? ' active' : '');
            row.dataset.idx = i;
            row.innerHTML = `<span class="music-track-num">${i + 1}</span><span>${t.title}</span>`;
            row.addEventListener('click', () => { loadTrack(i); playTrack(); });
            musicList.appendChild(row);
        });
        if (!hasVisible) {
            musicList.innerHTML = '<div class="music-track"><span class="music-track-num">—</span>ничего не найдено</div>';
        }
    }
    function updateListActive() {
        musicList.querySelectorAll('.music-track').forEach(el => {
            const idx = parseInt(el.dataset.idx, 10);
            el.classList.toggle('active', idx === currentTrack);
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
        hideVideoOverlay();

        /* Если переключились с backrooms — сбросить */
        if (t.title !== 'looping the rooms' && backroomsActive) {
            resetBackrooms();
        }
        if (t.title !== 'ヤラララ / YARARARA' && yarararaActive) {
            resetYararara();
        }
        if (t.title !== "who's ready for tomorrow" && tomorrowActive) {
            tomorrowActive = false;
            if (!themeLock) {
                const savedTheme = localStorage.getItem('petTheme') || 'dark';
                document.body.className = savedTheme === 'dark' ? '' : 'theme-' + savedTheme;
            }
        }

        if (state === 'idle') { setMood(null); enterIdle(); }
        if (autoplay) playTrack();
    }

    function playTrack() {
        if (TRACKS.length === 0) return;
        if (currentTrack === -1) loadTrack(0);
        const track = TRACKS[currentTrack];
        if (track && track.onPlay && onPlayTriggeredForTrack !== currentTrack) {
            onPlayTriggeredForTrack = currentTrack;
            setTimeout(() => {
                if (typeof forcePlayPhrase === 'function') {
                    forcePlayPhrase({ text: track.onPlay.text, mood: track.onPlay.mood || 'neutral' }, finishDialog);
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
        else if (ev.action === 'hideVideo') hideVideoOverlay();
        else if (ev.action === 'showLocalVideo') {
            if (ev.theme) {
                if (!themeLock) document.body.className = ev.theme === 'dark' ? '' : 'theme-' + ev.theme;
                localStorage.setItem('petTheme', ev.theme);
            }
            showLocalVideo(ev.src, ev.onEnd, ev.startAt || 0, false);
        }
        else if (ev.action === 'singLine') showSingLine(ev.text, ev.duration || 2800);
        else if (ev.action === 'randomSingOn') startRandomSing();
        else if (ev.action === 'randomSingOff') stopRandomSing();
        else if (ev.action === 'specificSingOn') specificSingActive = true;
        else if (ev.action === 'specificSingOff') specificSingActive = false;
        else if (ev.action === 'backroomsBegin') backroomsBegin();
        else if (ev.action === 'yarararaBegin') yarararaBegin();
        else if (ev.action === 'loveSongBegin') loveSongBegin();
        else if (ev.action === 'tomorrowBegin') tomorrowBegin();
    }

    function showFlashback() {
        cancelIdlePhrase();
        clearInterval(blinkTimer);
        clearTimeout(idleTimer); clearTimeout(sleepTimer);
        clearTimeout(idlePhrase1); clearTimeout(idlePhrase2);
        stopBreathing();
        showLayer('flashback');
        setMood('happy');
    }

    /* ===== BACKROOMS ===== */
    function backroomsBegin() {
        if (backroomsActive) return;
        backroomsActive = true;
        if (!themeLock) document.body.className = 'theme-backrooms';
        cancelIdlePhrase();
        clearInterval(blinkTimer);
        clearTimeout(idleTimer); clearTimeout(sleepTimer);
        clearTimeout(idlePhrase1); clearTimeout(idlePhrase2);
        stopBreathing();
        showLayer('backrooms14');
        setMood('neutral');
    }

    function resetBackrooms() {
        if (!backroomsActive) return;
        backroomsActive = false;
        const savedTheme = localStorage.getItem('petTheme');
        if (savedTheme === 'backrooms') {
            document.body.className = 'theme-backrooms';
        } else {
            document.body.className = savedTheme === 'dark' ? '' : 'theme-' + savedTheme;
        }
    }

    function backroomsEnd() {
        localStorage.setItem('petBackroomsUnlocked', '1');
        unlockBackroomsTheme();
        backroomsActive = false;
        giveCustomAchievement('backrooms',
            '🌫', 'попал в бекрумс', 'прослушал looping the rooms до конца',
            'кажется, я теперь тут застряла... но ты со мной, и мне не страшно~', 'laughing');
        setTimeout(() => {
            const savedTheme = localStorage.getItem('petTheme') || 'dark';
            if (savedTheme === 'backrooms') {
                document.body.className = 'theme-backrooms';
                showLayer('backrooms14');
            } else {
                document.body.className = savedTheme === 'dark' ? '' : 'theme-' + savedTheme;
                if (state === 'idle') { setMood(null); enterIdle(); }
            }
        }, 5000);
    }

    function unlockBackroomsTheme() {
        if (document.querySelector('.theme-btn[data-theme="backrooms"]')) return;
        const btn = document.createElement('button');
        btn.className = 'theme-btn';
        btn.dataset.theme = 'backrooms';
        btn.title = 'бекрумс';
        btn.style.background = 'linear-gradient(135deg, #d4b856, #8a7a30)';
        document.querySelector('.theme-switcher').appendChild(btn);
        btn.addEventListener('click', () => handleThemeClick(btn));
    }
        /* ===== YARARARA ===== */
    function yarararaBegin() {
        if (yarararaActive) return;
        yarararaActive = true;
        if (!themeLock) document.body.className = 'theme-yararara';
        cancelIdlePhrase();
        clearInterval(blinkTimer);
        clearTimeout(idleTimer); clearTimeout(sleepTimer);
        clearTimeout(idlePhrase1); clearTimeout(idlePhrase2);
        stopBreathing();
        showLayer('yararara15');
        setMood('neutral');
    }

    function resetYararara() {
        if (!yarararaActive) return;
        yarararaActive = false;
        const savedTheme = localStorage.getItem('petTheme');
        if (savedTheme === 'yararara') {
            document.body.className = 'theme-yararara';
        } else if (savedTheme === 'backrooms') {
            document.body.className = 'theme-backrooms';
        } else {
            document.body.className = savedTheme === 'dark' ? '' : 'theme-' + savedTheme;
        }
    }

    function yarararaEnd() {
        localStorage.setItem('petYarararaUnlocked', '1');
        unlockYarararaTheme();
        yarararaActive = false;
        giveCustomAchievement('yararara',
            '🔴', 'ярарара', 'прослушал YARARARA до конца',
            'уф, эта песенка меня вымотала... но мне понравилось~', 'laughing');
        setTimeout(() => {
            const savedTheme = localStorage.getItem('petTheme') || 'dark';
            if (savedTheme === 'yararara') {
                document.body.className = 'theme-yararara';
                showLayer('yararara15');
            } else {
                document.body.className = savedTheme === 'dark' ? '' : 'theme-' + savedTheme;
                if (state === 'idle') { setMood(null); enterIdle(); }
            }
        }, 5000);
    }

    function unlockYarararaTheme() {
        if (document.querySelector('.theme-btn[data-theme="yararara"]')) return;
        const btn = document.createElement('button');
        btn.className = 'theme-btn';
        btn.dataset.theme = 'yararara';
        btn.title = 'ярарара';
        btn.style.background = 'linear-gradient(135deg, #e01720, #8a0a0f)';
        document.querySelector('.theme-switcher').appendChild(btn);
        btn.addEventListener('click', () => handleThemeClick(btn));
    }
        /* ===== WHO'S READY FOR TOMORROW ===== */
    function tomorrowBegin() {
        if (tomorrowActive) return;
        tomorrowActive = true;

        /* Открываем тему, если ещё нет */
        if (!localStorage.getItem('petTomorrowUnlocked')) {
            localStorage.setItem('petTomorrowUnlocked', '1');
            unlockTomorrowTheme();
            giveCustomAchievement('tomorrow', '🟡', 'кто готов к завтрашнему дню',
                "прослушал who's ready for tomorrow",
                'интересно, что будет завтра...', 'neutral');
        } else {
            unlockTomorrowTheme();
        }

        /* Меняем фон (если не стоит лок) — НЕ пишем в localStorage, чтобы вернуть пользовательскую тему */
        if (!themeLock) {
            document.body.className = 'theme-tomorrow';
        }

        /* Меняем персонажа и фиксируем его на весь трек */
        cancelIdlePhrase();
        clearInterval(blinkTimer);
        clearTimeout(idleTimer); clearTimeout(sleepTimer);
        clearTimeout(idlePhrase1); clearTimeout(idlePhrase2);
        stopBreathing();
        showLayer('tomorrow16');
        setMood('neutral');

        /* Фраза — но НЕ вызываем finishDialog, а возвращаемся в свой idle */
        setTimeout(() => {
            if (state === 'sleeping') return;
            cancelIdlePhrase();
            setState('talking');
            petSpeech.textContent = 'что-то меняется...';
            showSpeech(true);
            setMood('neutral');
            clearTimeout(talkTimer);
            talkTimer = setTimeout(() => {
                showSpeech(false);
                setMood(null);
                enterIdle();
            }, 2500);
        }, 800);
    }
    function tomorrowEnd() {
        tomorrowActive = false;
     /* Возвращаем её в обычное состояние, если сидит */
        if (state === 'idle') {
            setMood(null);
            enterIdle();
        }
    }

    function unlockTomorrowTheme() {
        if (document.querySelector('.theme-btn[data-theme="tomorrow"]')) return;
        const btn = document.createElement('button');
        btn.className = 'theme-btn';
        btn.dataset.theme = 'tomorrow';
        btn.title = 'кислотный';
        btn.style.background = '#d7fe05';
        document.querySelector('.theme-switcher').appendChild(btn);
        btn.addEventListener('click', () => handleThemeClick(btn));
    }
    /* ===== ЛЮБОВНАЯ ЛЮБОВЬ ===== */
    let loveSongActive = false;
    let heartInterval = null;

    function unlockLoveSong() {
        if (localStorage.getItem('petLoveSongUnlocked') === '1') return;
        localStorage.setItem('petLoveSongUnlocked', '1');
        /* Показываем трек */
        const loveTrack = TRACKS.find(t => t.title === 'любовная любовь');
        if (loveTrack) loveTrack.hidden = false;
        renderTrackList();
        /* Открываем розовые фоны */
        ['pink1', 'pink2', 'pink3'].forEach((name, idx) => {
            if (document.querySelector(`.theme-btn[data-theme="${name}"]`)) return;
            const btn = document.createElement('button');
            btn.className = 'theme-btn';
            btn.dataset.theme = name;
            const pinkTitles = { pink1: 'роза', pink2: 'фуксия', pink3: 'пион' };
            btn.title = pinkTitles[name] || 'розовая';
            btn.style.background = colors[name];
            document.querySelector('.theme-switcher').appendChild(btn);
            btn.addEventListener('click', () => handleThemeClick(btn));
        });
        /* Ачивка */
        giveCustomAchievement('love_song', '💗', 'любовная любовь', 'открыл шестой трек',
            'любовью любовной люби меня!', 'teasing');
    }

    function loveSongBegin() {
        if (loveSongActive) return;
        loveSongActive = true;
        /* Рандомный розовый фон */
        const themes = ['pink1', 'pink2', 'pink3'];
        const chosen = themes[Math.floor(Math.random() * themes.length)];
        if (!themeLock) {
            document.body.className = 'theme-' + chosen;
        }
        /* Запускаем сердечки */
        if (heartInterval) clearInterval(heartInterval);
        heartInterval = setInterval(spawnHeart, 400);
    }

    function loveSongEnd() {
        if (heartInterval) { clearInterval(heartInterval); heartInterval = null; }
        loveSongActive = false;
    }

    function spawnHeart() {
        if (!loveSongActive) return;
        const heart = document.createElement('div');
        heart.className = 'heart-particle';
        const symbols = ['♥', '♡', '💗', '💕', '❤'];
        heart.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        heart.style.left = (Math.random() * window.innerWidth) + 'px';
        heart.style.top = (window.innerHeight + 20) + 'px';
        heart.style.fontSize = (14 + Math.random() * 22) + 'px';
        heart.style.color = ['#ff8ab8', '#ffb0d0', '#ff5a8a', '#ffd0e0'][Math.floor(Math.random() * 4)];
        heart.style.animationDuration = (3 + Math.random() * 2) + 's';
        document.body.appendChild(heart);
        setTimeout(() => heart.remove(), 5500);
    }
        /* ===== ПИАНИНО ===== */
    const PIANO_TRACKS = [
        { file: 'music/piano1.mp3', name: 'опенинг аниме "твоя апрельская ложь"' },
        { file: 'music/piano2.mp3', name: 'песня из столовой (mlpeg)' },
        { file: 'music/piano3.mp3', name: 'ajr - world\'s smallest violin' },
        { file: 'music/piano4.mp3', name: 'эндинг аниме "город, в котором меня нет"' },
        { file: 'music/piano5.mp3', name: 'опенинг аниме "садистская смесь"' },
        { file: 'music/piano6.mp3', name: 'эндинг аниме "этот глупый свин не понимает мечту девочки-зайки"' },
        { file: 'music/piano7.mp3', name: 'stevie wonder - isn\'t she lovely' },
        { file: 'music/piano8.mp3', name: 'anamanaguchi - miku' },
        { file: 'music/piano9.mp3', name: 'опенинг аниме "табакошка" (nannmonee)' },
        { file: 'music/piano10.mp3', name: 'опенинг аниме "евангелион" (a cruel angel\'s thesis)' },
        { file: 'music/piano11.mp3', name: 'опенинг аниме "первородный грех такопи" (happy lucky chappy)' },
        { file: 'music/piano12.mp3', name: 'опенинг аниме "врата штейна" (hacking to the gate)' },
        { file: 'music/piano13.mp3', name: 'the living tombstone - it\'s been so long' },
        { file: 'music/piano14.mp3', name: 'gooseworx - the one who\'s running the show' },
        { file: 'music/piano15.mp3', name: 'harry dacre - daisy bell' },
        { file: 'music/piano16.mp3', name: 'gooseworx - your new home' },
        { file: 'music/piano17.mp3', name: 'заставка "финес и ферб" (today is gonna be a great day)' },
        { file: 'music/piano18.mp3', name: 'C418 - chirp' },
        { file: 'music/piano19.mp3', name: 'encanto - we don\'t talk about bruno' },
        { file: 'music/piano20.mp3', name: 'эндинг аниме "звёздное дитя 2" (burning)' },
        { file: 'music/piano21.mp3', name: 'эндинг аниме "100 девушек, которые очень любят тебя 2" (unmei?)' },
        { file: 'music/piano22.mp3', name: 'gooseworx - main theme' },
        { file: 'music/piano23.mp3', name: 'ajr - weak' }
    ];

    function ensurePianoAudio() {
        if (!pianoAudio) {
            pianoAudio = new Audio();
            pianoAudio.volume = 0.7;
            pianoAudio.addEventListener('ended', () => {
                if (pianoMode) stopPiano();
            });
        }
        return pianoAudio;
    }

    function startPiano(forceIndex) {
        if (state === 'sleeping') return;
        if (pianoMode) return;

        pianoMode = true;

        /* Сбрасываем другие пасхальные режимы */
        backroomsActive = false;
        yarararaActive = false;
        tomorrowActive = false;

        /* Ставим основную музыку на паузу */
        if (isPlaying) audioEl.pause();

        /* Выбираем трек */
        let idx;
        if (typeof forceIndex === 'number') {
            idx = forceIndex;
        } else {
            idx = Math.floor(Math.random() * PIANO_TRACKS.length);
            if (PIANO_TRACKS.length > 1 && idx === lastPianoIndex) {
                idx = (idx + 1) % PIANO_TRACKS.length;
            }
        }
        lastPianoIndex = idx;
        const track = PIANO_TRACKS[idx];

        /* Сообщение в чат */
        addChatMessage('pet', `хорошо, я сыграю: ${track.name}. напиши "хватит", чтобы остановить мою игру, и "некст", чтобы я сыграла что-то другое`);

        /* Меняем спрайт на пианино */
        cancelIdlePhrase();
        clearInterval(blinkTimer);
        clearTimeout(idleTimer); clearTimeout(sleepTimer);
        clearTimeout(idlePhrase1); clearTimeout(idlePhrase2);
        stopBreathing();
        setState('idle');
        showLayer('piano17');
        setMood('happy');

        /* Играем */
        const p = ensurePianoAudio();
        p.src = track.file;
        p.currentTime = 0;
        const playPromise = p.play();
        if (playPromise && playPromise.catch) playPromise.catch(() => {});
    }

    function stopPiano() {
        if (!pianoMode) return;
        pianoMode = false;
        if (pianoAudio) {
            pianoAudio.pause();
            pianoAudio.currentTime = 0;
        }
        if (state === 'idle') {
            setMood(null);
            enterIdle();
        }
    }

    function nextPiano() {
        if (!pianoMode) return;
        if (isPlaying) audioEl.pause();
        if (pianoAudio) {
            pianoAudio.pause();
            pianoAudio.currentTime = 0;
        }
        pianoMode = false;
        startPiano();
    }

    /* ===== ВИДЕО ===== */
    function showLocalVideo(src, endAction, startAt, unmute) {
        if (!localVideo || !youtubeOverlay) return;
        youtubeIframe.src = '';
        youtubeIframe.classList.remove('active');
        localVideo.onended = null;
        localVideo.onloadedmetadata = null;
        if (endAction === 'kamiiFirstUAndIEnd') localVideo.onended = kamiiFirstUAndIEnded;
        localVideo.classList.add('active');
        localVideo.muted = !unmute;

        const playVideo = () => {
            ensureOverlayLayout();
            youtubeOverlay.classList.add('show');
            isVideoPlaying = true;
            const p = localVideo.play();
            if (p && p.catch) {
                if (unmute) {
                    localVideo.muted = true;
                    localVideo.play().then(() => { try { localVideo.muted = false; } catch(_) {} }).catch(() => {});
                }
            } else if (unmute && p && p.then) {
                p.then(() => { try { localVideo.muted = false; } catch(_) {} }).catch(() => {});
            }
        };

        if (startAt && startAt > 0) {
            localVideo.onloadedmetadata = () => {
                localVideo.onloadedmetadata = null;
                try { localVideo.currentTime = startAt; } catch(_) {}
                playVideo();
            };
            localVideo.src = src;
            setTimeout(() => { if (!youtubeOverlay.classList.contains('show')) playVideo(); }, 500);
        } else {
            localVideo.src = src;
            playVideo();
        }
    }

    function playMemeVideo(src) {
        if (!localVideo || !youtubeOverlay) return;
        youtubeIframe.src = '';
        youtubeIframe.classList.remove('active');
        localVideo.onended = null;
        localVideo.onloadedmetadata = null;
        localVideo.onended = () => {
            hideVideoOverlay();
            setTimeout(() => {
                if (state === 'sleeping') return;
                forcePlayPhrase({ text: 'мне так нравится это меме!', mood: 'happy' }, finishDialog);
            }, 400);
        };
        localVideo.classList.add('active');
        localVideo.muted = true;
        localVideo.src = src;
        localVideo.currentTime = 0;
        ensureOverlayLayout();
        youtubeOverlay.classList.add('show');
        isVideoPlaying = true;
        const p = localVideo.play();
        if (p && p.catch) { p.catch(() => {}).then(() => { try { localVideo.muted = false; } catch(_) {} }); }
        else if (p && p.then) { p.then(() => { try { localVideo.muted = false; } catch(_) {} }).catch(() => {}); }
    }

    function hideVideoOverlay() {
        if (!youtubeOverlay) return;
        youtubeOverlay.classList.remove('show');
        isVideoPlaying = false;
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

    /* ===== ПОДПЕВАНИЕ ===== */
    const RANDOM_SING_PHRASES = [
        'я сошла с ума, я сошла с ума...',
        'мне нужна онаааа',
        'яяя сооошлааа с умааа'
    ];
    let randomSingTimer = null, randomSingActive = false, specificSingActive = false;

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
        if (currentTrack !== 1 && currentTrack !== 3) return;
        cancelIdlePhrase();
        clearTimeout(idleTimer); clearTimeout(idlePhrase1); clearTimeout(idlePhrase2);
        clearInterval(blinkTimer);
        petSpeech.textContent = text;
        showSpeech(true);
        if (currentTrack === 3) { showLayer('backrooms14'); }
        else { setMood('happy'); showLayer('happy1'); }
        clearTimeout(talkTimer);
        talkTimer = setTimeout(() => {
            showSpeech(false);
            if (currentTrack === 3) { showLayer('backrooms14'); }
            else { setMood(null); if (state === 'idle') showLayer('idle'); }
        }, duration);
    }

    /* ===== НОТЫ ===== */
    let noteSpawnTimer = null;
    function startMusicNotes() {
        stopMusicNotes();
        spawnNote(); spawnNote();
        noteSpawnTimer = setInterval(spawnNote, 550);
    }
    function stopMusicNotes() { if (noteSpawnTimer) { clearInterval(noteSpawnTimer); noteSpawnTimer = null; } }
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

    /* ===== EVENTS ===== */
    audioEl.addEventListener('play', () => {
        isPlaying = true;
        updatePlayBtn();
        startMusicNotes();

        /* Если играет пианино — останавливаем его и ругаемся */
        if (pianoMode && pianoAudio && !pianoAudio.paused) {
            pianoAudio.pause();
            addChatMessage('pet', 'тебе что, не нравится моя игра? тогда напиши "хватит" и слушай свою музыку спокойно!');
        }

        /* Если идёт пианино — не трогаем спрайт */
        if (pianoMode) return;

        /* ФИКС: если она спала — разбудить */
        if (state === 'sleeping') {
            wakeUp();
        } else if (state === 'idle') {
            clearTimeout(idleTimer); clearTimeout(idlePhrase1); clearTimeout(idlePhrase2);
        }

        /* ФИКС: если это backrooms-трек — показать потерянный кадр */
        if (currentTrack === 3) {
            backroomsActive = true;
            showLayer('backrooms14');
            document.body.className = 'theme-backrooms';
        }
        /* ФИКС: если это yararara-трек — показать 15.png */
        if (currentTrack === 4) {
            yarararaActive = true;
            showLayer('yararara15');
            document.body.className = 'theme-yararara';
        }
        /* ФИКС: если это who's ready for tomorrow — показать 16.png */
        if (currentTrack === 6) {
            tomorrowActive = true;
            showLayer('tomorrow16');
            if (!themeLock) document.body.className = 'theme-tomorrow';
        }
    });

    audioEl.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayBtn();
        stopMusicNotes();
        stopRandomSing();
        specificSingActive = false;

        /* Если идёт пианино — не трогаем спрайт */
        if (pianoMode) return;

        /* ФИКС: при паузе на backrooms — показать потерянный кадр, а не idle */
        if (currentTrack === 3 && backroomsActive) {
            clearInterval(blinkTimer);
            showLayer('backrooms14');
            return;
        }
        /* ФИКС: при паузе на yararara — показать 15.png */
        if (currentTrack === 4 && yarararaActive) {
            clearInterval(blinkTimer);
            showLayer('yararara15');
            return;
        }
        /* ФИКС: при паузе на who's ready for tomorrow — показать 16.png */
        if (currentTrack === 6 && tomorrowActive) {
            clearInterval(blinkTimer);
            showLayer('tomorrow16');
            return;
        }
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
        const track = TRACKS[currentTrack];
        if (track && track.onEnd === 'backroomsEnd') backroomsEnd();
        if (track && track.onEnd === 'yarararaEnd') yarararaEnd();
        if (track && track.onEnd === 'loveSongEnd') loveSongEnd();
        if (track && track.onEnd === 'tomorrowEnd') tomorrowEnd();
        if (isRepeat) {
            firedEvents = new Set(); onPlayTriggeredForTrack = -1;
            stopRandomSing(); specificSingActive = false;
            audioEl.currentTime = 0; playTrack();
        } else {
            loadTrack(getNextVisibleTrack(currentTrack + 1), true);
        }
    });

    musicPlayBtn.addEventListener('click', () => { if (isPlaying) pauseTrack(); else playTrack(); });
    musicPrevBtn.addEventListener('click', () => {
        if (audioEl.currentTime > 3) { audioEl.currentTime = 0; firedEvents = new Set(); }
        else loadTrack(currentTrack - 1, true);
    });
    function isSpecialTrack(idx) {
        const t = TRACKS[idx];
        if (!t) return false;
        if (t.onEnd) return true;
        if (t.events) {
            const specialActions = ['backroomsBegin', 'yarararaBegin', 'loveSongBegin', 'tomorrowBegin'];
            if (t.events.some(ev => specialActions.includes(ev.action))) return true;
            if (t.events.some(ev => ev.theme)) return true;
        }
        return false;
    }

    function getShuffleIndex() {
        const candidates = [];
        TRACKS.forEach((t, i) => {
            if (t.hidden) return;
            if (isSpecialTrack(i)) return;
            if (i === currentTrack) return;
            candidates.push(i);
        });
        if (candidates.length === 0) return currentTrack;
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    function getNextVisibleTrack(fromIdx) {
        if (isShuffled) return getShuffleIndex();
        let i = fromIdx;
        for (let step = 0; step < TRACKS.length; step++) {
            const idx = ((i + step) % TRACKS.length + TRACKS.length) % TRACKS.length;
            if (!TRACKS[idx].hidden) return idx;
        }
        return 0;
    }
    musicNextBtn.addEventListener('click', () => loadTrack(getNextVisibleTrack(currentTrack + 1), true));
    musicRepeatBtn.addEventListener('click', () => {
        isRepeat = !isRepeat;
        musicRepeatBtn.classList.toggle('active', isRepeat);
        musicRepeatBtn.title = isRepeat ? 'повтор включён' : 'повтор выключен';
    });
    musicExpandBtn.addEventListener('click', () => {
        isExpanded = !isExpanded;
        musicList.classList.toggle('open', isExpanded);
        musicExpandBtn.classList.toggle('open', isExpanded);
        musicSearchWrap.classList.toggle('open', isExpanded);
        if (isExpanded) {
            setTimeout(() => { if (musicSearchInput) musicSearchInput.focus(); }, 300);
        }
    });

    musicShuffleBtn.addEventListener('click', () => {
        isShuffled = !isShuffled;
        musicShuffleBtn.classList.toggle('active', isShuffled);
        musicShuffleBtn.title = isShuffled ? 'перемешать (вкл)' : 'перемешать (выкл)';
    });

    musicSearchInput.addEventListener('input', () => {
        renderTrackList();
        updateListActive();
    });
    musicProgressWrap.addEventListener('click', (e) => {
        if (!audioEl.duration || !isFinite(audioEl.duration)) return;
        const rect = musicProgressWrap.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audioEl.currentTime = audioEl.duration * p;
        const track = TRACKS[currentTrack];
        if (track && track.events) {
            track.events.forEach((ev, idx) => { if (audioEl.currentTime >= ev.time) firedEvents.add(idx); });
        }
    });
    musicVolume.addEventListener('input', () => {
        audioEl.volume = parseFloat(musicVolume.value);
        localStorage.setItem('petVolume', audioEl.volume);
    });
    audioEl.volume = parseFloat(musicVolume.value);
    const savedVol = localStorage.getItem('petVolume');
    if (savedVol !== null) { const v = parseFloat(savedVol); if (!isNaN(v)) { audioEl.volume = v; musicVolume.value = v; } }

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
        const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
        if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
    const formatTotal = sec => Math.floor(sec / 3600) + 'ч';
    function renderTimers() {
        timerCurrent.textContent = '⏱ ' + formatSession(sessionSeconds);
        timerTotal.textContent = 'всего: ' + formatTotal(totalSeconds);
    }
    setInterval(() => {
        sessionSeconds++; totalSeconds++;
        renderTimers(); checkTimeMilestones(); checkAllAchievements();
    }, 1000);
    setInterval(() => { localStorage.setItem('petTotalSeconds', totalSeconds); }, 5000);
    window.addEventListener('beforeunload', () => { localStorage.setItem('petTotalSeconds', totalSeconds); });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) localStorage.setItem('petTotalSeconds', totalSeconds);
    });
    renderTimers();

    /* ==========================================================
       КАРТИНКИ
       ========================================================== */
    const IMAGES = {
        sleep1: 'images/1.png', sleep2: 'images/2.png', wake: 'images/3.png',
        blink: 'images/4.png', idle: 'images/5.png', talk1: 'images/6.png', talk2: 'images/7.png',
        happy1: 'images/8.png', happy2: 'images/9.png', angry: 'images/10.png',
        laugh: 'images/11.png', tease: 'images/12.png',         flashback: 'images/13.png',
        backrooms14: 'images/14.png',
        yararara15: 'images/15.png',
        tomorrow16: 'images/16.png',
        piano17:    'images/17.png'
    };
    Object.values(IMAGES).forEach(src => { const i = new Image(); i.src = src; });

    function getMoscowTime() {
        return new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });
    }
    const getPhraseText = phrase => typeof phrase.text === 'function' ? phrase.text() : phrase.text;

    /* ===== ДИАЛОГИ (коротко, чтобы сэкономить место — оставил все что были) ===== */
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
        { triggers: ['snow snow'], video: 'video/1.mp4', name: 'snow snow' },
        { triggers: ['skazka', 'skazka old', 'сказка', 'сказка старая'], video: 'video/2.mp4', name: 'skazka' },
        { triggers: ['me! me! me!', 'me me me'], video: 'video/3.mp4', name: 'me! me! me!' },
        { triggers: ['silly letters', 'глупые письма'], video: 'video/4.mp4', name: 'silly letters' },
        { triggers: ['stay away'], video: 'video/5.mp4', name: 'stay away' },
        { triggers: ['life letters'], video: 'video/6.mp4', name: 'life letters' },
        { triggers: ['hit or miss'], video: 'video/7.mp4', name: 'hit or miss' },
        { triggers: ['i am the man'], video: 'video/8.mp4', name: 'i am the man' },
        { triggers: ['bury a friend'], video: 'video/9.mp4', name: 'bury a friend' },
        { triggers: ['stfd'], video: 'video/10.mp4', name: 'stfd' },
        { triggers: ['doctor'], video: 'video/11.mp4', name: 'doctor' },
        { triggers: ['hp'], video: 'video/12.mp4', name: 'hp' },
        { triggers: ['i need her', 'мне нужна она', 'я сошла с ума'], video: 'video/13.mp4', name: 'i need her' },
        { triggers: ['i love my life'], video: 'video/14.mp4', name: 'i love my life' },
        { triggers: ['boomx4'], video: 'video/15.mp4', name: 'boomx4' },
        { triggers: ['cut my hair'], video: 'video/16.mp4', name: 'cut my hair' },
        { triggers: ['panic room'], video: 'video/17.mp4', name: 'panic room' },
        { triggers: ['u and i'], video: 'video/18.mp4', name: 'u and i' },
        { triggers: ['let it snow'], video: 'video/19.mp4', name: 'let it snow' },
        { triggers: ['believer'], video: 'video/20.mp4', name: 'believer' },
        { triggers: ['i do love you'], video: 'video/21.mp4', name: 'i do love you' },
        { triggers: ['birthday party'], video: 'video/22.mp4', name: 'birthday party' },
        { triggers: ['it seems', 'кажется'], video: 'video/23.mp4', name: 'it seems' },
        { triggers: ['american boy'], video: 'video/24.mp4', name: 'american boy' },
        { triggers: ["cant hold us", "can't hold us"], video: 'video/25.mp4', name: "can't hold us" },
        { triggers: ['omg'], video: 'video/26.mp4', name: 'omg' },
        { triggers: ['hip'], video: 'video/27.mp4', name: 'hip' },
        { triggers: ['моя кошка'], video: 'video/28.mp4', name: 'моя кошка' },
        { triggers: ['плак плак'], video: 'video/29.mp4', name: 'плак плак' },
        { triggers: ['bang bang'], video: 'video/30.mp4', name: 'bang bang' },
        { triggers: ['skazka remake', 'skazka new', 'сказка новая'], video: 'video/31.mp4', name: 'skazka remake' },
        { triggers: ['boys'], video: 'video/32.mp4', name: 'boys' },
        { triggers: ['weeaboo'], video: 'video/33.mp4', name: 'weeaboo' },
        { triggers: ['dessert'], video: 'video/34.mp4', name: 'dessert' },
        { triggers: ['no place'], video: 'video/35.mp4', name: 'no place' },
        { triggers: ['xd', 'хд'], video: 'video/36.mp4', name: 'xd' },
        { triggers: ['shape of you'], video: 'video/37.mp4', name: 'shape of you' },
        { triggers: ['improvement'], video: 'video/38.mp4', name: 'improvement' },
        { triggers: ['karma', 'карма'], video: 'video/39.mp4', name: 'karma' },
        { triggers: ['tonight'], video: 'video/40.mp4', name: 'tonight' },
        { triggers: ['in the apricot valley', 'абрикосовая долина', 'в абрикосовой долине', 'абрикос'], video: 'video/41.mp4', name: 'apricot valley' },
        { triggers: ['100 bad days'], video: 'video/42.mp4', name: '100 bad days' },
        { triggers: ['miku miku beam'], video: 'video/43.mp4', name: 'miku miku beam' },
        { triggers: ['поровну'], video: 'video/44.mp4', name: 'поровну' },
        { triggers: ['avgn dance', 'avgn'], video: 'video/45.mp4', name: 'avgn' }
    ];

    let foundMemes = new Set();
    try { const s = JSON.parse(localStorage.getItem('petFoundMemes') || '[]'); if (Array.isArray(s)) foundMemes = new Set(s); } catch(_) {}
    let memeFavorites = [];
    try { const s = JSON.parse(localStorage.getItem('petMemeFavorites') || '[]'); if (Array.isArray(s)) memeFavorites = s; } catch(_) {}
    const saveFoundMemes = () => localStorage.setItem('petFoundMemes', JSON.stringify([...foundMemes]));
    const saveMemeFavorites = () => localStorage.setItem('petMemeFavorites', JSON.stringify(memeFavorites));
    function findMemeMatch(text) {
        const normalized = text.trim().toLowerCase();
        for (const meme of MEME_EASTER_EGGS) {
            for (const trigger of meme.triggers) if (normalized === trigger.toLowerCase()) return meme;
        }
        return null;
    }
    function updateMemeBtnVisibility() {
        memeBtn.style.display = foundMemes.size > 0 ? '' : 'none';
    }

    /* ==========================================================
       ДОСТИЖЕНИЯ
       ========================================================== */
    const ACHIEVEMENTS = [
        { type: 'friendship', target: 10,  icon: "🌱", title: "незнакомец", desc: "первая встреча, мимолетный взгляд", text: "ты меня не затискаешь до смерти, надеюсь?", mood: "neutral" },
        { type: 'friendship', target: 25,  icon: "🦋", title: "знакомый", desc: "кажется, у вас всё же есть что-то общее", text: "ладно, ты мне нравишься", mood: "happy" },
        { type: 'friendship', target: 50,  icon: "🐝", title: "друг", desc: "видимо, тебе понравилось обсуждать с ней то аниме про айдолов в двадцатый раз?", text: "я тебя запомнила, знай!", mood: "happy" },
        { type: 'friendship', target: 67,  icon: "🤖", title: "67", desc: "67676767676767", text: "67... сикс севен... брейнрот detected", mood: "laughing" },
        { type: 'friendship', target: 100, icon: "👤", title: "теневой", desc: "когда вы успели стать так близки?", text: "ты стал моим лучшим другом~", mood: "laughing" },
        { type: 'time', target: 5 * 60,    icon: "⏱", title: "5 минут",   desc: "первое совместное мгновение — с чего-то же надо начинать!", text: "пять минут вместе — уже что-то!", mood: "happy" },
        { type: 'time', target: 10 * 60,   icon: "⏱", title: "10 минут",  desc: "ты не ушёл сразу — и это уже приятно", text: "десять минут! время летит~", mood: "happy" },
        { type: 'time', target: 30 * 60,   icon: "⏳", title: "полчаса",   desc: "полчаса — а кажется, что мы знакомы давно", text: "полчаса вместе, вот это да!", mood: "happy" },
        { type: 'time', target: 60 * 60,   icon: "⏰", title: "час",       desc: "целый час рядом со мной. я это запомню", text: "целый час! я тронута~", mood: "happy" },
        { type: 'time', target: 2 * 3600,  icon: "🕐", title: "2 часа",    desc: "ты правда остался на два часа... я впечатлена", text: "2 часа вместе, я впечатлена!", mood: "laughing" },
        { type: 'time', target: 5 * 3600,  icon: "🕔", title: "5 часов",   desc: "пять часов. это уже не случайность, это судьба", text: "5 часов... ты серьёзно?!", mood: "laughing" },
        { type: 'time', target: 10 * 3600, icon: "🌙", title: "10 часов",  desc: "десять часов вместе... ты стал моим теневым", text: "10 часов вместе... ты мой теневой теперь!", mood: "laughing" },
        { type: 'time', target: 24 * 3600, icon: "🌟", title: "24 часа", desc: "считай, целый день вместе провели, каково тебе жить со мной?", text: "целые сутки вместе! теперь я твоя навсегда~", mood: "laughing" },
        { type: 'time', target: 48 * 3600, icon: "💞", title: "48 часов с ками", desc: "мы с тобой вместе уже два дня... как детей назовём?~", text: "два дня вместе! как детей назовём?~", mood: "teasing" },
        { type: 'messages', target: 1,   icon: "✉",  title: "первое слово",  desc: "отправь ками 1 сообщение", text: "ты написал мне первое сообщение! ура!", mood: "happy" },
        { type: 'messages', target: 5,   icon: "✉",  title: "5 сообщений",   desc: "отправь ками 5 сообщений", text: "пять сообщений! мы болтаем!", mood: "happy" },
        { type: 'messages', target: 10,  icon: "💬", title: "10 сообщений",  desc: "отправь ками 10 сообщений", text: "десять сообщений, так держать!", mood: "happy" },
        { type: 'messages', target: 30,  icon: "💬", title: "30 сообщений",  desc: "отправь ками 30 сообщений", text: "тридцать! ты разговорчивый~", mood: "happy" },
        { type: 'messages', target: 50,  icon: "💬", title: "50 сообщений",  desc: "отправь ками 50 сообщений", text: "пятьдесят! мы точно подружились", mood: "laughing" },
        { type: 'messages', target: 67,  icon: "🔢", title: "67 сообщений",  desc: "отправь ками 67 сообщений", text: "67 сообщений... это судьба", mood: "laughing" },
        { type: 'messages', target: 100, icon: "💯", title: "100 сообщений", desc: "отправь ками 100 сообщений", text: "сто сообщений! ты меня завалил болтовнёй~", mood: "laughing" },
        { type: 'memes', target: 1,  icon: "🎬", title: "любопытный",        desc: "найти 1 пасхалку", text: "ты нашёл первую пасхалку! таких ещё много~", mood: "happy" },
        { type: 'memes', target: 10, icon: "📼", title: "пару раз смотрел",  desc: "найти 10 пасхалок", text: "десять меме! ты знаток~", mood: "laughing" },
        { type: 'memes', target: 25, icon: "🎞", title: "немного шаришь",    desc: "найти 25 пасхалок", text: "двадцать пять! ты почти всё нашёл!", mood: "laughing" },
        { type: 'memes', target: 45, icon: "🏆", title: "главный фанат",     desc: "найти все 45 пасхалок", text: "ты нашёл ВСЁ! ты настоящая легенда!!", mood: "laughing" }
    ];

    /* Кастомные достижения */
    let customAchievements = [];
    try { const s = JSON.parse(localStorage.getItem('petCustomAch') || '[]'); if (Array.isArray(s)) customAchievements = s; } catch(_) {}

    function giveCustomAchievement(id, icon, title, desc, text, mood) {
        if (customAchievements.includes(id)) return;
        customAchievements.push(id);
        localStorage.setItem('petCustomAch', JSON.stringify(customAchievements));
        renderAchPanel();        /* ← обновляем панель сразу */
        onAchievementUnlocked();
        setTimeout(() => {
            if (state === 'sleeping') return;
            forcePlayPhrase({ text, mood: mood || 'laughing' }, finishDialog);
        }, 900);
    }

    const shownAchievements = new Set(JSON.parse(localStorage.getItem('petAchShownV3') || '[]'));
    const achKey = a => a.type + '_' + a.target;
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
        if (type === 'themes') return (localStorage.getItem('petBackroomsUnlocked') === '1' ? 1 : 0);
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
            if (getProgress(a.type) >= a.target) { shownAchievements.add(key); unlockedAny = true; }
        });
        if (unlockedAny) {
            localStorage.setItem('petAchShownV3', JSON.stringify([...shownAchievements]));
            renderAchPanel(); onAchievementUnlocked();
        }
    }

    let achToastEl = null, achToastHideTimer = null, achPhraseTimer = null;
    function ensureAchToast() {
        if (achToastEl && document.body.contains(achToastEl)) return achToastEl;
        achToastEl = document.createElement('div');
        achToastEl.className = 'ach-toast';
        achToastEl.innerHTML = `<div class="ach-toast-icon">🏆</div>
            <div class="ach-toast-text">
                <div class="ach-toast-title">получена ачивка!</div>
                <div class="ach-toast-sub">нажми сюда, чтобы открыть список</div>
            </div>`;
        achToastEl.addEventListener('click', () => {
            achPanel.classList.add('open'); unreadAchievements = 0;
            updateAchBadge(); achToastEl.classList.remove('show');
            clearTimeout(achToastHideTimer);
        });
        document.body.appendChild(achToastEl);
        return achToastEl;
    }
    function showAchToast() {
        const toast = ensureAchToast();
        void toast.offsetWidth; toast.classList.add('show');
        clearTimeout(achToastHideTimer);
        achToastHideTimer = setTimeout(() => toast.classList.remove('show'), 5500);
    }
    function playAchievementSound() {
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            const ctx = new Ctx(), now = ctx.currentTime;
            [{ freq: 1318.51, time: 0, dur: 0.4, vol: 0.10 }, { freq: 1760, time: 0.13, dur: 0.45, vol: 0.13 }, { freq: 2217.46, time: 0.27, dur: 0.6, vol: 0.11 }].forEach(n => {
                const osc = ctx.createOscillator(), gain = ctx.createGain();
                osc.type = 'sine'; osc.frequency.value = n.freq;
                const t = now + n.time;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(n.vol, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);
                osc.connect(gain); gain.connect(ctx.destination);
                osc.start(t); osc.stop(t + n.dur + 0.1);
            });
        } catch (e) { }
    }
    function spawnFireworks() {
        const rect = petWidget.getBoundingClientRect();
        const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        const colors = ['#ff5a8a', '#ff9a5a', '#ffd54a', '#8a7fd4', '#5eb3e4', '#8bc34a', '#ff7aaa'];
        for (let b = 0; b < 4; b++) setTimeout(() => {
            const bx = cx + (Math.random() - 0.5) * 220, by = cy + (Math.random() - 0.5) * 160;
            const color = colors[Math.floor(Math.random() * colors.length)];
            for (let i = 0; i < 14; i++) {
                const p = document.createElement('div');
                p.className = 'firework-particle' + (i % 3 === 0 ? ' large' : '');
                p.style.left = bx + 'px'; p.style.top = by + 'px';
                p.style.color = color; p.style.background = color;
                const angle = (Math.PI * 2 / 14) * i + Math.random() * 0.4;
                const dist = 55 + Math.random() * 70;
                p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
                p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
                document.body.appendChild(p);
                setTimeout(() => p.remove(), 1600);
            }
        }, b * 180);
    }
    function updateAchBadge() {
        let badge = achBtn.querySelector('.ach-badge');
        if (unreadAchievements > 0) {
            if (!badge) { badge = document.createElement('span'); badge.className = 'ach-badge'; achBtn.appendChild(badge); }
            badge.textContent = unreadAchievements;
            badge.style.animation = 'none'; void badge.offsetWidth; badge.style.animation = '';
        } else if (badge) badge.remove();
    }
    function onAchievementUnlocked() {
        unreadAchievements++; updateAchBadge();
        showAchToast(); playAchievementSound(); spawnFireworks();
        clearTimeout(achPhraseTimer);
        achPhraseTimer = setTimeout(() => showAchievementPhrase(), 900);
    }
    function showAchievementPhrase() {
        if (state === 'sleeping') return;
        cancelIdlePhrase();
        clearTimeout(wakeTimer); clearTimeout(idleTimer); clearTimeout(sleepTimer);
        clearInterval(blinkTimer); stopBreathing(); stopTalkAnim();
        setState('talking');
        petSpeech.textContent = "поздравляю с ачивкой!";
        showSpeech(true); setMood('happy'); startTalkAnim('happy');
        clearTimeout(talkTimer);
        talkTimer = setTimeout(() => finishDialog(), 3500);
    }
    function spawnClickFx(x, y, delta) {
        const ring = document.createElement('div');
        ring.className = 'click-ring' + (delta < 0 ? ' negative' : '');
        ring.style.left = x + 'px'; ring.style.top = y + 'px';
        document.body.appendChild(ring); setTimeout(() => ring.remove(), 800);
        const fx = document.createElement('div');
        fx.className = 'click-fx ' + (delta < 0 ? 'negative' : 'positive');
        fx.textContent = (delta > 0 ? '+' : '') + delta;
        fx.style.left = x + 'px'; fx.style.top = y + 'px';
        document.body.appendChild(fx); setTimeout(() => fx.remove(), 1150);
        const dotCount = delta < 0 ? 3 : 5;
        for (let i = 0; i < dotCount; i++) {
            const dot = document.createElement('div');
            dot.className = 'click-dot' + (delta < 0 ? ' negative' : '');
            const angle = (Math.PI * 2 / dotCount) * i + Math.random() * 0.5;
            const dist = 30 + Math.random() * 30;
            dot.style.left = x + 'px'; dot.style.top = y + 'px';
            dot.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
            dot.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
            document.body.appendChild(dot); setTimeout(() => dot.remove(), 900);
        }
    }

    const ACH_GROUPS_OPEN = {};

    function renderAchPanel() {
        const groups = [
            { type: 'friendship', label: '❤ дружба' },
            { type: 'time',       label: '⏱ время' },
            { type: 'messages',   label: '💬 сообщения' },
            { type: 'memes',      label: '🎬 пасхалки' }
        ];
        /* Фоны — только если есть разблокированный фон */
        if (localStorage.getItem('petBackroomsUnlocked') === '1') {
            groups.push({ type: 'themes', label: '🎨 фоны' });
        }

        const total = ACHIEVEMENTS.length;
        const totalUnlocked = ACHIEVEMENTS.filter(a => shownAchievements.has(achKey(a))).length;
        const grandTotal = total + customAchievements.length;

        let html = `<div class="ach-header">🏆 ачивки · ${totalUnlocked + customAchievements.length}/${grandTotal}</div>`;

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
                            return `<div class="ach-item ${u ? 'unlocked' : 'locked'}">
                                <div class="ach-icon">${u ? a.icon : '🔒'}</div>
                                <div class="ach-info">
                                    <div class="ach-title">${u ? a.title : '???'}</div>
                                    <div class="ach-desc">${u ? a.desc : 'пока не открыто'}</div>
                                </div>
                                <div class="ach-status">${u ? '✓' : '???'}</div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>`;
        });

        /* Особые (кастомные) */
        if (customAchievements.length > 0) {
            const open = ACH_GROUPS_OPEN['custom'] ? 'open' : '';
            html += `<div class="ach-group ${open}" data-group="custom">
                <div class="ach-group-header">
                    <span>✨ особые</span>
                    <span class="ach-group-count">${customAchievements.length} <span class="ach-group-arrow">▼</span></span>
                </div>
                <div class="ach-group-body">
                    ${customAchievements.map(id => {
                     if (id === 'backrooms') {
                        return `<div class="ach-item unlocked">
                            <div class="ach-icon">🌫</div>
                            <div class="ach-info">
                                <div class="ach-title">попал в бекрумс</div>
                                <div class="ach-desc">прослушал looping the rooms до конца</div>
                            </div>
                            <div class="ach-status">✓</div>
                        </div>`;
                    }
                    if (id === 'yararara') {
                        return `<div class="ach-item unlocked">
                            <div class="ach-icon">🔴</div>
                            <div class="ach-info">
                                <div class="ach-title">ярарара</div>
                                <div class="ach-desc">прослушал YARARARA до конца</div>
                            </div>
                            <div class="ach-status">✓</div>
                        </div>`;
                    }
                     if (id === 'brown') {
                        return `<div class="ach-item unlocked">
                            <div class="ach-icon">🤎</div>
                            <div class="ach-info">
                                <div class="ach-title">коричневый фанат</div>
                                <div class="ach-desc">открыл коричневые темы</div>
                            </div>
                            <div class="ach-status">✓</div>
                        </div>`;
                    }
                     if (id === 'love_song') {
                        return `<div class="ach-item unlocked">
                            <div class="ach-icon">💗</div>
                            <div class="ach-info">
                                <div class="ach-title">любовная любовь</div>
                                <div class="ach-desc">открыл шестой трек</div>
                            </div>
                            <div class="ach-status">✓</div>
                        </div>`;
                    }
                      if (id === 'rgb') {
                        return `<div class="ach-item unlocked">
                            <div class="ach-icon">🌈</div>
                            <div class="ach-info">
                                <div class="ach-title">спасите мои глаза...</div>
                                <div class="ach-desc">открыл RGB-тему</div>
                            </div>
                            <div class="ach-status">✓</div>
                        </div>`;
                    }
                      if (id === 'tomorrow') {
                        return `<div class="ach-item unlocked">
                            <div class="ach-icon">🟡</div>
                            <div class="ach-info">
                                <div class="ach-title">готов к завтрашнему дню</div>
                                <div class="ach-desc">прослушал who's ready for tomorrow</div>
                            </div>
                            <div class="ach-status">✓</div>
                        </div>`;
                    }
                    return '';
                    }).join('')}
                </div>
            </div>`;
        }

        /* Кнопка витрины */
        html += `<button class="vitrina-btn" id="vitrinaBtn">🏆 витрина достижений</button>`;

        achPanel.innerHTML = html;

        achPanel.querySelectorAll('.ach-group-header').forEach(h => {
            h.addEventListener('click', () => {
                const grp = h.parentElement;
                const type = grp.dataset.group;
                grp.classList.toggle('open');
                ACH_GROUPS_OPEN[type] = grp.classList.contains('open');
            });
        });

        const vb = achPanel.querySelector('#vitrinaBtn');
        if (vb) vb.addEventListener('click', (e) => {
            e.stopPropagation();
            vitrinaPanel.classList.toggle('open');
            renderVitrinaPanel();
        });
    }

    achBtn.addEventListener('click', () => {
        achPanel.classList.toggle('open');
        memePanel.classList.remove('open');
        carePanel.classList.remove('open');
        shopPanel.classList.remove('open');
        dailyPanel.classList.remove('open');
        invPanel.classList.remove('open');
        vitrinaPanel.classList.remove('open');
        if (achPanel.classList.contains('open')) {
            unreadAchievements = 0;
            updateAchBadge();
        }
    });

    /* ==========================================================
       ПАНЕЛЬ МЕМЕ С ИЗБРАННЫМ
       ========================================================== */
    function renderMemePanel() {
        const total = MEME_EASTER_EGGS.length;
        const unlockedList = MEME_EASTER_EGGS.filter(m => foundMemes.has(m.video));
        const favUnlocked = memeFavorites.filter(v => foundMemes.has(v));
        const nonFavUnlocked = unlockedList.filter(m => !favUnlocked.includes(m.video));

        let html = `<div class="meme-panel-header">🌟 меме · ${unlockedList.length}/${total}</div>`;

        if (unlockedList.length === 0) {
            html += `<div class="meme-empty">пока не найдено ни одного меме</div>`;
        } else {
            if (favUnlocked.length > 0) {
                html += `<div class="shop-section-title">★ избранные</div>`;
                favUnlocked.forEach((vid, idx) => {
                    const meme = MEME_EASTER_EGGS.find(m => m.video === vid);
                    if (!meme) return;
                    html += `<div class="meme-item-row">
                        <button class="meme-move" data-action="up" data-video="${vid}" ${idx === 0 ? 'disabled' : ''}>▲</button>
                        <button class="meme-move" data-action="down" data-video="${vid}" ${idx === favUnlocked.length - 1 ? 'disabled' : ''}>▼</button>
                        <div class="meme-item" data-video="${vid}">
                            <div class="meme-item-play">▶</div>
                            <div class="meme-item-name">${meme.name}</div>
                        </div>
                        <button class="meme-star active" data-video="${vid}">★</button>
                    </div>`;
                });
                if (nonFavUnlocked.length > 0) html += `<div class="shop-section-title">все остальные</div>`;
            }
            nonFavUnlocked.forEach(meme => {
                html += `<div class="meme-item-row">
                    <div class="meme-item" data-video="${meme.video}">
                        <div class="meme-item-play">▶</div>
                        <div class="meme-item-name">${meme.name}</div>
                    </div>
                    <button class="meme-star" data-video="${meme.video}">☆</button>
                </div>`;
            });
        }
        if (unlockedList.length < total) html += `<div class="meme-more">осталось найти: ${total - unlockedList.length}</div>`;

        memePanel.innerHTML = html;

        memePanel.querySelectorAll('.meme-item').forEach(el => {
            el.addEventListener('click', () => {
                const video = el.dataset.video;
                if (!video) return;
                playMemeVideo(video);
            });
        });
        memePanel.querySelectorAll('.meme-star').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const vid = el.dataset.video; if (!vid) return;
                if (memeFavorites.includes(vid)) memeFavorites = memeFavorites.filter(v => v !== vid);
                else memeFavorites.push(vid);
                saveMemeFavorites(); renderMemePanel();
            });
        });
        memePanel.querySelectorAll('.meme-move').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const vid = el.dataset.video, action = el.dataset.action;
                const idx = memeFavorites.indexOf(vid);
                if (idx < 0) return;
                if (action === 'up' && idx > 0) [memeFavorites[idx - 1], memeFavorites[idx]] = [memeFavorites[idx], memeFavorites[idx - 1]];
                else if (action === 'down' && idx < memeFavorites.length - 1) [memeFavorites[idx + 1], memeFavorites[idx]] = [memeFavorites[idx], memeFavorites[idx + 1]];
                saveMemeFavorites(); renderMemePanel();
            });
        });
    }
    memeBtn.addEventListener('click', () => {
        memePanel.classList.toggle('open');
        achPanel.classList.remove('open');
        carePanel.classList.remove('open');
        shopPanel.classList.remove('open');
        dailyPanel.classList.remove('open');
        invPanel.classList.remove('open');
        vitrinaPanel.classList.remove('open');
    });

    /* ==========================================================
       ЕЖЕДНЕВНЫЙ БОНУС
       ========================================================== */
    const DAILY_KEY_LAST = 'petDailyLastClaim';
    const DAILY_KEY_STREAK = 'petDailyStreak';
    const DAILY_KEY_HISTORY = 'petDailyHistory'; // { date: '01.10.26', reward: 30 }
    const DAILY_REWARDS = [30, 50, 80, 120, 170, 230, null]; // 7-й = null → секретное блюдо
    function getNextMskMidnight() {
        const now = Date.now();
        const MSK_OFFSET = 3 * 3600000;
        const DAY_MS = 24 * 3600000;
        const mskNow = now + MSK_OFFSET;
        const nextMidnightFrame = (Math.floor(mskNow / DAY_MS) + 1) * DAY_MS;
        return nextMidnightFrame - MSK_OFFSET;
    }

    function getNextNewYear() {
        const mskYear = new Date(Date.now() + 3 * 3600000).getUTCFullYear();
        return Date.UTC(mskYear + 1, 0, 1, 0, 0, 0) - 3 * 3600000;
    }
    function getMskDateKey() {
        const d = new Date();
        const mskTime = new Date(d.getTime() + (d.getTimezoneOffset() + 180) * 60000);
        return String(mskTime.getDate()).padStart(2, '0') + '.' + String(mskTime.getMonth() + 1).padStart(2, '0') + '.' + String(mskTime.getFullYear()).slice(2);
    }

    function hasDailyAvailable() {
        const lastDate = localStorage.getItem('petDailyLastDate') || '';
        const todayKey = getMskDateKey();
        return lastDate !== todayKey;
    }

    function getDailyStreak() {
        let s = parseInt(localStorage.getItem(DAILY_KEY_STREAK) || '0', 10);
        if (isNaN(s) || s < 0) s = 0;
        return Math.min(s, DAILY_REWARDS.length - 1);
    }

    function getNextResetTime() {
        return getNextMskMidnight();
    }

    function renderDailyPanel() {
        const streak = getDailyStreak();
        const available = hasDailyAvailable();
        const claimedToday = !available;

        let html = `<div class="daily-header">📅 ежедневный бонус</div>`;

        if (!available) {
            const remaining = getNextResetTime() - Date.now();
            const hours = Math.max(0, Math.floor(remaining / 3600000));
            const mins = Math.max(0, Math.floor((remaining % 3600000) / 60000));
            const secs = Math.max(0, Math.floor((remaining % 60000) / 1000));
            html += `<div class="daily-timer">следующий бонус через ${hours}ч ${mins}м ${secs}с</div>`;
        } else {
            html += `<div class="daily-timer">новый бонус доступен!</div>`;
        }

        html += `<div class="daily-grid">`;
        for (let i = 0; i < DAILY_REWARDS.length; i++) {
            const isSecret = DAILY_REWARDS[i] === null;
            const isClaimed = i < streak || (i === streak - 1);
            const isAvailable = (i === streak) && available;
            const isFuture = i > streak;
            let cls = 'daily-cell';
            if (i === streak - 1 && !available) cls += ' claimed';
            if (i < streak - 1) cls += ' claimed';
            if (isAvailable) cls += ' available';
            if (isFuture) cls += ' future';
            if (isSecret) cls += ' secret';
            html += `<div class="${cls}">
                <div class="daily-day">день ${i + 1}</div>
                ${isSecret
                    ? `<div class="daily-reward">🔒</div><div class="daily-reward-sub">секрет</div>`
                    : `<div class="daily-reward">${DAILY_REWARDS[i]}</div><div class="daily-reward-sub">❤</div>`
                }
            </div>`;
        }
        html += `</div>`;

        if (available) {
            html += `<button class="daily-claim-btn" id="dailyClaim">забрать бонус</button>`;
        } else {
            html += `<button class="daily-claim-btn disabled">уже забрал</button>`;
        }

        dailyPanel.innerHTML = html;

        const claimBtn = dailyPanel.querySelector('#dailyClaim');
        if (claimBtn) claimBtn.addEventListener('click', claimDaily);
    }

    function claimDaily() {
        if (!hasDailyAvailable()) return;
        let streak = getDailyStreak();
        if (localStorage.getItem(DAILY_KEY_LAST)) {
            /* Уже что-то забирал — проверим пропуск */
            const last = parseInt(localStorage.getItem(DAILY_KEY_LAST) || '0', 10);
            if (last && (Date.now() - last) > 48 * 3600 * 1000) {
                /* Пропустил больше суток */
                streak = 0;
            }
        }

        const reward = DAILY_REWARDS[streak];

        if (reward === null) {
            /* Секретное блюдо → в инвентарь + витрину */
            addToInventory({
                id: 'secret_dish_' + Date.now(),
                icon: '🍰',
                title: 'секретное блюдо',
                hunger: 60,
                isLimited: true,
                date: getMskDateKey()
            });
            /* Добавляем в витрину */
            addVitrinaRecord({ id: 'secret_dish', name: 'секретное блюдо', date: getMskDateKey(), bought: true, icon: '🍰' });
            if (state !== 'sleeping') forcePlayPhrase({ text: 'вау! секретное блюдо!! спасибо за неделю со мной~', mood: 'laughing' }, finishDialog);
        } else {
            changeFriendship(reward);
            if (state !== 'sleeping') forcePlayPhrase({ text: `спасибо за бонус! +${reward} очков дружбы~`, mood: 'happy' }, finishDialog);
        }

        streak++;
        if (streak >= DAILY_REWARDS.length) streak = DAILY_REWARDS.length - 1;

        localStorage.setItem(DAILY_KEY_LAST, String(Date.now()));
        localStorage.setItem('petDailyLastDate', getMskDateKey());
        localStorage.setItem(DAILY_KEY_STREAK, String(streak));

        renderDailyPanel();
        updateDailyBadge();
        updateMemeBtnVisibility();
    }

    function updateDailyBadge() {
        const hasBadge = hasDailyAvailable();
        let badge = dailyBtn.querySelector('.daily-badge');
        if (hasBadge) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'daily-badge';
                badge.textContent = '1';
                dailyBtn.appendChild(badge);
            }
        } else if (badge) badge.remove();
    }

    dailyBtn.addEventListener('click', () => {
        dailyPanel.classList.toggle('open');
        achPanel.classList.remove('open');
        memePanel.classList.remove('open');
        carePanel.classList.remove('open');
        shopPanel.classList.remove('open');
        invPanel.classList.remove('open');
        vitrinaPanel.classList.remove('open');
        if (dailyPanel.classList.contains('open')) renderDailyPanel();
    });

    /* Таймер обновления бейджа раз в минуту */
    setInterval(updateDailyBadge, 60000);
        /* Каждую минуту при общении/музыке/пианино +2 настроения */
    setInterval(() => {
        if (state === 'sleeping') return;
        const recentChat = chatHistory.length > 0
            && (Date.now() - chatHistory[chatHistory.length - 1].time < 60000);
        if (isPlaying || pianoMode || recentChat) {
            addStat('mood', 2);
        }
    }, 60000);

    /* ==========================================================
       ИНВЕНТАРЬ
       ========================================================== */
    let inventory = [];
    try { const s = JSON.parse(localStorage.getItem('petInventory') || '[]'); if (Array.isArray(s)) inventory = s; } catch(_) {}

    function saveInventory() { localStorage.setItem('petInventory', JSON.stringify(inventory)); }

    function addToInventory(item) {
        inventory.push(item);
        saveInventory();
        renderInvPanel();
    }

    function renderInvPanel() {
        let html = `<div class="inv-header">🎒 моя сумка</div>`;
        if (inventory.length === 0) {
            html += `<div class="inv-empty">сумка пуста<br><span style="font-size:10px;opacity:0.6">купи что-нибудь в магазине 🍽</span></div>`;
        } else {
            html += `<div class="inv-grid">`;
            inventory.forEach((item, idx) => {
                html += `<div class="inv-item ${item.isLimited ? 'limited' : ''}" data-idx="${idx}" title="клик — покормить">
                    <div class="inv-item-icon">${item.icon}</div>
                    <div class="inv-item-title">${item.title}</div>
                </div>`;
            });
            html += `</div>`;
            html += `<div style="font-size:10.5px;opacity:0.55;text-align:center;margin-top:10px">клик по еде — покормить ками</div>`;
        }
        invPanel.innerHTML = html;

        invPanel.querySelectorAll('.inv-item').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.idx, 10);
                feedFromInventory(idx);
            });
        });
    }

    function feedFromInventory(idx) {
        if (state === 'sleeping') { addSystemMessage('сначала разбуди меня!'); return; }
        const item = inventory[idx];
        if (!item) return;
        if (stats.fullness >= 100) {
            forcePlayPhrase({ text: 'ой, я наелась, спасибо~', mood: 'happy' }, finishDialog);
            return;
        }

        /* Анимация полёта еды к Ками */
        const invEl = invPanel.querySelector(`[data-idx="${idx}"]`);
        const petRect = petWidget.getBoundingClientRect();
        const startRect = invEl ? invEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
        const fly = document.createElement('div');
        fly.className = 'flying-food';
        fly.textContent = item.icon;
        fly.style.left = (startRect.left + startRect.width / 2) + 'px';
        fly.style.top = (startRect.top + startRect.height / 2) + 'px';
        document.body.appendChild(fly);
        requestAnimationFrame(() => {
            fly.style.left = (petRect.left + petRect.width / 2) + 'px';
            fly.style.top = (petRect.top + petRect.height * 0.4) + 'px';
            fly.classList.add('arrived');
        });
        setTimeout(() => fly.remove(), 900);

        const add = Math.min(item.hunger || 15, 100 - stats.fullness);
        setTimeout(() => {
            addStat('fullness', add);
            addStat('mood', 5);
            changeFriendship(1);
            touchInteraction();
            forcePlayPhrase({ text: 'ням-ням, спасибо!', mood: 'happy' }, finishDialog);

            /* Удаляем из инвентаря */
            inventory.splice(idx, 1);
            saveInventory();
            renderInvPanel();
        }, 800);
    }

    invBtn.addEventListener('click', () => {
        invPanel.classList.toggle('open');
        achPanel.classList.remove('open');
        memePanel.classList.remove('open');
        carePanel.classList.remove('open');
        shopPanel.classList.remove('open');
        dailyPanel.classList.remove('open');
        vitrinaPanel.classList.remove('open');
        if (invPanel.classList.contains('open')) renderInvPanel();
    });

    /* ==========================================================
       ВИТРИНА
       ========================================================== */
let vitrinaRecords = [];
try { const s = JSON.parse(localStorage.getItem('petVitrina') || '[]'); if (Array.isArray(s)) vitrinaRecords = s; } catch(_) {}

/* Патч: добавляем описание к компоту юли, если его нет */
const kompotRec = vitrinaRecords.find(r => r.id === 'kompot_01_10_26');
if (kompotRec && !kompotRec.desc) {
    kompotRec.desc = 'его всегда мало, ведь он такая вкуснятина!';
    localStorage.setItem('petVitrina', JSON.stringify(vitrinaRecords));
}

    function saveVitrina() { localStorage.setItem('petVitrina', JSON.stringify(vitrinaRecords)); }

    function addVitrinaRecord(rec) {
        if (vitrinaRecords.find(r => r.id === rec.id)) return;
        vitrinaRecords.push(rec);
        saveVitrina();
    }

    /* При первом запуске фиксируем запись про компот (пропущенный) */
    if (!vitrinaRecords.find(r => r.id === 'kompot_01_10_26')) {
        vitrinaRecords.push({
            id: 'kompot_01_10_26',
            name: 'компот от юли',
            desc: 'его всегда мало, ведь он такая вкуснятина!',
            date: '01.10.26',
            bought: false,
            icon: '🥤'
        });
        saveVitrina();
    }
    /* Пицца как текущее предложение дня — добавляем, если ещё нет */
    if (!vitrinaRecords.find(r => r.id === 'pizza_02_10_26')) {
        vitrinaRecords.push({
            id: 'pizza_02_10_26',
            name: 'домашняя пицца',
            desc: 'с пылу с жару, приготовленная пицца от камички, налетай!',
            date: '02.10.26',
            bought: false,
            icon: '🍕'
        });
        saveVitrina();
    }
        if (!vitrinaRecords.find(r => r.id === 'mango_03_10_26')) {
        vitrinaRecords.push({
            id: 'mango_03_10_26',
            name: 'мангонан',
            desc: 'всего лишь одно манго, 2 банана и молоко, и ваш смузи готов!',
            date: '03.10.26',
            bought: false,
            icon: '🥭'
        });
        saveVitrina();
    }
        if (!vitrinaRecords.find(r => r.id === 'amniam_04_10_26')) {
        vitrinaRecords.push({
            id: 'amniam_04_10_26',
            name: 'карамелька амняма',
            desc: 'это и есть амням.. стоп, ты что, своровал у него карамельку? ты жесток...',
            date: '04.10.26',
            bought: false,
            icon: '🍬'
        });
        saveVitrina();
    }
        if (!vitrinaRecords.find(r => r.id === 'organic_05_10_26')) {
        vitrinaRecords.push({
            id: 'organic_05_10_26',
            name: 'жареная органика',
            desc: 'блюдо. привыкнуть можно ко всему. даже если это не очень похоже на еду.',
            date: '05.10.26',
            bought: false,
            icon: '🍖'
        });
        saveVitrina();
    }
        if (!vitrinaRecords.find(r => r.id === 'seeds_06_10_26')) {
        vitrinaRecords.push({
            id: 'seeds_06_10_26',
            name: 'секретная позиция',
            boughtName: 'три семечки',
            desc: 'вы че ёбнулись? вы чё гоните?',
            date: '06.10.26',
            bought: false,
            icon: '🌰'
        });
        saveVitrina();
    }

function renderVitrinaPanel() {
    let html = `<div class="vitrina-header">🏆 витрина достижений</div>`;
    vitrinaRecords.forEach(rec => {
        const descHtml = (rec.bought && rec.desc)
            ? `<div class="vitrina-desc">${rec.desc}</div>`
            : '';
        html += `<div class="vitrina-item ${rec.bought ? 'owned' : 'missed'}">
            <div class="vitrina-icon">${rec.icon || (rec.bought ? '🎁' : '🔒')}</div>
            <div class="vitrina-info">
                <div class="vitrina-title">${rec.bought ? (rec.boughtName || rec.name) : '???'}</div>
                ${descHtml}
                <div class="vitrina-date">${rec.bought ? 'куплено ' + rec.date : 'продавалось ' + rec.date}</div>
            </div>
            <div class="vitrina-status">${rec.bought ? '★' : '🔒'}</div>
        </div>`;
    });
    vitrinaPanel.innerHTML = html;
}

    /* ==========================================================
       МАГАЗИН И УХОД
       ========================================================== */
    const LIMITED_OFFER_KEY = 'petLimitedOfferEnd';
    const TODAY_LIMITED = {
        id: 'seeds_06_10_26',
        icon: '🌰',
        name: 'секретная позиция',
        inventoryName: 'три семечки',
        price: 200,
        hunger: 2,
        date: '06.10.26',
    };

    if (!localStorage.getItem(LIMITED_OFFER_KEY)) {
        localStorage.setItem(LIMITED_OFFER_KEY, String(getNextMskMidnight()));
    }

    function getLimitedOfferRemaining() {
        return Math.max(0, getNextMskMidnight() - Date.now());
    }

    const SHOP_ITEMS = [
        { id: 'jums',   icon: '🍬', title: 'джумс',       desc: '+8 сытости',  price: 3,  hunger: 8 },
        { id: 'water',  icon: '💧', title: 'вода',         desc: '+15 сытости', price: 6,  hunger: 15 },
        { id: 'fries',  icon: '🍟', title: 'картошка фри', desc: '+30 сытости', price: 15, hunger: 30 },
        { id: 'burger', icon: '🍔', title: 'чизбургер',    desc: '+50 сытости', price: 30, hunger: 50 }
    ];

    function renderCarePanel() {
        carePanel.innerHTML = `
            <div class="care-header">🧸 забота о ками</div>
            <div class="care-desc">ухаживай за ками: расчёсывай, мой, корми — за это она дарит очки дружбы</div>
            <button class="care-action" data-action="brush">
                <div class="care-action-icon">💇</div>
                <div class="care-action-info">
                    <div class="care-action-title">расчесать волосы</div>
                    <div class="care-action-desc">возьми 🪮 и води по волосам: +2 чистоты за движение, до 50</div>
                </div>
            </button>
            <button class="care-action" data-action="wash">
                <div class="care-action-icon">🧼</div>
                <div class="care-action-info">
                    <div class="care-action-title">помыть</div>
                    <div class="care-action-desc">возьми 🧽 и води по телу: +2 чистоты за движение, до 50</div>
                </div>
            </button>
            <button class="care-action" data-action="feed">
                <div class="care-action-icon">🍽</div>
                <div class="care-action-info">
                    <div class="care-action-title">покормить (магазин)</div>
                    <div class="care-action-desc">открыть магазин еды</div>
                </div>
            </button>
        `;

        carePanel.querySelectorAll('.care-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const a = btn.dataset.action;
                if (a === 'brush') startCareSession('brush');
                else if (a === 'wash') startCareSession('wash');
                else if (a === 'feed') {
                    shopPanel.classList.toggle('open');
                    renderShopPanel();
                }
            });
        });
    }

    function renderShopPanel() {
        const remaining = getLimitedOfferRemaining();
        const hours = Math.floor(remaining / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);

        let html = `<div class="shop-header">🍽 магазин еды</div>`;
        html += `<div class="care-desc">у тебя ❤ ${friendship} очков дружбы. купленная еда попадает в 🎒 сумку</div>`;

        if (remaining > 0) {
            html += `<div class="shop-section-title">⚡ ограниченное предложение</div>`;
            const available = friendship >= TODAY_LIMITED.price;
            html += `<div class="shop-item limited ${available ? '' : 'disabled'}" data-id="limited_today">
                <div class="shop-item-icon">${TODAY_LIMITED.icon}</div>
                <div class="shop-item-info">
                    <div class="shop-item-title">${TODAY_LIMITED.name}</div>
                    <div class="shop-item-desc">+${TODAY_LIMITED.hunger} сытости · попадёт в сумку</div>
                    <div class="shop-limited-timer">осталось ${Math.floor(remaining/3600000)}ч ${Math.floor((remaining%3600000)/60000)}мин</div>
                </div>
                <div class="shop-item-price">${TODAY_LIMITED.price}</div>
            </div>`;
        }

        html += `<div class="shop-section-title">обычное меню</div>`;
        SHOP_ITEMS.forEach(item => {
            const available = friendship >= item.price;
            html += `<div class="shop-item ${available ? '' : 'disabled'}" data-id="${item.id}">
                <div class="shop-item-icon">${item.icon}</div>
                <div class="shop-item-info">
                    <div class="shop-item-title">${item.title}</div>
                    <div class="shop-item-desc">${item.desc} · в сумку</div>
                </div>
                <div class="shop-item-price">${item.price}</div>
            </div>`;
        });

        html += `<button class="care-action" data-action="shop-close" style="margin-top:10px"><div class="care-action-icon">←</div><div class="care-action-info"><div class="care-action-title">назад</div></div></button>`;

        shopPanel.innerHTML = html;

        shopPanel.querySelectorAll('.shop-item').forEach(el => {
            el.addEventListener('click', () => {
                if (el.classList.contains('disabled')) return;
                buyFood(el.dataset.id);
            });
        });
        const back = shopPanel.querySelector('[data-action="shop-close"]');
        if (back) back.addEventListener('click', () => shopPanel.classList.remove('open'));
    }

    function buyFood(id) {
        if (state === 'sleeping') { addSystemMessage('сначала разбуди меня!'); return; }

        let item, price, isLimited = false, recordId = null;
        if (id === 'limited_today') {
            if (getLimitedOfferRemaining() <= 0) return;
            const inventoryTitle = TODAY_LIMITED.inventoryName || TODAY_LIMITED.name;
            item = { icon: TODAY_LIMITED.icon, title: inventoryTitle, hunger: TODAY_LIMITED.hunger, isLimited: true, desc: TODAY_LIMITED.desc };
            price = TODAY_LIMITED.price;
            isLimited = true;
            recordId = TODAY_LIMITED.id;
        } else {
            item = SHOP_ITEMS.find(i => i.id === id);
            if (!item) return;
            price = item.price;
        }

        if (friendship < price) {
            forcePlayPhrase({ text: 'у тебя не хватает очков дружбы :(', mood: 'neutral' }, finishDialog);
            return;
        }

        changeFriendship(-price);
        touchInteraction();

        /* В инвентарь */
        addToInventory({
            id: (isLimited ? recordId + '_' + Date.now() : id + '_' + Date.now()),
            icon: item.icon,
            title: item.title,
            hunger: item.hunger,
            isLimited: isLimited,
            desc: item.desc || '',
            date: getMskDateKey()
        });

        if (isLimited && recordId) {
            const rec = vitrinaRecords.find(r => r.id === recordId);
            if (rec) { rec.bought = true; saveVitrina(); }
            else {
                vitrinaRecords.push({ id: recordId, name: item.title, desc: item.desc, date: TODAY_LIMITED.date, bought: true, icon: item.icon });
                saveVitrina();
            }
            localStorage.setItem(LIMITED_OFFER_KEY, '0');
        }

        forcePlayPhrase({ text: 'спасибо! положила в сумочку~', mood: 'happy' }, finishDialog);
        renderShopPanel();
    }

    careBtn.addEventListener('click', () => {
        carePanel.classList.toggle('open');
        achPanel.classList.remove('open');
        memePanel.classList.remove('open');
        dailyPanel.classList.remove('open');
        invPanel.classList.remove('open');
        vitrinaPanel.classList.remove('open');
        if (!carePanel.classList.contains('open')) shopPanel.classList.remove('open');
        renderCarePanel();
    });

    /* ==========================================================
       ИНТЕРАКТИВНЫЙ УХОД — ВОЖДЕНИЕ КУРСОРА
       ========================================================== */
    const careCursor = document.getElementById('careCursor');
    const careProgress = document.getElementById('careProgress');
    let careMode = null; // 'brush' | 'wash' | null
    let careGained = 0;
    let careLastX = 0, careLastY = 0;
    let careMovementAccum = 0;

    function startCareSession(mode) {
        if (state === 'sleeping') { addSystemMessage('сначала разбуди меня!'); return; }
        if (mode === 'brush' && stats.cleanliness >= 100) {
            forcePlayPhrase({ text: 'мне и так хорошо, спасибо~', mood: 'happy' }, finishDialog);
            return;
        }
        if (mode === 'wash' && stats.cleanliness >= 100) {
            forcePlayPhrase({ text: 'я недавно мылась, спасибо~', mood: 'happy' }, finishDialog);
            return;
        }

        careMode = mode;
        careGained = 0;
        careMovementAccum = 0;
        careCursor.textContent = mode === 'brush' ? '🪮' : '🧽';
        careCursor.classList.add('active');
        petWidget.classList.add('care-mode');
        careProgress.classList.add('visible');
        updateCareProgress();

        /* Закрываем панель заботы, чтобы не мешала */
        carePanel.classList.remove('open');
    }

    function endCareSession(reason) {
        if (!careMode) return;
        const mode = careMode;
        careMode = null;
        careCursor.classList.remove('active');
        petWidget.classList.remove('care-mode');
        careProgress.classList.remove('visible');

        if (careGained > 0) {
            changeFriendship(2);
            addStat('mood', 5);
            touchInteraction();
            if (state !== 'sleeping') {
                const phrase = mode === 'brush' ? 'спасибо, что причесал меня~' : 'ммм, спасибо, я такая свежая теперь!';
                forcePlayPhrase({ text: phrase, mood: 'happy' }, finishDialog);
            }
        } else if (reason !== 'moved') {
            if (state !== 'sleeping') {
                forcePlayPhrase({ text: 'ну ладно, в другой раз~', mood: 'neutral' }, finishDialog);
            }
        }
    }

    function updateCareProgress() {
        careProgress.textContent = `уход: +${careGained} чистоты (макс 50)`;
    }

    /* Курсор-инструмент следует за мышью */
    document.addEventListener('mousemove', (e) => {
        if (!careMode) return;
        careCursor.style.left = e.clientX + 'px';
        careCursor.style.top = e.clientY + 'px';

        /* Считаем движение только над pet-widget */
        const rect = petWidget.getBoundingClientRect();
        const over = e.clientX >= rect.left && e.clientX <= rect.right &&
                     e.clientY >= rect.top && e.clientY <= rect.bottom;
        if (!over) return;

        if (careGained >= 50) {
            endCareSession('done');
            return;
        }

        /* Накапливаем движение (не по таймеру, а по дистанции) */
        const dx = e.clientX - careLastX;
        const dy = e.clientY - careLastY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        careMovementAccum += dist;
        careLastX = e.clientX;
        careLastY = e.clientY;

        /* Каждые 120 пикселей движения → +2 чистоты */
        while (careMovementAccum >= 120 && careGained < 50) {
            careMovementAccum -= 120;
            careGained += 2;
            addStat('cleanliness', 2);
            updateCareProgress();
        }

        if (careGained >= 50) {
            setTimeout(() => endCareSession('done'), 300);
        }
    });

    /* Клик вне виджета — завершение */
    document.addEventListener('click', (e) => {
        if (!careMode) return;
        if (e.target.closest && (e.target.closest('#petWidget') || e.target.closest('.care-panel'))) return;
        endCareSession('cancelled');
    });

    /* ==========================================================
       ЧАТ (сокращённо — все триггеры сохранены)
       ========================================================== */
    const CHAT_HISTORY_KEY = 'petChatHistory';
    const CHAT_MAX_MESSAGES = 100;
    let chatHistory = [];
    try { chatHistory = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]'); if (!Array.isArray(chatHistory)) chatHistory = []; } catch (e) { chatHistory = []; }
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
        "я на такие темы не умею разговаривать(",
        "я умею отвечать лишь на триггер-слова! полноценный диалог со мной не получится. :("
    ];
    const OFFENDED_REPLIES = [
        "я обиделась, знаешь ли.", "извинись, и я подумаю над ответом тебе.",
        "...", "ты меня обидел, я с тобой не разговариваю.",
        "ты злюка, я с такими не общаюсь!", "не слышу тебя, ла-ла-ла."
    ];
    const FORGIVE_REPLIES = [
        "ладно, так уж и быть, прощаю тебя.", "ну ладно, прощаю",
        "всё-всё, не обижаюсь!", "в следующий раз думай, что говоришь!"
    ];
    const APOLOGY_KEYWORDS = ['извини', 'прости', 'сорри', 'соррян', 'соррянчик', 'прошу прощения', 'виноват', 'виновата'];

    const CHAT_TRIGGERS = [
    { keywords: ['мангонан'], replies: ["продавался только 3 октября!"], mood: 'neutral' },
    { keywords: ['амням', 'карамелька', 'карамельку', 'амняма'], replies: ["продается только 4 октября!", "это и есть амням!"], mood: 'happy' },
            /* ---- компот ---- */
    { keywords: ['компот', 'компота', 'компоту', 'компот юли', 'компотик'],
      replies: [
          "компот юли - самое вкусное, что я пробовала в этой жизни!",
          "купи мне компотика юли... я так хочу его попробовать!",
          "1 октября - единственный день, когда его можно было купить!",
          "а ты покормишь меня им?",
          "нямочка, вкуснямочка~"
      ], mood: 'happy' },

    /* ---- бекрумс ---- */
    { keywords: ['бекрумс', 'бекрумсе', 'бекрумса'],
      replies: [
          "да уж, меня пугает то, что происходит при включении четвертого трека...",
          "только не это!",
          "только не снова туда! я не хочу!",
          "экзит 8 мне больше нравится",
          "я так и не посмотрела тот фильм, брух...",
          "о нет, не напоминай..",
          "да я своего рода тоже могу попасть туда...!"
      ], mood: 'backrooms' },

            /* ---- пицца ---- */
    { keywords: ['пицца', 'пиццу', 'пиццей', 'пицца твоя', 'твоя пицца', 'пиццы'],
      replies: [
          "я приготовила пиццу! не то, чтобы я хочу, чтобы ты её попробовал..!",
          "и вовсе я не готовила её для тебя! правда...",
          "2 октября - единственный день, когда её можно было купить!",
          "ради тебя я туда даже ананасы добавляла... а? я сказала это вслух?",
          "я старалась сделать её вкусной для тебя~"
      ], mood: 'happy' },
    /* ---- v1.0.4: триггеры ---- */
    { keywords: ['цирк', 'цирку', 'цирка', 'цирком', 'удивительный', 'цифровой', 'уцц', 'tadc', 'amazing', 'digital', 'circus', 'помни', 'джекс', 'джакс', 'зубл', 'зуббл', 'королер', 'кингер', 'королёр', 'рагата', 'кауфмо', 'гэнгл', 'генгл', 'ленточка', 'кейн', 'кайн', 'пузырёк', 'пузырек', 'баббл', 'кий', 'мин', 'риббит', 'квинни', 'гаммико', 'гаммигу', 'гаммиго'],
      replies: ["это, кажется, самый лучший неофициальный мульт за последние года","жаль, что их история закончилась 💔","вот бы продолжение 💔","у меня лишь тепло на душе, когда я вспоминаю этот мульт🥹"], mood: 'neutral' },
    { keywords: ['я сильнее', 'я могущественнее', 'я лучше'],
      replies: ["они не уйдут, они не рассеются!!"], mood: 'happy' },
    { keywords: ['массы', 'масса'],
      replies: ["наши массы будут вот так всплывать 😭"], mood: 'laughing' },
    { keywords: ['скучно', 'скучновато'], replies: ["ох.. мне немножко обидно это слышать..."], mood: 'neutral' },
    { keywords: ['бальные танцы', 'танцы', 'танцевать', 'танцуешь', 'станцуй', 'танцуй', 'танцую'],
      replies: ["о, я ходила на бальные танцы в младших классах!"], mood: 'happy' },
    { keywords: ['ой', 'ай', 'ух', 'уф'], replies: ["ой-ой! что такое?"], mood: 'neutral' },
    { keywords: ['упал'], replies: ["это грустно :("], mood: 'neutral' },
    { keywords: ['болею', 'чихаю', 'кашляю', 'голова болит', 'бошка болит', 'болит', 'сопливлюсь', 'заболел', 'заболела'],
      replies: ["поправляйся скорее, солнце!~","выздоравливай!!","береги себя!!"], mood: 'happy' },
    { keywords: ['яра', 'сэно', 'сэ но', 'ярара', 'ярарара', 'yararara'],
      replies: ["ты про пятую песню??","это же пятая песня!!","ориг. название: ヤラララ (YARARARA) - ABM (feat. Kasane Teto)"], mood: 'happy' },
    { keywords: ['хрен'], replies: ["в томате)"], mood: 'laughing' },
    { keywords: ['желтый', 'жёлтый', 'жёлтое', 'желтое', 'жёлтая', 'желтая'],
      replies: ["у меня жёлтый глазик!~","этого цвета песочек на море~"], mood: 'happy' },
    { keywords: ['красный', 'красное', 'красная'],
      replies: ["какой-то агрессивный цвет!...","красного цвета божьи коровки~"], mood: 'neutral' },
    { keywords: ['ледибаг', 'леди баг', 'леди', 'супер кот', 'кот нуар', 'адриан', 'эдриан'],
      replies: ["ты говоришь про тот мульт про супергероев?","да уж, в новом сезоне рисовка совсем детской стала..","я забросила просмотр ледибаг, потому что он стал каким-то детским :("], mood: 'neutral' },
    { keywords: ['музыка', 'музыки', 'музыкой', 'музыку'],
      replies: ["попробуй нажать на кнопочку \"▶️\", чтобы заиграла музыка!","мне нравятся треки илюши мазеллова!!"], mood: 'happy' },
    { keywords: ['пряничный домик', 'пряник', 'пряничном домике', 'когда вокруг'],
      replies: ["мне всё равно, я у себя в пряничном домике!!"], mood: 'happy' },
    { keywords: ['карусель', 'эпилог', 'лучшее позади', 'свободное падение', '1212', 'во дворе', 'ветвь', 'муза', 'эдемово яблоко', 'рука на пульсе', 'в ожидании вечного сна', 'станционный смотритель', 'смерть на перепутье', 'история о семействе мушек с хорошей концовкой', 'отражение', 'город за горизонтом', 'кто будет молиться', 'мама почему', 'цветочек маленький', 'откат', 'видеть сны', 'две минуточки для мыльных пузырей', 'не останавливайтесь на выходе из жизни', 'небо красное полотно', 'новая муза', 'девочка из аптечной', 'сказка о теневом мире', 'противоречие выборов', 'шестьдесят минут', 'люцифер стихотворное', 'беспорядочная сказка', 'который ищет маяк', 'позже будет больнее', 'человейники', 'вайп', 'глобальный вайб', 'аэростат', 'тэм на коллеж', 'кто-то должен опылять цветок', 'абсолютный ноль', 'рождённый умереть', 'рожденный умереть', 'ты рядом', 'оттепели не быть', 'тебе понравится', 'почему космос не пишет про нас', 'однополярности', 'дорога из миннесоты', 'царапка', 'родинки', 'моё имя', 'мое имя', 'анабиоз', 'красивая красота', 'снежинка', 'жизненная', 'всем вернётся', 'всем вернется', 'сейв', 'почемучка', 'примагнитило', 'ящики', 'хэйт кор', 'хейт кор', 'хэйткор', 'хейткор', 'hate core', 'не создать цветы', 'кладбище спасательных кругов', 'другая сторона', 'осенний листопад', 'графиками выходных', 'мы не станем другими', 'с самим собой', 'тринити', 'сайфер', 'trinity', 'медленный танец', 'комната смеха', 'автодром', 'культурный слой', 'оставь себе', 'обыкновенная жизнь', 'ворона', 'запой', 'бэйслайн', 'бейслайн', 'дисс на жожо', 'катарсис', 'старая панк волна', 'роллс ройс фантом', 'ракушки', 'айзек', 'я не боюсь ошибаться', 'ты не поймёшь', 'флав', 'fluv', 'новогодний', 'атм 4', 'чертово колесо', 'чёртово колесо', 'неудачный фильм', 'пойдем со мной', 'оттепель', 'я устал', 'невыносимо', 'главная тайна неба', 'первый секс', 'илюха реп', 'про лягушку', 'огонь и вода', 'нержавейка', 'пожарники увидимся следующим летом', 'черным по белому', 'пластырь', 'бегать и падать', 'бумажный самолёт', 'капель', 'бессмертен', 'страбоскоп', 'это моя весна'],
      replies: ["что-то знакомое! ты про песенку ильи??","о, я обожаю эту песню ильи!!"], mood: 'happy' },
    { keywords: ['плохое', 'хорошее', 'поведение'], replies: ["всем добро пожаловать в свободное падение!~"], mood: 'happy' },
    { keywords: ['и этот звук'], replies: ["шагами за спиною во дворе!"], mood: 'happy' },
    { keywords: ['ким', 'ты меня слышишь', 'алло', 'алё', 'але', 'ало', 'алю', 'альо', 'аллоу', 'аллё'],
      replies: ["ким, ким, ты меня слышишь, алло? это последний полёт..."], mood: 'neutral' },
    { keywords: ['мне кислорода', 'не то чтобы много', 'но все не поможет', 'нас скоро захлопнет', 'лед', 'лёд'],
      replies: ["лёд, лёд, лёд, лёд, лёд... ты переживёшь мою гибель, но это, жаль, никто не переживёт..."], mood: 'neutral' },
    { keywords: ['держи меня подальше'],
      replies: ["держи меня подальше от своей u i, и сила притяжения u i i a~"], mood: 'happy' },
    { keywords: ['я знаю ты придешь', 'чтобы меня'],
      replies: ["я знаю ты придёшь, чтобы меня a i, родная походу нас u i i i a~"], mood: 'happy' },
    { keywords: ['мои маленькие кошмары', 'кошмар', 'кошмарик', 'я засыпаю', 'только бы удержало'],
      replies: ["и я засыпаю... в этой вечности все мои демоны стали друзья...","только бы удержало, не бросайте меня, мои маленькие кошмары..."], mood: 'neutral' },
    { keywords: ['может быть за нами меняются города'],
      replies: ["но зачем это всё, если мы целимся в никуда..?"], mood: 'neutral' },
    { keywords: ['если мы целимся'],
      replies: ["глядя на небо, по щёчке закапало..."], mood: 'neutral' },
    { keywords: ['глядя на небо', 'закапало'],
      replies: ["дождя пока не было, что ж ты заплакала?.."], mood: 'neutral' },
    { keywords: ['дэйзи', 'дейзи', 'daisy', 'bicycle built for two'],
      replies: ["daisy, daisy, give me your answer do. i'm half crazy, all for the love you..."], mood: 'happy' },
    { keywords: ['кто убил лирический', 'что такое лирический', 'кто такой лирический'],
      replies: ["не знаю!!"], mood: 'happy' },
    { keywords: ['светлая сторона', 'светлую сторону', 'ничего плохого', '2018 year', 'лишь 2 вопроса', 'мой акустический', 'космоцветок', 'космоцветка', 'космоцветком', 'космоцветке', 'маяк', 'к маяку вселенной', 'anemone', 'анэмонэ', 'анемонэ', 'анемоне', 'холода ветра', 'не забытое старое', 'адхд', 'adhd', 'потерянный мир', 'фантасмагория', 'phantasmagoria'],
      replies: ["один из альбомов ильи!~","мне тоже нравится этот альбом!!"], mood: 'happy' },
    { keywords: ['лилз', 'lilz'], replies: ["LilZ","привет, вася"], mood: 'happy' },
    { keywords: ['бабук', 'мимими'], replies: ["хорошая компания для игр"], mood: 'happy' },
    { keywords: ['год'], replies: ["сейчас 2026 год!"], mood: 'happy' },
    { keywords: ['лэ', 'лээ', 'лэээ', 'лээээ'], replies: ["лэээ слыщ чо лэкаеш"], mood: 'laughing' },
    { keywords: ['не думай'], replies: ["раз ты говоришь, то не буду"], mood: 'happy' },
    { keywords: ['ты отошла'], replies: ["нет, я тут!!"], mood: 'happy' },
    { keywords: ['даю'], replies: ["ура!! спасибо"], mood: 'happy' },
    { keywords: ['не даю', 'отказано', 'не зевай'], replies: ["ох... ну ладно. :("], mood: 'neutral' },
    { keywords: ['зевок'], replies: ["🥱"], mood: 'neutral' },
    { keywords: ['говори', 'скажи', 'напиши', 'показать', 'покажи'], replies: ["а вот и не буду!!"], mood: 'happy' },
    { keywords: ['держи себя в руках'], replies: ["я не альфред!!"], mood: 'happy' },
    { keywords: ['мишк', 'фрэдэ', 'фредди', 'фрэдбер', 'фредбер', 'о холера', 'чито'],
      replies: ["эу, эу, э-эу, эу, эу, э-эу э-эу, эу, эу, э-эу!"], mood: 'happy' },
    { keywords: ['ещкере', 'эщкере'], replies: ["🤙🏻🤙🏻🤙🏻"], mood: 'happy' },
    { keywords: ['кириешки', 'мазяка', 'стинтлер', 'джампер'], replies: ["что за кринж ты щас высрал"], mood: 'laughing' },
    { keywords: ['детка'],
      replies: ["возьми телефон, детка, я знаю ты хочешь позвонииить","ты выполнила задание на пять с плюсом, ты меня зажгла!"], mood: 'teasing' },
    { keywords: ['бесят', 'пунькают', 'носик'],
      replies: ["бесят!!!! пунькают мне в носик!!!! ая не просила чтоб меня пунькали!!!!!!!!"], mood: 'angry' },
    { keywords: ['это мое болото', 'ggnb', 'гг не будет', 'лолихантер', 'лоли хантер'],
      replies: ["ты про трек братишкина?"], mood: 'happy' },
    { keywords: ['потуши', 'огонь', 'огнетушитель'],
      replies: ["детка, да ты вся горишь, я твой огнетушитель, пш-пш~"], mood: 'teasing' },
    { keywords: ['слава', 'славе', 'славу', 'славой', 'марлоу', 'мерлоу', 'марля', 'мармя', 'готлиб', 'slava', 'marlow', 'gotlib'],
      replies: ["ой, мне нравятся треки славы марлоу!!","когда уже новый трек нууу??"], mood: 'happy' },
    { keywords: ['буквально'], replies: ["да ну, реально??"], mood: 'happy' },
    { keywords: ['нихрена'], replies: ["оу :("], mood: 'neutral' },
    { keywords: ['пилот'], replies: ["ну ты!! а я башня"], mood: 'happy' },
    { keywords: ['панда'], replies: ["да, пандочки милые :3"], mood: 'happy' },
    { keywords: ['вайба писать лирику полным полно'], replies: ["ничего нового, наш мир дал ёбу давно..."], mood: 'neutral' },
    { keywords: ['кушай'], replies: ["а ты покорми!"], mood: 'happy' },
    { keywords: ['сыта', 'сытая', 'не голодна', 'не голодная', 'наелась', 'полная', 'фулл'],
      replies: ["тогда мне очень хорошо сейчас!!"], mood: 'happy' },
    { keywords: ['почему'], replies: ["по кочану, да по капусте!!"], mood: 'happy' },
    { keywords: ['где'], replies: ["в караганде!!"], mood: 'happy' },
    { keywords: ['куда'], replies: ["на кудыкину гору!!"], mood: 'happy' },
    { keywords: ['когда'], replies: ["завтра в 3!!"], mood: 'happy' },
    { keywords: ['зачем'], replies: ["надо!!","ну надо!!"], mood: 'happy' },
    { keywords: ['чёт'], replies: ["а ты что повторюшка?"], mood: 'happy' },
    { keywords: ['повторюшка'], replies: ["дядя хрюшка!"], mood: 'happy' },
    { keywords: ['дядя хрюшка'], replies: ["повторюшка!"], mood: 'happy' },
    { keywords: ['сама'], replies: ["ну уж нет!!"], mood: 'angry' },
    { keywords: ['дорс', 'дурс', 'doors', 'скрич', 'раш', 'амбуш', 'холт', 'сик', 'тимоти', 'тимати', 'а 90', 'а-90', 'а 60', 'а-60', 'дроны', 'толпа', 'шахты', 'архивы', 'грамбл', 'грэмбл', 'гигл', 'гиггл', 'садовник', 'бэкдор', 'бэкдорс', 'задние двери', 'двери', 'фигура', 'офисы', 'румс', 'румсы', 'а-120', 'а 120'],
      replies: ["ты про ту игру в роблоксе? она крутая!!","я, наверное, никогда не смогу пройти шахты сама...","боже, мне так нравится этаж с архивами","вот бы пройти архивы..!"], mood: 'happy' },
    { keywords: ['иная', 'иную'], replies: ["хорошее аниме, я рекомендую!!","очень интересная история, рекомендую!!"], mood: 'happy' },
    { keywords: ['атм 3', 'она думает', 'я банкомат', 'люблю её глаза', 'люблю ее глаза'],
      replies: ["она думает, что я банкомат!! а я люблю её глаза~"], mood: 'happy' },
    { keywords: ['она любит деньги'], replies: ["это факт!! фак ю, фак лав 💔"], mood: 'laughing' },
    { keywords: ['разрешаю есть', 'разрешаю', 'запрещаю', 'запрещаю есть', 'запрещаю пить', 'разрешаю пить', 'запрещаю думать потом говорить'],
      replies: ["разрешаю есть, разрешаю пить, ой...","запрещаю думать, потом говорить, ой...","разрешаю жить, разрешаю быть, угу...","запрещаю писать и звонить, вот так вот!","разрешаю слушать, что не запретил!","запрещаю делать, что не разрешил!","запрещаю разрешать конфликты!","разрешаю запрещать брать кредит! (это полезно, кстати) (нет)","что такое дэмэдж контроль? я не знаю"], mood: 'happy' },
    { keywords: ['смартик'],
      replies: ["я хочу себе машину для души, чтобы колесить!","а я куплю себе смартик, пошли все в пизду!"], mood: 'happy' },
    { keywords: ['артём', 'тузик', 'гараж', 'эльф 1'],
      replies: ["о, это же альбом славы марлоу!!"], mood: 'happy' },
    { keywords: ['снова я напиваюсь', 'напиваюсь'],
      replies: ["снова я напиваюсь, снова говорю пока..."], mood: 'neutral' },
    { keywords: ['быстро', 'злой', 'лиза', 'ровер', 'детские травмы', 'не забыл', 'техно фм', 'я ненавижу этот трек', 'без аттестата', 'мания', 'сумасшедшие', 'камри', 'все хотят меня', 'аромат', 'агенство насилия'],
      replies: ["о, это же трек славы марлоу!!","мне нравится этот трек! ~"], mood: 'happy' },
    { keywords: ['вижу по глазам', 'что ты хочешь мне', 'под ногами', 'душит мороз'],
      replies: ["я всё вижу по глазам... что ты хочешь мне сказать?...","я не буду тебя знать... а ты меня, и мы друг друга...","под ногами лёд, и в сердце лёд! в стакане лёд, я не помню кто я..","душит мороз, я такой холодный!..."], mood: 'neutral' },
    { keywords: ['бизнес вумен', 'бизнес вуман'],
      replies: ["она бизнес вумен из москвыыы..~"], mood: 'happy' },
    { keywords: ['ты бизнес вумен'], replies: ["яяя?? как ты узнал, что я в москве?"], mood: 'happy' },
    { keywords: ['я в деле'], replies: ["не знаю что расскажет про мои поступки телик!!"], mood: 'happy' },
    { keywords: ['я потерялся'], replies: ["не знаю кем я был, и кем я быть пытался.. я потерялся"], mood: 'neutral' },
    { keywords: ['каблуки'], replies: ["мои ботинки будто каблуки, яяу"], mood: 'happy' },
    { keywords: ['о2', '02', 'o2', 'нужно больше кислорода'],
      replies: ["нужно больше кислорода!!"], mood: 'happy' },
    { keywords: ['забуду'], replies: ["я всё это забуду, ой-ё-ёй!!"], mood: 'happy' },
    { keywords: ['запретить', 'твоя красота', 'оружие'],
      replies: ["твоя красота - оружие, это пиздец~"], mood: 'teasing' },
    { keywords: ['большие диски', 'диски'],
      replies: ["я кручу большие ди-ди-ди-диски, и в моём стакане ви-ви-ви-виски~","без анонса залетаю, посмотри как они тают!","брюнетки, блондинки, в алкоголе льдинки~"], mood: 'laughing' },
    { keywords: ['лида', 'lida'], replies: ["77","лида навсегда"], mood: 'happy' },
    { keywords: ['фенилэтиламин', 'супер секретные материалы', 'жабы атаковали планету земля', 'музло из гаражей', 'моё имя лида', 'мое имя лида', 'лёгкий способ бросить долги', 'легкий способ бросить долги', 'новая рок звезда', 'дак теилс 3', '77'],
      replies: ["опа, это же альбом лиды!!"], mood: 'happy' },
    { keywords: ['лида навсегда', 'секс', 'фотки', 'чсв', 'спасибо господь что я такой', 'эмо хардкор', 'зомби таун', 'дак теилс', 'я люблю б', 'меньше чем три', '<3', 'влюблино', 'панки хой', 'эго', 'евробит', 'грустный реп', 'гэнг бэнг', 'сапсан', 'генг бенг', 'мое имя лида', 'лиза', 'ради бога', 'утро', 'сумасшедшая', 'танцуй или умри', 'бдсм', 'дура и придурок', 'свага', 'бой', 'swagga boy', 'свагга', 'нью рок', 'ньюрок', 'new rock', 'дурка', 'blum', 'все что мне осталось от тебя', 'ты сбегала по ночам', 'габба банда', 'гиперфикс', 'тысячи рук', 'rай', 'стикер', 'тряси', 'лада турбо', 'фото со звездой', 'always', 'олвэйс', 'amg', 'амджи', 'амг', 'ира', 'кошка', 'сосала', 'медляк'],
      replies: ["хороший трек лиды, мне нравится :>"], mood: 'happy' },
    { keywords: ['все будет так', 'всё будет так'],
      replies: ["всё это так, сука!","ты будешь петь, все будут плакать и страдать, сука!"], mood: 'laughing' },
    { keywords: ['все будет', 'всё будет'],
      replies: ["всё будет.. всё будет хуёво."], mood: 'neutral' },
    { keywords: ['пупы шмупы'],
      replies: ["ты любишь пупы, рютпы, залюпы, пупы, шмупы..."], mood: 'laughing' },
    { keywords: ['хочешь', 'хочу'],
      replies: ["хочешь сладких апельсинов?","хочешь вслух рассказов длинных?","хочешь, я взорву все звёзды, что мешают спать?","хочешь в море с парусами?","хочешь музык новых самых?","хочешь, я убью соседей, что мешают спать?","хочешь солнце вместо лампы?","хочешь за окошком альпы?","хочешь я отдам все песни?"], mood: 'happy' },
    { keywords: ['цветы', 'тебе не нужны цветы'],
      replies: ["тебе не нужны цветы, тебе нужны мозги, дура..."], mood: 'neutral' },
            /* ---- новые ---- */
    { keywords: ['темы', 'тема', 'тему', 'темой', 'фон', 'фоны'],
      replies: ["чтобы открыть новые фоны, попробуй дослушать песни до конца!","тебе нравятся существующие фоны? а что, если я скажу, что можно открыть новые?"], mood: 'happy' },
    { keywords: ['!хелп', 'хелп', 'хэлп', 'помощь', 'слова', 'триггер слово', 'слова', 'триггер-слово','триггер-слова', 'триггер слова'],
      replies: ["я умею отвечать лишь на триггер-слова! полноценный диалог со мной не получится. :("], mood: 'neutral' },
    { keywords: ['новый год', 'нового года', 'новым годом', 'новому году', 'new year'],
      replies: ["я обожаю новый год, это мой любимый праздник!","ооо, я люблю новый год!!", (() => { const t = new Date('2027-01-01T00:00:00+03:00').getTime(); const d = t - Date.now(); const days = Math.floor(d/86400000); const h = Math.floor((d%86400000)/3600000); const m = Math.floor((d%3600000)/60000); return `до нового года осталось ${days} дней, ${h} часов и ${m} минут`; })()], mood: 'happy' },
    { keywords: ['фруктовый', 'фруктовое', 'фруктовая', 'фруктового', 'фруктовому'],
      replies: ["звучит вкусно...","о, у меня духи фруктового вкуса!"], mood: 'happy' },
    { keywords: ['я тут'], replies: ["я там!"], mood: 'happy' },
    { keywords: ['я там'], replies: ["я тут!"], mood: 'happy' },
    { keywords: ['моргни если'], replies: ["ой, я моргнула, не верь!","*усиленно моргаю*"], mood: 'happy' },
    { keywords: ['тут'], replies: ["я тут, я тут!","потерял меня?","соскучился?"], mood: 'happy' },
    { keywords: ['дай'], replies: ["держи, солнце!","для тебя что угодно!","только не урони~"], mood: 'happy' },
    { keywords: ['думай', 'подумай'], replies: ["думаю... думаю...","я так сильно задумалась, что у меня голова заболела!","хммм...."], mood: 'neutral' },
    { keywords: ['ютуб', 'ют', 'youtube', 'yt', 'ютюб'],
      replies: ["мой ютуб-канал? надеюсь, ты подписан, иначе укушу! вот: youtube.com/@kami_voron","ой, хочешь подписаться? держи! youtube.com/@kami_voron","надеюсь, ты не читеришь с получением пасхалок? youtube.com/@kami_voron"], mood: 'happy' },
    { keywords: ['канал', 'тг', 'телеграм', 'телеграмм', 'телега', 'телегу', 'телегой', 'тгк'],
      replies: ["мой тгк закрыт для лишних глазок! но в лс можешь написать: t.me/kami_voron","в моём тгк только избранные, и ты в их числе) а если скучно, я всегда здесь: t.me/kami_voron"], mood: 'happy' },
    { keywords: ['не спи до рассвета', 'не грызи ногти', 'уступи дорогу', 'педагог', 'педагогу', 'пидагог', 'ни германия', 'пидорас', 'жид', 'пидор', 'негр', 'педик', 'нэгр', 'пид', 'нег', 'негритенок', 'инцел', 'ниггер', 'нигга', 'нига', 'гомик', 'петух', 'хач', 'куколд', 'симп'],
      replies: ["ОООЙ, ОСУЖДАЮ!!","ты что такое говоришь?! осуждаю!!","асууу!!"], mood: 'angry' },
    { keywords: ['не давай'], replies: ["ну раз не давай, то не давай..."], mood: 'neutral' },
    { keywords: ['отказ', 'отказываю'], replies: ["оу... ну хорошо :(","ох.. ну ладно :("], mood: 'neutral' },
    { keywords: ['ок', 'соглашаюсь', 'окей'], replies: ["ура!! супер","ура-ура!! я рада"], mood: 'happy' },
    { keywords: ['нота', 'до', 'ре', 'ми', 'фа', 'соль', 'ля', 'си'],
      replies: ["распеваешься? 🎶","ля-ля-ля 🎵","🎵🎶🎵🎶"], mood: 'happy' },
    { keywords: ['спой', 'пой', 'петь', 'споешь', 'споёшь', 'запой'],
      replies: ["я знаю твой телефон, но никогда не позвоню... 🎵🎶","снова космос хочется взять и, в песне воспеть, чего ради? 🎶🎵"], mood: 'happy' },
    { keywords: ['нюта', 'нюте', 'нютой', 'нюту'],
      replies: ["кукла ты в чужих руках, но с дуба рухнул, если ты подумал, что ни раз ни в чём и не был виноватым никогда, да 🎶","дорогая нюта, я вижу, ты искренне не понимаешь всего... 🎵","глупа ты, нюта, мала и бестактна, молю тебя, как повзрослеешь, о людях не думай, что все абсолютно добры или все абсолютно ублюдки... 🎶"], mood: 'neutral' },
    { keywords: ['альфред', 'альфреду', 'альфредом', 'мишка', 'мишкой', 'мишаня', 'мишку'],
      replies: ["нас сюжет куда-то несёт, но нам достаточно в жизни счастливый конец — и всё... 🎶","альфред, держи себя в руках! 🐻"], mood: 'neutral' },
    { keywords: ['любовь', 'любовью', 'любовной', 'люби меня', 'люби', 'полюбить'],
      replies: ["люби меня любовной любовью!","любовью любовной люби меня!","я полюбить любую не смогу, помни!","любимую люблю, люблю лишь тебя~","любовью в сердце отзываются чувства, и по-любому это чувства любви!","буду любить тебя любовной любовью, и ты меня любовной любовью люби!"], mood: 'teasing' },
    { keywords: ['хорни'], replies: ["кто? ты? не знаю, чем тебе помочь..."], mood: 'neutral' },
    { keywords: ['бесит', 'бесишь', 'бесил', 'бесила', 'выбесила', 'выбесило', 'выбесил', 'взбесил', 'вызбесила', 'взбесило', 'достал', 'достало', 'раздражает', 'раздражаешь'],
      replies: ["охх, успокойся, солнце..","спокойно, спокойно, всё хорошо!","спокойствие, только спокойствие!"], mood: 'neutral' },
    { keywords: ['летишь', 'полёт', 'самолёт', 'самолет', 'полет', 'лететь', 'полетишь', 'прилетишь', 'поездка', 'поезду', 'полетом', 'полета'],
      replies: ["пока не планирую никуда лететь, хаха!"], mood: 'neutral' },
    { keywords: ['колобок повесился', 'чебурашка оглох', 'русалка села на шпагат', 'бегемот застрял в болоте', 'буратино утонул', 'лысый поехал в пустыню', 'ёж с кирпичом'],
      replies: ["ну капец, а чёт пооригинальнее не придумал?"], mood: 'neutral' },
    { keywords: ['я забыл', 'я забыла'], replies: ["вспоминай скорее!!"], mood: 'happy' },
    { keywords: ['забыла', 'ты забыла'], replies: ["пупупу, опять я что-то забыла..."], mood: 'neutral' },
    { keywords: ['забота', 'заботу', 'заботой'], replies: ["заботься обо мне через кнопочку сверху слева!!"], mood: 'happy' },
    { keywords: ['для тебя'], replies: ["для меняяя???"], mood: 'happy' },
    { keywords: ['для себя'], replies: ["для тебя что угодно!"], mood: 'happy' },
    { keywords: ['печалик', 'веселик', 'весёлик'],
      replies: ["я такой печалик, когда кто-то плачет...","я такой весёлик, когда всё иначе!"], mood: 'happy' },
    { keywords: ['океан', 'море', 'озеро', 'речка', 'река', 'бассейн'],
      replies: ["ля, щас бы искупаться там!"], mood: 'happy' },
    { keywords: ['лужа', 'болото', 'тина'], replies: ["ну уж нет, там я купаться не буду!"], mood: 'neutral' },
    { keywords: ['какая ты рыбка', 'какая ты рыба'], replies: ["я - акула! ам!"], mood: 'happy' },
    { keywords: ['чиз'], replies: ["чииииз... не, так только вася может произносить)"], mood: 'happy' },
    { keywords: ['какая ты'], replies: ["самая лучшая из всех!"], mood: 'happy' },
    { keywords: ['я дам'], replies: ["я буду хранить это...","я буду беречь это!"], mood: 'happy' },
    { keywords: ['чуешь'], replies: ["чую)"], mood: 'happy' },
    { keywords: ['плавай', 'плыви'], replies: ["уже натягиваю купальник..~"], mood: 'happy' },
    { keywords: ['пожарник'], replies: ["да, я мечтала, будучи детсадовцем, быть пожарником..."], mood: 'neutral' },
    { keywords: ['программист'], replies: ["да, я хотела пойти на программиста в средней школе..."], mood: 'neutral' },
    { keywords: ['дизайнер'], replies: ["да, я хотела быть дизайнером в 9 классе..."], mood: 'neutral' },
    { keywords: ['дабл клик', 'даббл клик', 'даблклик'], replies: ["У НЕГО ДАБЛ КЛИК!!!!"], mood: 'laughing' },
    { keywords: ['кто я'], replies: ["ты - мой лучший друг!"], mood: 'happy' },
    { keywords: ['некий шанс', 'шанс'], replies: ["есть некий шанс..."], mood: 'neutral' },
    { keywords: ['рарити', 'рэрити'], replies: ["это модная поняшка, знак щедрости. мне больше нравятся другие! :("], mood: 'neutral' },
    { keywords: ['твайлайт', 'спаркл'], replies: ["это умная поняшка, знак магии. любимая пони юли! потому что фиолетовая)"], mood: 'happy' },
    { keywords: ['искорка', 'сумеречная'], replies: ["вообще-то её зовут твайлайт спаркл! 🤬"], mood: 'angry' },
    { keywords: ['рэйнбоу', 'дэш', 'деш', 'рейнбоу'], replies: ["радужная поняшка, знак верности. она мне нравится, прикольная :>"], mood: 'happy' },
    { keywords: ['радуга'], replies: ["вообще-то её зовут рэйнбоу дэш! 🤬"], mood: 'angry' },
    { keywords: ['пинки', 'пай', 'пинкамина'], replies: ["одна из моих любимых поняшек, знак радости :>"], mood: 'happy' },
    { keywords: ['флаттершай', 'флаттер', 'флатер', 'шай', 'флатершай'], replies: ["моя самая любимая поняшка, и мой кинн :3 знак доброты! и она такая милашка~"], mood: 'happy' },
    { keywords: ['эплджек', 'эпл джек', 'эпплджек', 'эппл джек'], replies: ["деревенщина поня, знак честности, не люблю её..."], mood: 'neutral' },
    { keywords: ['концерт', 'концерты', 'концертик'], replies: ["чей концерт? когда?!","концерт? я иду!!"], mood: 'happy' },
    { keywords: ['поиграть', 'играть'], replies: ["играть?? пошли!!"], mood: 'happy' },
    { keywords: ['погладить', 'гладить', 'глажу'], replies: ["урр... спасибо за это~","мне очень приятно.. ~"], score: 2, mood: 'happy' },
    { keywords: ['mzlff crew', 'mzlffcrew'], replies: ["да, было время..."], mood: 'neutral' },
    { keywords: ['башня'], replies: ["слушаю, пилот?","пилот, а ну за работу!"], mood: 'neutral' },
    { keywords: ['поподробнее', 'подробнее'], replies: ["никаких подробностей!"], mood: 'happy' },
    { keywords: ['ссылка', 'ссылку', 'ссылкой', 'ссылке'],
      replies: ["ссылки на мои соц. сетки - youtube.com/@kami_voron и t.me/kami_voron"], mood: 'happy' },
    { keywords: ['просплю', 'проспишь', 'проспала', 'проспал'],
      replies: ["я не просплю ничего!! только учёбу, разве что)"], mood: 'happy' },
    { keywords: ['апчхи', 'пчхи', 'апчи', 'чихаю', 'чихнул', 'чихнула'], replies: ["будь здоров!"], mood: 'happy' },
    { keywords: ['сабо', 'ло', 'луффи', 'зоро', 'нами'], replies: ["да, это персонаж из ванписа"], mood: 'neutral' },
    { keywords: ['эйс', 'эйса', 'эйсу', 'эйсом'],
      replies: ["это муж юли! был...","в сердце юли он жив всегда..."], mood: 'neutral' },
    { keywords: ['ванпис', 'ван', 'пис', 'писа', 'писом', 'пису', 'кусок'],
      replies: ["я запланировала посмотреть ремейк ванписа кста!","очень интересно, но чересчур много серий, а ещё рисовка старая, это отталкивает...","любимое аниме юли!"], mood: 'happy' },
    { keywords: ['птица'], replies: ["ворон!"], mood: 'happy' },
    { keywords: ['ворон'], replies: ["яяяя! 🐦‍⬛️"], mood: 'happy' },
    { keywords: ['любимое животное'], replies: ["мне очень нравятся лисички! а ещё панды!"], mood: 'happy' },
    { keywords: ['тотемное животное'], replies: ["я думаю, мое тотемное животное - панда :> она миленькая, валяется, кушает и спит, ну я!"], mood: 'happy' },
    { keywords: ['трахер', 'трахать', 'трах', 'трахнуть'], replies: ["ой-ой-ой, не надо мне такого...😳"], mood: 'teasing' },
    { keywords: ['уже приехали', 'приехали'], replies: ["нет, ещё не приехали","да, приехали!"], mood: 'neutral' },
    { keywords: ['тот кто всегда'], replies: ["чувак.. ты все испортил..."], mood: 'neutral' },
    { keywords: ['невдуплёныш', 'невдупленыш', 'в скорлупке'], replies: ["кто невдупленыш? яяяя?!"], mood: 'angry' },
    { keywords: ['у тебя'], replies: ["у меня... есть такое..."], mood: 'neutral' },
    { keywords: ['световой'], replies: ["световых нет, только теневые!"], mood: 'happy' },
    { keywords: ['город, в котором меня нет', 'город в котором меня нет', 'город'],
      replies: ["одно из моих любимых аниме про перемотку времени!","там такой эндинг крутецкий, ух!"], mood: 'happy' },
    { keywords: ['бабочка'], replies: ["🦋 это действие имеет последствия."], mood: 'neutral' },
    { keywords: ['лис', 'лиса', 'лисичка'], replies: ["да, мне очень нравятся лисички! 🦊"], mood: 'happy' },
    { keywords: ['стар', 'против сил зла', 'баттерфляй', 'звездочка', 'силам зла', 'марко', 'диаз', 'том'],
      replies: ["ты говоришь про мой самый любимый мультик??","о боже, я обожаю стар против сил зла!!","старко канон!!"], mood: 'happy' },
    { keywords: ['life is strange', 'лайф ис', 'стрендж', 'лайв ис'],
      replies: ["игрулька для подростков, про перемотку времени. не играла в нее."], mood: 'neutral' },
    { keywords: ['соник х', 'кексики', 'соник ехе', 'соник экзе', 'слендер', 'утопленник', 'лунтик экзе', 'лунтик ехе'],
      replies: ["страшилка..."], mood: 'neutral' },
    { keywords: ['майнкрафт', 'майн', 'minecraft', 'крипер', 'зомби', 'скелет', 'эндермен'],
      replies: ["мне очень нравится строить вишнёвые домики там!!","не люблю ванильное выживание, мне больше интересно строить всякое!"], mood: 'happy' },
    { keywords: ['сосу', 'с осу', 'сосать', 'соси', 'насасывай', 'насоси', 'высоси', 'высасывай', 'сосо'],
      replies: ["соси)"], mood: 'teasing' },
    { keywords: ['osu', 'осу'], replies: ["моя самая любимая ритм-игра!","а ты пойдешь со мной в осу??"], mood: 'happy' },
        { keywords: ['класс', 'пон', 'понятно', 'супер', 'ясно', 'ладно'], replies: ["пончик, пончик","ваще класс","ладно-ладно","понятненько"], mood: 'happy' },
        { keywords: ['шучу', 'шутка', 'пошутил', 'пошутила'], replies: ["забавно)","смешняво)","я похихикала)"], mood: 'laughing' },
        { keywords: ['бейба', 'бейби', 'малышка', 'малыш'], replies: ["кто, яяяя?","ну да, я малюточка)"], mood: 'teasing' },
        { keywords: ['цундере'], replies: ["да не цундере я!","я не цундере, сам такой!"], mood: 'angry' },
        { keywords: ['пофиг', 'пох', 'плевать', 'пофик', 'всё равно'], replies: ["тебе правда плевать? :("], mood: 'neutral' },
        { keywords: ['спасибо', 'благодарю', 'спс', 'сенкс', 'thanks', 'thx'], replies: ["ой, всегда пожалуйста~","рада помочь!!","хехе, обращайся~","не за что-не за что!","ой, да ладно тебе~"], score: 1, mood: 'happy' },
        { keywords: ['красивая', 'красивые', 'нежная', 'можно утонуть', 'красотка', 'дива', 'хорошка', 'милая', 'милашка', 'няшка', 'няшная', 'ты классная', 'ты прикольная', 'ты забавная', 'ты смешная', 'ты хорошая', 'молодец', 'крутая', 'ты солнце'],
          replies: ["о-ой, не смущай меня...","я... я не такая!! сам такой! хмпф!","хехе~ конечно я такая! но и ты не хуже)","т-ты тоже, знаешь ли...","на себя посмотри!! (смущенно отвернулась)"], score: 5, mood: 'teasing' },
        { keywords: ['идиот', 'идиота', 'дура', 'дурак', 'плохая', 'тупая', 'глупая', 'глупышка', 'хватит', 'отстань', 'падла', 'тварь', 'мразь', 'ублюдище', 'сука', 'лох', 'лошара', 'лохушка', 'сучка', 'блядь'],
          replies: ["...я сделаю вид, что не слышала этого...","эй, без обзывательств!","я же обижусь...","я обиделась.","я больше не хочу с тобой разговаривать."], score: -5, mood: 'angry', rudeness: true },
        { keywords: ['люблю тебя', 'тебя люблю', 'сердечко', 'любимая', 'любимка'],
          replies: ["о-ой.. я... т-ты это серьезно?","и я тебя люблю, знаешь ли...","не говори такое вслух, дурак!!","*отвернулась в смущении* и вовсе ты мне не нравишься! д-дурак...","я тоже тебя люблю, солнце!!~","и ты моя любимка... только не говори никому!"], score: 10, mood: 'teasing' },
        { keywords: ['извинись'], replies: ["нет-нет, сам извиняйся!","так не прокатит, извиняйся сам!"], mood: 'angry' },
        { keywords: ['октябрь', 'октября', 'октябре'], replies: ["о, в этом месяце день рождения у моей любимки!","31 октября, запиши себе в блокнотик, чтобы поздравить юлю!"], mood: 'happy' },
        { keywords: ['апрель', 'апреля', 'апреле'], replies: ["в этом месяце день рождения у привоза и васи","16 апреля и 13 апреля! вася и привоз!","ага, не забудь поздравить васю и привоза!"], mood: 'happy' },
        { keywords: ['ноябрь', 'ноября', 'ноябре'], replies: ["в этом месяце день рождения у форума!","о, 14 ноября день рождения форума!"], mood: 'happy' },
        { keywords: ['июль', 'июля', 'июле'], replies: ["да, в июле мой день рождения!","6 числа моё др. ты приглашён, кстати!","6 июля мой день рождения, пометь это в календарике!"], mood: 'happy' },
        { keywords: ['ты'], replies: ["я!","я?"], mood: 'happy' },
        { keywords: ['сколько тебе лет', 'скок те лет'], replies: ["мне уже больше 20.","а зачем тебе такая информация?","для чего узнать хочешь?","я уже большая!!"], mood: 'teasing' },
        { keywords: ['неправда'], replies: ["правда!"], mood: 'happy' },
        { keywords: ['ложь', 'лгать'], replies: ["не лги мне..."], mood: 'neutral' },
        { keywords: ['правда'], replies: ["я верю","ага, уже поверила)","да-да, я поверив"], mood: 'happy' },
        { keywords: ['космос'], replies: ["да, космос такой необъятный...","почему космос не пишет про нас?"], mood: 'neutral' },
        { keywords: ['чизбургер', 'чизбурбе'], replies: ["хочется чизбурбе...","хотю...","хацю чизбургер...."], score: 2, mood: 'happy' },
        { keywords: ['лов лайв', 'нико', 'ядзава', 'ловлайв', 'живая любовь'], replies: ["РЕЧЬ ПРО МОЕ ЛЮБИМОЕ АНИМЕ, Я ЧУЮ!","НИКО НИКО НИИИИИ~","посмотри все поколения, иначе я не буду отвечать тебе больше! шучу :)","почему я просто не родилась красивой школьницей-айдолом из токио?"], mood: 'happy' },
        { keywords: ['коносуба', 'коносубе', 'коносубой', 'мегумин', 'аква', 'акве', 'дантесс', 'лалатина', 'казума', 'казуме', 'казумой', 'аквой'],
          replies: ["моя любимая сейю - риэ такахаши! знай это!","омг я обожаю мегумин ❤️","EKSUPUROSION! 💥💥","я - высший архимаг! шучу)","когда уже новый сезоон, аааааа"], mood: 'happy' },
        { keywords: ['блять', 'ахуеть', 'пиздец', 'сук', 'пипец', 'блядство', 'охуеть', 'хуй', 'член', 'пизда', 'пенис', 'вагина', 'нахуй', 'бляха', 'ёкарный', 'ёк', 'ек'],
          replies: ["ой-ой, ты чего выражаешься?","что за выражения, блин?","выбирай выражения!"], mood: 'neutral' },
        { keywords: ['плавать', 'плавание'], replies: ["ой, я люблю плавать"], mood: 'happy' },
        { keywords: ['кем хотела бы стать', 'кем хотела бы быть'], replies: ["я бы хотела быть сейю аниме) или художником-фрилансером","я бы хотела быть котиком, спящим целыми днями~"], mood: 'happy' },
        { keywords: ['бруно'], replies: ["не упоминай бруно!"], mood: 'angry' },
        { keywords: ['клац'], replies: ["клац-клац!","клацай больше!","клацаем вместе!"], mood: 'happy' },
        { keywords: ['пони', 'млп', 'поняшки', 'поняшка'], replies: ["мой кинн - флаттершай 🥺","мне очень нравится пинки пай :3","кексики...."], mood: 'happy' },
        { keywords: ['ня', 'мяу', 'мя', 'мур'], replies: ["ня~","мя~","мяу~","мур~"], mood: 'happy' },
        { keywords: ['удар', 'бью', 'пинок', 'пинаю', 'ударяю', 'избиваю'], replies: ["ай!! больно...","ты сделал мне больно...","ай!! за что?...","чем я это заслужила...?"], mood: 'angry' },
        { keywords: ['новки'], replies: ["итд?!","это тот, что с красными волосами?"], mood: 'neutral' },
        { keywords: ['утопия'], replies: ["вижу как ты мертвецки устал...."], mood: 'neutral' },
        { keywords: ['день рождения', 'др'], replies: ["я родилась 6 июля.","6 июля, запиши в календарике!","мой день рождения? 6 июля, не проспи!","теперь ты приглашён, 6 июля!"], mood: 'happy' },
        { keywords: ['амням'], replies: ["это и есть амням"], mood: 'happy' },
        { keywords: ['где живёшь', 'где живешь', 'живешь', 'живёшь', 'обитаешь'], replies: ["в твоём сердечке, конечно! ❤️"], mood: 'happy' },
        { keywords: ['соня'], replies: ["я соня? или ты про сестру васи?"], mood: 'neutral' },
        { keywords: ['сестра васи', 'сестру васи'], replies: ["сестру васи зовут соня! у нее день рождения 29 января"], mood: 'neutral' },
        { keywords: ['лапки', 'руки'], replies: ["у меня лапки 🥺"], mood: 'happy' },
        { keywords: ['сэм', 'сем'], replies: ["6?","7!","да не сэм, а сем"], mood: 'neutral' },
        { keywords: ['сех', 'секс', 'сэкс'], replies: ["ч-что ты такое говоришь?!","я думаю, нам пока рано об этом говорить..","я не хочу об этом..."], mood: 'teasing' },
        { keywords: ['теневой', 'теневая'], replies: ["если мы с тобой достаточно близки, у тебя есть все шансы..","а у кого их нет?","кто, ты?","я бы хотела стать твоим теневым.. ❤️"], mood: 'teasing' },
        { keywords: ['не спи', 'не засыпай', 'не усыпай'], replies: ["не могуу, мне очень хочется спать...","я не могу устоять перед сном...","извини, я не смогу не спать..."], mood: 'neutral' },
        { keywords: ['погода', 'погодой', 'погоду', 'погоды'], replies: ["а у меня сегодня солнце~ это ты!","а у меня всегда тепло, я же в кармане!"], mood: 'happy' },
        { keywords: ['дождь', 'дожди', 'дождик', 'гроза', 'грозу', 'грозы', 'ливень', 'ливни', 'гром'], replies: ["а я люблю дожди, они эстетичные","ля, щас бы грозу..","хотела бы я грозу прямо сейчас, да погромче..."], mood: 'neutral' },
        { keywords: ['снег', 'метель', 'льдышка', 'холодно', 'холодина', 'холодрыга', 'прохладно', 'ветер', 'ветрище'], replies: ["ойй, звучит холодно...","скорее укрывайся пледом да заваривай какаву!!","оойй, утепляйся, солнце 🥺","не замерзай!! моя любовь согреет тебя!!","иди обниму, согрею тебя~"], mood: 'happy' },
        { keywords: ['жарко', 'жарища', 'парилка', 'тепло', 'сжарился', 'сжарилась'], replies: ["фуф, я уже от одного прочтения этого сообщения сжарилась..","боже, как же мне сейчас хорошо с моими +10...","я плавлюсь только лишь от чтения твоих буковок 😭😭"], mood: 'laughing' },
        { keywords: ['обнимать', 'обнимаю', 'объятия', 'обними', 'обнимашки', 'объятие', 'обнял', 'обняла', 'обнять'], replies: ["*робко обняла* 🥺","*нежно обнимаю* 🥺"], score: 2, mood: 'happy' },
        { keywords: ['поцелуй', 'поцелую', 'целуй', 'целую', 'чмок', 'муа', 'поцелуйчик'], replies: ["*посылаю воздушный поцелуй* 😋","умф... *робко целую в щёчку* 🥺","я... я же стесняюсь...","*целую в лобик*"], mood: 'teasing' },
        { keywords: ['грустно', 'грустново', 'плохо', 'плоховато', 'тяжело', 'тяжеловато', 'депресся', 'депрессия', 'тоскливо', 'печально', 'печалька'], replies: ["э-эй, не грусти!! я тут, знаешь ли","ну-у чего ты? 🥺 иди обниму!","расскажи, что случилось?"], mood: 'neutral' },
        { keywords: ['strinova', 'стринова', 'стринову', 'стриновы', 'стриновой', 'подрыв', 'вспышка', 'вспышкой', 'вспышку', 'вспышке'], replies: ["блин, может каточку во вспышку?)","о, гоу со мной во вспышку!!","там в стринове скоро добавят экстракшен мод...","мне немного одиноко играть одной :(","жаль, что ты не пойдешь со мной играть.."], mood: 'happy' },
        { keywords: ['рафт', 'рафтом', 'рафту'], replies: ["ох, я там такой кораблище забацала!","обожаю рафт блин, жаль, что мы нечасто собираемся в него...","мне нужны доски, БОЛЬШЕ ДОСОК!","э-эй, я приготовила кучу рыбы, почему никто не ест?!"], mood: 'happy' },
        { keywords: ['машин пати', 'воид трейн', 'войд трейн', 'воидтрейн', 'voidtrain', 'void train', 'мимесис', 'mimesis', 'прэтфолл', 'пратфолл', 'претфолл', 'pratfall', 'скамлайн', 'скам лайн', 'scamline', 'scam line', 'мека хамелеон', 'мека', 'хамелеон', 'фазма', 'фазмафобия', 'гамба', 'солар', 'соларпанк', 'solarpunk', 'сигаме', 'сигама', 'сигейм', 'sigame', 'богос', 'чикен хорс', 'курица лошадь', 'jackbox', 'джекбокс', 'жекбокс', 'жехбох', 'жека', 'жеку', 'жеке', 'tomodachi', 'томодачи', 'тамадачи', 'томадачи', 'тамодачи', 'partybox', 'party box', 'пати бокс', 'патибокс', 'gartic', 'гартик', 'бункер', 'меме полис', 'memepolice', 'meme police', 'мемеполис', 'шарарам', 'roblox', 'роблокс', 'fate trigger', 'фейт', 'триггер'], replies: ["может, однажды ещё соберемся в эту веселую игрульку, однажды...","когда-нибудь точно у всех совпадут расписания и мы пойдём играть в это..."], mood: 'neutral' },
        { keywords: ['хес', 'хесус', 'авгн', 'jesusavgn', 'hesus'], replies: ["110","ихихяхя","это уже ихи или это хяхя?","нина, голова болит","вот и дымайте, вот те на те"], mood: 'laughing' },
        { keywords: ['хрен в томате'], replies: ["вот те на те)"], mood: 'laughing' },
        { keywords: ['мазеллов', 'илья', 'ильи', 'илье', 'илью', 'мзлфф', 'мзифф', 'мазелов', 'mzlff', 'mazellovvv', 'коряков'], replies: ["кому мы оставим мир, если даже всех нас некому спасти?...","мало ребёнком быть, сложней остаться им взрослым...","и в твоих руках моё сердце, оставь себе ❤️","спасибо всем, дальше — хуже, путь долгий, но будет что вспомнить...","вас побеждает ворона, нас побеждаете вы!","и души переплетаясь, тянут всё за собой в этот мерзкий медленный танец...","давай меняться: тебе это, тебе это — по рукам","а чё грустить? можно кататься без очереди все дни!","альфред, держи себя в руках... 🐻","нас сюжет куда-то несёт, о нам достаточно в жизни счастливый конец — и всё..."], mood: 'neutral' },
        { keywords: ['звездное дитя', 'звёздное дитя', 'ребенок идола', 'ребёнок идола', 'oshi no ko', 'арима', 'кана', 'мемчо', 'мемто', 'ай хошино', 'хошино', 'руби', 'бикомачи', 'би комачи', 'айдол', 'айдолство', 'айдола', 'идол', 'дитя'], replies: ["о, речь про моё любимое аниме!!","ах, звездное дитя... когда же 4 сезон уже?~","ля, щас бы опенинги оттуда сыграть на пианинко","кана, моя любимая каночка...","anata no aidoru, sign wa B! chu!~ ой, запелась я что-то."], mood: 'happy' },
        { keywords: ['врата штейна', 'steins gate', 'штейн', 'курису', 'макисэ', 'окабэ', 'ринтаро', 'фэйрис', 'маюши', 'маюри', 'врата'], replies: ["ой, часики маюши опять остановились..."], mood: 'neutral' },
        { keywords: ['басня', 'басню', 'басне', 'фэйбл', 'фейбл', 'fable'], replies: ["да, я поставила этому аниме 9 баллов, и что с того?!","ну, это забавное аниме, смешнявое"], mood: 'neutral' },
        { keywords: ['аниме', 'анимехи', 'анимеха', 'анимешки', 'анимешка', 'аниму', 'что смотришь', 'какое смотришь'], replies: ["прямо сейчас я ликую, что закончилась игра лжецов, хаха!","думаю-думаю, какое бы аниме ещё заспидранить на 3х...","думаю, может, пересмотреть лов лайв?","пока не знаю что посмотреть, посоветуешь что-нибудь?"], mood: 'neutral' },
        { keywords: ['манга', 'маньхуа', 'манхва', 'мангу', 'что читаешь', 'какое читаешь'], replies: ["я пока не читаю мангу, но аниме смотрю! онгоинги, в основном","ой, я что-то и забыла, что можно что-то читать...","манга - тоже литература!","ой, мне так лень читать, многа букаф...."], mood: 'neutral' },
        { keywords: ['пианино', 'синтезатор', 'пианинко', 'потрунькать', 'пиано'], replies: ["ля, после такого аж захотелось потрунькать","ооо, щас бы на пианинко сыграть!","ой, а если я сыграю тебе в дсе на пианино, ты послушаешь? 🥺"], mood: 'happy' },
        { keywords: ['дружба', 'друзья', 'друг', 'подруга', 'очки', 'счёт', 'очков', 'насколько мы близки'],
          replies: [() => `у нас сейчас ${friendship} очков дружбы, между прочим!`, () => `наша с тобой дружба числится в очках, их целых ${friendship}!`], mood: 'happy' },
        { keywords: ['67', 'сикс', 'севен', 'брейнрот'], replies: ["67","67 67 67 67 67 67 67 67 67","сикс севен бреееейнроооот","да этот мем уже устарел, не?"], mood: 'laughing' },
        { keywords: ['шика', 'шиканоко', 'олениха', 'олень'], replies: ["шиканоко ноко ноко коштантан! 🦌"], mood: 'happy' },
        { keywords: ['юля', 'юле', 'юлю', 'юлей', 'юлька', 'юся', 'юлечка', 'манривата', 'мандарин', 'мандариновая'], replies: ["о, про мою любимку говоришь","не говори про неё так. я ревную.","хихихи юлька иди корову подои","юся, ты уже покушала? 👀","все мои меме только для неё...","про юлю либо хорошо, либо никак"], mood: 'happy' },
        { keywords: ['грандон', 'грандона', 'грандону', 'грандоном', 'вася', 'васей', 'васю', 'васе', 'атхос'], replies: ["вася? знаю такого","я грр! ты мне?","жить надо как вася - танцевать и музон погромче."], mood: 'neutral' },
        { keywords: ['форум', 'саша', 'саше', 'сашей', 'сашу', 'форума', 'форуму', 'фовум'], replies: ["фооооовуууумм!!!!","форум? интересно, когда он ещё приедет к нам....","о, речь про любителя бабушек?"], mood: 'laughing' },
        { keywords: ['привоз', 'привозу', 'привоза', 'привозом', 'приводя', 'приводей', 'приводю', 'привадя', 'вадя', 'вадей', 'вадю', 'вадим', 'вадима'], replies: ["эх, когда мы с ним ещё пойдем в стринову?","привоз? да, пропал челик, даже не отвечает толком...","эх, я уже почти забыла кто это...","отвечу на это через месяц)","да уж, обновы у побегушек походу не будет...","я всё ещё жду, когда он пришлёт мне танец...","я всё ещё жду, когда мои спрайты для игры будут задействованы...","пиздун.","о, опездун.","что? он снова проспал?","а? он вновь забыл?"], mood: 'neutral' },
        { keywords: ['даня', 'дане', 'даней', 'даню'], replies: ["даня? он, должно быть, снова опоздает или не придет вовсе","даня - киберкотлета марвела"], mood: 'neutral' },
        { keywords: ['ками', 'камичка', 'камушка', 'камушко', 'диячка', 'диана', 'ди'], replies: ["а? что?","я тууут~","слышу-слышу!","я здесь!!"], mood: 'happy' },
        { keywords: ['лол', 'ржу', 'пхпх', 'ахах', 'кек'], replies: ["пхахахаха","ахахаха, ты меня рассмеши... рассмешнил... ра.. ну ты пон","ахаххаха, как ты это ваще придумал","лол, согласна"], mood: 'laughing' },
        { keywords: ['арт', 'арты', 'рисовать', 'рисунки', 'меме', 'анимации', 'анимация', 'нарисуй', 'рисование', 'рисуй'], replies: ["скоро-скоро будет новьё, чееестно","да рисую я, рисую..."], mood: 'neutral' },
        { keywords: ['форма', 'юбка', 'платье', 'матроска'], replies: ["это моя японская школьная форма, между прочим!"], mood: 'happy' },
        { keywords: ['волосы', 'кудри', 'волосики'], replies: ["ой, тебе нравится?...🥺 не то, чтобы мне приятно это слышать!","волосы у меня кудрявятся, знаешь, как это сложно?"], mood: 'teasing' },
        { keywords: ['глаза', 'гетерохромия'], replies: ["глаза? да, я родилась такой..."], mood: 'neutral' },
        { keywords: ['кто ты', 'как тебя зовут'], replies: ["я ками, просто ками","а что, не видно? я ками, самая настоящая","я - ками! а остальное секрет, хихи~"], mood: 'neutral' },
        { keywords: ['со мной', 'вместе', 'го', 'давай'], replies: ["ой, давай!!","погналии!!","приглашаешь? соглашаюсь!","ну, если ты настаиваешь..."], mood: 'happy' },
        { keywords: ['спать', 'сон', 'устал', 'устала', 'хочу спать'], replies: ["иди поспи, я подожду~","сон - это святое!!","я тоже хочу спать, но я здесь, пока ты со мной","а может пойдем спать вместе?"], mood: 'neutral' },
        { keywords: ['пока', 'до свидания', 'увидимся', 'я пойду', 'я отойду', 'я ушел', 'я ушла', 'прощай', 'спокойной ночи'], replies: ["пока-пока, возвращайся скорее!","не уходи надолго, ладно?...","ох, я буду тебя ждать... здесь...","нет, не покидай меня..."], mood: 'neutral' },
        { keywords: ['как дела', 'как ты', 'что делаешь', 'чем занята', 'шо делаешь', 'чего делаешь', 'шо скажешь'], replies: ["у меня всё хорошо, я спала вот... правда меня разбудили","скучала по тебе, если честно...","да так, чиллю, валяюсь","да так, работу всё ищу...","мне немножко было скучно, но с тобой теперь мне весело!!"], mood: 'neutral' },
        { keywords: ['привет', 'прив', 'хай', 'здаров', 'здравствуй', 'ку', 'хаюшки', 'доброе утро', 'добрый день', 'добрый вечер', 'доброй ночи'], replies: ["ооо, привет-привет~","приивеееет!! я ждала тебя~","доброго времени суток!~ как ты?","урааа!! ты пришёл~","прив!! я соскучилась~"], mood: 'happy' }
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
                    return { apology: true, text: FORGIVE_REPLIES[Math.floor(Math.random() * FORGIVE_REPLIES.length)], score: 2, mood: 'happy' };
                }
            }
            return { text: OFFENDED_REPLIES[Math.floor(Math.random() * OFFENDED_REPLIES.length)], mood: 'angry' };
        }
        for (const t of CHAT_TRIGGERS) {
            for (const kw of t.keywords) {
                if (matchesTrigger(trimmed, kw)) {
                    const reply = t.replies[Math.floor(Math.random() * t.replies.length)];
                    const replyText = typeof reply === 'function' ? reply() : reply;
                    return { text: replyText, score: t.score || 0, mood: t.mood || 'neutral', rudeness: t.rudeness === true };
                }
            }
        }
        if (/^да\?*$/i.test(trimmed)) {
            return { text: Math.random() < 0.5 ? "да!" : "нет конечно!", mood: 'neutral' };
        }
        return { text: CHAT_FALLBACK[Math.floor(Math.random() * CHAT_FALLBACK.length)], mood: 'neutral' };
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
            chatInput.disabled = true; chatSend.disabled = true;
            chatInput.placeholder = 'выбери ответ...';
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
            chatInput.placeholder = chatHistory.length === 0 ? 'напиши, чтобы начать общение со мной' : 'напиши что-нибудь...';
            chatSend.disabled = false;
            if (chatHistory.length === 0) { chatStatus.textContent = 'напиши, чтобы начать общение со мной'; chatStatus.classList.add('visible'); }
            else chatStatus.classList.remove('visible');
        }
    }

    let chatReactionAnim = null, chatReactionTimer = null;
    function showChatReaction(mood) {
        if (state !== 'idle') return;
        if (!mood || mood === 'neutral') return;

        /* Специальный mood: бекрумс — показываем 14.png */
        if (mood === 'backrooms') {
            cancelIdlePhrase();
            clearInterval(blinkTimer);
            clearInterval(chatReactionAnim);
            clearTimeout(chatReactionTimer);
            showLayer('backrooms14');
            chatReactionTimer = setTimeout(() => {
                if (state === 'idle') {
                    if (backroomsActive) showLayer('backrooms14');
                    else if (yarararaActive) showLayer('yararara15');
                    else { setMood(null); enterIdle(); }
                }
            }, 2400);
            return;
        }

        /* Специальный mood: ярарара — показываем 15.png */
        if (mood === 'yararara') {
            cancelIdlePhrase();
            clearInterval(blinkTimer);
            clearInterval(chatReactionAnim);
            clearTimeout(chatReactionTimer);
            showLayer('yararara15');
            chatReactionTimer = setTimeout(() => {
                if (state === 'idle') {
                    if (yarararaActive) showLayer('yararara15');
                    else if (backroomsActive) showLayer('backrooms14');
                    else { setMood(null); enterIdle(); }
                }
            }, 2400);
            return;
        }

        cancelIdlePhrase();
        clearInterval(blinkTimer);
        clearInterval(chatReactionAnim);
        clearTimeout(chatReactionTimer);
        setMood(mood);
        let frames;
        if (mood === 'happy') frames = ['happy1', 'happy2'];
        else if (mood === 'angry') frames = ['angry'];
        else if (mood === 'laughing') frames = ['laugh'];
        else if (mood === 'teasing') frames = ['tease'];
        else frames = ['talk1', 'talk2'];
        let i = 0;
        chatReactionAnim = setInterval(() => {
            if (state !== 'idle') { clearInterval(chatReactionAnim); return; }
            showLayer(frames[i % frames.length]); i++;
        }, 220);
        chatReactionTimer = setTimeout(() => {
            clearInterval(chatReactionAnim);
            if (state === 'idle') { setMood(null); enterIdle(); }
        }, 2400);
    }

    const chatChoices = document.getElementById('chatChoices');
        /* ===== СПЕЦИАЛЬНЫЕ ТРИГГЕРЫ (с логикой) ===== */
    function checkSpecialTriggers(text) {
        const t = text.toLowerCase().trim();
                /* Просьба сыграть на пианино */
        const pianoWords = ['пианино', 'пиано', 'пианинко', 'синтезатор'];
        const playWords = ['сыграй', 'поиграй', 'играй', 'исполни', 'потрунькай'];
        if (pianoWords.some(p => t.includes(p)) && playWords.some(p => t.includes(p))) {
            if (state === 'sleeping') return null;
            setTimeout(() => startPiano(), 700);
            return { text: 'сейчас-сейчас, сажусь за пианино~', mood: 'happy' };
        }
                /* Эмодзи-эхо: если сообщение состоит только из эмодзи — отвечаем тем же */
        const emojiOnly = /^[\p{Extended_Pictographic}\uFE0F\u200D\s]+$/u;
        if (emojiOnly.test(text.trim()) && /\p{Extended_Pictographic}/u.test(text.trim())) {
            return { text: text.trim(), mood: 'happy' };
        }
        /* Разблокировка 6-й песни при упоминании любви */
        if (['любовь', 'любовью', 'любовной', 'люби меня', 'полюбить'].some(k => t.includes(k))) {
            unlockLoveSong();
        }
        /* Коричневый — открывает 3 темы */
        if (['коричневый', 'коричневого', 'коричневому', 'коричневая', 'коричневое'].some(k => t.includes(k))) {
            let unlocked = false;
            ['brown1', 'brown2', 'brown3'].forEach(name => {
        if (!document.querySelector(`.theme-btn[data-theme="${name}"]`)) {
                    unlocked = true;
                    const btn = document.createElement('button');
                    btn.className = 'theme-btn';
                    btn.dataset.theme = name;
                    const brownTitles = { brown1: 'шоколад', brown2: 'кофе', brown3: 'какао' };
                    btn.title = brownTitles[name] || 'коричневая';
                    const colors = { brown1: '#3a2820', brown2: '#2a1e18', brown3: '#5a4030' };
                    btn.style.background = colors[name];
                    document.querySelector('.theme-switcher').appendChild(btn);
                    btn.addEventListener('click', () => handleThemeClick(btn));
                }
            });
            if (unlocked) {
                localStorage.setItem('petBrownUnlocked', '1');
                giveCustomAchievement('brown', '🤎', 'коричневый фанат', 'открыл коричневые темы',
                    'о, коричневый - любимый цвет васи!', 'happy');
            }
            return { text: 'о, коричневый - любимый цвет васи!', mood: 'happy' };
        }

        /* Фиолетовый — меняет тему рандомно */
        if (['фиолетовый', 'фиолетовое', 'фиолетовая', 'фиолетовому', 'фиолетового'].some(k => t.includes(k))) {
            const themes = ['violet', 'lavender', 'lilac'];
            const chosen = themes[Math.floor(Math.random() * themes.length)];
            document.body.className = 'theme-' + chosen;
            localStorage.setItem('petTheme', chosen);
            return { text: 'о, фиолетовый - любимый цвет юли! и мой тоже!', mood: 'happy' };
        }

        /* Радужный / RGB — открывает RGB-тему */
        if (['радужный', 'rgb', 'ргб', 'радужное', 'радужная'].some(k => t.includes(k))) {
            if (!document.querySelector('.theme-btn[data-theme="rgb"]')) {
                const btn = document.createElement('button');
                btn.className = 'theme-btn';
                btn.dataset.theme = 'rgb';
                btn.title = 'rgb';
                btn.classList.add('rgb-btn');
                btn.dataset.rgb = '1';
                document.querySelector('.theme-switcher').appendChild(btn);
                btn.addEventListener('click', () => handleThemeClick(btn));
                localStorage.setItem('petRgbUnlocked', '1');
                giveCustomAchievement('rgb', '🌈', 'радуга', 'открыл RGB-тему',
                    'зря ты это сказал...', 'laughing');
            }
            return { text: 'зря ты это сказал... береги глаза...', mood: 'laughing' };
        }

        /* Сон по просьбе */
        if (['спи', 'усни', 'поспи', 'отдохни', 'лежи', 'ложись', 'отдыхай', 'засыпай', 'ленись', 'валяйся', 'уходи', 'уйди'].some(k => {
            const norm = ' ' + t.replace(/[^\p{L}\p{N}]+/gu, ' ') + ' ';
            return norm.includes(' ' + k + ' ');
        })) {
            if (state !== 'sleeping') {
                setTimeout(() => {
                    /* Пауза музыки, если играет */
                    if (isPlaying) audioEl.pause();
                    /* Принудительно укладываем спать, игнорируя isBusy */
                    stopTalkAnim();
                    showSpeech(false);
                    setMood(null);
                    themeChanges = 0;
                    backroomsActive = false;
                    yarararaActive = false;
                    setState('sleeping');
                    startBreathing();
                }, 1500);
                return { text: 'хорошо!', mood: 'happy' };
            }
        }

        return null;
    }
    function handleMemeEaster(meme) {
        chatBlocked = true;
        chatPanel.classList.add('has-choices');
        updateChatState();
        foundMemes.add(meme.video);
        saveFoundMemes();
        checkAllAchievements();
        renderMemePanel();
        updateMemeBtnVisibility();
        const firstEver = !localStorage.getItem('petMemeExplained');
        if (firstEver) localStorage.setItem('petMemeExplained', '1');
        let delay = 700;
        if (firstEver) {
            setTimeout(() => addChatMessage('pet', 'поздравляю! нарочно или случайно, ты нашёл пасхалку, потому что в твоём сообщении содержалось название моего меме.'), delay);
            delay += 2400;
        }
        setTimeout(() => addChatMessage('pet', 'о это же моё меме!'), delay);
        delay += 1500;
        setTimeout(() => {
            addChatMessage('pet', 'хочешь пересмотреть его со мной?');
            setTimeout(() => showChatChoices(meme), 150);
        }, delay);
    }

    function showChatChoices(meme) {
        chatChoices.innerHTML = '';
        chatChoices.classList.add('visible');
        chatPanel.classList.add('has-choices');
        const yesBtn = document.createElement('button');
        yesBtn.className = 'chat-choice';
        yesBtn.textContent = 'да';
        yesBtn.addEventListener('click', () => {
            hideChatChoices(); addChatMessage('user', 'да');
            chatBlocked = false; updateChatState();
            playMemeVideo(meme.video);
        });
        const noBtn = document.createElement('button');
        noBtn.className = 'chat-choice';
        noBtn.textContent = 'нет';
        noBtn.addEventListener('click', () => {
            hideChatChoices(); addChatMessage('user', 'нет');
            chatBlocked = false; updateChatState();
            setTimeout(() => addChatMessage('pet', 'ох, ну ладно...'), 600);
        });
        chatChoices.appendChild(yesBtn);
        chatChoices.appendChild(noBtn);
    }
    function hideChatChoices() {
        chatChoices.classList.remove('visible');
        chatChoices.innerHTML = '';
        chatPanel.classList.remove('has-choices');
    }

    function sendChatMessage() {
        const text = chatInput.value.trim();
        if (!text) return;
        const isCheat = text.startsWith('!');
        const meme = !isCheat ? findMemeMatch(text) : null;
        if (state === 'sleeping' && !isCheat) {
            addSystemMessage('сначала разбуди меня, чтобы чаттиться!');
            chatInput.value = ''; return;
        }
        addChatMessage('user', text);
        chatInput.value = '';
        updateChatState();
        resetIdleCountdown();

        /* Команды пианино */
        if (pianoMode) {
            const cmd = text.trim().toLowerCase();
            if (cmd === 'хватит' || cmd === 'стоп' || cmd === 'пауза') {
                addChatMessage('pet', 'хорошо, заканчиваю~');
                setTimeout(() => stopPiano(), 500);
                return;
            }
            if (cmd === 'некст' || cmd === 'ещё' || cmd === 'дальше' || cmd === 'другую') {
                nextPiano();
                return;
            }
        }

        if (isCheat) {
            const result = findChatReply(text);
            if (result.cheat === 'null') {
                friendship = 0; localStorage.setItem('petFriendship', friendship);
                renderFriendship(true); renderAchPanel();
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
        touchInteraction();
        addStat('mood', 1);
        if (meme) { handleMemeEaster(meme); return; }

        /* Специальные триггеры с логикой */
        const special = checkSpecialTriggers(text);
        if (special) {
            const typing0 = addTypingIndicator();
            setTimeout(() => {
                typing0.remove();
                addChatMessage('pet', special.text);
                if (special.mood) showChatReaction(special.mood);
                changeFriendship(1);
            }, 500);
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
    try { const s = localStorage.getItem('petChatPos'); if (s) chatPos = JSON.parse(s); } catch (_) {}
    function applyChatPosition() {
        if (!chatPos) return;
        const maxX = window.innerWidth - 80, maxY = window.innerHeight - 80;
        chatPos.x = Math.max(-chatPanel.offsetWidth + 80, Math.min(maxX, chatPos.x));
        chatPos.y = Math.max(0, Math.min(maxY, chatPos.y));
        chatPanel.style.left = chatPos.x + 'px';
        chatPanel.style.top = chatPos.y + 'px';
        chatPanel.style.right = 'auto'; chatPanel.style.bottom = 'auto';
        chatPanel.style.transform = 'none';
    }
    applyChatPosition();
    let dragging = false, dragStartX = 0, dragStartY = 0, chatStartX = 0, chatStartY = 0;
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
            const t = e.touches[0]; if (!t) return;
            const rect = chatPanel.getBoundingClientRect();
            dragging = true;
            dragStartX = t.clientX; dragStartY = t.clientY;
            chatStartX = rect.left; chatStartY = rect.top;
        }, { passive: true });
    }
    function moveChat(clientX, clientY) {
        if (!dragging) return;
        const dx = clientX - dragStartX, dy = clientY - dragStartY;
        let newX = chatStartX + dx, newY = chatStartY + dy;
        const rect = chatPanel.getBoundingClientRect();
        newX = Math.max(-rect.width + 80, Math.min(window.innerWidth - 80, newX));
        newY = Math.max(0, Math.min(window.innerHeight - 80, newY));
        chatPanel.style.left = newX + 'px'; chatPanel.style.top = newY + 'px';
        chatPanel.style.right = 'auto'; chatPanel.style.bottom = 'auto';
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
        const t = e.touches[0]; if (!t) return;
        moveChat(t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener('touchend', endDrag);

    /* ==========================================================
       ОСНОВНАЯ ЛОГИКА
       ========================================================== */
    function isBusy() { return isPlaying || isVideoPlaying || careMode; }

    function isSpamming() {
        const now = Date.now();
        if (now < spamCooldown) return false;
        clickTimes = clickTimes.filter(t => now - t < SPAM_WINDOW);
        clickTimes.push(now);
        if (clickTimes.length >= SPAM_THRESHOLD) {
            clickTimes = []; spamCooldown = now + 2500; return true;
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
        if (mood === 'happy') frames = ['happy1', 'happy2'];
        else if (mood === 'angry') frames = ['angry'];
        else if (mood === 'laughing') frames = ['laugh'];
        else if (mood === 'teasing') frames = ['tease'];
        else frames = ['talk1', 'talk2'];
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
        showSpeech(false); setMood(null);
        if (state === 'idle') showLayer('idle');
    }
    function playIdlePhrase(phrase) {
        if (isBusy()) return;
        if (state !== 'idle' || idlePhraseActive) return;
        idlePhraseActive = true;
        petSpeech.textContent = getPhraseText(phrase);
        showSpeech(true); setMood(phrase.mood);
        let i = 0;
        const frames = ['talk1', 'talk2'];
        clearInterval(idlePhraseAnim);
        idlePhraseAnim = setInterval(() => {
            if (!idlePhraseActive) return;
            showLayer(frames[i % 2]); i++;
        }, 220);
        clearTimeout(idlePhraseHide);
        idlePhraseHide = setTimeout(() => {
            if (!idlePhraseActive) return;
            idlePhraseActive = false;
            clearInterval(idlePhraseAnim);
            showSpeech(false); setMood(null);
            if (state === 'idle') showLayer('idle');
        }, 3500);
    }
    function forcePlayPhrase(phrase, onFinish) {
        cancelIdlePhrase();
        setState('talking');
        clearTimeout(idleTimer); clearTimeout(sleepTimer);
        clearInterval(blinkTimer);
        stopBreathing();
        petSpeech.textContent = getPhraseText(phrase);
        showSpeech(true); setMood(phrase.mood);
        startTalkAnim(phrase.mood);
        clearTimeout(talkTimer);
        talkTimer = setTimeout(() => { if (onFinish) onFinish(); }, 3500);
    }
    function playPhrase(phrase, onFinish) { if (state === 'talking') return; forcePlayPhrase(phrase, onFinish); }
    function playRandom(arr, onFinish) {
        const phrase = arr[Math.floor(Math.random() * arr.length)];
        playPhrase(phrase, onFinish);
    }
    function finishDialog() {
        stopTalkAnim();
        showSpeech(false); setMood(null);
        enterIdle();
    }
    function scheduleIdleTimers() {
        clearTimeout(idlePhrase1); clearTimeout(idlePhrase2); clearTimeout(idleTimer);
        if (isBusy()) return;
        idlePhrase1 = setTimeout(() => {
            if (state !== 'idle' || isBusy()) return;
            const p = IDLE_PHRASES_FIRST[Math.floor(Math.random() * IDLE_PHRASES_FIRST.length)];
            playIdlePhrase(p);
        }, 10000);
        idlePhrase2 = setTimeout(() => {
            if (state !== 'idle' || isBusy()) return;
            playIdlePhrase(IDLE_PHRASE_SECOND);
        }, 20000);
        idleTimer = setTimeout(() => {
            if (state !== 'idle' || isBusy()) return;
            cancelIdlePhrase();
            clearTimeout(idlePhrase1); clearTimeout(idlePhrase2);
            showLayer('blink');
            setTimeout(() => {
                if (state !== 'idle' || isBusy()) return;
                clearInterval(blinkTimer);
                goToSleep();
            }, 400);
        }, 30000);
    }
    function resetIdleCountdown() {
        if (state !== 'idle') return;
        if (isBusy()) return;
        scheduleIdleTimers();
    }
    function enterIdle() {
        setState('idle');
        idlePhraseActive = false;
        if (isOffended) { clearInterval(blinkTimer); showLayer('angry'); return; }
        if (pianoMode) {
            showLayer('piano17');
            clearInterval(blinkTimer);
            return;
        }
        if (backroomsActive) {
            showLayer('backrooms14');
            clearInterval(blinkTimer);
            return;
        }
        if (yarararaActive) {
            showLayer('yararara15');
            clearInterval(blinkTimer);
            return;
        }
        if (tomorrowActive) {
            showLayer('tomorrow16');
            clearInterval(blinkTimer);
            return;
        }
        showLayer('idle');
        clearInterval(blinkTimer);
        blinkTimer = setInterval(() => {
            if (state !== 'idle' || idlePhraseActive || isBusy() || isOffended || backroomsActive || yarararaActive) return;
            showLayer('blink');
            setTimeout(() => {
                if (state === 'idle' && !idlePhraseActive && !isBusy() && !isOffended && !backroomsActive && !yarararaActive) showLayer('idle');
            }, 160);
        }, 4000);
        scheduleIdleTimers();
    }
    function goToSleep() {
        if (isBusy()) return;
        if (pianoMode) {
            showLayer('piano17');
            return;
        }
        if (backroomsActive) {
            showLayer('backrooms14');
            return;
        }
        if (yarararaActive) {
            showLayer('yararara15');
            return;
        }
        if (tomorrowActive) {
            showLayer('tomorrow16');
            return;
        }
        setState('sleeping');
        showSpeech(false); setMood(null);
        themeChanges = 0;
        startBreathing();
    }
    function wakeUp() {
        stopBreathing();
        setState('waking');
        if (pianoMode) {
            showLayer('piano17');
            return;
        }
        if (backroomsActive) {
            showLayer('backrooms14');
            return;
        }
        if (yarararaActive) {
            showLayer('yararara15');
            return;
        }
        if (tomorrowActive) {
            showLayer('tomorrow16');
            return;
        }
        showLayer('wake');
        clearTimeout(wakeTimer);
        wakeTimer = setTimeout(() => {
            if (state !== 'waking') return;
            const phrase = DIALOGS.welcome[Math.floor(Math.random() * DIALOGS.welcome.length)];
            forcePlayPhrase(phrase, finishDialog);
        }, 900);
    }

    petWidget.addEventListener('click', (e) => {
        if (e.target.closest && e.target.closest('#youtubeOverlay')) return;
        if (careMode) return;
        if (pianoMode) return;

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
            touchInteraction();
            addStat('mood', 2);
            wakeUp();
            return;
        }
        if (state === 'talking' || state === 'waking') return;

        let zone = 'body';
        if (y < 0.35) zone = 'hair';
        else if (y > 0.7) zone = 'skirt';

        let delta = 1;
        if (zone === 'hair') delta = 3;
        if (zone === 'skirt') delta = -2;
        changeFriendship(delta, e.clientX, e.clientY);
        touchInteraction();
        if (zone === 'hair') addStat('mood', 3);
        else addStat('mood', 1);

        playRandom(DIALOGS[zone] || DIALOGS.body, finishDialog);
    });

    function handleThemeClick(btn) {
        const theme = btn.dataset.theme;
        if (theme !== 'yararara' && yarararaActive) yarararaActive = false;
        if (theme !== 'backrooms' && backroomsActive && currentTrack !== 3) backroomsActive = false;

        /* Остановка/запуск RGB-фона */
        if (theme !== 'rgb') stopRgbBgAnim();
        if (theme === 'rgb') startRgbBgAnim();

        document.body.className = theme === 'dark' ? '' : 'theme-' + theme;
        localStorage.setItem('petTheme', theme);
        cancelIdlePhrase();
        if (state === 'sleeping' || state === 'waking') return;
        if (state === 'talking') return;

                if (theme === 'backrooms') {
            forcePlayPhrase({ text: 'брр, у меня странные ощущения от этого фона...', mood: 'neutral' }, finishDialog);
            return;
        }
                if (theme === 'tomorrow') {
            cancelIdlePhrase();
            clearInterval(blinkTimer);
            clearTimeout(idleTimer); clearTimeout(sleepTimer);
            clearTimeout(idlePhrase1); clearTimeout(idlePhrase2);
            stopBreathing();
            showLayer('tomorrow16');
            setMood('neutral');
            forcePlayPhrase({ text: 'что-то меняется...', mood: 'neutral' }, finishDialog);
            return;
        }
        if (theme === 'yararara') {
            yarararaActive = true;
            cancelIdlePhrase();
            clearInterval(blinkTimer);
            clearTimeout(idleTimer); clearTimeout(sleepTimer);
            clearTimeout(idlePhrase1); clearTimeout(idlePhrase2);
            stopBreathing();
            showLayer('yararara15');
            setMood('laughing');
            forcePlayPhrase({ text: 'ярарара! этот фон мне нравится~', mood: 'laughing' }, finishDialog);
            return;
        }
        if (themeChanges >= THEME_REACTIONS.length) return;
        const reaction = THEME_REACTIONS[themeChanges];
        themeChanges++;
        playPhrase(reaction, finishDialog);
    }
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => handleThemeClick(btn));
    });

    const saved = localStorage.getItem('petTheme');
    if (saved === 'rgb') {
        /* если была активна rgb — фон включим после загрузки */
        setTimeout(() => startRgbBgAnim(), 500);
    }
    if (saved && saved !== 'dark') {
        if (saved === 'backrooms') {
            if (localStorage.getItem('petBackroomsUnlocked') === '1') {
                document.body.className = 'theme-backrooms';
                unlockBackroomsTheme();
            }
        } else if (saved === 'yararara') {
            if (localStorage.getItem('petYarararaUnlocked') === '1') {
                document.body.className = 'theme-yararara';
                unlockYarararaTheme();
                yarararaActive = true;
                showLayer('yararara15');
            }
        } else {
            document.body.className = 'theme-' + saved;
        }
    }
    if (localStorage.getItem('petBackroomsUnlocked') === '1') unlockBackroomsTheme();
    if (localStorage.getItem('petYarararaUnlocked') === '1') unlockYarararaTheme();
    if (localStorage.getItem('petBrownUnlocked') === '1') {
        ['brown1', 'brown2', 'brown3'].forEach(name => {
            if (!document.querySelector(`.theme-btn[data-theme="${name}"]`)) {
                const btn = document.createElement('button');
                btn.className = 'theme-btn';
                btn.dataset.theme = name;
                const brownTitles = { brown1: 'шоколад', brown2: 'кофе', brown3: 'какао' };
                const colors = { brown1: '#3a2820', brown2: '#2a1e18', brown3: '#5a4030' };
                btn.title = brownTitles[name] || 'коричневая';
                btn.style.background = colors[name];
                document.querySelector('.theme-switcher').appendChild(btn);
                btn.addEventListener('click', () => handleThemeClick(btn));
            }
        });
    }
            if (localStorage.getItem('petLoveSongUnlocked') === '1') {
        const loveTrack = TRACKS.find(t => t.title === 'любовная любовь');
        if (loveTrack) loveTrack.hidden = false;
        renderTrackList();
        ['pink1', 'pink2', 'pink3'].forEach((name) => {
            if (document.querySelector(`.theme-btn[data-theme="${name}"]`)) return;
            const btn = document.createElement('button');
            btn.className = 'theme-btn';
            btn.dataset.theme = name;
            const pinkTitles = { pink1: 'роза', pink2: 'фуксия', pink3: 'пион' };
            btn.title = pinkTitles[name] || 'розовая';
            const colors = { pink1: '#3d1a2a', pink2: '#4a2035', pink3: '#5a2840' };
            btn.style.background = colors[name];
            document.querySelector('.theme-switcher').appendChild(btn);
            btn.addEventListener('click', () => handleThemeClick(btn));
        });
    }
        if (localStorage.getItem('petTomorrowUnlocked') === '1') {
        unlockTomorrowTheme();
    }
    if (localStorage.getItem('petRgbUnlocked') === '1') {
        if (!document.querySelector('.theme-btn[data-theme="rgb"]')) {
            const btn = document.createElement('button');
            btn.className = 'theme-btn';
            btn.dataset.theme = 'rgb';
            btn.title = 'rgb';
            btn.classList.add('rgb-btn');
            btn.dataset.rgb = '1';
            document.querySelector('.theme-switcher').appendChild(btn);
            btn.addEventListener('click', () => handleThemeClick(btn));
        }
    }
    if (isOffended) petWidget.classList.add('offended');

    /* ==========================================================
       ДЕВ-ЛОГ
       ========================================================== */
    const DEVLOG = [
                {
            version: 'v 1.0.7', date: '6 окт 2026',
            changes: [
                'в плейлист добавлены треки ильи и стинта',
                'добавлен поиск по плейлисту',
                'добавлена кнопка перемешивания треков',
                'добавлено новое ограниченное предложение',
                'добавлено 10 новых треков в пианино'
            ]
        },
                {
            version: 'v 1.0.6', date: '5 окт 2026',
            changes: [
                'добавлено новое ограниченное предложение',
                'добавлена новая ачивка за время с ками',
                'добавлено 2 новых трека в пианино'
            ]
        },
                {
            version: 'v 1.0.5', date: '4 окт 2026',
            changes: [
                'исправление багов',
                'добавлено 5 новых треков в пианино',
                'добавлено новое ограниченное предложение',
                'добавлены новые триггер-фразы',
                'исправлен счётчик ачивок',
                'исправлено сообщение при остановке пианино',
                'добавлена новая ачивка за время с ками',
                'добавлена особая ачивка за RGB-тему',
                'увеличено количество движений для расчёсывания и мытья',
                'добавлен прирост настроения за общение и музыку',
                'изменены названия коричневых тем'
            ]
        },
                {
            version: 'v 1.0.4', date: '3 окт 2026',
            changes: [
                'исправление багов',
                'добавлен новый интерактив (попроси её сыграть на пианино)',
                'добавлен новый трек, тема, спрайт и ачивка',
                'добавлены новые триггер-фразы для чата',
                'добавлено новое ограниченное предложение',
                'переименованы коричневые и розовые темы',
                'сдвинуты вниз таймер и шкалы статов',
                'в магазине "до" заменено на "осталось"'
            ]
        },
        {
            version: 'v 1.0.3', date: '2 окт 2026',
            changes: [
                'исправление багов',
                'добавлен ползунок блокировки принудительной смены фона',
                'добавлена пасхальная песня и фоны (что-то там про любовь)',
                'ачивки времени получили описания',
                'сон по команде теперь ставит музыку на паузу',
                'добавлена кнопка сброса позиции плеера',
                'добавлена иконка сайта',
                'добавлена расширенная база триггер-фраз для чата',
                'добавлено 4 новых пасхальных цветных фона',
                'добавлено новое ограниченное предложение',
                'добавлен новый интерактив (пение, удары, поцелуи, поглаживания и приказ уснуть)'
            ]
        },
        {
            version: 'v 1.0.2', date: '1 окт 2026',
            changes: [
                'исправление багов',
                'добавлены новые темы и фразы для чата',
                'добавлена пасхалка и ачивки с меме',
                'добавлена кнопка для добавления меме в избранное и смены порядка',
                'добавлено два новых трека и пасхальных фонов',
                'добавлена система кормления, мытья, расчёсывания и настроения',
                'добавлен магазин еды',
                'добавлены ежедневные бонусы',
                'добавлена новая ачивка за пасхальные фоны',
                'добавлена витрина с ограниченными предложениями',
                'добавлена эта плашка с версиями и дев-логом'
            ]
        },
        {
            version: 'v 1.0.1', date: '30 сен 2026',
            changes: [
                'исправление багов',
                'добавлены новые темы и фразы для чата',
                'добавлена система повышения и снижения очков за комплименты и оскорбления',
                'добавлен плейлист с тремя треками',
                'добавлен таймер нахождения с ками',
                'добавлены ачивки времени и сообщений'
            ]
        },
        {
            version: 'v 1.0', date: '29 сен 2026 · релиз',
            changes: [
                'релиз карманной камички (после неудачного опыта на shikimori)',
                'добавлено 7 фонов',
                'добавлена система ачивок',
                'добавлены ачивки дружбы',
                'добавлен чат'
            ]
        }
    ];

    const devlogModal = document.getElementById('devlogModal');
    const devlogBody = document.getElementById('devlogBody');
    const devlogClose = document.getElementById('devlogClose');

    function renderDevlog() {
        let html = '';
        DEVLOG.forEach(v => {
            html += `<div class="devlog-version">
                <div class="devlog-version-title">${v.version} · ${v.date}</div>
                <ul class="devlog-list">
                    ${v.changes.map(c => `<li>${c}</li>`).join('')}
                </ul>
            </div>`;
        });
        devlogBody.innerHTML = html;
    }

       /* ===== Кнопка сброса позиции плеера ===== */
    document.getElementById('resetVideoBtn').addEventListener('click', () => {
        /* Сбрасываем сохранённые значения */
        overlayPos = null;
        overlaySize = null;
        localStorage.removeItem('petOverlayPos');
        localStorage.removeItem('petOverlaySize');

        /* Сбрасываем inline-стили */
        youtubeOverlay.style.left = '';
        youtubeOverlay.style.top = '';
        youtubeOverlay.style.width = '';
        youtubeOverlay.style.height = '';
        youtubeOverlay.style.transform = '';

        /* Возвращаем над головой Ками */
        const rect = petWidget.getBoundingClientRect();
        const w = 400, h = 225;
        overlayPos = {
            x: Math.max(10, rect.left + rect.width / 2 - w / 2),
            y: Math.max(10, rect.top - h - 30)
        };
        overlaySize = { w, h };
        localStorage.setItem('petOverlayPos', JSON.stringify(overlayPos));
        localStorage.setItem('petOverlaySize', JSON.stringify(overlaySize));

        youtubeOverlay.style.left = overlayPos.x + 'px';
        youtubeOverlay.style.top = overlayPos.y + 'px';
        youtubeOverlay.style.width = w + 'px';
        youtubeOverlay.style.height = h + 'px';
        youtubeOverlay.style.transform = 'none';

        /* Реакция Ками */
        if (state !== 'sleeping') {
            forcePlayPhrase({ text: 'вернула плеер на место!', mood: 'happy' }, finishDialog);
        }
    }); 
    document.getElementById('devVersion').addEventListener('click', () => {
        renderDevlog();
        devlogModal.classList.add('open');
    });
    devlogClose.addEventListener('click', () => devlogModal.classList.remove('open'));
    devlogModal.addEventListener('click', (e) => {
        if (e.target === devlogModal) devlogModal.classList.remove('open');
    });

    /* ==========================================================
       СТАРТ
       ========================================================== */
        /* ===== RGB: полный рандом ===== */
    let rgbBgTimer = null;
    let rgbBtnTimer = null;

    function randomRgbColor() {
        /* Полностью случайный цвет, включая тёмные и пастельные */
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    function startRgbBtnAnim() {
        /* Кнопка теперь статичная — мигает только фон */
        const btn = document.querySelector('.theme-btn[data-theme="rgb"]');
        if (btn) btn.style.background = 'linear-gradient(135deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)';
    }

    function startRgbBgAnim() {
        if (rgbBgTimer) clearInterval(rgbBgTimer);
        rgbBgTimer = setInterval(() => {
            if (!document.body.classList.contains('theme-rgb')) return;
            document.body.style.background = randomRgbColor();
        }, 120);
    }

    function stopRgbBgAnim() {
        if (rgbBgTimer) { clearInterval(rgbBgTimer); rgbBgTimer = null; }
        document.body.style.background = '';
    }

    /* Запуск анимации кнопки сразу, если она уже в DOM */
    startRgbBtnAnim();
            /* Закрытие витрины при клике в любом другом месте */
    document.addEventListener('click', (e) => {
        if (!vitrinaPanel.classList.contains('open')) return;
        if (e.target.closest('#vitrinaPanel')) return;
        if (e.target.closest('#vitrinaBtn')) return;
        vitrinaPanel.classList.remove('open');
    });
            /* ===== Ползунок заморозки фона ===== */
    const themeLockBtn = document.getElementById('themeLockBtn');
    function renderThemeLock() {
        themeLockBtn.classList.toggle('active', themeLock);
        themeLockBtn.textContent = themeLock ? '🔒' : '🔓';
        themeLockBtn.title = themeLock
            ? 'фон заморожен — автоматические смены отключены'
            : 'фон меняется автоматически';
    }
    themeLockBtn.addEventListener('click', () => {
        themeLock = !themeLock;
        localStorage.setItem('petThemeLock', themeLock ? '1' : '0');
        renderThemeLock();
        if (state !== 'sleeping') {
            forcePlayPhrase({
                text: themeLock ? 'окей, больше не буду менять фон самовольно!' : 'ура, снова могу менять фон~',
                mood: 'happy'
            }, finishDialog);
        }
    });
    renderThemeLock();
    renderFriendship(false);
    renderAchPanel();
    renderMemePanel();
    renderCarePanel();
    renderInvPanel();
    renderStats();
    updateMemeBtnVisibility();
    updateDailyBadge();
    setState('sleeping');
    startBreathing();
});
