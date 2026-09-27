import { MACAU_POIS, MacauPOI } from '../constants';

// Comprehensive search aliases mapping for Macau POIs
export const POI_SEARCH_ALIASES: Record<string, string[]> = {
  ruins: [
    '大三巴', '大三巴牌坊', '牌坊', '圣保禄', '聖保祿', '耶稣会', '耶穌會', '耶稣会纪念广场', 
    'dasanba', 'ruins', 'st paul', 'san paulo', 'ruinas'
  ],
  monte_forte: [
    '大炮台', '大砲台', '澳门博物馆', '澳門博物館', '大炮台顶', '大砲台頂', '炮台', '砲台',
    'dapaotai', 'monte forte', 'fortaleza', 'museum'
  ],
  senado_square: [
    '议事亭前地', '議事亭前地', '喷水池', '噴水池', '新马路', '新馬路', '葡式碎石', '市政署',
    'senado', 'fountain', 'san ma lou', 'largo do senado'
  ],
  st_dominic: [
    '玫瑰圣母堂', '玫瑰堂', '玫瑰聖母堂', '板樟堂', '板樟堂街', '教堂',
    'st dominic', 'igreja de sao domingos', 'church'
  ],
  a_ma_temple: [
    '妈阁庙', '媽閣廟', '妈祖阁', '媽祖閣', '妈祖', '媽祖', '妈阁庙前地', '妈阁', '媽閣',
    'a ma temple', 'templo de a-ma', 'temple', 'mazu'
  ],
  guia_fortress: [
    '东望洋灯塔', '東望洋燈塔', '东望洋炮台', '東望洋砲台', '松山灯塔', '松山', '东望洋山', '東望洋山',
    'guia fortress', 'fortaleza da guia', 'lighthouse'
  ],
  mandarin_house: [
    '郑家大屋', '鄭家大屋', '郑观应', '鄭觀應', '龙头左巷', '龍頭左巷', '岭南大宅',
    'mandarin house', 'casa do mandarim'
  ],
  lou_kau_mansion: [
    '卢家大屋', '盧家大屋', '金玉堂', '大堂巷', '中西合璧',
    'lou kau mansion', 'casa de lou kau'
  ],
  macau_tower: [
    '澳门旅游塔', '澳門旅遊塔', '澳门塔', '澳門塔', '观光塔', '觀光塔', '旅游塔', '旅遊塔', '蹦极', '笨猪跳', '338米',
    'macau tower', 'torre de macau', 'bungee'
  ],
  science_center: [
    '澳门科学馆', '澳門科學館', '科学馆', '科學館', '贝聿铭', '貝聿銘', '孙逸仙大马路', '天文馆',
    'science center', 'centro de ciencia'
  ],
  fishermans_wharf: [
    '澳门渔人码头', '澳門漁人碼頭', '渔人码头', '漁人碼頭', '古罗马竞技场', '友谊大马路',
    'fishermans wharf', 'doca dos pescadores'
  ],
  kun_iam: [
    '观音莲花苑', '觀音蓮花苑', '观音像', '觀音像', '海面观音', '海面觀音',
    'kun iam', 'centro ecumenico'
  ],
  hotel_lisboa: [
    '葡京酒店', '老葡京', '葡京', '经典地标酒店', '葡京路',
    'hotel lisboa', 'lisboa'
  ],
  grand_lisboa: [
    '新葡京酒店', '新葡京', '天巢', '米其林三星', 'grand lisboa'
  ],
  wynn_macau: [
    '永利澳门', '永利澳門', '永利', '发财树', '發財樹', '吉祥树', '音乐喷泉', '音樂噴泉', '仙德丽街',
    'wynn macau', 'wynn'
  ],
  mgm_macau: [
    '澳门美高梅', '澳門美高梅', '美高梅', '天幕广场', '天幕廣場', '水族馆',
    'mgm macau', 'mgm'
  ],
  cunha: [
    '氹仔官也街', '官也街', '手信街', '手信美食街', '地堡街', '肉干', '杏仁饼', '晃记', '莫义记',
    'cunha', 'rua do cunha', 'taipa food'
  ],
  taipa_houses: [
    '龙环葡韵', '龍環葡韻', '龙环葡韵住宅式博物馆', '龍環葡韻住宅式博物館', '薄荷绿', '海边马路',
    'taipa houses', 'casas-museu da taipa'
  ],
  venetian: [
    '澳门威尼斯人', '澳門威尼斯人', '威尼斯人', '大运河', '大運河', '贡多拉', '貢多拉', '金沙城', '路氹连贯公路',
    'venetian', 'the venetian macao', 'gondola'
  ],
  parisian: [
    '澳门巴黎人', '澳門巴黎人', '巴黎人', '巴黎铁塔', '巴黎鐵塔', '埃菲尔铁塔', '铁塔',
    'parisian', 'the parisian macao', 'eiffel'
  ],
  londoner: [
    '澳门伦敦人', '澳門倫敦人', '伦敦人', '倫敦人', '大本钟', '大笨鐘', '伊丽莎白塔', '皇家卫队', '英伦',
    'londoner', 'the londoner macao', 'big ben'
  ],
  wynn_palace: [
    '永利皇宫', '永利皇宮', '皇宫', '观光缆车', '觀光纜車', '免费缆车', '音乐喷泉', '體育館大馬路',
    'wynn palace', 'cable car'
  ],
  city_of_dreams: [
    '新濠天地', '新濠', '水舞间', '水舞間', '童梦天地',
    'city of dreams', 'cod'
  ],
  studio_city: [
    '新濠影汇', '新濠影匯', '影汇之星', '影匯之星', '8字摩天轮', '8字摩天輪', '水上乐园',
    'studio city', 'ferris wheel'
  ],
  galaxy_macau: [
    '澳门银河', '澳門銀河', '银河度假城', '銀河渡假城', '银河', '銀河', '天浪淘园', '天浪淘園', '钻石大堂', '水晶大堂',
    'galaxy macau', 'galaxy'
  ],
  mgm_cotai: [
    '美狮美高梅', '美獅美高梅', '路氹美高梅', '珠宝盒', '視博廣場', '视博广场',
    'mgm cotai'
  ],
  hac_sa: [
    '路环黑沙海滩', '路環黑沙海灘', '黑沙海滩', '黑沙海灘', '黑沙', '天然海滩', '烧烤档',
    'hac sa', 'praia de hac-sa', 'beach'
  ],
  coloane_village: [
    '路环市区', '路環市區', '路环', '路環', '圣方济各圣堂', '聖方濟各聖堂', '安德鲁总店', '安德魯總店',
    'coloane village', 'vila de coloane'
  ],
  panda_pavilion: [
    '澳门大熊猫馆', '澳門大熊貓館', '大熊猫馆', '大熊貓館', '石排湾郊野公园', '石排灣郊野公園', '熊猫', '熊貓', '开开', '心心',
    'panda pavilion', 'pavilhao do panda'
  ],
  morpheus_hotel: [
    '摩珀斯酒店', '摩珀斯', '扎哈', '扎哈哈迪德', '新濠天地摩珀斯',
    'morpheus', 'hotel morpheus'
  ],
  banyan_tree: [
    '澳门悦榕庄', '澳門悅榕庄', '悦榕庄', '悅榕庄', '全套房度假酒店', '银河悦榕庄',
    'banyan tree macau', 'banyan tree'
  ],
  st_regis: [
    '澳门瑞吉酒店', '澳門瑞吉酒店', '瑞吉酒店', '瑞吉', '瑞吉管家', '伦敦人瑞吉',
    'st regis macao', 'st regis'
  ],
  sofitel_macau: [
    '澳门十六浦索菲特大酒店', '澳門十六浦索菲特大酒店', '十六浦', '索菲特', '内港',
    'sofitel macau', 'ponte 16'
  ],
  lofficiel_coffee: [
    'lofficiel coffee', 'lofficiel', '水坑尾', '手冲咖啡', '特调咖啡', '百老汇中心'
  ],
  blooom_coffee: [
    'blooom coffee', 'blooom', '雀仔园', '柯高街', '咖啡烘焙', '精品咖啡'
  ],
  margarets_cafe: [
    '玛嘉烈蛋挞', '瑪嘉烈葡撻', '玛嘉烈', '瑪嘉烈', '马统领围', '葡挞', '蛋挞'
  ],
  sei_kee_cafe: [
    '世记咖啡', '世紀咖啡', '世记', '世紀', '氹仔地堡街', '瓦煲咖啡', '古法炭烧', '猪扒包', '豬扒包', '奶茶'
  ],
  single_origin: [
    'single origin', '荷兰园', '荷蘭園', '冠军单品', '手冲咖啡'
  ],
  quarter_square: [
    'quarter square', '氹仔天台', '天台景观咖啡', '米也马嘉礼前地'
  ],
  lord_stow_cafe: [
    '安德鲁花园咖啡店', '安德魯花園咖啡店', '安德鲁', '安德魯', '路环总店', '正宗葡挞', '葡挞总店'
  ],
  commune_cafe: [
    'commune cafe', 'commune', '雀仔园轻食', '文青咖啡'
  ],
  miaohua_chicken: [
    '苗花鸡', '苗花雞', '香脆鸡翅', '便当', '雀仔园', '柯高街'
  ],
  wong_chi_kei: [
    '黄枝记粥面', '黃枝記粥麵', '黄枝记', '黃枝記', '议事亭前地', '竹升打面', '鲜虾云吞', '云吞面'
  ],
  lorcha: [
    '船屋葡国餐厅', '船屋葡國餐廳', '船屋', '河边新街', '米其林必比登', '葡国菜', '葡國菜', '焗鸭饭', '马介休'
  ],
  albergue_1601: [
    '婆仔屋1601葡国餐厅', '婆仔屋1601', '婆仔屋', '疯堂斜巷', '瘋堂斜巷', '望德堂', '葡国料理'
  ],
  chan_kwong_kei: [
    '陈光记烧腊', '陳光記燒臘', '陈光记', '陳光記', '黑椒烧鸭', '黑椒燒鴨', '罗保博士街', '烧味'
  ],
  new_yaohan: [
    '新八佰伴', '新八佰伴百货', '八佰伴', '新八百伴', '苏亚利斯博士大马路', '商场', '百货'
  ],
  shopper_venetian: [
    '大运河购物中心', '大運河購物中心', '威尼斯人购物中心', '威尼斯人商场', '免税店', '名品'
  ],
  shopper_parisian: [
    '巴黎人购物中心', '巴黎人商场', '香榭丽舍', '名品大道'
  ],
  shopper_londoner: [
    '伦敦人购物中心', '倫敦人購物中心', '伦敦人商场', '英伦奢品', '免税商场'
  ],
  galaxy_promenade: [
    '澳门银河时尚汇', '澳門銀河時尚匯', '时尚汇', '時尚匯', '银河商场', '奢牌'
  ],
  yide_center: [
    '怡德商业中心', '怡德商業中心', '怡德大厦', '新口岸北京街', '写字楼'
  ],
  mpu_dorm: [
    '澳门理工大学宿舍', '澳門理工大學宿舍', '澳门理工大学明德楼', '明德楼', '理工大学', '大学宿舍', '高美士街'
  ],
  border_gate: [
    '关闸', '關閘', '关闸口岸', '關閘口岸', '拱北口岸', '拱北', '关闸广场', '总口岸', '过关'
  ],
  qingmao_port: [
    '青茂口岸', '青茂', '鸭涌马路', '24小时通关', '快捷通关'
  ],
  hzmb_port: [
    '港珠澳大桥澳门口岸', '港珠澳大橋澳門口岸', '港珠澳大桥', '港珠澳大橋', '人工岛', '穿梭巴士', '金巴'
  ],
  outer_harbour: [
    '外港客运码头', '外港客運碼頭', '外港码头', '外港碼頭', '喷射飞航', '海港前地', '港澳码头'
  ],
  ferry_terminal: [
    '氹仔客运码头', '氹仔客運碼頭', '氹仔码头', '氹仔碼頭', '北安码头', '金光飞航'
  ],
  macau_airport: [
    '澳门国际机场', '澳門國際機場', '澳门机场', '澳門機場', '飞机场', '伟龙马路', '航站楼'
  ],
  hengqin_port: [
    '横琴口岸', '橫琴口岸', '横琴口岸澳门管辖区', '横琴', '莲花大桥', '一地两检'
  ]
};

