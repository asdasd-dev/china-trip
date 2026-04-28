// Адреса для копипаста в Amap Global / DiDi.
// Тап по карточке копирует zh-текст в буфер.
const AMAP_PLACES = [
    {
        city: 'Шанхай',
        sections: [
            {
                title: 'Транспорт',
                items: [
                    { zh: '上海浦东国际机场', label: 'PVG — аэропорт прилёта/вылета' },
                    { zh: '上海火车站', label: 'Shanghai Railway Station — поезда в Сучжоу' },
                    { zh: '苏州火车站', label: 'Suzhou Railway Station — вход в Сучжоу' },
                ]
            },
            {
                title: 'Отель и район',
                items: [
                    { zh: '浦东新区陆家嘴环路1100号', label: 'Atour X Hotel Lujiazui (отель)' },
                    { zh: '陆家嘴中心绿地', label: 'Lujiazui Central Green Park — парк у отеля' },
                    { zh: '上海国金中心', label: 'IFC Mall — фудкорт + Din Tai Fung' },
                    { zh: '正大广场', label: 'Super Brand Mall — у Oriental Pearl Tower' },
                ]
            },
            {
                title: 'Места',
                items: [
                    { zh: '外滩', label: 'The Bund — набережная' },
                    { zh: '上海博物馆 人民广场', label: 'Шанхайский музей на People\'s Square' },
                    { zh: '新天地', label: 'Xintiandi — квартал шикумэнов' },
                    { zh: '武康大楼', label: 'Wukang Mansion — арт-деко' },
                    { zh: '丽思卡尔顿酒店浦东', label: 'Ritz-Carlton Pudong — Flair Bar 58F' },
                    { zh: 'POPMART 南京东路旗舰店', label: 'POPMART флагман на Nanjing East Road' },
                    { zh: 'Haus Nowhere 愚园路1292号', label: 'концепт-стор Tamburins' },
                    { zh: '上海野生动物园', label: 'Shanghai Wild Animal Park' },
                    { zh: '世博文化公园温室花园', label: 'Expo Park Greenhouse' },
                    { zh: '朵云书院 上海中心', label: 'Duoyun Books — книжный на 52F Shanghai Tower' },
                    { zh: '豫园', label: 'Yuyuan Garden + Old Bazaar' },
                    { zh: '上海中心大厦', label: 'Shanghai Tower — смотровая 118/119F' },
                    { zh: '十六铺码头', label: 'Shiliupu Wharf — причал ночных круизов' },
                ]
            },
            {
                title: 'Сучжоу (день из Шанхая)',
                items: [
                    { zh: '拙政园', label: 'Сад Скромного Чиновника — главный сад' },
                    { zh: '平江路历史街区', label: 'Pingjiang Road — старая улица вдоль канала' },
                    { zh: '狮子林', label: 'Сад Льва — лабиринт из камней' },
                    { zh: '平江路码头', label: 'причал лодок на Pingjiang Road' },
                ]
            },
            {
                title: 'Рестораны и бары',
                items: [
                    { zh: '鼎泰丰 上海国金中心', label: 'Din Tai Fung в IFC Mall (Ш1)' },
                    { zh: '翡翠餐厅 新天地', label: 'Crystal Jade в Xintiandi (Ш2)' },
                    { zh: '佳家汤包 陆家嘴', label: 'Jia Jia Tang Bao — сяолунбао у отеля (Ш2)' },
                    { zh: '吴门人家', label: 'Wumen Renjia — обед в Сучжоу (Ш4)' },
                    { zh: '南翔馒头店 豫园', label: 'Nanxiang Mantou Dian в Yuyuan (Ш5)' },
                    { zh: '老吉士', label: 'Lao Ji Shi — финальный ужин (Ш5)' },
                ]
            },
        ]
    },
    {
        city: 'Чжанцзяцзе',
        sections: [
            {
                title: 'Транспорт',
                items: [
                    { zh: '张家界荷花机场', label: 'DYG — аэропорт прилёта/вылета' },
                ]
            },
            {
                title: 'Отель и парк',
                items: [
                    { zh: '武陵源紫木岗19号', label: 'Avatar Hilltop Resort (отель)' },
                    { zh: '森林公园门票站', label: 'Central Gate — главный вход в Wulingyuan' },
                    { zh: '天门山索道下站', label: 'нижняя станция канатки на Тяньмэнь' },
                    { zh: '张家界大峡谷景区', label: 'Grand Canyon — вход к Glass Bridge' },
                ]
            },
            {
                title: 'Места в парке',
                items: [
                    { zh: '金鞭溪', label: 'Golden Whip Stream — тропа по дну каньона' },
                    { zh: '百龙天梯', label: 'Bailong Elevator — наружный лифт 326 м' },
                    { zh: '袁家界', label: 'Yuanjiajie — платформа «парящих гор» (Аватар)' },
                    { zh: '天子山', label: 'Tianzi Mountain — вид «над столбами»' },
                    { zh: '天门山', label: 'Tianmen Mountain — Небесные Врата + glass skywalk' },
                    { zh: '张家界大峡谷玻璃桥', label: 'Grand Canyon Glass Bridge — стеклянный мост 430 м' },
                ]
            },
            {
                title: 'Рестораны',
                items: [
                    { zh: '娄氏桐子鱼头王', label: 'Loushi — хунаньские рыбьи головы (Ч3, опц.)' },
                ]
            },
        ]
    },
    {
        city: 'Пекин',
        sections: [
            {
                title: 'Транспорт',
                items: [
                    { zh: '北京首都国际机场', label: 'PEK — аэропорт прилёта (ночью 20→21 мая)' },
                    { zh: '北京大兴国际机场', label: 'PKX Daxing — вылет 26 мая (НЕ путать с PEK!)' },
                ]
            },
            {
                title: 'Отель и узловые точки',
                items: [
                    { zh: '雅宝路甲5号', label: 'Livefortuna Hotel (отель)' },
                    { zh: '天安门东', label: 'Tiananmen East — высадка к Запретному городу' },
                    { zh: '三里屯太古里', label: 'Sanlitun Taikoo Li — шопинг + рестораны' },
                    { zh: '东直门', label: 'Dongzhimen — автобус 916快 на Великую стену' },
                ]
            },
            {
                title: 'Места',
                items: [
                    { zh: '日坛公园', label: 'Ritan Park — Храм Солнца, утренний парк' },
                    { zh: '王府井大街', label: 'Wangfujing — пешеходная улица + Snack Street' },
                    { zh: '故宫博物院', label: 'Forbidden City — императорский дворец' },
                    { zh: '景山公园', label: 'Jingshan Park — холм с видом на Запретный город' },
                    { zh: '南锣鼓巷', label: 'Nanluoguxiang — главный туристический хутун' },
                    { zh: '后海', label: 'Hou Hai — озеро + бары + рикши по хутунам' },
                    { zh: '慕田峪长城', label: 'Мутянью — Великая стена + тобогган' },
                    { zh: '天坛公园', label: 'Temple of Heaven — круглый храм + парк с тайцзи' },
                    { zh: '颐和园', label: 'Summer Palace — императорская летняя резиденция' },
                    { zh: '雍和宫', label: 'Lama Temple — тибетский монастырь, 26 м Будда' },
                    { zh: '北京孔庙', label: 'Confucius Temple — стелы императорских экзаменов' },
                    { zh: '簋街', label: 'Ghost Street — ночные рестораны, мала-раки' },
                    { zh: '798艺术区', label: '798 Art District — арт-кластер в заводах Bauhaus' },
                ]
            },
            {
                title: 'Рестораны и бары',
                items: [
                    { zh: '四季民福 东四十条', label: 'Siji Minfu — пекинская утка (П1)' },
                    { zh: '孔乙己酒楼 后海', label: 'Kong Yi Ji — терраса на Hou Hai (П2)' },
                    { zh: '麵酷 三里屯', label: 'Noodle Loft — лапша zhajiangmian (П3)' },
                    { zh: '那里花园', label: 'Nali Patio — двор с баром Migas Mercado (П3)' },
                    { zh: '大董烤鸭 三里屯', label: 'Da Dong — премиальная утка, финальный ужин (П5)' },
                ]
            },
        ]
    },
];
