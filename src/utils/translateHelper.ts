// Auto-localization helper for POI addresses and tags
const ADDRESS_MAPPING: Record<string, Record<string, string>> = {
  "澳门耶稣会纪念广场": {
    en: "Largo da Companhia de Jesus, Macau",
    pt: "Largo da Companhia de Jesus, Macau",
    "zh-TW": "澳門耶穌會紀念廣場",
  },
  "澳门大炮台顶": {
    en: "Mount Fortress Top, Macau",
    pt: "Topo da Fortaleza do Monte, Macau",
    "zh-TW": "澳門大炮台頂",
  },
  "澳门新马路": {
    en: "Avenida de Almeida Ribeiro, Macau",
    pt: "Avenida de Almeida Ribeiro, Macau",
    "zh-TW": "澳門新馬路",
  },
  "板樟堂街前地": {
    en: "Largo de São Domingos, Macau",
    pt: "Largo de São Domingos, Macau",
    "zh-TW": "板樟堂街前地",
  },
  "澳门妈阁庙前地": {
    en: "Largo do Pagode da Barra, Macau",
    pt: "Largo do Pagode da Barra, Macau",
    "zh-TW": "澳門媽閣廟前地",
  },
  "东望洋山顶": {
    en: "Guia Hill Peak, Macau",
    pt: "Topo da Colina da Guia, Macau",
    "zh-TW": "東望洋山頂",
  },
  "龙头左巷10号": {
    en: "No. 10, Travessa da Penha, Macau",
    pt: "N.º 10, Travessa da Penha, Macau",
    "zh-TW": "龍頭左巷10號",
  },
  "大堂巷7号": {
    en: "No. 7, Travessa da Sé, Macau",
    pt: "N.º 7, Travessa da Sé, Macau",
    "zh-TW": "大堂巷7號",
  },
  "观光塔前地": {
    en: "Largo da Torre de Macau",
    pt: "Largo da Torre de Macau",
    "zh-TW": "觀光塔前地",
  },
  "孙逸仙大马路": {
    en: "Avenida Dr. Sun Yat-Sen, Macau",
    pt: "Avenida Dr. Sun Yat-Sen, Macau",
    "zh-TW": "孫逸仙大馬路",
  },
  "友谊大马路": {
    en: "Avenida da Amizade, Macau",
    pt: "Avenida da Amizade, Macau",
    "zh-TW": "友誼大馬路",
  },
  "葡京路2-4号": {
    en: "No. 2-4, Avenida de Lisboa, Macau",
    pt: "N.º 2-4, Avenida de Lisboa, Macau",
    "zh-TW": "葡京路2-4號",
  },
  "葡京路": {
    en: "Avenida de Lisboa, Macau",
    pt: "Avenida de Lisboa, Macau",
    "zh-TW": "葡京路",
  },
  "仙德丽街": {
    en: "Rua Cidade de Sintra, Macau",
    pt: "Rua Cidade de Sintra, Macau",
    "zh-TW": "仙德麗街",
  },
  "路氹连贯公路 新濠天地": {
    en: "Estrada do Istmo, City of Dreams, Cotai",
    pt: "Estrada do Istmo, City of Dreams, Cotai",
    "zh-TW": "路氹連貫公路 新濠天地",
  },
  "望德圣母湾大马路 澳门银河": {
    en: "Avenida Marginal Flor de Lótus, Galaxy Macau, Cotai",
    pt: "Avenida Marginal Flor de Lótus, Galaxy Macau, Cotai",
    "zh-TW": "望德聖母灣大馬路 澳門銀河",
  },
  "路氹连贯公路 澳门伦敦人": {
    en: "Estrada do Istmo, The Londoner Macao, Cotai",
    pt: "Estrada do Istmo, The Londoner Macao, Cotai",
    "zh-TW": "路氹連貫公路 澳門倫敦人",
  },
  "巴素打尔古街 十六浦": {
    en: "Rua das Lorchas, Ponte 16, Macau",
    pt: "Rua das Lorchas, Ponte 16, Macau",
    "zh-TW": "巴素打爾古街 十六浦",
  },
  "氹仔官也街": {
    en: "Rua do Cunha, Taipa",
    pt: "Rua do Cunha, Taipa",
    "zh-TW": "氹仔官也街",
  },
  "海边马路": {
    en: "Avenida da Praia, Taipa",
    pt: "Avenida da Praia, Taipa",
    "zh-TW": "海邊馬路",
  },
  "路氹连贯公路": {
    en: "Estrada do Istmo, Cotai",
    pt: "Estrada do Istmo, Cotai",
    "zh-TW": "路氹連貫公路",
  },
  "体育馆大马路": {
    en: "Avenida da Nave Desportiva, Cotai",
    pt: "Avenida da Nave Desportiva, Cotai",
    "zh-TW": "體育館大馬路",
  },
  "黑沙海滩": {
    en: "Hac Sa Beach, Coloane",
    pt: "Praia de Hac Sá, Coloane",
    "zh-TW": "黑沙海灘",
  },
  "路环市区": {
    en: "Coloane Village, Coloane",
    pt: "Vila de Coloane, Coloane",
    "zh-TW": "路環市區",
  },
  "石排湾郊野公园": {
    en: "Seac Pai Van Park, Coloane",
    pt: "Parque de Seac Pai Van, Coloane",
    "zh-TW": "石排灣郊野公園",
  },
  "水坑尾百老汇中心旁": {
    en: "Rua do Campo, Broadway Center, Macau",
    pt: "Rua do Campo, Broadway Center, Macau",
    "zh-TW": "水坑尾百老匯中心旁",
  },
  "雀仔园柯高街5号": {
    en: "No. 5, Rua de Horta e Costa, Macau",
    pt: "N.º 5, Rua de Horta e Costa, Macau",
    "zh-TW": "雀仔園柯高街5號",
  },
  "马统领围17B地下": {
    en: "No. 17B, G/F, Pátio do Comendador, Macau",
    pt: "N.º 17B, R/C, Pátio do Comendador, Macau",
    "zh-TW": "馬統領圍17B地下",
  },
  "氹仔地堡街1号": {
    en: "No. 1, Rua do Regedor, Taipa",
    pt: "N.º 1, Rua do Regedor, Taipa",
    "zh-TW": "氹仔地堡街1號",
  },
  "荷兰园二马路19号": {
    en: "No. 19, Rua de Silva Mendes, Macau",
    pt: "N.º 19, Rua de Silva Mendes, Macau",
    "zh-TW": "荷蘭園二馬路19號",
  },
  "氹仔米也马嘉礼前地8号": {
    en: "No. 8, Largo Camilo Pessanha, Taipa",
    pt: "N.º 8, Largo Camilo Pessanha, Taipa",
    "zh-TW": "氹仔米也馬嘉禮前地8號",
  },
  "路环市区屠场前地21号": {
    en: "No. 21, Largo do Matadouro, Coloane",
    pt: "N.º 21, Largo do Matadouro, Coloane",
    "zh-TW": "路環市區屠場前地21號",
  },
  "柯高街雀仔园12号": {
    en: "No. 12, Rua de Horta e Costa, Macau",
    pt: "N.º 12, Rua de Horta e Costa, Macau",
    "zh-TW": "柯高街雀仔園12號",
  },
  "雀仔园柯高街24号地下": {
    en: "No. 24, G/F, Rua de Horta e Costa, Macau",
    pt: "N.º 24, R/C, Rua de Horta e Costa, Macau",
    "zh-TW": "雀仔園柯高街24號地下",
  },
  "议事亭前地17号": {
    en: "No. 17, Largo do Senado, Macau",
    pt: "N.º 17, Largo do Senado, Macau",
    "zh-TW": "議事亭前地17號",
  },
  "河边新街289号": {
    en: "No. 289, Rua das Lorchas, Macau",
    pt: "N.º 289, Rua das Lorchas, Macau",
    "zh-TW": "河邊新街289號",
  },
  "疯堂斜巷8号 婆仔屋": {
    en: "No. 8, Calçada da Igreja de S. Lázaro, Macau",
    pt: "N.º 8, Calçada da Igreja de S. Lázaro, Macau",
    "zh-TW": "瘋堂斜巷8號 婆仔屋",
  },
  "罗保博士街19号": {
    en: "No. 19, Avenida de Doutor Mário Soares, Macau",
    pt: "N.º 19, Avenida de Doutor Mário Soares, Macau",
    "zh-TW": "羅保博士街19號",
  },
  "苏亚利斯博士大马路90号": {
    en: "No. 90, Avenida de Doutor Mário Soares, Macau",
    pt: "N.º 90, Avenida de Doutor Mário Soares, Macau",
    "zh-TW": "蘇亞利斯博士大馬路90號",
  },
  "威尼斯人三楼": {
    en: "3/F, The Venetian Macao, Cotai",
    pt: "3.º Piso, The Venetian Macao, Cotai",
    "zh-TW": "威尼斯人三樓",
  },
  "巴黎人购物中心": {
    en: "The Parisian Macao Shoppes, Cotai",
    pt: "Centro Comercial de The Parisian Macao, Cotai",
    "zh-TW": "巴黎人購物中心",
  },
  "伦敦人购物中心": {
    en: "The Londoner Macao Shoppes, Cotai",
    pt: "Centro Comercial de The Londoner Macao, Cotai",
    "zh-TW": "倫敦人購物中心",
  },
  "澳门银河 时尚汇": {
    en: "The Promenade Shops, Galaxy Macau, Cotai",
    pt: "The Promenade Shops, Galaxy Macau, Cotai",
    "zh-TW": "澳門銀河 時尚匯",
  },
  "新口岸北京街 怡德商业中心": {
    en: "Rua de Pequim, Yee Tak Commercial Center, Macau",
    pt: "Rua de Pequim, Yee Tak Commercial Center, Macau",
    "zh-TW": "新口岸北京街 怡德商業中心",
  },
  "高美士街 澳门理工大学明德楼": {
    en: "Rua de Luís Gonzaga Gomes, MPU, Macau",
    pt: "Rua de Luís Gonzaga Gomes, MPU, Macau",
    "zh-TW": "高美士街 澳門理工大學明德樓",
  },
  "关闸广场": {
    en: "Praça das Portas do Cerco, Macau",
    pt: "Praça das Portas do Cerco, Macau",
    "zh-TW": "關閘廣場",
  },
  "鸭涌马路": {
    en: "Estrada do Canal dos Patos, Macau",
    pt: "Estrada do Canal dos Patos, Macau",
    "zh-TW": "鴨湧馬路",
  },
  "港珠澳大桥人工岛": {
    en: "HZMB Artificial Island, Macau",
    pt: "Ilha Artificial da Ponte HZMB, Macau",
    "zh-TW": "港珠澳大橋人工島",
  },
  "海港前地": {
    en: "Largo do Terminal Marítimo, Macau",
    pt: "Largo do Terminal Marítimo, Macau",
    "zh-TW": "海港前地",
  },
  "氹仔北安客运码头": {
    en: "Pac On Ferry Terminal, Taipa",
    pt: "Terminal Marítimo de Passageiros da Taipa",
    "zh-TW": "氹仔北安客運碼頭",
  },
  "伟龙马路": {
    en: "Avenida Wai Long, Taipa",
    pt: "Avenida Wai Long, Taipa",
    "zh-TW": "偉龍馬路",
  },
  "横琴莲花大桥": {
    en: "Lotus Bridge, Hengqin, Cotai",
    pt: "Ponte Flor de Lótus, Hengqin, Cotai",
    "zh-TW": "橫琴蓮花大橋",
  }
};

