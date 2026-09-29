document.addEventListener('DOMContentLoaded', () => {
    const petWidget = document.getElementById('petWidget');
    const petLayer = document.getElementById('petLayer');
    const petSpeech = document.getElementById('petSpeech');

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

    /* Реакции на смену темы */
    const THEME_REACTIONS = [
        { text: "что-то изменилось вокруг...",      mood: "neutral" },
        { text: "да, этот цвет лучше прошлого",      mood: "happy"   },
        { text: "ты просто кликаешь на всё подряд?", mood: "neutral" },
        { text: "ладно, развлекайся",                mood: "neutral" }
    ];
    let themeChanges = 0;

    /* Idle-фразы: первый рандом (без "пора"), второй — всегда фиксированный */
    const IDLE_PHRASES_FIRST = [
        { text: "ээ... ты там?",                       mood: "neutral" },
        { text: "так и будем смотреть друг на друга?",  mood: "neutral" }
    ];
    const IDLE_PHRASE_SECOND = { text: "ты уснул? значит, мне тоже пора...", mood: "neutral" };

    /* Достижения за накопленные обнимашки */
    const ACHIEVEMENTS = [
        { score: 10,  text: "ты меня не затискаешь до смерти, надеюсь?", mood: "neutral" },
        { score: 25,  text: "ладно, ты мне нравишься",                   mood: "happy"   },
        { score: 50,  text: "я тебя запомнила, знай!",                   mood: "happy"   },
        { score: 100, text: "ты стала моим лучшим другом~",              mood: "laughing" }
    ];
    const shownAchievements = new Set();

    /* ===== СЧЁТЧИК ДРУЖБЫ ===== */
    let friendship = parseInt(localStorage.getItem('petFriendship') || '0', 10);
    if (isNaN(friendship)) friendship = 0;

    const friendEl = document.createElement('div');
    friendEl.className = 'friendship-counter';
    document.body.appendChild(friendEl);

    function renderFriendship(bump) {
        let icon = '❤';
        friendEl.className = 'friendship-counter';
        if (friendship >= 100)      friendEl.classList.add('lvl-4');
        else if (friendship >= 50)  friendEl.classList.add('lvl-3');
        else if (friendship >= 25)  friendEl.classList.add('lvl-2');
        else if (friendship >= 10)  friendEl.classList.add('lvl-1');
        friendEl.textContent = `${icon} ${friendship}`;
        if (bump) {
            friendEl.classList.add('bump');
            setTimeout(() => friendEl.classList.remove('bump'), 180);
        }
    }

    function changeFriendship(delta, x, y) {
        const old = friendship;
        friendship = Math.max(0, Math.min(9999, friendship + delta));
        if (friendship === old) return;

        localStorage.setItem('petFriendship', friendship);
        renderFriendship(true);
        spawnHeart(x, y, delta < 0);

        if (delta > 0) checkAchievements(old, friendship);
    }

    function checkAchievements(oldScore, newScore) {
        ACHIEVEMENTS.forEach(a => {
            if (shownAchievements.has(a.score)) return;
            if (oldScore < a.score && newScore >= a.score) {
                shownAchievements.add(a.score);
                setTimeout(() => {
                    if (state === 'talking' || state === 'waking') return;
                    forcePlayPhrase({ text: a.text, mood: a.mood }, finishDialog);
                }, 400);
            }
        });
    }

    /* Частица-сердечко в точке клика */
    function spawnHeart(x, y, negative) {
        const h = document.createElement('div');
        h.className = 'heart-particle' + (negative ? ' negative' : '');
        h.textContent = negative ? '✖' : '♥';
        h.style.left = x + 'px';
        h.style.top = y + 'px';
        document.body.appendChild(h);
        setTimeout(() => h.remove(), 1300);
    }

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

    function startBreathing() {
        stopBreathing();
        breathFrame = 0;
        showLayer('sleep2');
        breathTimer = setInterval(() => {
            if (state !== 'sleeping') return;
            breathFrame = 1 - breathFrame;
            showLayer(breathFrame === 0 ? 'sleep2' : 'sleep1');
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

        /* Первая idle-фраза — рандом из двух без "пора" */
        clearTimeout(idlePhrase1);
        clearTimeout(idlePhrase2);
        idlePhrase1 = setTimeout(() => {
            if (state !== 'idle') return;
            const p = IDLE_PHRASES_FIRST[Math.floor(Math.random() * IDLE_PHRASES_FIRST.length)];
            playIdlePhrase(p);
        }, 10000);

        /* Вторая idle-фраза — всегда фиксированная */
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
        setState('waking');
        showLayer('wake');
        stopBreathing();

        setTimeout(() => {
            const phrase = DIALOGS.welcome[Math.floor(Math.random() * DIALOGS.welcome.length)];
            forcePlayPhrase(phrase, finishDialog);
        }, 900);
    }

    /* ===== КЛИК ===== */
    petWidget.addEventListener('click', (e) => {
        cancelIdlePhrase();

        const rect = petWidget.getBoundingClientRect();
        const y = (e.clientY - rect.top) / rect.height;
        const x = e.clientX;
        const cy = e.clientY;

        if (state === 'sleeping') {
            changeFriendship(1, x, cy);
            wakeUp();
            return;
        }
        if (state === 'talking' || state === 'waking') return;

        let zone = 'body';
        if (y < 0.35)       zone = 'hair';
        else if (y > 0.7)   zone = 'skirt';

        /* Очки дружбы */
        let delta = 1;
        if (zone === 'hair')  delta = 3;
        if (zone === 'skirt') delta = -2;
        changeFriendship(delta, x, cy);

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
    setState('sleeping');
    startBreathing();
});
