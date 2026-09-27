export interface MacauPOI {
  id: string;
  nameKey: string;
  regionKey: 'macau_peninsula' | 'cotai' | 'taipa' | 'coloane';
  lat: number;
  lng: number;
  category: 'heritage' | 'resort' | 'landmark' | 'food' | 'nature' | 'port' | 'hotel' | 'cafe' | 'shopping' | 'campus';
  isStartFriendly?: boolean;
  rating?: number;
  reviewCount?: number;
  address?: string;
  tag?: string;
}

export const MACAU_POIS: MacauPOI[] = [
  // 1. World Heritage & Cultural Landmarks (Macau Peninsula)
  { id: 'ruins', nameKey: 'ruins', regionKey: 'macau_peninsula', lat: 22.1976, lng: 113.5408, category: 'heritage', rating: 4.8, reviewCount: 4280, address: '澳门耶稣会纪念广场', tag: '世界文化遗产' },
  { id: 'monte_forte', nameKey: 'monte_forte', regionKey: 'macau_peninsula', lat: 22.1973, lng: 113.5422, category: 'heritage', rating: 4.6, reviewCount: 1530, address: '澳门大炮台顶', tag: '俯瞰全澳' },
  { id: 'senado_square', nameKey: 'senado_square', regionKey: 'macau_peninsula', lat: 22.1935, lng: 113.5398, category: 'heritage', rating: 4.7, reviewCount: 3820, address: '澳门新马路', tag: '葡式碎石街道' },
  { id: 'st_dominic', nameKey: 'st_dominic', regionKey: 'macau_peninsula', lat: 22.1948, lng: 113.5407, category: 'heritage', rating: 4.6, reviewCount: 1200, address: '板樟堂街前地', tag: '巴洛克教堂' },
  { id: 'a_ma_temple', nameKey: 'a_ma_temple', regionKey: 'macau_peninsula', lat: 22.1862, lng: 113.5312, category: 'heritage', rating: 4.6, reviewCount: 2190, address: '澳门妈阁庙前地', tag: '千年古刹' },
  { id: 'guia_fortress', nameKey: 'guia_fortress', regionKey: 'macau_peninsula', lat: 22.1966, lng: 113.5501, category: 'heritage', rating: 4.7, reviewCount: 940, address: '东望洋山顶', tag: '远东最古老灯塔' },
  { id: 'mandarin_house', nameKey: 'mandarin_house', regionKey: 'macau_peninsula', lat: 22.1888, lng: 113.5348, category: 'heritage', rating: 4.5, reviewCount: 680, address: '龙头左巷10号', tag: '岭南近代大宅' },
  { id: 'lou_kau_mansion', nameKey: 'lou_kau_mansion', regionKey: 'macau_peninsula', lat: 22.1942, lng: 113.5414, category: 'heritage', rating: 4.4, reviewCount: 520, address: '大堂巷7号', tag: '中西合璧建筑' },
  { id: 'macau_tower', nameKey: 'macau_tower', regionKey: 'macau_peninsula', lat: 22.1798, lng: 113.5367, category: 'landmark', rating: 4.7, reviewCount: 3100, address: '观光塔前地', tag: '338米极速蹦极' },
  { id: 'science_center', nameKey: 'science_center', regionKey: 'macau_peninsula', lat: 22.1868, lng: 113.5564, category: 'landmark', rating: 4.6, reviewCount: 1450, address: '孙逸仙大马路', tag: '贝聿铭设计亲子科普' },
  { id: 'fishermans_wharf', nameKey: 'fishermans_wharf', regionKey: 'macau_peninsula', lat: 22.1932, lng: 113.5574, category: 'landmark', rating: 4.3, reviewCount: 1860, address: '友谊大马路', tag: '古罗马竞技场打卡' },
  { id: 'kun_iam', nameKey: 'kun_iam', regionKey: 'macau_peninsula', lat: 22.1856, lng: 113.5529, category: 'landmark', rating: 4.4, reviewCount: 420, address: '孙逸仙大马路', tag: '海面莲花观音像' },

  // 2. Peninsula & Cotai Premier Luxury Hotels
  { id: 'hotel_lisboa', nameKey: 'hotel_lisboa', regionKey: 'macau_peninsula', lat: 22.1899, lng: 113.5437, category: 'hotel', isStartFriendly: true, rating: 4.6, reviewCount: 2200, address: '葡京路2-4号', tag: '经典地标酒店' },
  { id: 'grand_lisboa', nameKey: 'grand_lisboa', regionKey: 'macau_peninsula', lat: 22.1906, lng: 113.5432, category: 'hotel', isStartFriendly: true, rating: 4.7, reviewCount: 3100, address: '葡京路', tag: '米其林三星天巢' },
  { id: 'wynn_macau', nameKey: 'wynn_macau', regionKey: 'macau_peninsula', lat: 22.1884, lng: 113.5482, category: 'hotel', isStartFriendly: true, rating: 4.8, reviewCount: 2800, address: '仙德丽街', tag: '音乐喷泉·发财树' },
  { id: 'mgm_macau', nameKey: 'mgm_macau', regionKey: 'macau_peninsula', lat: 22.1852, lng: 113.5492, category: 'hotel', isStartFriendly: true, rating: 4.7, reviewCount: 1950, address: '孙逸仙大马路', tag: '天幕广场水族馆' },
  { id: 'morpheus_hotel', nameKey: 'morpheus_hotel', regionKey: 'cotai', lat: 22.1492, lng: 113.5662, category: 'hotel', isStartFriendly: true, rating: 4.9, reviewCount: 3200, address: '路氹连贯公路 新濠天地', tag: '扎哈·哈迪德曲线杰作' },
  { id: 'banyan_tree', nameKey: 'banyan_tree', regionKey: 'cotai', lat: 22.1505, lng: 113.5535, category: 'hotel', isStartFriendly: true, rating: 4.9, reviewCount: 1800, address: '望德圣母湾大马路 澳门银河', tag: '独栋全泳池悦榕套房' },
  { id: 'st_regis', nameKey: 'st_regis', regionKey: 'cotai', lat: 22.1462, lng: 113.5645, category: 'hotel', isStartFriendly: true, rating: 4.8, reviewCount: 2100, address: '路氹连贯公路 澳门伦敦人', tag: '经典百年瑞吉管家服务' },
  { id: 'sofitel_macau', nameKey: 'sofitel_macau', regionKey: 'macau_peninsula', lat: 22.1965, lng: 113.5358, category: 'hotel', isStartFriendly: true, rating: 4.6, reviewCount: 1560, address: '巴素打尔古街 十六浦', tag: '内港历史城区景观' },

  // 3. Taipa Culture & Gastronomy
  { id: 'cunha', nameKey: 'cunha', regionKey: 'taipa', lat: 22.1534, lng: 113.5566, category: 'food', rating: 4.8, reviewCount: 5200, address: '氹仔官也街', tag: '澳门首屈一指手信街' },
  { id: 'taipa_houses', nameKey: 'taipa_houses', regionKey: 'taipa', lat: 22.1539, lng: 113.5599, category: 'heritage', rating: 4.7, reviewCount: 1670, address: '海边马路', tag: '薄荷绿葡式别墅' },

  // 4. Cotai Integrated Mega Resorts
  { id: 'venetian', nameKey: 'venetian', regionKey: 'cotai', lat: 22.1471, lng: 113.5601, category: 'resort', isStartFriendly: true, rating: 4.9, reviewCount: 9800, address: '路氹连贯公路', tag: '室内大运河贡多拉' },
  { id: 'parisian', nameKey: 'parisian', regionKey: 'cotai', lat: 22.1438, lng: 113.5592, category: 'resort', isStartFriendly: true, rating: 4.8, reviewCount: 5600, address: '路氹连贯公路', tag: '1/2比例巴黎铁塔' },
  { id: 'londoner', nameKey: 'londoner', regionKey: 'cotai', lat: 22.1458, lng: 113.5652, category: 'resort', isStartFriendly: true, rating: 4.8, reviewCount: 4900, address: '路氹连贯公路', tag: '大本钟·英伦皇家' },
  { id: 'wynn_palace', nameKey: 'wynn_palace', regionKey: 'cotai', lat: 22.1475, lng: 113.5714, category: 'resort', isStartFriendly: true, rating: 4.9, reviewCount: 6100, address: '体育馆大马路', tag: '免费观光缆车' },
  { id: 'city_of_dreams', nameKey: 'city_of_dreams', regionKey: 'cotai', lat: 22.1488, lng: 113.5658, category: 'resort', isStartFriendly: true, rating: 4.7, reviewCount: 3400, address: '路氹连贯公路', tag: '摩珀斯建筑艺术' },
  { id: 'studio_city', nameKey: 'studio_city', regionKey: 'cotai', lat: 22.1402, lng: 113.5605, category: 'resort', isStartFriendly: true, rating: 4.7, reviewCount: 3800, address: '路氹连贯公路', tag: '8字形影汇之星' },
  { id: 'galaxy_macau', nameKey: 'galaxy_macau', regionKey: 'cotai', lat: 22.1502, lng: 113.5542, category: 'resort', isStartFriendly: true, rating: 4.9, reviewCount: 7500, address: '望德圣母湾大马路', tag: '天浪淘园·钻石大堂' },
  { id: 'mgm_cotai', nameKey: 'mgm_cotai', regionKey: 'cotai', lat: 22.1447, lng: 113.5689, category: 'resort', isStartFriendly: true, rating: 4.7, reviewCount: 2600, address: '体育馆大马路', tag: '珠宝盒建筑设计' },

  // 5. Coloane Island Nature & Leisure
  { id: 'hac_sa', nameKey: 'hac_sa', regionKey: 'coloane', lat: 22.1176, lng: 113.5701, category: 'nature', rating: 4.5, reviewCount: 1100, address: '黑沙海滩', tag: '澳门最大天然黑沙海滩' },
  { id: 'coloane_village', nameKey: 'coloane_village', regionKey: 'coloane', lat: 22.1192, lng: 113.5516, category: 'heritage', rating: 4.6, reviewCount: 1400, address: '路环市区', tag: '安德鲁葡挞发源地' },
  { id: 'panda_pavilion', nameKey: 'panda_pavilion', regionKey: 'coloane', lat: 22.1287, lng: 113.5583, category: 'nature', rating: 4.7, reviewCount: 890, address: '石排湾郊野公园', tag: '国宝大熊猫亲密接触' },

  // 6. Cafes & Bakeries
  { id: 'lofficiel_coffee', nameKey: 'lofficiel_coffee', regionKey: 'macau_peninsula', lat: 22.1950, lng: 113.5430, category: 'cafe', rating: 4.7, reviewCount: 145, address: '水坑尾百老汇中心旁', tag: '精致手冲特调咖啡' },
  { id: 'blooom_coffee', nameKey: 'blooom_coffee', regionKey: 'macau_peninsula', lat: 22.1958, lng: 113.5460, category: 'cafe', rating: 4.8, reviewCount: 310, address: '雀仔园柯高街5号', tag: '精品咖啡烘焙工坊' },
  { id: 'margarets_cafe', nameKey: 'margarets_cafe', regionKey: 'macau_peninsula', lat: 22.1915, lng: 113.5420, category: 'cafe', rating: 4.5, reviewCount: 2400, address: '马统领围17B地下', tag: '玛嘉烈正宗葡挞咖啡' },
  { id: 'sei_kee_cafe', nameKey: 'sei_kee_cafe', regionKey: 'taipa', lat: 22.1532, lng: 113.5570, category: 'cafe', rating: 4.8, reviewCount: 3800, address: '氹仔地堡街1号', tag: '古法炭烧瓦煲咖啡·猪扒包' },
  { id: 'single_origin', nameKey: 'single_origin', regionKey: 'macau_peninsula', lat: 22.1982, lng: 113.5475, category: 'cafe', rating: 4.8, reviewCount: 420, address: '荷兰园二马路19号', tag: '澳门首批冠军单品手冲' },
  { id: 'quarter_square', nameKey: 'quarter_square', regionKey: 'taipa', lat: 22.1542, lng: 113.5582, category: 'cafe', rating: 4.7, reviewCount: 290, address: '氹仔米也马嘉礼前地8号', tag: '法式天台景观设计咖啡' },
  { id: 'lord_stow_cafe', nameKey: 'lord_stow_cafe', regionKey: 'coloane', lat: 22.1190, lng: 113.5518, category: 'cafe', rating: 4.9, reviewCount: 6200, address: '路环市区屠场前地21号', tag: '安德鲁花园咖啡总店' },
  { id: 'commune_cafe', nameKey: 'commune_cafe', regionKey: 'macau_peninsula', lat: 22.1938, lng: 113.5452, category: 'cafe', rating: 4.6, reviewCount: 180, address: '柯高街雀仔园12号', tag: '文青手作轻食咖啡' },

  // 7. Restaurants & Local Flavors (Food)
  { id: 'miaohua_chicken', nameKey: 'miaohua_chicken', regionKey: 'macau_peninsula', lat: 22.1940, lng: 113.5448, category: 'food', rating: 4.6, reviewCount: 230, address: '雀仔园柯高街24号地下', tag: '经典香脆鸡翅便当' },
  { id: 'wong_chi_kei', nameKey: 'wong_chi_kei', regionKey: 'macau_peninsula', lat: 22.1936, lng: 113.5401, category: 'food', rating: 4.4, reviewCount: 1980, address: '议事亭前地17号', tag: '百年竹升打面鲜虾云吞' },
  { id: 'lorcha', nameKey: 'lorcha', regionKey: 'macau_peninsula', lat: 22.1865, lng: 113.5318, category: 'food', rating: 4.7, reviewCount: 890, address: '河边新街289号', tag: '地道米其林必比登葡国菜' },
  { id: 'albergue_1601', nameKey: 'albergue_1601', regionKey: 'macau_peninsula', lat: 22.1969, lng: 113.5468, category: 'food', rating: 4.7, reviewCount: 650, address: '疯堂斜巷8号 婆仔屋', tag: '望德堂百年古宅葡式料理' },
  { id: 'chan_kwong_kei', nameKey: 'chan_kwong_kei', regionKey: 'macau_peninsula', lat: 22.1920, lng: 113.5418, category: 'food', rating: 4.5, reviewCount: 2100, address: '罗保博士街19号', tag: '祖传秘制黑椒烧鸭' },

  // 8. Shopping Malls & Duty-Free
  { id: 'new_yaohan', nameKey: 'new_yaohan', regionKey: 'macau_peninsula', lat: 22.1910, lng: 113.5410, category: 'shopping', rating: 4.5, reviewCount: 1780, address: '苏亚利斯博士大马路90号', tag: '澳门核心高端百货' },
  { id: 'shopper_venetian', nameKey: 'shopper_venetian', regionKey: 'cotai', lat: 22.1473, lng: 113.5605, category: 'shopping', rating: 4.8, reviewCount: 4200, address: '威尼斯人三楼', tag: '350+国际免税大牌' },
  { id: 'shopper_parisian', nameKey: 'shopper_parisian', regionKey: 'cotai', lat: 22.1435, lng: 113.5590, category: 'shopping', rating: 4.7, reviewCount: 2300, address: '巴黎人购物中心', tag: '香榭丽舍风情名品大道' },
  { id: 'shopper_londoner', nameKey: 'shopper_londoner', regionKey: 'cotai', lat: 22.1455, lng: 113.5655, category: 'shopping', rating: 4.8, reviewCount: 3100, address: '伦敦人购物中心', tag: '英伦奢品免税商场' },
  { id: 'galaxy_promenade', nameKey: 'galaxy_promenade', regionKey: 'cotai', lat: 22.1500, lng: 113.5540, category: 'shopping', rating: 4.9, reviewCount: 4500, address: '澳门银河 时尚汇', tag: '200+顶级旗舰奢牌' },
  { id: 'yide_center', nameKey: 'yide_center', regionKey: 'macau_peninsula', lat: 22.1918, lng: 113.5450, category: 'shopping', rating: 4.3, reviewCount: 85, address: '新口岸北京街 怡德商业中心', tag: '商业办公中心' },
  { id: 'mpu_dorm', nameKey: 'mpu_dorm', regionKey: 'macau_peninsula', lat: 22.1925, lng: 113.5495, category: 'campus', rating: 4.5, reviewCount: 110, address: '高美士街 澳门理工大学明德楼', tag: '大学宿舍与教学区' },

  // 9. Border Ports & Major Transport Hubs
  { id: 'border_gate', nameKey: 'border_gate', regionKey: 'macau_peninsula', lat: 22.2155, lng: 113.5489, category: 'port', isStartFriendly: true, rating: 4.5, reviewCount: 6500, address: '关闸广场', tag: '拱北通关总口岸' },
  { id: 'qingmao_port', nameKey: 'qingmao_port', regionKey: 'macau_peninsula', lat: 22.2117, lng: 113.5442, category: 'port', isStartFriendly: true, rating: 4.7, reviewCount: 3200, address: '鸭涌马路', tag: '24小时快捷通关口岸' },
  { id: 'hzmb_port', nameKey: 'hzmb_port', regionKey: 'macau_peninsula', lat: 22.2039, lng: 113.5786, category: 'port', isStartFriendly: true, rating: 4.8, reviewCount: 4100, address: '港珠澳大桥人工岛', tag: '连接港珠澳三地口岸' },
  { id: 'outer_harbour', nameKey: 'outer_harbour', regionKey: 'macau_peninsula', lat: 22.1979, lng: 113.5585, category: 'port', isStartFriendly: true, rating: 4.4, reviewCount: 2300, address: '海港前地', tag: '外港客运码头' },
  { id: 'ferry_terminal', nameKey: 'ferry_terminal', regionKey: 'taipa', lat: 22.1625, lng: 113.5750, category: 'port', isStartFriendly: true, rating: 4.6, reviewCount: 2800, address: '氹仔北安客运码头', tag: '金光飞航港澳班次' },
  { id: 'macau_airport', nameKey: 'macau_airport', regionKey: 'taipa', lat: 22.1501, lng: 113.5888, category: 'port', isStartFriendly: true, rating: 4.5, reviewCount: 3400, address: '伟龙马路', tag: '澳门国际机场' },
  { id: 'hengqin_port', nameKey: 'hengqin_port', regionKey: 'cotai', lat: 22.1408, lng: 113.5469, category: 'port', isStartFriendly: true, rating: 4.7, reviewCount: 3900, address: '横琴莲花大桥', tag: '横琴口岸澳门管辖区' }
];