// Search Matcher Function
export function matchPoi(
  poiId: string, 
  rawQuery: string, 
  translations: Record<string, Record<string, string>>,
  currentLang: string = 'zh-CN'
): { matched: boolean; score: number } {
  if (!rawQuery || !rawQuery.trim()) {
    return { matched: true, score: 0 };
  }

  const q = rawQuery.trim().toLowerCase();
  const poi = MACAU_POIS.find(p => p.id === poiId);
  if (!poi) return { matched: false, score: 0 };

  let score = 0;
  let matched = false;

  // 1. Direct ID match
  if (poi.id.toLowerCase() === q) {
    return { matched: true, score: 100 };
  }
  if (poi.id.toLowerCase().includes(q)) {
    score = Math.max(score, 80);
    matched = true;
  }

  // 2. Check all translations (zh-CN, zh-TW, en, pt)
  const nameKeys = ['zh-CN', 'zh-TW', 'en', 'pt'];
  for (const langKey of nameKeys) {
    const localizedName = (translations[langKey]?.[poi.nameKey] || '').toLowerCase();
    if (localizedName) {
      if (localizedName === q) {
        score = Math.max(score, 95);
        matched = true;
      } else if (localizedName.startsWith(q)) {
        score = Math.max(score, 90);
        matched = true;
      } else if (localizedName.includes(q)) {
        score = Math.max(score, 75);
        matched = true;
      }
    }
  }

  // 3. Check aliases dictionary
  const aliases = POI_SEARCH_ALIASES[poi.id] || [];
  for (const alias of aliases) {
    const al = alias.toLowerCase();
    if (al === q) {
      score = Math.max(score, 90);
      matched = true;
    } else if (al.startsWith(q)) {
      score = Math.max(score, 85);
      matched = true;
    } else if (al.includes(q) || q.includes(al)) {
      score = Math.max(score, 70);
      matched = true;
    }
  }

  // 4. Check address & tags
  if (poi.address && poi.address.toLowerCase().includes(q)) {
    score = Math.max(score, 65);
    matched = true;
  }
  if (poi.tag && poi.tag.toLowerCase().includes(q)) {
    score = Math.max(score, 60);
    matched = true;
  }

  // 5. Check categories & generic aliases
  const categoryTerms: Record<string, string[]> = {
    heritage: ['景点', '景點', '古迹', '古蹟', '遗产', '遺產', '文化', '打卡', 'heritage', 'landmark'],
    landmark: ['地标', '地標', '景点', '景點', '观光', '觀光', 'landmark'],
    food: ['美食', '餐厅', '餐廳', '小吃', '吃饭', '吃飯', '葡国菜', '葡國菜', '烧腊', '餐馆', 'food', 'restaurant'],
    cafe: ['咖啡', '咖啡馆', '咖啡館', '咖啡店', '下午茶', '甜品', '蛋挞', '葡挞', 'cafe', 'coffee'],
    hotel: ['酒店', '住宿', '住处', '名宿', '度假村', '奢华酒店', 'hotel', 'resort'],
    resort: ['度假村', '渡假村', '酒店', '综合体', '娱乐城', 'resort', 'hotel'],
    shopping: ['购物', '購物', '商场', '商場', '买', '買', '免税', '免稅', '百货', '百貨', 'shopping', 'mall'],
    port: ['口岸', '关口', '關口', '码头', '碼頭', '机场', '機場', '通关', '交通', 'port', 'border', 'airport'],
    nature: ['自然', '海滩', '海灘', '公园', '公園', '户外', 'nature', 'beach', 'park']
  };

  const terms = categoryTerms[poi.category] || [];
  for (const term of terms) {
    if (q.includes(term.toLowerCase()) || term.toLowerCase().includes(q)) {
      score = Math.max(score, 50);
      matched = true;
    }
  }

  return { matched, score };
}
