// Данные разговорника
const PHRASEBOOK = [
    {
        category: 'Базовое',
        phrases: [
            { ru: 'Здравствуйте', zh: '你好', pinyin: 'nǐ hǎo', note: 'При входе в магазин/ресторан' },
            { ru: 'Спасибо', zh: '谢谢', pinyin: 'xiè xie', note: 'Везде' },
            { ru: 'Не надо, спасибо', zh: '不用了，谢谢', pinyin: 'bú yòng le, xiè xie', note: 'Когда навязывают товар/услугу' },
            { ru: 'Сколько стоит?', zh: '多少钱？', pinyin: 'duō shao qián?', note: 'На рынках' },
            { ru: 'Дорого!', zh: '太贵了！', pinyin: 'tài guì le!', note: 'Торг на рынке' },
            { ru: 'Да / Нет', zh: '是 / 不是', pinyin: 'shì / bú shì', note: '' },
            { ru: 'Хорошо / ОК', zh: '好的', pinyin: 'hǎo de', note: 'Согласие' },
            { ru: 'Не понимаю', zh: '我听不懂', pinyin: 'wǒ tīng bù dǒng', note: 'Когда говорят по-китайски' },
        ]
    },
    {
        category: 'Для такси / навигации',
        phrases: [
            { ru: 'Я хочу поехать сюда', zh: '我要去这里', pinyin: 'wǒ yào qù zhè lǐ', note: 'Показываешь адрес на телефоне' },
            { ru: 'Стоп, здесь', zh: '停这里', pinyin: 'tíng zhè lǐ', note: '' },
            { ru: 'Метро где?', zh: '地铁在哪里？', pinyin: 'dì tiě zài nǎ lǐ?', note: '' },
            { ru: 'Туалет где?', zh: '厕所在哪里？', pinyin: 'cè suǒ zài nǎ lǐ?', note: '' },
        ]
    },
    {
        category: 'Для еды',
        phrases: [
            { ru: 'Я хочу это', zh: '我要这个', pinyin: 'wǒ yào zhè ge', note: 'Тыкни в меню/фото' },
            { ru: 'Без острого', zh: '不要辣', pinyin: 'bú yào là', note: 'В Хунани/Сычуани!' },
            { ru: 'Счёт', zh: '买单', pinyin: 'mǎi dān', note: '' },
            { ru: 'Очень вкусно!', zh: '很好吃！', pinyin: 'hěn hǎo chī', note: 'Повару будет приятно' },
            { ru: 'Воду, пожалуйста', zh: '请给我水', pinyin: 'qǐng gěi wǒ shuǐ', note: '' },
            { ru: 'Два пива', zh: '两瓶啤酒', pinyin: 'liǎng píng pí jiǔ', note: '' },
        ]
    },
    {
        category: 'Экстренные',
        phrases: [
            { ru: 'Помогите!', zh: '救命！', pinyin: 'jiù mìng!', note: '' },
            { ru: 'Вызовите скорую', zh: '请叫救护车', pinyin: 'qǐng jiào jiù hù chē', note: '' },
            { ru: 'Я из России', zh: '我是俄罗斯人', pinyin: 'wǒ shì é luó sī rén', note: '' },
            { ru: 'Полиция', zh: '警察', pinyin: 'jǐng chá', note: '' },
            { ru: 'Я потерялся', zh: '我迷路了', pinyin: 'wǒ mí lù le', note: '' },
            { ru: 'Мне нужен переводчик', zh: '我需要翻译', pinyin: 'wǒ xū yào fān yì', note: '' },
        ]
    },
];
