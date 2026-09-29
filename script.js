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

    /* Реакции на смену темы (один раз за цикл сна) */
    const THEME_REACTIONS = [
        { text: "что-то изменилось вокруг...",      mood: "neutral" },
        { text: "да, этот цвет лучше прошлого",      mood: "happy"   },
        { text: "ты просто кликаешь на всё подряд?", mood: "neutral" },
        { text: "ладно, развлекайся",                mood: "neutral" }
    ];
    let themeChanges = 0;

    /* Фразы, когда пользователь долго ничего не делает */
    const IDLE_PHRASES = [
        { text: "ээ... ты там?",                       mood: "neutral" },
        { text: "так и будем смотреть друг на друга?",  mood: "neutral" },
        { text: "ты уснул? значит, мне тоже пора...",   mood: "neutral" }
    ];

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

    /* Дыхание во сне.
       ВАЖНО: теперь стартуем с "sleep2" (вдох), потом переключаем на "sleep1" (выдох).
       Так визуальный порядок совпадает с анимацией scale: сначала вдох → потом выдох. */
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

    /* Отмена idle-фразы (если игрок кликнул или меняет тему) */
    function cancelIdlePhrase() {
        if (!idlePhraseActive) return;
        idlePhraseActive = false;
        clearInterval(idlePhraseAnim);
        clearTimeout(idlePhraseHide);
        showSpeech(false);
        setMood(null);
        if (state === 'idle') showLayer('idle');
    }

    /* Показ фразы от бездействия */
    function playIdlePhrase() {
        if (state !== 'idle' || idlePhraseActive) return;
        idlePhraseActive = true;

        const phrase = IDLE_PHRASES[Math.floor(Math.random() * IDLE_PHRASES.length)];
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

        /* Фразы от бездействия — на 10-й и 20-й секунде */
        clearTimeout(idlePhrase1);
        clearTimeout(idlePhrase2);
        idlePhrase1 = setTimeout(() => {
            if (state !== 'idle') return;
            playIdlePhrase();
        }, 10000);
        idlePhrase2 = setTimeout(() => {
            if (state !== 'idle') return;
            playIdlePhrase();
        }, 20000);

        /* Сон через 30 секунд */
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

        if (state === 'sleeping') { wakeUp(); return; }
        if (state === 'talking' || state === 'waking') return;

        let zone = 'body';
        if (y < 0.35)       zone = 'hair';
        else if (y > 0.7)   zone = 'skirt';

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
    setState('sleeping');
    startBreathing();
});
