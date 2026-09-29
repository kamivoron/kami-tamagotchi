// Ждём, пока загрузится вся страница
document.addEventListener('DOMContentLoaded', () => {
    // Находим все элементы на странице
    const petWidget = document.getElementById('petWidget');
    const petLayer = document.getElementById('petLayer');
    const petSpeech = document.getElementById('petSpeech');

    // ==== ЗАМЕНИ ЭТИ ССЫЛКИ НА СВОИ (если они изменятся) ====
    const IMAGES = {
        sleep1: 'https://i.ibb.co/LDzbkbMQ/123-20260929142127.png', // Сон, кадр 1
        sleep2: 'https://i.ibb.co/nqYSCMBq/123-20260929142128.png', // Сон, кадр 2 (вдох)
        wake: 'https://i.ibb.co/kg66b7RZ/123-20260929142329.png',   // Пробуждение (злой)
        blink: 'https://i.ibb.co/4RLBHjPS/123-20260929151145.png',  // Моргает
        idle: 'https://i.ibb.co/ccGkNxJj/123-20260929151146.png',   // Сидит, нейтральный
        talk1: 'https://i.ibb.co/6cX7Bsy0/123-20260929151149.png',  // Говорит, рот приоткрыт
        talk2: 'https://i.ibb.co/1GxDN6Jj/123-20260929151151.png',  // Говорит, рот широко открыт
        happy1: 'https://i.ibb.co/67wsBBC5/123-20260929151153.png', // Радостный, рот приоткрыт
        happy2: 'https://i.ibb.co/wFJsz5j0/123-20260929151154.png', // Радостный, рот открыт
        angry: 'https://i.ibb.co/JwLGf1PC/123-20260929151156.png',  // Недовольный
        laugh: 'https://i.ibb.co/HDXssT4L/123-20260929151157.png',  // Смеётся
        tease: 'https://i.ibb.co/35ZVQ56V/123-20260929151159.png'   // Показывает язык
    };

    // ==== ТВОИ ДИАЛОГИ ====
    const DIALOGS = {
        welcome: [
            { text: "ммм... что такое?", mood: "neutral" },
            { text: "я так сладко спала!...", mood: "neutral" },
            { text: "ладно, встаю...", mood: "neutral" },
            { text: "хотя нет, ещё 5 минуток...", mood: "neutral" },
            { text: "и что тебе нужно на этот раз?~", mood: "happy" }
        ],
        body: [
            { text: "ой! ты чего тыкаешь?", mood: "neutral" },
            { text: "я вообще-то занята!... ну ладно.", mood: "happy" },
            { text: "думаешь, тут есть какая-то пасхалка?", mood: "neutral" },
            { text: "я проснусь, когда выйдет фейт триггер", mood: "neutral" },
            { text: "ну, или обнова в соларпанке", mood: "neutral" },
            { text: "ну, или четвертый сезон звездного дитя", mood: "neutral" },
            { text: "ладно, я слишком хочу спать, так что не проснусь.", mood: "neutral" },
            { text: "почему ты всё ещё меня слушаешь?", mood: "neutral" },
            { text: "что ты ожидаешь тут дальше увидеть?", mood: "neutral" },
            { text: "67", mood: "neutral" },
            { text: "сикс севен брееейнроооот", mood: "neutral" },
            { text: "надеюсь ты щас была оч довольна юль", mood: "happy" },
            { text: "...", mood: "neutral" },
            { text: "ладно, всё, я уже... засыпаю...", mood: "neutral" },
            { text: "*зевает*", mood: "neutral" },
            { text: "😴", mood: "neutral" },
            { text: "😴", mood: "neutral" },
            { text: "😴", mood: "neutral" }
        ],
        hair: [
            { text: "э! не трогай мои волосы!", mood: "angry" },
            { text: "ты меня гладишь?! я совсем не милая!", mood: "angry" },
            { text: "ещё раз тронешь - укушу!", mood: "angry" }
        ],
        skirt: [
            { text: "к-куда ты жмёшь?!", mood: "angry" },
            { text: "извращенец!", mood: "angry" },
            { text: "что ты только что-!", mood: "teasing" }
        ]
    };

    // ==== ПЕРЕМЕННЫЕ СОСТОЯНИЯ ====
    let state = 'sleeping'; // Текущее состояние: sleeping, waking, idle, talking
    let talkTimer = null;   // Таймер для смены реплик
    let blinkTimer = null;  // Таймер для моргания
    let idleTimer = null;   // Таймер для начала "сна"
    let sleepTimer = null;  // Таймер для засыпания
    let phraseIndex = 0;    // Индекс текущей фразы в диалоге
    let talkAnim = null;    // Таймер для анимации рта

    // ==== ФУНКЦИИ ====

    // Показать определённый кадр
    function showLayer(name) {
        if (!IMAGES[name]) return;
        petLayer.style.backgroundImage = `url(${IMAGES[name]})`;
    }

    // Показать/скрыть облачко с текстом
    function showSpeech(visible) {
        if (visible) petWidget.classList.add('awake');
        else petWidget.classList.remove('awake');
    }

    // Анимация "рта" (смена кадров)
    function startTalkAnim(kind) {
        stopTalkAnim();
        let i = 0;
        let frames;

        if (kind === 'happy') frames = ['happy1', 'happy2'];
        else if (kind === 'angry') frames = ['angry'];
        else frames = ['talk1', 'talk2']; // 'neutral'

        if (frames.length === 1) {
            showLayer(frames[0]);
            return;
        }

        talkAnim = setInterval(() => {
            showLayer(frames[i % frames.length]);
            i++;
        }, 220); // Скорость смены кадров
    }

    // Остановить анимацию "рта"
    function stopTalkAnim() {
        if (talkAnim) {
            clearInterval(talkAnim);
            talkAnim = null;
        }
    }

    // Проиграть диалог
    function playDialog(phrasesArr, onFinish) {
        if (state === 'talking') return;

        state = 'talking';
        // Очищаем все таймеры
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

            petWidget.classList.remove('pet-mood-angry', 'pet-mood-happy');

            // Определяем "настроение" и показываем кадр
            if (cur.mood === 'angry') {
                showLayer('angry');
                petWidget.classList.add('pet-mood-angry');
                startTalkAnim('angry');
            } else if (cur.mood === 'happy') {
                startTalkAnim('happy');
            } else if (cur.mood === 'teasing') {
                stopTalkAnim();
                showLayer('tease');
            } else {
                startTalkAnim('neutral');
            }

            phraseIndex++;
        }

        step(); // Показываем первую фразу сразу
        talkTimer = setInterval(step, 2600); // Смена фраз каждые 2.6 сек
    }

    // Завершение диалога и возврат в состояние покоя
    function finishDialog() {
        stopTalkAnim();
        showSpeech(false);
        petWidget.classList.remove('pet-mood-angry', 'pet-mood-happy');
        enterIdle();
    }

    // Вход в состояние "покоя" (сидит и моргает)
    function enterIdle() {
        state = 'idle';
        showLayer('idle');

        // Настраиваем моргание
        clearInterval(blinkTimer);
        blinkTimer = setInterval(() => {
            if (state !== 'idle') return;
            showLayer('blink');
            setTimeout(() => {
                if (state === 'idle') showLayer('idle');
            }, 160);
        }, 4000); // Моргает каждые 4 секунды

        // Настраиваем "засыпание" через 30 секунд
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            if (state !== 'idle') return;
            showLayer('blink'); // Зевает
            setTimeout(() => {
                if (state !== 'idle') return;
                clearTimeout(sleepTimer);
                sleepTimer = setTimeout(() => {
                    if (state !== 'idle') return;
                    clearInterval(blinkTimer);
                    state = 'sleeping';
                    petWidget.classList.remove('awake');
                    showLayer('sleep1');
                }, 10000); // Через 10 сек засыпает
            }, 400);
        }, 30000); // Через 30 сек начинает зевать
    }

    // Пробуждение
    function wakeUp() {
        state = 'waking';
        showLayer('wake');
        petWidget.classList.add('pet-waking');
        petWidget.classList.add('pet-mood-angry');

        // Через 0.9 сек начинаем диалог
        setTimeout(() => {
            petWidget.classList.remove('pet-waking');
            petWidget.classList.remove('pet-mood-angry');
            playDialog(DIALOGS.welcome, finishDialog);
        }, 900);
    }

    // ==== ОБРАБОТЧИК КЛИКОВ ====
    petWidget.addEventListener('click', (e) => {
        const rect = petWidget.getBoundingClientRect();
        const y = (e.clientY - rect.top) / rect.height; // Координата клика по вертикали (0..1)

        if (state === 'sleeping') {
            wakeUp();
            return;
        }

        if (state === 'talking') return; // Если говорит, не перебиваем

        let zone = 'body'; // По умолчанию - тело
        if (y < 0.35) zone = 'hair'; // Верхняя часть - волосы
        else if (y > 0.7) zone = 'skirt'; // Нижняя часть - юбка

        const dlg = DIALOGS[zone] || DIALOGS.body;
        playDialog(dlg, finishDialog);
    });

    // ==== СТАРТ ====
    showLayer('sleep1'); // Начинаем со сна
    petWidget.classList.add('pet-sleeping');
});
