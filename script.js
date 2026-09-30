document.addEventListener('DOMContentLoaded', () => {
    const petWidget = document.getElementById('petWidget');
    const petLayer = document.getElementById('petLayer');
    const petSpeech = document.getElementById('petSpeech');
    const friendCounter = document.getElementById('friendCounter');
    const achBtn = document.getElementById('achBtn');
    const achPanel = document.getElementById('achPanel');
    const chatBtn = document.getElementById('chatBtn');
    const chatPanel = document.getElementById('chatPanel');
    const chatStatus = document.getElementById('chatStatus');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');

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

    /* ===== МОСКОВСКОЕ ВРЕМЯ ===== */
    function getMoscowTime() {
        return new Date().toLocaleTimeString('ru-RU', {
            timeZone: 'Europe/Moscow',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getPhraseText(phrase) {
        return typeof phrase.text === 'function' ? phrase.text() : phrase.text;
    }

    /* ===== ДИАЛОГИ ===== */
    const DIALOGS = {
        welcome: [
            { text: () => `*зевает* доброе утро... ого, уже ${getMoscowTime()}`, mood: "neutral" },
            { text: "я соскучилась по тебе~",                     mood: "happy"   },
            { text: "я уже боялась, что ты не вернёшься ко мне",   mood: "neutral" },
            { text: "знакомые глаза читают этот текст!~",          mood: "happy"   },
            { text: "утречка, рада тебя видеть!",                  mood: "happy"   },
            { text: "упф, мне сейчас такооое снилось!",            mood: "neutral" },
            { text: "ну капец, а я только начала засыпать...",      mood: "neutral" },
            { text: "который раз вижу тебя, солнце?~",             mood: "happy"   },
            { text: "каждое мое утро самое доброе, ведь я сразу вижу тебя~", mood: "happy" },
            { text: "ммм... что такое?",                            mood: "neutral" },
            { text: "я так сладко спала!...",                       mood: "neutral" },
            { text: "кто меня разбудил?",                           mood: "neutral" },
            { text: "и что тебе нужно?~",                           mood: "happy"   }
        ],
        body: [
            { text: "ой! ты чего тыкаешь?",                        mood: "neutral"  },
            { text: "мне же щекотно!",                             mood: "happy"    },
            { text: "думаешь, тут есть пасхалка?",                 mood: "neutral"  },
            { text: "ахахах, ну ты даёшь!",                        mood: "laughing" },
            { text: "я так и знала, что ты зайдёшь~",              mood: "happy"    },
            { text: "ты пришла поиграть?",                         mood: "happy"    },
            { text: "красивая у меня одёжка, не так ли?)",         mood: "happy"    },
            { text: "это японская школьная форма, моя любимая!~",  mood: "happy"    },
            { text: "что, я испачкала форму? наверное, это от чизбургера..", mood: "neutral" },
            { text: "клик, клик, какая же фраза следующая?",        mood: "neutral"  },
            { text: "только не кликай слишком часто!",             mood: "neutral"  },
            { text: "ты такой настойчивый, это смущает...",         mood: "teasing"  },
            { text: "я сегодня попшикалась новыми духами, как тебе?", mood: "happy"  }
        ],
        hair: [
            { text: "э! не трогай мои волосы!",                                        mood: "angry"   },
            { text: "ты меня гладишь?! я не милая!",                                    mood: "angry"   },
            { text: "ещё раз тронешь — укушу!",                                         mood: "angry"   },
            { text: "и вовсе ты мне не нравишься!",                                     mood: "angry"   },
            { text: "но я же только уложила их...",                                     mood: "neutral" },
            { text: "у меня волосы кудрявятся, их сложно расчесать после такого знаешь ли!", mood: "neutral" },
            { text: "з-зачем ты... меня гладишь...",                                    mood: "teasing" },
            { text: "и вовсе мне не приятно!",                                          mood: "angry"   },
            { text: "продолжай...",                                                     mood: "happy"   },
            { text: "хватит называть меня милой!",                                      mood: "angry"   },
            { text: "дурак ты...",                                                      mood: "teasing" }
        ],
        skirt: [
            { text: "к-куда ты жмёшь?!",                        mood: "angry"   },
            { text: "извращенец!",                              mood: "angry"   },
            { text: "что ты только что-!",                       mood: "teasing" },
            { text: "что ты думаешь ты творишь?!",              mood: "angry"   },
            { text: "тебе это доставляет удовольствие или что?!", mood: "angry" },
            { text: "не трогай мою юбку.",                      mood: "angry"   },
            { text: "мне это не нравится.",                     mood: "angry"   },
            { text: "хватит.",                                  mood: "angry"   },
            { text: "я обижусь, если ты продолжишь.",           mood: "angry"   }
        ]
    };

    const SPAM_PHRASES = [
        { text: "ёмаё, поумерь свой пыл, бро",              mood: "angry" },
        { text: "ты чего накинулся?",                        mood: "angry" },
        { text: "тише, тише, куда так жмёшь-то?",            mood: "angry" },
        { text: "слишком быстро кликаешь!",                  mood: "angry" },
        { text: "чилл, бро",                                 mood: "angry" },
        { text: "я не успеваю так быстро реагировать...",     mood: "angry" }
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
        { text: "так и будем смотреть друг на друга?",  mood: "neutral" },
        { text: "пупупу...",                            mood: "neutral" },
        { text: "тут кто-нибудь есть?",                 mood: "neutral" },
        { text: "я что, осталась одна?",                mood: "neutral" },
        { text: "меня что, оставили одну?",             mood: "neutral" },
        { text: "ты отошёл?",                           mood: "neutral" },
        { text: "эээй, вернись...",                     mood: "neutral" },
        { text: "скучновато чёт....",                   mood: "neutral" },
        { text: "*зевает*",                             mood: "neutral" }
    ];
    const IDLE_PHRASE_SECOND = { text: "ты уснул? значит, мне тоже пора...", mood: "neutral" };

    /* ===== ДОСТИЖЕНИЯ ===== */
    const ACHIEVEMENTS = [
        { score: 10,  icon: "🌱", title: "незнакомец", desc: "первая встреча, мимолетный взгляд",
          text: "ты меня не затискаешь до смерти, надеюсь?", mood: "neutral"  },
        { score: 25,  icon: "🌿", title: "знакомый",   desc: "кажется, у вас всё же есть что-то общее",
          text: "ладно, ты мне нравишься",                   mood: "happy"    },
        { score: 50,  icon: "🌳", title: "друг",       desc: "видимо, тебе понравилось обсуждать с ней то аниме про айдолов в двадцатый раз?",
          text: "я тебя запомнила, знай!",                   mood: "happy"    },
        { score: 67,  icon: "🤖", title: "67",         desc: "67676767676767",
          text: "67... сикс севен... брейнрот detected",     mood: "laughing" },
        { score: 100, icon: "👤", title: "теневой",    desc: "когда вы успели стать так близки?",
          text: "ты стала моим лучшим другом~",              mood: "laughing" }
    ];
    const shownAchievements = new Set(JSON.parse(localStorage.getItem('petAchShown') || '[]'));

    let unreadAchievements = 0;

    /* ===== СЧЁТЧИК ДРУЖБЫ ===== */
    let friendship = parseInt(localStorage.getItem('petFriendship') || '0', 10);
    if (isNaN(friendship)) friendship = 0;

    /* ===== СОСТОЯНИЕ ОБИДЫ ===== */
    let isOffended = localStorage.getItem('petOffended') === 'true';

    function setOffended(v) {
        isOffended = v;
        localStorage.setItem('petOffended', v ? 'true' : 'false');
        petWidget.classList.toggle('offended', v);
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

        if (typeof x === 'number' && typeof y === 'number') {
            spawnClickFx(x, y, delta);
        }

        if (delta > 0) checkAchievements(old, friendship);
        renderAchPanel();
    }

    function checkAchievements(oldScore, newScore) {
        let unlockedAny = false;
        ACHIEVEMENTS.forEach(a => {
            if (shownAchievements.has(a.score)) return;
            if (oldScore < a.score && newScore >= a.score) {
                shownAchievements.add(a.score);
                unlockedAny = true;
            }
        });

        if (unlockedAny) {
            localStorage.setItem('petAchShown', JSON.stringify([...shownAchievements]));
            renderAchPanel();
            onAchievementUnlocked();
        }
    }

    /* ===== УВЕДОМЛЕНИЕ ОБ АЧИВКЕ ===== */
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
        achToastHideTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 5500);
    }

    function playAchievementSound() {
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            const ctx = new Ctx();
            const now = ctx.currentTime;
            const notes = [
                { freq: 1318.51, time: 0.00, dur: 0.40, vol: 0.10 },
                { freq: 1760.00, time: 0.13, dur: 0.45, vol: 0.13 },
                { freq: 2217.46, time: 0.27, dur: 0.60, vol: 0.11 }
            ];
            notes.forEach(n => {
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
        const burstCount = 4;

        for (let b = 0; b < burstCount; b++) {
            setTimeout(() => {
                const bx = cx + (Math.random() - 0.5) * 220;
                const by = cy + (Math.random() - 0.5) * 160;
                const color = colors[Math.floor(Math.random() * colors.length)];
                const count = 14;
                for (let i = 0; i < count; i++) {
                    const p = document.createElement('div');
                    p.className = 'firework-particle' + (i % 3 === 0 ? ' large' : '');
                    p.style.left = bx + 'px';
                    p.style.top = by + 'px';
                    p.style.color = color;
                    p.style.background = color;
                    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.4;
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
        } else if (badge) {
            badge.remove();
        }
    }

    function onAchievementUnlocked() {
        unreadAchievements++;
        updateAchBadge();
        showAchToast();
        playAchievementSound();
        spawnFireworks();

        clearTimeout(achPhraseTimer);
        achPhraseTimer = setTimeout(() => {
            showAchievementPhrase();
        }, 900);
    }

    function showAchievementPhrase() {
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
        talkTimer = setTimeout(() => {
            finishDialog();
        }, 3500);
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
        if (achPanel.classList.contains('open')) {
            unreadAchievements = 0;
            updateAchBadge();
        }
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
        if (chatHistory.length > CHAT_MAX_MESSAGES) {
            chatHistory = chatHistory.slice(-CHAT_MAX_MESSAGES);
        }
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
    }

    /* ===== ФРАЗЫ ДЛЯ ЧАТА ===== */
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
        /* ---- спасибо ---- */
        {
            keywords: ['спасибо', 'благодарю', 'спс', 'сенкс', 'thanks', 'thx'],
            replies: [
                "ой, всегда пожалуйста~",
                "рада помочь!!",
                "хехе, обращайся~",
                "не за что-не за что!",
                "ой, да ладно тебе~"
            ],
            score: 1,
            mood: 'happy'
        },
        /* ---- комплименты ---- */
        {
            keywords: ['красивая', 'красивые', 'нежная', 'можно утонуть', 'красотка', 'дива', 'хорошка', 'милая', 'милашка', 'няшка', 'няшная', 'ты классная', 'ты прикольная', 'ты забавная', 'ты смешная', 'ты хорошая'],
            replies: [
                "о-ой, не смущай меня...",
                "я... я не такая!! сам такой! хмпф!",
                "хехе~ конечно я такая! но и ты не хуже)",
                "т-ты тоже, знаешь ли...",
                "на себя посмотри!! (смущенно отвернулась)"
            ],
            score: 5,
            mood: 'teasing'
        },
        /* ---- грубость ---- */
        {
            keywords: ['идиот', 'идиота', 'дура', 'дурак', 'плохая', 'тупая', 'глупая', 'глупышка', 'хватит', 'отстань', 'падла', 'тварь', 'мразь', 'ублюдище'],
            replies: [
                "...я сделаю вид, что не слышала этого...",
                "эй, без обзывательств!",
                "я же обижусь...",
                "я обиделась.",
                "я больше не хочу с тобой разговаривать."
            ],
            score: -5,
            mood: 'angry',
            rudeness: true
        },
        /* ---- любовь ---- */
        {
            keywords: ['люблю тебя', 'тебя люблю', 'сердечко', 'любимая', 'любимка'],
            replies: [
                "о-ой.. я... т-ты это серьезно?",
                "и я тебя люблю, знаешь ли...",
                "не говори такое вслух, дурак!!",
                "*отвернулась в смущении* и вовсе ты мне не нравишься! д-дурак...",
                "я тоже тебя люблю, солнце!!~",
                "и ты моя любимка... только не говори никому!"
            ],
            score: 10,
            mood: 'teasing'
        },
        /* ---- спящая ками ---- */
        {
            keywords: ['не спи', 'не засыпай', 'не усыпай'],
            replies: [
                "не могуу, мне очень хочется спать...",
                "я не могу устоять перед сном...",
                "извини, я не смогу не спать..."
            ],
            mood: 'neutral'
        },
        /* ---- погода ---- */
        {
            keywords: ['погода', 'погодой', 'погоду', 'погоды'],
            replies: [
                "а у меня сегодня солнце~ это ты!",
                "а у меня всегда тепло, я же в кармане!"
            ],
            mood: 'happy'
        },
        {
            keywords: ['дождь', 'дожди', 'дождик', 'гроза', 'грозу', 'грозы', 'ливень', 'ливни', 'гром'],
            replies: [
                "а я люблю дожди, они эстетичные",
                "ля, щас бы грозу..",
                "хотела бы я грозу прямо сейчас, да погромче..."
            ],
            mood: 'neutral'
        },
        {
            keywords: ['снег', 'метель', 'льдышка', 'холодно', 'холодина', 'холодрыга', 'прохладно', 'ветер', 'ветрище'],
            replies: [
                "ойй, звучит холодно...",
                "скорее укрывайся пледом да заваривай какаву!!",
                "оойй, утепляйся, солнце 🥺",
                "не замерзай!! моя любовь согреет тебя!!",
                "иди обниму, согрею тебя~"
            ],
            mood: 'happy'
        },
        {
            keywords: ['жарко', 'жарища', 'парилка', 'тепло', 'сжарился', 'сжарилась'],
            replies: [
                "фуф, я уже от одного прочтения этого сообщения сжарилась..",
                "боже, как же мне сейчас хорошо с моими +10...",
                "я плавлюсь только лишь от чтения твоих буковок 😭😭"
            ],
            mood: 'laughing'
        },
        /* ---- действия ---- */
        {
            keywords: ['обнимать', 'обнимаю', 'объятия', 'обними', 'обнимашки', 'объятие', 'обнял', 'обняла', 'обнять'],
            replies: [
                "*робко обняла* 🥺",
                "*нежно обнимаю* 🥺"
            ],
            score: 2,
            mood: 'happy'
        },
        {
            keywords: ['поцелуй', 'поцелую', 'целуй', 'целую', 'чмок', 'муа', 'поцелуйчик'],
            replies: [
                "*посылаю воздушный поцелуй* 😋",
                "умф... *робко целую в щёчку* 🥺",
                "я... я же стесняюсь...",
                "*целую в лобик*"
            ],
            mood: 'teasing'
        },
        /* ---- настроение ---- */
        {
            keywords: ['грустно', 'грустново', 'плохо', 'плоховато', 'тяжело', 'тяжеловато', 'депресся', 'депрессия', 'тоскливо', 'печально', 'печалька'],
            replies: [
                "э-эй, не грусти!! я тут, знаешь ли",
                "ну-у чего ты? 🥺 иди обниму!",
                "расскажи, что случилось?"
            ],
            mood: 'neutral'
        },
        /* ---- игры ---- */
        {
            keywords: ['стринова', 'стринову', 'стриновы', 'стриновой', 'подрыв', 'вспышка', 'вспышкой', 'вспышку', 'вспышке'],
            replies: [
                "блин, может каточку во вспышку?)",
                "о, гоу со мной во вспышку!!",
                "там в стринове скоро добавят экстракшен мод...",
                "мне немного одиноко играть одной :(",
                "жаль, что ты не пойдешь со мной играть.."
            ],
            mood: 'happy'
        },
        {
            keywords: ['рафт', 'рафтом', 'рафту'],
            replies: [
                "ох, я там такой кораблище забацала!",
                "обожаю рафт блин, жаль, что мы нечасто собираемся в него...",
                "мне нужны доски, БОЛЬШЕ ДОСОК!",
                "э-эй, я приготовила кучу рыбы, почему никто не ест?!"
            ],
            mood: 'happy'
        },
        {
            keywords: ['мимесис', 'прэтфолл', 'пратфолл', 'претфолл', 'скамлайн', 'скам лайн', 'мека хамелеон', 'мека', 'хамелеон', 'фазма', 'фазмафобия', 'гамба', 'солар', 'соларпанк', 'сигаме', 'сигама', 'сигейм', 'богос', 'чикен хорс', 'курица лошадь', 'джекбокс', 'пати бокс', 'патибокс', 'гартик', 'бункер', 'меме полис', 'мемеполис'],
            replies: [
                "может, однажды ещё соберемся в эту веселую игрульку, однажды...",
                "когда-нибудь точно у всех совпадут расписания и мы пойдём играть в это..."
            ],
            mood: 'neutral'
        },
        /* ---- твич ---- */
        {
            keywords: ['хес', 'хесус', 'авгн', 'jesusavgn', 'hesus', 'avgn'],
            replies: [
                "110",
                "ихихяхя",
                "это уже ихи или это хяхя?",
                "нина, голова болит",
                "вот и дымайте, вот те на те"
            ],
            mood: 'laughing'
        },
        {
            keywords: ['хрен в томате'],
            replies: ["вот те на те)"],
            mood: 'laughing'
        },
        {
            keywords: ['мазеллов', 'илья', 'мзлфф', 'мзифф', 'мазелов', 'mzlff', 'mazellovvv', 'коряков'],
            replies: [
                "кому мы оставим мир, если даже всех нас некому спасти?...",
                "мало ребёнком быть, сложней остаться им взрослым...",
                "и в твоих руках моё сердце, оставь себе ❤️",
                "спасибо всем, дальше — хуже, путь долгий, но будет что вспомнить...",
                "вас побеждает ворона, нас побеждаете вы!",
                "и души переплетаясь, тянут всё за собой в этот мерзкий медленный танец...",
                "давай меняться: тебе это, тебе это — по рукам",
                "а чё грустить? можно кататься без очереди все дни!",
                "альфред, держи себя в руках... 🐻",
                "нас сюжет куда-то несёт, о нам достаточно в жизни счастливый конец — и всё..."
            ],
            mood: 'neutral'
        },
        /* ---- звёздное дитя ---- */
        {
            keywords: ['звездное дитя', 'звёздное дитя', 'ребенок идола', 'ребёнок идола', 'oshi no ko', 'арима', 'кана', 'мемчо', 'мемто', 'ай хошино', 'хошино', 'аква', 'руби', 'бикомачи', 'би комачи'],
            replies: [
                "о, речь про моё любимое аниме!!",
                "ах, звездное дитя... когда же 4 сезон уже?~",
                "ля, щас бы опенинги оттуда сыграть на пианинко",
                "кана, моя любимая каночка...",
                "anata no aidoru, sign wa B! chu!~ ой, запелась я что-то."
            ],
            mood: 'happy'
        },
        /* ---- врата штейна ---- */
        {
            keywords: ['врата штейна', 'steins gate', 'штейн', 'курису', 'макисэ', 'окабэ', 'ринтаро', 'фэйрис', 'маюши', 'маюри'],
            replies: [
                "ой, часики маюши опять остановились..."
            ],
            mood: 'neutral'
        },
        /* ---- басня ---- */
        {
            keywords: ['басня', 'басню', 'басне', 'фэйбл', 'фейбл', 'fable'],
            replies: [
                "да, я поставила этому аниме 9 баллов, и что с того?!",
                "ну, это забавное аниме, смешнявое"
            ],
            mood: 'neutral'
        },
        /* ---- аниме ---- */
        {
            keywords: ['аниме', 'анимехи', 'анимеха', 'анимешки', 'анимешка', 'аниму', 'что смотришь', 'какое смотришь'],
            replies: [
                "прямо сейчас я ликую, что закончилась игра лжецов, хаха!",
                "думаю-думаю, какое бы аниме ещё заспидранить на 3х...",
                "думаю, может, пересмотреть лов лайв?",
                "пока не знаю что посмотреть, посоветуешь что-нибудь?"
            ],
            mood: 'neutral'
        },
        /* ---- манга ---- */
        {
            keywords: ['манга', 'маньхуа', 'манхва', 'мангу', 'что читаешь', 'какое читаешь'],
            replies: [
                "я пока не читаю мангу, но аниме смотрю! онгоинги, в основном",
                "ой, я что-то и забыла, что можно что-то читать...",
                "манга - тоже литература!",
                "ой, мне так лень читать, многа букаф...."
            ],
            mood: 'neutral'
        },
        /* ---- пианино ---- */
        {
            keywords: ['пианино', 'синтезатор', 'пианинко', 'потрунькать'],
            replies: [
                "ля, после такого аж захотелось потрунькать",
                "ооо, щас бы на пианинко сыграть!",
                "ой, а если я сыграю тебе в дсе на пианино, ты послушаешь? 🥺"
            ],
            mood: 'happy'
        },
        /* ---- о дружбе ---- */
        {
            keywords: ['дружба', 'друзья', 'очки', 'счёт', 'очков', 'насколько мы близки'],
            replies: [
                () => `у нас сейчас ${friendship} очков дружбы, между прочим!`,
                () => `наша с тобой дружба числится в очках, их целых ${friendship}!`
            ],
            mood: 'happy'
        },
        /* ---- 67 ---- */
        {
            keywords: ['67', 'сикс', 'севен', 'брейнрот'],
            replies: [
                "67",
                "67 67 67 67 67 67 67 67 67",
                "сикс севен бреееейнроооот",
                "да этот мем уже устарел, не?"
            ],
            mood: 'laughing'
        },
        /* ---- шика ---- */
        {
            keywords: ['шика', 'шиканоко', 'shika shikanoko', 'олениха', 'олень'],
            replies: [
                "шиканоко ноко ноко коштантан! 🦌"
            ],
            mood: 'happy'
        },
        /* ---- юля ---- */
        {
            keywords: ['юля', 'юле', 'юлю', 'юлей', 'юлька', 'юся', 'юлечка', 'манривата', 'мандарин', 'мандариновая'],
            replies: [
                "о, про мою любимку говоришь",
                "не говори про неё так. я ревную.",
                "хихихи юлька иди корову подои",
                "юся, ты уже покушала? 👀",
                "все мои меме только для неё...",
                "про юлю либо хорошо, либо никак"
            ],
            mood: 'happy'
        },
        /* ---- грандон ---- */
        {
            keywords: ['грандон', 'грандона', 'грандону', 'грандоном', 'вася', 'васей', 'васю', 'васе', 'атхос'],
            replies: [
                "вася? знаю такого",
                "я грр! ты мне?",
                "жить надо как вася - танцевать и музон погромче."
            ],
            mood: 'neutral'
        },
        /* ---- форум ---- */
        {
            keywords: ['форум', 'саша', 'саше', 'сашей', 'сашу', 'форума', 'форуму', 'фовум'],
            replies: [
                "фооооовуууумм!!!!",
                "форум? интересно, когда он ещё приедет к нам....",
                "о, речь про любителя бабушек?"
            ],
            mood: 'laughing'
        },
        /* ---- привоз ---- */
        {
            keywords: ['привоз', 'привозу', 'привоза', 'привозом', 'приводя', 'приводей', 'приводю', 'привадя', 'вадя', 'вадей', 'вадю', 'вадим', 'вадима'],
            replies: [
                "эх, когда мы с ним ещё пойдем в стринову?",
                "привоз? да, пропал челик, даже не отвечает толком...",
                "эх, я уже почти забыла кто это...",
                "отвечу на это через месяц)",
                "да уж, обновы у побегушек походу не будет...",
                "я всё ещё жду, когда он пришлёт мне танец...",
                "я всё ещё жду, когда мои спрайты для игры будут задействованы...",
                "пиздун.",
                "о, опездун.",
                "что? он снова проспал?",
                "а? он вновь забыл?"
            ],
            mood: 'neutral'
        },
        /* ---- даня ---- */
        {
            keywords: ['даня', 'дане', 'даней', 'даню'],
            replies: [
                "даня? он, должно быть, снова опоздает или не придет вовсе",
                "даня - киберкотлета марвела"
            ],
            mood: 'neutral'
        },
        /* ---- ками ---- */
        {
            keywords: ['ками', 'камичка', 'камушка', 'камушко', 'диячка', 'диана'],
            replies: [
                "а? что?",
                "я тууут~",
                "слышу-слышу!",
                "я здесь!!"
            ],
            mood: 'happy'
        },
        /* ---- смешное ---- */
        {
            keywords: ['лол', 'ржу', 'пхпх', 'ахах', 'кек'],
            replies: [
                "пхахахаха",
                "ахахаха, ты меня рассмеши... рассмешнил... ра.. ну ты пон",
                "ахаххаха, как ты это ваще придумал",
                "лол, согласна"
            ],
            mood: 'laughing'
        },
        /* ---- творчество ---- */
        {
            keywords: ['арт', 'арты', 'рисовать', 'рисунки', 'меме', 'анимации', 'анимация'],
            replies: [
                "скоро-скоро будет новьё, чееестно",
                "да рисую я, рисую..."
            ],
            mood: 'neutral'
        },
        /* ---- форма ---- */
        {
            keywords: ['форма', 'юбка', 'платье', 'матроска'],
            replies: [
                "это моя японская школьная форма, между прочим!"
            ],
            mood: 'happy'
        },
        /* ---- волосы ---- */
        {
            keywords: ['волосы', 'кудри', 'волосики'],
            replies: [
                "ой, тебе нравится?...🥺 не то, чтобы мне приятно это слышать!",
                "волосы у меня кудрявятся, знаешь, как это сложно?"
            ],
            mood: 'teasing'
        },
        /* ---- глаза ---- */
        {
            keywords: ['глаза', 'гетерохромия'],
            replies: [
                "глаза? да, я родилась такой..."
            ],
            mood: 'neutral'
        },
        /* ---- кто ты ---- */
        {
            keywords: ['кто ты', 'как тебя зовут', 'сколько тебе лет'],
            replies: [
                "я ками, просто ками",
                "а что, не видно? я ками, самая настоящая",
                "я - ками! а остальное секрет, хихи~"
            ],
            mood: 'neutral'
        },
        /* ---- вместе ---- */
        {
            keywords: ['со мной', 'вместе', 'го', 'давай'],
            replies: [
                "ой, давай!!",
                "погналии!!",
                "приглашаешь? соглашаюсь!",
                "ну, если ты настаиваешь..."
            ],
            mood: 'happy'
        },
        /* ---- сон ---- */
        {
            keywords: ['спать', 'сон', 'устал', 'устала', 'хочу спать'],
            replies: [
                "иди поспи, я подожду~",
                "сон - это святое!!",
                "я тоже хочу спать, но я здесь, пока ты со мной",
                "а может пойдем спать вместе?"
            ],
            mood: 'neutral'
        },
        /* ---- прощание ---- */
        {
            keywords: ['пока', 'до свидания', 'увидимся', 'я пойду', 'я отойду', 'я ушел', 'я ушла', 'прощай', 'спокойной ночи', 'бб'],
            replies: [
                "пока-пока, возвращайся скорее!",
                "не уходи надолго, ладно?...",
                "ох, я буду тебя ждать... здесь...",
                "нет, не покидай меня..."
            ],
            mood: 'neutral'
        },
        /* ---- как дела ---- */
        {
            keywords: ['как дела', 'как ты', 'что делаешь', 'чем занята', 'кд', 'чд', 'шо делаешь', 'чего делаешь', 'шо скажешь'],
            replies: [
                "у меня всё хорошо, я спала вот... правда меня разбудили",
                "скучала по тебе, если честно...",
                "да так, чиллю, валяюсь",
                "да так, работу всё ищу...",
                "мне немножко было скучно, но с тобой теперь мне весело!!"
            ],
            mood: 'neutral'
        },
        /* ---- приветствия ---- */
        {
            keywords: ['привет', 'прив', 'ку', 'хай', 'здаров', 'здравствуй', 'хаюшки', 'доброе утро', 'добрый день', 'добрый вечер', 'доброй ночи'],
            replies: [
                "ооо, привет-привет~",
                "приивеееет!! я ждала тебя~",
                "доброго времени суток!~ как ты?",
                "урааа!! ты пришёл~",
                "прив!! я соскучилась~"
            ],
            mood: 'happy'
        }
    ];

    function matchesTrigger(text, keyword) {
        const lowerText = text.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();
        if (lowerKeyword.length <= 3) {
            const normalized = ' ' + lowerText.replace(/[^\p{L}\p{N}]+/gu, ' ') + ' ';
            return normalized.includes(' ' + lowerKeyword + ' ');
        }
        return lowerText.includes(lowerKeyword);
    }

    function findChatReply(text) {
        const trimmed = text.trim().toLowerCase();

        /* читы работают всегда */
        if (trimmed === '!null') return { cheat: 'null' };
        if (trimmed.startsWith('!give ')) {
            const amount = parseInt(trimmed.slice(6).trim(), 10);
            if (!isNaN(amount)) return { cheat: 'give', amount: amount };
        }

        /* если обижена — сначала проверяем извинения */
        if (isOffended) {
            for (const kw of APOLOGY_KEYWORDS) {
                if (matchesTrigger(trimmed, kw)) {
                    return {
                        apology: true,
                        text: FORGIVE_REPLIES[Math.floor(Math.random() * FORGIVE_REPLIES.length)],
                        score: 2,
                        mood: 'happy'
                    };
                }
            }
            return {
                text: OFFENDED_REPLIES[Math.floor(Math.random() * OFFENDED_REPLIES.length)],
                mood: 'angry'
            };
        }

        /* обычные триггеры */
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

        /* Да? */
        if (/^да\?*$/i.test(trimmed)) {
            return {
                text: Math.random() < 0.5 ? "да!" : "нет конечно!",
                mood: 'neutral'
            };
        }

        /* Fallback */
        return {
            text: CHAT_FALLBACK[Math.floor(Math.random() * CHAT_FALLBACK.length)],
            mood: 'neutral'
        };
    }

    /* ===== РЕНДЕР ЧАТА ===== */
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

    /* ===== ОБНОВЛЕНИЕ СТАТУСА И ЗАБЛОКИРОВКИ ===== */
    function updateChatState() {
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

    /* ===== ЭМОЦИИ ВО ВРЕМЯ ЧАТА ===== */
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
            if (state === 'idle') {
                setMood(null);
                enterIdle();
            }
        }, 2400);
    }

    /* ===== ОТПРАВКА СООБЩЕНИЯ ===== */
    function sendChatMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        const isCheat = text.startsWith('!');

        if (state === 'sleeping' && !isCheat) {
            addSystemMessage('сначала разбуди меня, чтобы чаттиться!');
            chatInput.value = '';
            return;
        }

        addChatMessage('user', text);
        chatInput.value = '';
        updateChatState();

        /* Персонаж не засыпает во время чата */
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

    /* ===== СОБЫТИЯ ЧАТА ===== */
    chatBtn.addEventListener('click', () => {
        const isOpen = chatPanel.classList.toggle('open');
        document.body.classList.toggle('chat-open', isOpen);
        if (isOpen) {
            updateChatState();
            renderChatHistory();
            setTimeout(() => {
                if (!chatInput.disabled) chatInput.focus();
            }, 300);
        }
    });

    chatSend.addEventListener('click', sendChatMessage);

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });

    chatInput.addEventListener('input', () => {
        resetIdleCountdown();
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
    let wakeTimer       = null;

    let idlePhrase1     = null;
    let idlePhrase2     = null;
    let idlePhraseHide  = null;
    let idlePhraseAnim  = null;
    let idlePhraseActive = false;

    let clickTimes      = [];
    let spamCooldown    = 0;
    const SPAM_WINDOW   = 2000;
    const SPAM_THRESHOLD =