const TAG_MAPPING: Record<string, Record<string, string>> = {
  "世界文化遗产": {
    en: "World Heritage Site",
    pt: "Património Mundial",
    "zh-TW": "世界文化遺產",
  },
  "俯瞰全澳": {
    en: "Panoramic Views",
    pt: "Vistas Panorâmicas",
    "zh-TW": "俯瞰全澳",
  },
  "葡式碎石街道": {
    en: "Portuguese Mosaic St.",
    pt: "Calçada Portuguesa",
    "zh-TW": "葡式碎石街道",
  },
  "巴洛克教堂": {
    en: "Baroque Church",
    pt: "Igreja Barroca",
    "zh-TW": "巴洛克教堂",
  },
  "千年古刹": {
    en: "Ancient Temple",
    pt: "Templo Antigo",
    "zh-TW": "千年古刹",
  },
  "远东最古老灯塔": {
    en: "Far East's Oldest Lighthouse",
    pt: "Farol Mais Antigo do Extremo Oriente",
    "zh-TW": "遠東最古老燈塔",
  },
  "岭南近代大宅": {
    en: "Historic Lingnan Mansion",
    pt: "Mansão Histórica de Lingnan",
    "zh-TW": "嶺南近代大宅",
  },
  "中西合璧建筑": {
    en: "East-meets-West Architecture",
    pt: "Arquitetura Sino-Portuguesa",
    "zh-TW": "中西合璧建築",
  },
  "338米极速蹦极": {
    en: "338m Bungee Jump",
    pt: "Salto de Bungee de 338m",
    "zh-TW": "338米極速蹦極",
  },
  "贝聿铭设计亲子科普": {
    en: "I.M. Pei Design Sci Center",
    pt: "Centro Científico de Design de I.M. Pei",
    "zh-TW": "貝聿銘設計親子科普",
  },
  "古罗马竞技场打卡": {
    en: "Roman Amphitheatre Landmark",
    pt: "Anfiteatro Romano",
    "zh-TW": "古羅馬競技場打卡",
  },
  "海面莲花观音像": {
    en: "Lotus Kun Iam Statue",
    pt: "Estátua de Kun Iam Ecológica",
    "zh-TW": "海面蓮花觀音像",
  },
  "经典地标酒店": {
    en: "Classic Landmark Hotel",
    pt: "Hotel Clássico",
    "zh-TW": "經典地標酒店",
  },
  "米其林三星天巢": {
    en: "3-Star Michelin Robuchon",
    pt: "Robuchon 3 Estrelas Michelin",
    "zh-TW": "米其林三星天巢",
  },
  "音乐喷泉·发财树": {
    en: "Performance Lake & Tree",
    pt: "Show de Água e Árvore da Fortuna",
    "zh-TW": "音樂噴泉·發財樹",
  },
  "天幕广场水族馆": {
    en: "Grande Praça Aquarium",
    pt: "Aquário da Grande Praça",
    "zh-TW": "天幕廣場水族館",
  },
  "扎哈·哈迪德曲线杰作": {
    en: "Zaha Hadid Curve Masterpiece",
    pt: "Obra de Curva de Zaha Hadid",
    "zh-TW": "扎哈·哈迪德曲線傑作",
  },
  "独栋全泳池悦榕套房": {
    en: "Private Pool Banyan Suites",
    pt: "Suítes Banyan de Piscina Privada",
    "zh-TW": "獨棟全泳池悅榕套房",
  },
  "经典百年瑞吉管家服务": {
    en: "Signature Butler Service",
    pt: "Serviço de Mordomo Exclusivo",
    "zh-TW": "經典百年瑞吉管家服務",
  },
  "内港历史城区景观": {
    en: "Inner Harbour Views",
    pt: "Vistas do Porto Interior",
    "zh-TW": "內港歷史城區景觀",
  },
  "澳门首屈一指手信街": {
    en: "Premier Souvenirs Street",
    pt: "Rua do Cunha Souvenirs",
    "zh-TW": "澳門首屈一指手信街",
  },
  "薄荷绿葡式别墅": {
    en: "Mint Green Portuguese Houses",
    pt: "Casas Portuguesas Verde Menta",
    "zh-TW": "薄荷綠葡式別墅",
  },
  "室内大运河贡多拉": {
    en: "Indoor Canals & Gondola",
    pt: "Canais Internos e Gôndola",
    "zh-TW": "室內大運河貢多拉",
  },
  "1/2比例巴黎铁塔": {
    en: "1/2 Scale Eiffel Tower",
    pt: "Torre Eiffel em Escala 1/2",
    "zh-TW": "1/2比例巴黎鐵塔",
  },
  "大本钟·英伦皇家": {
    en: "Elizabeth Tower & British Style",
    pt: "Torre Elizabeth e Estilo Britânico",
    "zh-TW": "大本鐘·英倫皇家",
  },
  "免费观光缆车": {
    en: "Free SkyCab Cable Car",
    pt: "Teleférico SkyCab Gratuito",
    "zh-TW": "免費觀光纜車",
  },
  "摩珀斯建筑艺术": {
    en: "Morpheus Architecture Art",
    pt: "Arte de Arquitetura Morpheus",
    "zh-TW": "摩珀斯建築藝術",
  },
  "8字形影汇之星": {
    en: "Golden Reel 8 Ferris Wheel",
    pt: "Roda Gigante Golden Reel em 8",
    "zh-TW": "8字形影匯之星",
  },
  "天浪淘园·钻石大堂": {
    en: "Grand Resort Deck & Diamond",
    pt: "Grand Resort Deck e Diamante",
    "zh-TW": "天浪淘園·鑽石大堂",
  },
  "珠宝盒建筑设计": {
    en: "Jewelry Box Architecture",
    pt: "Arquitetura Caixa de Joias",
    "zh-TW": "珠寶盒建築設計",
  },
  "澳门最大天然黑沙海滩": {
    en: "Macau's Largest Black Sand Beach",
    pt: "Maior Praia de Areia Preta de Macau",
    "zh-TW": "澳門最大天然黑沙海灘",
  },
  "安德鲁葡挞发源地": {
    en: "Lord Stow's Egg Tart Birthplace",
    pt: "Origem do Pastel de Nata de Lord Stow",
    "zh-TW": "安德魯葡撻發源地",
  },
  "国宝大熊猫亲密接触": {
    en: "Giant Pandas Pavilion",
    pt: "Pavilhão do Panda Gigante",
    "zh-TW": "國寶大熊貓親密接觸",
  },
  "精致手冲特调咖啡": {
    en: "Craft Specialty Coffee",
    pt: "Café Especial Artesanal",
    "zh-TW": "精緻手沖特調咖啡",
  },
  "精品咖啡烘焙工坊": {
    en: "Boutique Coffee Roaster",
    pt: "Torrador de Café Boutique",
    "zh-TW": "精品咖啡烘焙工坊",
  },
  "玛嘉烈正宗葡挞咖啡": {
    en: "Margaret's Authentic Egg Tarts",
    pt: "Pastel de Nata Original da Margaret",
    "zh-TW": "瑪嘉烈正宗葡撻咖啡",
  },
  "古法炭烧瓦煲咖啡·猪扒包": {
    en: "Claypot Coffee & Pork Chop Bun",
    pt: "Café em Pote de Barro e Pão com Chouriço/Porco",
    "zh-TW": "古法炭燒瓦煲咖啡·豬扒包",
  },
  "澳门首批冠军单品手冲": {
    en: "Champion Single Origin Coffee",
    pt: "Café de Origem Única Campeão",
    "zh-TW": "澳門首批冠軍單品手沖",
  },
  "法式天台景观设计咖啡": {
    en: "French Rooftop Design Cafe",
    pt: "Café de Design com Terraço Francês",
    "zh-TW": "法式天台景觀設計咖啡",
  },
  "安德鲁花园咖啡总店": {
    en: "Lord Stow's Garden Cafe Head",
    pt: "Lord Stow's Garden Cafe Principal",
    "zh-TW": "安德魯花園咖啡總店",
  },
  "文青手作轻食咖啡": {
    en: "Hipster Handcrafted Cafe",
    pt: "Café Artesanal de Hipster",
    "zh-TW": "文青手作輕食咖啡",
  },
  "经典香脆鸡翅便当": {
    en: "Classic Crispy Chicken Bento",
    pt: "Bento de Asa de Frango Estaladiço",
    "zh-TW": "經典香脆雞翅便當",
  },
  "百年竹升打面鲜虾云吞": {
    en: "Bamboo Noodles & Shrimp Wontons",
    pt: "Massa de Bambu e Wontons de Camarão",
    "zh-TW": "百年竹升打麵鮮蝦雲吞",
  },
  "地道米其林必比登葡国菜": {
    en: "Michelin Bib Gourmand Portuguese",
    pt: "Culinária Portuguesa de Bib Gourmand",
    "zh-TW": "地道米其林必比登葡國菜",
  },
  "望德堂百年古宅葡式料理": {
    en: "Historic Mansion Portuguese Dining",
    pt: "Jantar Português em Mansão Histórica",
    "zh-TW": "望德堂百年古宅葡式料理",
  },
  "祖传秘制黑椒烧鸭": {
    en: "Secret Recipe Black Pepper Duck",
    pt: "Pato Assado com Pimenta Preta de Receita Secreta",
    "zh-TW": "祖傳秘製黑椒燒鴨",
  },
  "澳门核心高端百货": {
    en: "Macau Core Luxury Department",
    pt: "Grande Armazém Central de Macau",
    "zh-TW": "澳門核心高端百貨",
  },
  "350+国际免税大牌": {
    en: "350+ Luxury Duty-Free Brands",
    pt: "Mais de 350 Marcas Duty-Free",
    "zh-TW": "350+國際免稅大牌",
  },
  "香榭丽舍风情名品大道": {
    en: "Champs-Élysées Luxury Avenue",
    pt: "Avenida de Luxo Champs-Élysées",
    "zh-TW": "香榭麗舍風情名品大道",
  },
  "英伦奢品免税商场": {
    en: "British Luxury Duty-Free Mall",
    pt: "Shopping de Luxo de Estilo Britânico",
    "zh-TW": "英倫奢品免稅商場",
  },
  "200+顶级旗舰奢牌": {
    en: "200+ Premier Luxury Brands",
    pt: "Mais de 200 Marcas de Luxo do Estilo",
    "zh-TW": "200+頂級旗艦奢牌",
  },
  "商业办公中心": {
    en: "Commercial Business Office Center",
    pt: "Centro de Escritórios Comerciais",
    "zh-TW": "商業辦公中心",
  },
  "大学宿舍与教学区": {
    en: "University Dorm & Academic Area",
    pt: "Dormitório e Área Académica da MPU",
    "zh-TW": "大學宿舍與教學區",
  },
  "拱北通关总口岸": {
    en: "Main Gongbei Port of Entry",
    pt: "Posto Fronteiriço Principal de Gongbei",
    "zh-TW": "拱北通關總口岸",
  },
  "24小时快捷通关口岸": {
    en: "24h Express Qingmao Port",
    pt: "Posto Fronteiriço Qingmao 24h",
    "zh-TW": "24小時快捷通關口岸",
  },
  "连接港珠澳三地口岸": {
    en: "Mega Bridge Tri-Port Link",
    pt: "Ligação de Três Portos da Ponte HZMB",
    "zh-TW": "連接港珠澳三地口岸",
  },
  "外港客运码头": {
    en: "Outer Harbour Ferry Terminal",
    pt: "Terminal Marítimo do Porto Exterior",
    "zh-TW": "外港客運碼頭",
  },
  "金光飞航港澳班次": {
    en: "Cotai Water Jet HK-Macau",
    pt: "Serviço de Cotai Water Jet",
    "zh-TW": "金光飛航港澳班次",
  },
  "澳门国际机场": {
    en: "Macau International Airport",
    pt: "Aeroporto Internacional de Macau",
    "zh-TW": "澳門國際機場",
  },
  "横琴口岸澳门管辖区": {
    en: "Hengqin Port Macau Zone",
    pt: "Zona de Macau do Posto Fronteiriço Hengqin",
    "zh-TW": "橫琴口岸澳門管轄區",
  }
};

export function getLocalizedAddress(address: string, lang: string): string {
  if (!address) return "";
  const cleanAddr = address.trim();
  const match = ADDRESS_MAPPING[cleanAddr];
  if (!match) return address;
  if (lang === "en") return match.en || address;
  if (lang === "pt") return match.pt || match.en || address;
  if (lang === "zh-TW" || lang === "zh-HK") return match["zh-TW"] || address;
  return address;
}

export function getLocalizedTag(tag: string, lang: string): string {
  if (!tag) return "";
  const cleanTag = tag.trim();
  const match = TAG_MAPPING[cleanTag];
  if (!match) return tag;
  if (lang === "en") return match.en || tag;
  if (lang === "pt") return match.pt || match.en || tag;
  if (lang === "zh-TW" || lang === "zh-HK") return match["zh-TW"] || tag;
  return tag;
}
