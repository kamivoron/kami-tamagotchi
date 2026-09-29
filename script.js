document.addEventListener('DOMContentLoaded', () => {
    const petWidget = document.getElementById('petWidget');
    const petLayer = document.getElementById('petLayer');
    const petSpeech = document.getElementById('petSpeech');

    /* ===== КАРТИНКИ (папка images, файлы 1.png … 12.png) ===== */
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

    /* Предзагрузка всех картинок, чтобы не мигали при смене кадров */
    Object.values(IMAGES).forEach(src => {
        const img = new Image();
        img.src = src;
    });

    /* ===== ДИАЛОГИ =====
       mood: neutral | happy | angry | laughing | teasing */
    const DIALOGS = {
        welcome: [
            { text: "ммм... что такое?",              mood: "neutral" },
            { text: "я так сладко спала!...",          mood: "neutral" },
            { text: "ладно, встаю...",                 mood: "neutral" },
            { text: "хотя нет, ещё 5 минуток...",      mood: "neutral" },
            { text: "и что тебе нужно на этот раз?~",  mood: "happy"   }
        ],
        body: [
            { text: "ой! ты чего тыкаешь?",             mood: "neutral" },
            { text: "я вообще-то занята!... ну ладно.", mood: "happy"   },
            { text: "думаешь, тут есть какая-то пасхалка?", mood: "neutral" },
            { text: "ахахах, ну ты даёшь!",             mood: "laughing" },
            { text: "я так и знала, что ты зайдёшь~",   mood: "happy"   },
            { text: "ты пришла поиграть?",              mood: "happy"   }
        ],
        hair: [
            { text: "э! не трогай мои волосы!",          mood: "angry" },
            { text: "ты меня гладишь?! я совсем не милая!", mood: "angry" },
            { text: "ещё раз тронешь — укушу!",          mood: "angry" }
        ],
        skirt: [
            { text: "к-куда ты жмёшь?!",         mood: "angry"   },
            { text: "извращенец!",                mood: "angry"   },
            { text: "что ты только что-!",        mood: "teasing" }
        ]
    };

    /* ===== СОСТОЯНИЕ ===== */
    let state       = 'sleeping';
    let talkTimer   = null;
    let blinkTimer  = null;
    let idleTimer   = null;
    let sleepTimer  = null;
    let phraseIndex = 0;
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

    function startTalkAnim(kind) {
        stopTalkAnim();
        let i = 0;
        let frames;
        if (kind === 'happy')          frames = ['happy1', 'happy2'];
        else if (kind === 'angry')     frames = ['angry'];
        else if (kind === 'laughing')  frames = ['laugh'];
        else if (kind === 'teasing')   frames = ['tease'];
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

    function playDialog(phrasesArr, onFinish) {
        if (state === 'talking') return;
        setState('talking');
        clearTimeout(idleTimer);
        clearTimeout(sleepTimer);
        clearInterval(blinkTimer);
        clearInterval(talkTimer);

        phraseIndex = 0;

        function step() {
            if (phraseIndex >= phrasesArr.length) {
                clearInterval(talkTimer);
                if (onFinish) onFinish();
                return;
            }
            const cur = phrasesArr[phraseIndex];
            petSpeech.textContent = cur.text;
            showSpeech(true);
            setMood(cur.mood);

            if (cur.mood === 'angry')          startTalkAnim('angry');
            else if (cur.mood === 'happy')     startTalkAnim('happy');
            else if (cur.mood === 'laughing')  startTalkAnim('laughing');
            else if (cur.mood === 'teasing')   startTalkAnim('teasing');
            else                                startTalkAnim('neutral');

            phraseIndex++;
        }

        step();
        talkTimer = setInterval(step, 2600);
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
                    setState('sleeping');
                    showSpeech(false);
                    showLayer('sleep1');
                }, 10000);
            }, 400);
        }, 30000);
    }

    function wakeUp() {
        setState('waking');
        showLayer('wake');

        setTimeout(() => {
            playDialog(DIALOGS.welcome, finishDialog);
        }, 900);
    }

    /* ===== КЛИК ===== */
    petWidget.addEventListener('click', (e) => {
        const rect = petWidget.getBoundingClientRect();
        const y = (e.clientY - rect.top) / rect.height;

        if (state === 'sleeping') { wakeUp(); return; }
        if (state === 'talking')  return;

        let zone = 'body';
        if (y < 0.35)       zone = 'hair';
        else if (y > 0.7)   zone = 'skirt';

        const dlg = DIALOGS[zone] || DIALOGS.body;
        playDialog(dlg, finishDialog);
    });

    /* ===== ПЕРЕКЛЮЧАТЕЛЬ ТЕМ ===== */
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            document.body.className = theme === 'dark' ? '' : 'theme-' + theme;
            localStorage.setItem('petTheme', theme);
        });
    });

    /* Восстанавливаем сохранённую тему */
    const saved = localStorage.getItem('petTheme');
    if (saved && saved !== 'dark') document.body.className = 'theme-' + saved;

    /* ===== СТАРТ ===== */
    showLayer('sleep1');
});
