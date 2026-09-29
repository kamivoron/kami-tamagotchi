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
            { text: "я вообще-то занята!... ну ладно.", mood: "happy"    },
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

    /* Реакции на смену темы (по порядку, один раз за цикл сна) */
    const THEME_REACTIONS = [
        { text: "что-то изменилось вокруг...",      mood: "neutral" },
        { text: "да, этот цвет лучше прошлого",      mood: "happy"   },
        { text: "ты просто кликаешь на всё подряд?", mood: "neutral" },
        { text: "ладно, развлекайся",                mood: "neutral" }
    ];
    let themeChanges = 0;

    /* ===== СОСТОЯНИЕ ===== */
    let state       = 'sleeping';
    let talkTimer   = null;
    let blinkTimer  = null;
    let idleTimer   = null;
    let sleepTimer  = null;
    let breathTimer = null;
    let breathFrame = 0;
    let talkAnim    = null;

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

    /* Анимация рта */
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

    /* Дыхание во сне (смена кадров 1 ↔ 2) */
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

    /* Форсированный показ одной фразы (для реакций, которые могут перебивать) */
    function forcePlayPhrase(phrase, onFinish) {
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

    /* Обычный показ фразы (не перебивает, если уже говорит) */
    function playPhrase(phrase, onFinish) {
        if (state === 'talking') return;
        forcePlayPhrase(phrase, onFinish);
    }

    /* Случайная фраза из массива */
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

    /* Idle */
    function enterIdle() {
        setState('idle');
        showLayer('idle');

        clearInterval(blinkTimer);
        blinkTimer = setInterval(() => {
            if (state !== 'idle') return;
            showLayer('blink');
            setTimeout(() => {
                if (state === 'idle') showLayer('idle');
            }, 160);
        }, 4000);

        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            if (state !== 'idle') return;
            showLayer('blink');
            setTimeout(() => {
                if (state !== 'idle') return;
                clearTimeout(sleepTimer);
                sleepTimer = setTimeout(() => {
                    if (state !== 'idle') return;
                    clearInterval(blinkTimer);
                    goToSleep();
                }, 10000);
            }, 400);
        }, 30000);
    }

    /* Засыпание */
    function goToSleep() {
        setState('sleeping');
        showSpeech(false);
        setMood(null);
        themeChanges = 0;      // сброс реакций на смену темы
        startBreathing();
    }

    /* Пробуждение */
    function wakeUp() {
        setState('waking');
        showLayer('wake');
        stopBreathing();

        setTimeout(() => {
            const phrase = DIALOGS.welcome[Math.floor(Math.random() * DIALOGS.welcome.length)];
            forcePlayPhrase(phrase, finishDialog);
        }, 900);
    }

    /* Клик */
    petWidget.addEventListener('click', (e) => {
        const rect = petWidget.getBoundingClientRect();
        const y = (e.clientY - rect.top) / rect.height;

        if (state === 'sleeping') { wakeUp(); return; }
        if (state === 'talking' || state === 'waking') return;

        let zone = 'body';
        if (y < 0.35)       zone = 'hair';
        else if (y > 0.7)   zone = 'skirt';

        playRandom(DIALOGS[zone] || DIALOGS.body, finishDialog);
    });

    /* Переключатель тем */
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            document.body.className = theme === 'dark' ? '' : 'theme-' + theme;
            localStorage.setItem('petTheme', theme);

            /* Реакция на смену темы */
            if (state === 'sleeping' || state === 'waking') return;
            if (state === 'talking') return;      // не перебиваем диалог
            if (themeChanges >= THEME_REACTIONS.length) return;

            const reaction = THEME_REACTIONS[themeChanges];
            themeChanges++;
            playPhrase(reaction, finishDialog);
        });
    });

    /* Восстановление темы */
    const saved = localStorage.getItem('petTheme');
    if (saved && saved !== 'dark') document.body.className = 'theme-' + saved;

    /* Старт */
    setState('sleeping');
    startBreathing();
});
