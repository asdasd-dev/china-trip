// Данные разговорника
const PHRASEBOOK = [
    {
        category: 'Базовое',
        phrases: [
            { ru: 'Здравствуйте', zh: '你好', pinyin: 'nǐ hǎo', note: 'При входе в магазин/ресторан' },
            { ru: 'Пока / До свидания', zh: '再见', pinyin: 'zài jiàn', note: '' },
            { ru: 'Спасибо', zh: '谢谢', pinyin: 'xiè xie', note: 'Везде' },
            { ru: 'Пожалуйста / Не за что', zh: '不客气', pinyin: 'bú kè qi', note: 'В ответ на спасибо' },
            { ru: 'Извините', zh: '不好意思', pinyin: 'bù hǎo yì si', note: 'Чтобы протиснуться, привлечь внимание' },
            { ru: 'Не надо, спасибо', zh: '不用了，谢谢', pinyin: 'bú yòng le, xiè xie', note: 'Когда навязывают товар/услугу' },
            { ru: 'Да / Нет', zh: '是 / 不是', pinyin: 'shì / bú shì', note: '' },
            { ru: 'Хорошо / ОК', zh: '好的', pinyin: 'hǎo de', note: 'Согласие' },
            { ru: 'Не понимаю', zh: '我听不懂', pinyin: 'wǒ tīng bù dǒng', note: 'Когда говорят по-китайски' },
            { ru: 'Говорите помедленнее', zh: '请说慢一点', pinyin: 'qǐng shuō màn yī diǎn', note: '' },
            { ru: 'Вы говорите по-английски?', zh: '你会说英语吗？', pinyin: 'nǐ huì shuō yīng yǔ ma?', note: '' },
            { ru: 'Сколько стоит?', zh: '多少钱？', pinyin: 'duō shao qián?', note: 'На рынках' },
            { ru: 'Дорого!', zh: '太贵了！', pinyin: 'tài guì le!', note: 'Торг на рынке' },
            { ru: 'Скидку можно?', zh: '可以便宜一点吗？', pinyin: 'kě yǐ pián yi yī diǎn ma?', note: 'На рынке' },
            { ru: 'Я хочу...', zh: '我要...', pinyin: 'wǒ yào...', note: 'Базовая конструкция заказа' },
        ]
    },
    {
        category: 'Цифры',
        phrases: [
            { ru: '1 / 2 / 3', zh: '一 / 二 / 三', pinyin: 'yī / èr / sān', note: '' },
            { ru: '4 / 5 / 6', zh: '四 / 五 / 六', pinyin: 'sì / wǔ / liù', note: '' },
            { ru: '7 / 8 / 9 / 10', zh: '七 / 八 / 九 / 十', pinyin: 'qī / bā / jiǔ / shí', note: '' },
            { ru: '100 / 1000', zh: '百 / 千', pinyin: 'bǎi / qiān', note: 'Для цен на рынке' },
            { ru: 'Один человек', zh: '一个人', pinyin: 'yī gè rén', note: 'При входе в ресторан' },
            { ru: 'Два человека', zh: '两个人', pinyin: 'liǎng gè rén', note: 'При входе в ресторан' },
        ]
    },
    {
        category: 'Транспорт',
        phrases: [
            { ru: 'Я хочу поехать сюда', zh: '我要去这里', pinyin: 'wǒ yào qù zhè lǐ', note: 'Показываешь адрес на телефоне' },
            { ru: 'Стоп, здесь', zh: '停这里', pinyin: 'tíng zhè lǐ', note: 'Таксисту' },
            { ru: 'Метро где?', zh: '地铁在哪里？', pinyin: 'dì tiě zài nǎ lǐ?', note: '' },
            { ru: 'Аэропорт', zh: '机场', pinyin: 'jī chǎng', note: '' },
            { ru: 'Железнодорожный вокзал', zh: '火车站', pinyin: 'huǒ chē zhàn', note: '' },
            { ru: 'Выход', zh: '出口', pinyin: 'chū kǒu', note: 'На табличках в метро' },
            { ru: 'Вход', zh: '入口', pinyin: 'rù kǒu', note: 'На табличках' },
            { ru: 'Сколько ехать до...?', zh: '到...要多久？', pinyin: 'dào... yào duō jiǔ?', note: '' },
            { ru: 'Прямо / налево / направо', zh: '直走 / 左转 / 右转', pinyin: 'zhí zǒu / zuǒ zhuǎn / yòu zhuǎn', note: 'Навигация пешком' },
        ]
    },
    {
        category: 'Отель',
        phrases: [
            { ru: 'Я хочу заселиться', zh: '我要办理入住', pinyin: 'wǒ yào bàn lǐ rù zhù', note: 'На ресепшне' },
            { ru: 'Выезд сегодня', zh: '我今天退房', pinyin: 'wǒ jīn tiān tuì fáng', note: '' },
            { ru: 'Не работает...', zh: '...坏了', pinyin: '...huài le', note: 'Покажи на сломанную вещь' },
            { ru: 'Горячей воды нет', zh: '没有热水', pinyin: 'méi yǒu rè shuǐ', note: '' },
            { ru: 'Wi-Fi пароль?', zh: 'Wi-Fi密码是什么？', pinyin: 'Wi-Fi mì mǎ shì shén me?', note: '' },
            { ru: 'Разбудите в ... часов', zh: '请在...点叫醒我', pinyin: 'qǐng zài... diǎn jiào xǐng wǒ', note: 'Назови цифру' },
            { ru: 'Можно поздно заселиться?', zh: '可以晚点入住吗？', pinyin: 'kě yǐ wǎn diǎn rù zhù ma?', note: '' },
        ]
    },
    {
        category: 'Еда',
        phrases: [
            { ru: 'Я хочу это', zh: '我要这个', pinyin: 'wǒ yào zhè ge', note: 'Тыкни в меню/фото' },
            { ru: 'Ещё одно такое же', zh: '再来一个一样的', pinyin: 'zài lái yī gè yī yàng de', note: '' },
            { ru: 'Без острого', zh: '不要辣', pinyin: 'bú yào là', note: 'В Хунани/Сычуани — критично!' },
            { ru: 'Немного острого', zh: '少辣', pinyin: 'shǎo là', note: 'Если хочешь чуть остроты' },
            { ru: 'Без кориандра', zh: '不要香菜', pinyin: 'bú yào xiāng cài', note: 'Кинза везде в Китае' },
            { ru: 'Я не ем мясо', zh: '我不吃肉', pinyin: 'wǒ bù chī ròu', note: 'Вегетарианцам' },
            { ru: 'Счёт', zh: '买单', pinyin: 'mǎi dān', note: '' },
            { ru: 'Очень вкусно!', zh: '很好吃！', pinyin: 'hěn hǎo chī', note: 'Повару будет приятно' },
            { ru: 'Кипячёную воду', zh: '热水', pinyin: 'rè shuǐ', note: 'В Китае пьют горячую воду — это норма' },
            { ru: 'Холодной воды нельзя?', zh: '有没有冷水？', pinyin: 'yǒu méi yǒu lěng shuǐ?', note: '' },
            { ru: 'Два пива', zh: '两瓶啤酒', pinyin: 'liǎng píng pí jiǔ', note: '' },
            { ru: 'Упакуйте с собой', zh: '打包', pinyin: 'dǎ bāo', note: 'Попросить упаковать остатки' },
            { ru: 'Столик на двоих', zh: '两个人', pinyin: 'liǎng gè rén', note: 'При входе в ресторан' },
            { ru: 'У вас есть меню с фото?', zh: '有图片菜单吗？', pinyin: 'yǒu tú piàn cài dān ma?', note: '' },
        ]
    },
    {
        category: 'Шоппинг',
        phrases: [
            { ru: 'Можно примерить?', zh: '可以试穿吗？', pinyin: 'kě yǐ shì chuān ma?', note: 'Одежда' },
            { ru: 'Есть размер больше/меньше?', zh: '有大一点/小一点的吗？', pinyin: 'yǒu dà yī diǎn / xiǎo yī diǎn de ma?', note: '' },
            { ru: 'Я просто смотрю', zh: '我随便看看', pinyin: 'wǒ suí biàn kàn kan', note: 'Чтобы отвязались продавцы' },
            { ru: 'Последняя цена?', zh: '最低多少钱？', pinyin: 'zuì dī duō shao qián?', note: 'На рынке — финальный торг' },
            { ru: 'Напишите цену', zh: '把价格写下来', pinyin: 'bǎ jià gé xiě xià lái', note: 'Если не слышно/непонятно' },
            { ru: 'Могу заплатить Alipay?', zh: '可以用支付宝吗？', pinyin: 'kě yǐ yòng zhī fù bǎo ma?', note: '' },
            { ru: 'Дайте квитанцию', zh: '给我发票', pinyin: 'gěi wǒ fā piào', note: '' },
        ]
    },
    {
        category: 'Достопримечательности',
        phrases: [
            { ru: 'Один билет', zh: '一张票', pinyin: 'yī zhāng piào', note: '' },
            { ru: 'Два билета', zh: '两张票', pinyin: 'liǎng zhāng piào', note: '' },
            { ru: 'Можно сфотографировать?', zh: '可以拍照吗？', pinyin: 'kě yǐ pāi zhào ma?', note: '' },
            { ru: 'Сделайте фото?', zh: '能帮我们拍照吗？', pinyin: 'néng bāng wǒ men pāi zhào ma?', note: 'Попросить прохожего' },
            { ru: 'Туалет где?', zh: '厕所在哪里？', pinyin: 'cè suǒ zài nǎ lǐ?', note: '' },
            { ru: 'Аудиогид есть?', zh: '有语音导览吗？', pinyin: 'yǒu yǔ yīn dǎo lǎn ma?', note: '' },
            { ru: 'До закрытия сколько?', zh: '几点关门？', pinyin: 'jǐ diǎn guān mén?', note: 'Когда закрывается' },
        ]
    },
    {
        category: 'Экстренные',
        phrases: [
            { ru: 'Помогите!', zh: '救命！', pinyin: 'jiù mìng!', note: '' },
            { ru: 'Вызовите скорую', zh: '请叫救护车', pinyin: 'qǐng jiào jiù hù chē', note: '120 — скорая' },
            { ru: 'Вызовите полицию', zh: '请叫警察', pinyin: 'qǐng jiào jǐng chá', note: '110 — полиция' },
            { ru: 'Я из России', zh: '我是俄罗斯人', pinyin: 'wǒ shì é luó sī rén', note: '' },
            { ru: 'Я потерялся', zh: '我迷路了', pinyin: 'wǒ mí lù le', note: '' },
            { ru: 'Мне нужен переводчик', zh: '我需要翻译', pinyin: 'wǒ xū yào fān yì', note: '' },
            { ru: 'Мне плохо', zh: '我不舒服', pinyin: 'wǒ bù shū fu', note: '' },
            { ru: 'У меня аллергия на...', zh: '我对...过敏', pinyin: 'wǒ duì... guò mǐn', note: 'Назови продукт' },
            { ru: 'Где ближайшая аптека?', zh: '最近的药店在哪里？', pinyin: 'zuì jìn de yào diàn zài nǎ lǐ?', note: '' },
            { ru: 'У меня украли...', zh: '我的...被偷了', pinyin: 'wǒ de... bèi tōu le', note: '' },
            { ru: 'Консульство России', zh: '俄罗斯领事馆', pinyin: 'é luó sī lǐng shì guǎn', note: 'Пекин: +86 10 6532 2051' },
        ]
    },
];
