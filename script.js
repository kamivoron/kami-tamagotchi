document.addEventListener('DOMContentLoaded', () => {
    const petWidget = document.getElementById('petWidget');
    const petLayer = document.getElementById('petLayer');
    const petSpeech = document.getElementById('petSpeech');
    const friendCounter = document.getElementById('friendCounter');
    const achBtn = document.getElementById('achBtn');
    const achPanel = document.getElementById('achPanel');

    /* ===== КАРТИНКИ ===== */
    const IMAGES = {
        sleep1: 'images/1.png',
        sleep2: 'images/2.png',
        wake:   'images/3.png',
        blink:  'images/4.png',
        idle:   'images/5.png',
        talk1:  'images/6.png',
        talk2:  'images/7.png',
        happy1: 'images/8.png',
        happy2: 'images/9.png',
        angry:  'images/10.png',
        laugh:  'images/11.png',
        tease:  'images/12.png'
    };
    Object.values(IMAGES).forEach(src => { const i = new Image(); i.src = src; });

    /* ===== ДИАЛОГИ ===== */
    const DIALOGS = {
        welcome: [
            { text: "ммм... что такое?",       mood: "neutral" },
            { text: "я так сладко спала!...",   mood: "neutral" },
            { text: "кто меня разбудил?",       mood: "neutral" },
            { text: "и что тебе нужно?~",       mood: "happy"   }
        ],
        body: [
            { text: "ой! ты чего тыкаешь?",             mood: "neutral"  },
            { text: "мне же щекотно!",                  mood: "happy"    },
            { text: "думаешь, тут есть пасхалка?",      mood: "neutral"  },
            { text: "ахахах, ну ты даёшь!",             mood: "laughing" },
            { text: "я так и знала, что ты зайдёшь~",   mood: "happy"    },
            { text: "ты пришла поиграть?",              mood: "happy"    }
        ],
        hair: [
            { text: "э! не трогай мои волосы!",       mood: "angry" },
            { text: "ты меня гладишь?! я не милая!",  mood: "angry" },
            { text: "ещё раз тронешь — укушу!",       mood: "angry" }
        ],
        skirt: [
            { text: "к-куда ты жмёшь?!",   mood: "angry"   },
            { text: "извращенец!",          mood: "angry"   },
            { text: "что ты только что-!",  mood: "teasing" }
        ]
    };

    const SPAM_PHRASES = [
        { text: "ёмаё, поумерь свой пыл, бро",     mood: "angry" },
        { text: "ты чего накинулся?",               mood: "angry" },
        { text: "тише, тише, куда так жмёшь-то?",   mood: "angry" }
    ];

    const THEME_REACTIONS = [
        { text: "что-то изменилось вокруг...",      mood: "neutral" },
        { text: "да, этот цвет лучше прошлого",      mood: "happy"   },
        { text: "ты просто кликаешь на всё подряд?", mood: "neutral" },
        { text: "ладно, развлекайся",                mood: "neutral" }
    ];
    let themeChanges = 0;

    const IDLE_PHRASES_FIRST = [
        { text: "ээ... ты там?",                       mood: "neutral" },
        { text: "так и будем смотреть друг на друга?",  mood: "neutral" }
    ];
    const IDLE_PHRASE_SECOND = { text: "ты уснул? значит, мне тоже пора...", mood: "neutral" };

    /* ===== ДОСТИЖЕНИЯ ===== */
    const ACHIEVEMENTS = [
        { score: 10,  icon: "🌱", title: "незнакомец", desc: "первая встреча, мимолетный взгляд",
          text: "ты меня не затискаешь до смерти, надеюсь?", mood: "neutral"  },
        { score: 25,  icon: "🌿", title: "знакомый",   desc: "кажется, у вас всё же есть что-то общее",
          text: "ладно, ты мне нравишься",                   mood: "happy"    },
        { score: 50,  icon: "🌳", title: "друг",       desc: "видимо, тебе понравилось обсуждать с ней то аниме про айдолов двадцатый раз?",
          text: "я тебя запомнила, знай!",                   mood: "happy"    },
        { score: 67,  icon: "🤖", title: "67",         desc: "67676767676767",
          text: "67... сикс севен... брейнрот detected",     mood: "laughing" },
        { score: 100, icon: "👤", title: "теневой",    desc: "когда вы успели стать так близки?",
          text: "ты стала моим лучшим другом~",              mood: "laughing" }
    ];
    const shownAchievements = new Set(JSON.parse(localStorage.getItem('petAchShown') || '[]'));

    /* ===== СЧЁТЧИК ДРУЖБЫ ===== */
    let friendship = parseInt(localStorage.getItem('petFriendship') || '0', 10);
    if (isNaN(friendship)) friendship = 0;

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

        if (typeof x === 'number' && typeof y === 'number') {
            spawnClickFx(x, y, delta);
        }

        if (delta > 0) checkAchievements(old, friendship);
        renderAchPanel();
    }

    function checkAchievements(oldScore, newScore) {
        ACHIEVEMENTS.forEach(a => {
            if (shownAchievements.has(a.score)) return;
            if (oldScore < a.score && newScore >= a.score) {
                shownAchievements.add(a.score);
                localStorage.setItem('petAchShown', JSON.stringify([...shownAchievements]));
                renderAchPanel();
                setTimeout(() => {
                    if (state === 'talking' || state === 'waking') return;
                    forcePlayPhrase({ text: a.text, mood: a.mood }, finishDialog);
                }, 400);
            }
        });
    }

    /* ===== ВИЗУАЛЬНЫЕ ЭФФЕКТЫ КЛИКА ===== */
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

    /* ===== ПАНЕЛЬ ДОСТИЖЕНИЙ ===== */
    function renderAchPanel() {
        const unlockedCount = ACHIEVEMENTS.filter(a => friendship >= a.score).length;
        let html = `<div class="ach-header">🏆 твои ачивки · ${unlockedCount}/${ACHIEVEMENTS.length}</div>`;
        ACHIEVEMENTS.forEach(a => {
            const unlocked = friendship >= a.score;
            html += `
                <div class="ach-item ${unlocked ? 'unlocked' : 'locked'}">
                    <div class="ach-icon">${unlocked ? a.icon : '🔒'}</div>
                    <div class="ach-info">
                        <div class="ach-title">${unlocked ? a.title : '???'}</div>
                        <div class="ach-desc">${unlocked ? a.desc : 'пока не открыто'}</div>
                    </div>
                    <div class="ach-progress">${unlocked ? '✓' : '???'}</div>
                </div>`;
        });
        achPanel.innerHTML = html;
    }

    achBtn.addEventListener('click', () => {
        achPanel.classList.toggle('open');
    });

    /* ===== СОСТОЯНИЕ ===== */
    let state           = 'sleeping';
    let talkTimer       = null;
    let blinkTimer      = null;
    let idleTimer       = null;
    let sleepTimer      = null;
    let breathTimer     = null;
    let breathFrame     = 0;
    let talkAnim        = null;

    let idlePhrase1     = null;
    let idlePhrase2     = null;
    let idlePhraseHide  = null;
    let idlePhraseAnim  = null;
    let idlePhraseActive = false;

    let clickTimes      = [];
    let spamCooldown    = 0;
    const SPAM_WINDOW   = 2000;
    const SPAM_THRESHOLD = 5;

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

    /* ===== ФУНКЦИИ ===== */
    function setState(newState) {
        state = newState;
        ['sleeping', 'waking', 'idle', 'talking'].forEach(s => {
            petWidget.classList.toggle(s, s === newState);
        });
    }

    function showLayer(name) {
        if (!IMAGES[name]) return;
        petLayer.style.backgroundImage = `url(${IMAGES[name]})`;
    }

    function showSpeech(visible) {
        petWidget.classList.toggle('awake', visible);
    }

    function setMood(mood) {
        petWidget.classList.remove('mood-angry', 'mood-happy', 'mood-laughing', 'mood-teasing');
        if (mood && mood !== 'neutral') petWidget.classList.add('mood-' + mood);
    }

    function startTalkAnim(mood) {
        stopTalkAnim();
        let i = 0;
        let frames;
        if (mood === 'happy')          frames = ['happy1', 'happy2'];
        else if (mood === 'angry')     frames = ['angry'];
        else if (mood === 'laughing')  frames = ['laugh'];
        else if (mood === 'teasing')   frames = ['tease'];
        else                            frames = ['talk1', 'talk2'];

        if (frames.length === 1) { showLayer(frames[0]); return; }
        talkAnim = setInterval(() => {
            showLayer(frames[i % frames.length]);
            i++;
        }, 220);
    }
    function stopTalkAnim() {
        if (talkAnim) { clearInterval(talkAnim); talkAnim = null; }
    }

    /* ===== ДЫХАНИЕ ВО СНЕ (простая смена кадров 1 ↔ 2) ===== */
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
    function stopBreathing() {
        if (breathTimer) { clearInterval(breathTimer); breathTimer = null; }
    }

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
        if (state !== 'idle' || idlePhraseActive) return;
        idlePhraseActive = true;

        petSpeech.textContent = phrase.text;
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

        petSpeech.textContent = phrase.text;
        showSpeech(true);
        setMood(phrase.mood);
        startTalkAnim(phrase.mood);

        clearTimeout(talkTimer);
        talkTimer = setTimeout(() => {
            if (onFinish) onFinish();
        }, 3500);
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

    function enterIdle() {
        setState('idle');
        showLayer('idle');
        idlePhraseActive = false;

        clearInterval(blinkTimer);
        blinkTimer = setInterval(() => {
            if (state !== 'idle' || idlePhraseActive) return;
            showLayer('blink');
            setTimeout(() => {
                if (state === 'idle' && !idlePhraseActive) showLayer('idle');
            }, 160);
        }, 4000);

        clearTimeout(idlePhrase1);
        clearTimeout(idlePhrase2);
        idlePhrase1 = setTimeout(() => {
            if (state !== 'idle') return;
            const p = IDLE_PHRASES_FIRST[Math.floor(Math.random() * IDLE_PHRASES_FIRST.length)];
            playIdlePhrase(p);
        }, 10000);
        idlePhrase2 = setTimeout(() => {
            if (state !== 'idle') return;
            playIdlePhrase(IDLE_PHRASE_SECOND);
        }, 20000);

        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            if (state !== 'idle') return;
            cancelIdlePhrase();
            clearTimeout(idlePhrase1);
            clearTimeout(idlePhrase2);
            showLayer('blink');
            setTimeout(() => {
                if (state !== 'idle') return;
                clearInterval(blinkTimer);
                goToSleep();
            }, 400);
        }, 30000);
    }

    function goToSleep() {
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

        setTimeout(() => {
            const phrase = DIALOGS.welcome[Math.floor(Math.random() * DIALOGS.welcome.length)];
            forcePlayPhrase(phrase, finishDialog);
        }, 900);
    }

    /* ===== КЛИК ===== */
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

    /* ===== ПЕРЕКЛЮЧАТЕЛЬ ТЕМ ===== */
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

    /* Восстановление темы */
    const saved = localStorage.getItem('petTheme');
    if (saved && saved !== 'dark') document.body.className = 'theme-' + saved;

    /* ===== СТАРТ ===== */
    renderFriendship(false);
    renderAchPanel();
    setState('sleeping');
    startBreathing();
});