export const POI_BASE_CROWD: Record<string, { baseCrowd: number; capacity: number; peakHour: number }> = {
  ruins: { baseCrowd: 88, capacity: 12000, peakHour: 15 },
  monte_forte: { baseCrowd: 65, capacity: 6000, peakHour: 15 },
  senado_square: { baseCrowd: 82, capacity: 10000, peakHour: 16 },
  st_dominic: { baseCrowd: 74, capacity: 5000, peakHour: 15 },
  a_ma_temple: { baseCrowd: 68, capacity: 7000, peakHour: 11 },
  guia_fortress: { baseCrowd: 45, capacity: 4000, peakHour: 16 },
  mandarin_house: { baseCrowd: 40, capacity: 3000, peakHour: 14 },
  lou_kau_mansion: { baseCrowd: 58, capacity: 2500, peakHour: 14 },
  macau_tower: { baseCrowd: 65, capacity: 8000, peakHour: 17 },
  science_center: { baseCrowd: 42, capacity: 6000, peakHour: 14 },
  fishermans_wharf: { baseCrowd: 55, capacity: 7000, peakHour: 17 },
  kun_iam: { baseCrowd: 35, capacity: 3500, peakHour: 16 },
  hotel_lisboa: { baseCrowd: 60, capacity: 7000, peakHour: 18 },
  grand_lisboa: { baseCrowd: 72, capacity: 10000, peakHour: 19 },
  wynn_macau: { baseCrowd: 75, capacity: 9000, peakHour: 20 },
  mgm_macau: { baseCrowd: 66, capacity: 8000, peakHour: 19 },
  morpheus_hotel: { baseCrowd: 65, capacity: 4000, peakHour: 18 },
  banyan_tree: { baseCrowd: 45, capacity: 2000, peakHour: 17 },
  st_regis: { baseCrowd: 55, capacity: 3000, peakHour: 19 },
  sofitel_macau: { baseCrowd: 52, capacity: 3500, peakHour: 18 },
  cunha: { baseCrowd: 86, capacity: 9000, peakHour: 15 },
  taipa_houses: { baseCrowd: 52, capacity: 5000, peakHour: 16 },
  venetian: { baseCrowd: 84, capacity: 20000, peakHour: 16 },
  parisian: { baseCrowd: 76, capacity: 15000, peakHour: 18 },
  londoner: { baseCrowd: 80, capacity: 16000, peakHour: 19 },
  wynn_palace: { baseCrowd: 78, capacity: 14000, peakHour: 20 },
  city_of_dreams: { baseCrowd: 70, capacity: 13000, peakHour: 17 },
  studio_city: { baseCrowd: 68, capacity: 12000, peakHour: 16 },
  galaxy_macau: { baseCrowd: 82, capacity: 18000, peakHour: 17 },
  mgm_cotai: { baseCrowd: 70, capacity: 11000, peakHour: 18 },
  hac_sa: { baseCrowd: 35, capacity: 5000, peakHour: 15 },
  coloane_village: { baseCrowd: 58, capacity: 4500, peakHour: 14 },
  panda_pavilion: { baseCrowd: 38, capacity: 4000, peakHour: 11 },
  lofficiel_coffee: { baseCrowd: 48, capacity: 400, peakHour: 14 },
  blooom_coffee: { baseCrowd: 52, capacity: 500, peakHour: 15 },
  margarets_cafe: { baseCrowd: 78, capacity: 1200, peakHour: 15 },
  sei_kee_cafe: { baseCrowd: 82, capacity: 1000, peakHour: 14 },
  single_origin: { baseCrowd: 46, capacity: 300, peakHour: 15 },
  quarter_square: { baseCrowd: 40, capacity: 350, peakHour: 16 },
  lord_stow_cafe: { baseCrowd: 76, capacity: 1500, peakHour: 15 },
  commune_cafe: { baseCrowd: 38, capacity: 250, peakHour: 14 },
  miaohua_chicken: { baseCrowd: 62, capacity: 800, peakHour: 12 },
  wong_chi_kei: { baseCrowd: 75, capacity: 1500, peakHour: 13 },
  lorcha: { baseCrowd: 60, capacity: 1000, peakHour: 19 },
  albergue_1601: { baseCrowd: 55, capacity: 600, peakHour: 19 },
  chan_kwong_kei: { baseCrowd: 78, capacity: 1200, peakHour: 13 },
  new_yaohan: { baseCrowd: 68, capacity: 8000, peakHour: 16 },
  shopper_venetian: { baseCrowd: 82, capacity: 15000, peakHour: 16 },
  shopper_parisian: { baseCrowd: 65, capacity: 8000, peakHour: 16 },
  shopper_londoner: { baseCrowd: 70, capacity: 9000, peakHour: 17 },
  galaxy_promenade: { baseCrowd: 75, capacity: 12000, peakHour: 17 },
  mpu_dorm: { baseCrowd: 30, capacity: 2000, peakHour: 21 },
  yide_center: { baseCrowd: 35, capacity: 3000, peakHour: 10 },
  border_gate: { baseCrowd: 90, capacity: 25000, peakHour: 18 },
  qingmao_port: { baseCrowd: 72, capacity: 15000, peakHour: 19 },
  hzmb_port: { baseCrowd: 65, capacity: 18000, peakHour: 10 },
  outer_harbour: { baseCrowd: 52, capacity: 8000, peakHour: 14 },
  ferry_terminal: { baseCrowd: 55, capacity: 10000, peakHour: 15 },
  macau_airport: { baseCrowd: 58, capacity: 12000, peakHour: 13 },
  hengqin_port: { baseCrowd: 68, capacity: 16000, peakHour: 18 }
};
