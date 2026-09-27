import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  History, 
  Activity, 
  Map as MapIcon, 
  Navigation, 
  Clock, 
  RotateCcw, 
  Compass, 
  Plus, 
  X, 
  Circle, 
  Settings, 
  Cpu, 
  Loader2,
  Search,
  CloudRain,
  Sun,
  CloudDrizzle,
  Calendar,
  SlidersHorizontal,
  MapPin,
  Sparkles,
  ChevronRight,
  Check,
  Trash2,
  Globe,
  Type,
  ChevronDown
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { CrowdContent } from './components/CrowdContent';
import { PlanContent } from './components/PlanContent';
import { SettingsContent } from './components/SettingsContent';
import { MobileCategoryDrawer } from './components/MobileCategoryDrawer';
import { MobileSearchModal } from './components/MobileSearchModal';
import { MobilePoiDetailCard } from './components/MobilePoiDetailCard';
import { MobileRouteView } from './components/MobileRouteView';
import { RouteHistoryModal, RouteHistoryItem } from './components/RouteHistoryModal';
import { MACAU_POIS, POI_BASE_CROWD } from './constants';
import { matchPoi } from './utils/searchHelper';
import { useRoutePreview } from './hooks/useRoutePreview';
import { routeTranslations } from './routeTranslations';
import {
  classifyCongestion,
  CongestionLevel,
  getCongestionVisual,
  getSpotThreshold,
  getThresholdSummary,
  USER_FACING_THRESHOLD_SOURCE,
  USER_FACING_THRESHOLD_SOURCE_PERIOD
} from '../congestionThresholds';

// Valid LatLng Sanitizer Utility
export const getValidLatLng = (lat: any, lng: any): [number, number] => {
  const nLat = Number(lat);
  const nLng = Number(lng);
  return [
    Number.isFinite(nLat) && !isNaN(nLat) && nLat !== 0 ? nLat : 22.1899,
    Number.isFinite(nLng) && !isNaN(nLng) && nLng !== 0 ? nLng : 113.5437
  ];
};

// Live Beijing / Macau (UTC+8) Time Utility
export const getLiveBeijingTime = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const beijingDate = new Date(utc + (3600000 * 8));
  const hh = String(beijingDate.getHours()).padStart(2, '0');
  const mm = String(beijingDate.getMinutes()).padStart(2, '0');
  return {
    timeStr: `${hh}:${mm}`,
    hour: beijingDate.getHours(),
    minute: beijingDate.getMinutes()
  };
};

export const formatCurrentDate24h = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const beijingDate = new Date(utc + (3600000 * 8));
  const y = beijingDate.getFullYear();
  const m = String(beijingDate.getMonth() + 1).padStart(2, '0');
  const d = String(beijingDate.getDate()).padStart(2, '0');
  const hh = String(beijingDate.getHours()).padStart(2, '0');
  const mm = String(beijingDate.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${d} ${hh}:${mm}`;
};

const ROUTE_DRAFT_STORAGE_KEY = 'macau_route_draft_v1';
const DEFAULT_START_WAYPOINT = {
  id: 'start',
  type: 'start',
  poiId: 'hotel_lisboa',
  nameKey: 'hotel_lisboa',
  lat: 22.1899,
  lng: 113.5437,
  bg: '#3b82f6'
};

const DEFAULT_ROUTE_HISTORY: RouteHistoryItem[] = [
  {
    id: 'hist_1',
    title: '澳门半岛经典历史文化避峰游',
    createdAt: '2026/09/22 14:30',
    timestamp: 1789998600000,
    spotCount: 3,
    destinationsCount: 3,
    totalStopsCount: 4,
    transportMode: 'transit',
    waypoints: [
      { id: 'start', type: 'start', poiId: 'hotel_lisboa', nameKey: 'hotel_lisboa', lat: 22.1899, lng: 113.5437, bg: '#3b82f6', name: '葡京酒店' },
      { id: 'dest_1', type: 'dest', poiId: 'ruins', nameKey: 'ruins', lat: 22.1976, lng: 113.5408, bg: '#facc15', name: '大三巴牌坊' },
      { id: 'dest_2', type: 'dest', poiId: 'a_ma_temple', nameKey: 'a_ma_temple', lat: 22.1863, lng: 113.5312, bg: '#10b981', name: '妈阁庙' },
      { id: 'dest_3', type: 'dest', poiId: 'science_center', nameKey: 'science_center', lat: 22.1868, lng: 113.5564, bg: '#dc2626', name: '澳门科学馆' }
    ],
    waypointDurations: {
      'start': 45,
      'dest_1': 60,
      'dest_2': 45,
      'dest_3': 90
    }
  },
  {
    id: 'hist_2',
    title: '路氹金光大道奢华度假休闲游',
    createdAt: '2026/09/21 10:15',
    timestamp: 1789896900000,
    spotCount: 2,
    destinationsCount: 2,
    totalStopsCount: 3,
    transportMode: 'walk',
    waypoints: [
      { id: 'start', type: 'start', poiId: 'venetian', nameKey: 'venetian', lat: 22.1471, lng: 113.5601, bg: '#3b82f6', name: '澳门威尼斯人' },
      { id: 'dest_1', type: 'dest', poiId: 'parisian_macao', nameKey: 'parisian_macao', lat: 22.1432, lng: 113.5614, bg: '#facc15', name: '澳门巴黎人 (巴黎铁塔)' },
      { id: 'dest_2', type: 'dest', poiId: 'rua_do_cunha', nameKey: 'rua_do_cunha', lat: 22.1539, lng: 113.5561, bg: '#10b981', name: '官也街' }
    ],
    waypointDurations: {
      'start': 60,
      'dest_1': 60,
      'dest_2': 90
    }
  },
  {
    id: 'hist_3',
    title: '氹仔与路环葡式风情深度漫游',
    createdAt: '2026/09/20 16:45',
    timestamp: 1789833900000,
    spotCount: 4,
    destinationsCount: 4,
    totalStopsCount: 5,
    transportMode: 'transit',
    waypoints: [
      { id: 'start', type: 'start', poiId: 'hengqin_port', nameKey: 'hengqin_port', lat: 22.1418, lng: 113.5469, bg: '#3b82f6', name: '横琴口岸澳门门区' },
      { id: 'dest_1', type: 'dest', poiId: 'rua_do_cunha', nameKey: 'rua_do_cunha', lat: 22.1539, lng: 113.5561, bg: '#facc15', name: '官也街' },
      { id: 'dest_2', type: 'dest', poiId: 'taipa_houses', nameKey: 'taipa_houses', lat: 22.1542, lng: 113.5582, bg: '#10b981', name: '龙环葡韵住宅式博物馆' },
      { id: 'dest_3', type: 'dest', poiId: 'coloane_village', nameKey: 'coloane_village', lat: 22.1189, lng: 113.5524, bg: '#f59e0b', name: '路环市区 (安德鲁饼店)' },
      { id: 'dest_4', type: 'dest', poiId: 'a_ma_temple', nameKey: 'a_ma_temple', lat: 22.1863, lng: 113.5312, bg: '#dc2626', name: '妈阁庙' }
    ],
    waypointDurations: {
      'start': 30,
      'dest_1': 75,
      'dest_2': 60,
      'dest_3': 90,
      'dest_4': 45
    }
  }
];

const LANG_OPTIONS = [
  { code: 'zh-CN' as const, label: '简中', fullLabel: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW' as const, label: '繁中', fullLabel: '繁體中文', flag: '🇭🇰' },
  { code: 'en' as const, label: 'EN', fullLabel: 'English', flag: '🇺🇸' },
  { code: 'pt' as const, label: 'PT', fullLabel: 'Português', flag: '🇵🇹' }
];

const FONT_OPTIONS = [
  { id: 'standard' as const, label: '标准', desc: '标准字号 (100%)' },
  { id: 'large' as const, label: '大号', desc: '放大显示 (115%)' },
  { id: 'xlarge' as const, label: '特大', desc: '超大显示 (130%)' }
];

const translations = {
  en: {
    ...routeTranslations["en"],
    ruins: "Ruins of St. Paul's",
    monte_forte: "Monte Forte (Mount Fortress)",
    senado_square: "Senado Square",
    st_dominic: "St. Dominic's Church",
    a_ma_temple: "A-Ma Temple",
    guia_fortress: "Guia Fortress & Lighthouse",
    mandarin_house: "Mandarin's House",
    lou_kau_mansion: "Lou Kau Mansion",
    macau_tower: "Macau Tower",
    science_center: "Macao Science Center",
    fishermans_wharf: "Macau Fisherman's Wharf",
    kun_iam: "Kun Iam Ecumenical Centre",
    hotel_lisboa: "Hotel Lisboa",
    grand_lisboa: "Grand Lisboa",
    wynn_macau: "Wynn Macau",
    mgm_macau: "MGM Macau",
    cunha: "Rua do Cunha (Taipa Food St.)",
    taipa_houses: "Taipa Houses-Museum",
    venetian: "The Venetian Macao",
    parisian: "The Parisian Macao",
    londoner: "The Londoner Macao",
    wynn_palace: "Wynn Palace",
    city_of_dreams: "City of Dreams",
    studio_city: "Studio City",
    galaxy_macau: "Galaxy Macau",
    mgm_cotai: "MGM Cotai",
    hac_sa: "Hac Sa Beach",
    coloane_village: "Coloane Village",
    panda_pavilion: "Macao Giant Panda Pavilion",
    morpheus_hotel: "Morpheus Hotel (City of Dreams)",
    banyan_tree: "Banyan Tree Macau (Galaxy)",
    st_regis: "The St. Regis Macao (Londoner)",
    sofitel_macau: "Sofitel Macau At Ponte 16",
    lofficiel_coffee: "lofficiel coffee",
    blooom_coffee: "Blooom Coffee House",
    margarets_cafe: "Margaret's Café e Nata",
    sei_kee_cafe: "Sei Kee Cafe (Taipa)",
    single_origin: "Single Origin Coffee Roasters",
    quarter_square: "Quarter Square Lifestyle & Cafe",
    lord_stow_cafe: "Lord Stow's Garden Cafe (Coloane)",
    commune_cafe: "Commune Cafe & Kitchen",
    miaohua_chicken: "Miao Hua Chicken (Rua da Tomba)",
    wong_chi_kei: "Wong Chi Kei Noodle",
    lorcha: "A Lorcha Portuguese Restaurant",
    albergue_1601: "Albergue 1601 Portuguese Cuisine",
    chan_kwong_kei: "Chan Kwong Kei Roast Duck",
    new_yaohan: "New Yaohan Department Store",
    shopper_venetian: "Shoppes at Venetian",
    shopper_parisian: "Shoppes at Parisian",
    shopper_londoner: "Shoppes at Londoner",
    galaxy_promenade: "The Promenade Shops (Galaxy)",
    mpu_dorm: "Macao Polytechnic Univ. Dorm",
    yide_center: "Yide Commercial Center",
    border_gate: "Border Gate Port (Gongbei)",
    qingmao_port: "Qingmao Port",
    hzmb_port: "HZMB Port (Macau)",
    outer_harbour: "Outer Harbour Ferry Terminal",
    ferry_terminal: "Taipa Ferry Terminal",
    macau_airport: "Macau International Airport",
    hengqin_port: "Hengqin Port (Macau Zone)",
    macau_peninsula: "Macau Peninsula",
    cotai: "Cotai",
    taipa: "Taipa",
    coloane: "Coloane",
    comfortable: "Comfortable",
    moderate: "Moderate",
    busy: "Busy",
    crowded: "Crowded",
    data_unavailable: "Data unavailable",
    predicted_crowd: "Estimated crowd",
    prediction_loading: "Predicting…",
    user_name: "Visitor_8921",
    standard_user: "Standard User",
    history: "History",
    crowd_status: "Crowd Status",
    start_planning: "Start Planning",
    attraction_crowd: "Attraction Crowd",
    plan_route: "Plan Your Route",
    choose_start: "Choose starting point",
    choose_dest: "Choose destination",
    add_dest: "Add destination",
    start_smart_planning: "Start Smart Planning",
    ai_optimized: "AI Optimized Route",
    peak_avoided: "Peak crowds avoided! Reordered to save ~45 mins.",
    edit: "Edit Route",
    start_nav: "Start Navigation",
    language: "Language",
    text_size: "Text Size",
    standard: "Standard",
    large: "Large",
    xlarge: "Extra Large",
    visit_duration: "Visit Duration",
    optimizing: "Calculating optimal route with Mapbox...",
    beijing_time: "Beijing Time (UTC+8)",
    departure_time: "Departure Time",
    sync_live: "Sync Live",
    start_point: "Starting Point",
    destination_point: "Destination",
    change_location: "Change Location",
    delete_dest: "Remove",
    live_badge: "Live",
    custom_input_placeholder: "Search here",
    custom_mode: "Custom",
    list_mode: "Catalog",
    manual_custom: "✏️ Search here",
    matched_spot: "Matched Spot",
    stop_prefix: "Stop ",
    stop_suffix: "",
    departure_suffix: "Depart",
    arrival_suffix: "Arrive",
    leave_suffix: "Leave",
    reordered_tag: "AI Reordered",
    orig_dest_tag: "Original Dest",
    travel_time_prefix: "Travel approx",
    optimal_kept: "Current sequence is already optimal!",
    reordered_saved: "AI reordered the sequence to bypass congestion, saving ~45 mins!",
    visitors_unit: "visitors",
    env_mode_title: "Environment & Weather Mode",
    expand: "Expand",
    collapse: "Collapse",
    search_spots_placeholder: "Search here",
    total_spots_monitored: "spots live monitored",
    all_spots: "All",
    port_hub: "Ports & Transport",
    locate_on_map: "Location",
    cat_heritage: "Heritage",
    cat_resort: "Resort",
    cat_landmark: "Landmark",
    cat_food: "Food & Street",
    cat_hotel: "Hotel",
    cat_nature: "Nature",
    cat_port: "Port & Hub",
    filter_all: "All",
    sort_crowd_desc: "Highest Crowd First",
    sort_crowd_asc: "Lowest Crowd First",
    sort_by_crowd: "Crowded First",
    sort_by_comfort: "Comfort First",
    crowd_forecast_time: "Forecast period",
    visitors_in_park: " visitors",
    hourly_distribution_label: "24-Hour Crowd Pattern:",
    peak_hour_estimate: "Peak expected around {hour}:00",
    hourly_tooltip: "Expected crowd: {crowd}%",
    region_all: "All",
    region_macau_peninsula: "Macau Peninsula",
    region_cotai: "Cotai Strip",
    region_taipa: "Taipa",
    region_coloane: "Coloane",
    region_port: "Ports & Transport",
    no_spots_found: "No matching spots found",
    clear_search: "Clear Search",
    weather_no_rain: "No Rain",
    weather_light_rain: "Light Rain",
    weather_heavy_rain: "Heavy Rain",
    weather_label: "Weather / Rain",
    holiday_stage_label: "Holiday Phase",
    holiday_stage_none: "Regular Day",
    holiday_stage_pre: "Pre-Holiday",
    holiday_stage_in: "Peak Holiday",
    holiday_stage_post: "Post-Holiday",
    mode_select_label: "Mode",
    mode_auto_govt: "Live Weather",
    mode_manual_scenario: "Custom Scenario",
    simulated_tag: "Custom",
    tab_map: "Explore",
    tab_route: "Route Plan",
    tab_crowd: "Crowd Rank",
    tab_settings: "Settings",
    set_as_start: "Start",
    add_as_dest: "Route",
    close: "Close",
    mobile_back_to_map: "Back to Map",
    spot_details: "Spot Details",
    search_or_custom_input: "Search here",
    quick_weather_env: "Weather & Environment",
    plan_this_custom_spot: "Add as Custom Stop",
    custom_spot_label: "Custom Spot",
    spots_in_route: "stops in route",
    adjust_weather_sim: "Weather & Holiday Simulation",
    jump_to_plan: "Open Route Planner",
    total_prefix: "Total ",
    stations_unit: " stations",
    custom_route_suffix: " Optimized Custom Route",
    macau_route_mgmt: "Macau Route Management",
    mode_car: "Driving",
    mode_walk: "Walking",
    mode_bike: "Cycling",
    mode_transit: "Transit",
    save_to_history: "Save Route to History",
    hist_1: "Macau Peninsula Classic Historical Tour",
    hist_2: "Cotai Strip Luxury Resort Leisure Tour",
    hist_3: "Taipa & Coloane Portuguese Style In-depth Tour",
    cat_pills_attraction: "Attractions",
    cat_pills_food: "Restaurants",
    cat_pills_hotel: "Hotels",
    cat_pills_cafe: "Cafes",
    cat_pills_shopping: "Shopping",
    cat_pills_port: "Ports & Hubs",
    exit_nav: "Exit",
    route_details_btn: "Route Details",
    toggle_all_spots_expanded_title: "All Spots Expanded (Click to collapse)",
    toggle_all_spots_collapsed_title: "Click to view all spots crowd live",
    toggle_all_spots_expanded_short: "All Spots",
    toggle_all_spots_collapsed_short: "View All",
    toast_all_spots_expanded: "🔍 Expanded to show crowd levels of all spots!",
    toast_only_waypoints: "📍 Restored to only show route stops heat levels",
    toast_nav_enabled: "🧭 Navigation active: showing waypoints heatmap by default",
    toast_nav_disabled: "Exited route navigation mode",
    toast_route_cleared: "🗑️ Current planned route cleared. You can add new waypoints now",
    toast_history_loaded: "✓ Loaded history route and recalculated smart peak-shaving route!",
    toast_route_saved: "✓ Planned route successfully saved to history!",
    toast_history_deleted: "Deleted historical route record",
    toast_set_start: "✓ Set as start: {name}",
    toast_add_dest: "✓ Added to route: {name}",
  },
  'zh-CN': {
    ...routeTranslations["zh-CN"],
    ruins: "大三巴牌坊",
    monte_forte: "大炮台 / 澳门博物馆",
    senado_square: "议事亭前地 / 喷水池",
    st_dominic: "玫瑰圣母堂",
    a_ma_temple: "妈阁庙",
    guia_fortress: "东望洋灯塔与炮台",
    mandarin_house: "郑家大屋",
    lou_kau_mansion: "卢家大屋",
    macau_tower: "澳门旅游塔会展中心",
    science_center: "澳门科学馆",
    fishermans_wharf: "澳门渔人码头",
    kun_iam: "观音莲花苑",
    hotel_lisboa: "葡京酒店",
    grand_lisboa: "新葡京酒店",
    wynn_macau: "永利澳门 (音乐喷泉)",
    mgm_macau: "澳门美高梅",
    cunha: "氹仔官也街 (手信美食街)",
    taipa_houses: "龙环葡韵住宅式博物馆",
    venetian: "澳门威尼斯人 (大运河)",
    parisian: "澳门巴黎人 (巴黎铁塔)",
    londoner: "澳门伦敦人 (伊丽莎白塔)",
    wynn_palace: "永利皇宫 (观光缆车)",
    city_of_dreams: "新濠天地",
    studio_city: "新濠影汇 (8字摩天轮)",
    galaxy_macau: "澳门银河度假城",
    mgm_cotai: "美狮美高梅",
    hac_sa: "路环黑沙海滩",
    coloane_village: "路环市区 (圣方济各圣堂/安德鲁总店)",
    panda_pavilion: "澳门大熊猫馆 (石排湾公园)",
    morpheus_hotel: "摩珀斯酒店 (新濠天地)",
    banyan_tree: "澳门悦榕庄 (银河全套房度假酒店)",
    st_regis: "澳门瑞吉酒店 (伦敦人)",
    sofitel_macau: "澳门十六浦索菲特大酒店",
    lofficiel_coffee: "lofficiel coffee (水坑尾精品手冲)",
    blooom_coffee: "Blooom Coffee House (雀仔园咖啡工坊)",
    margarets_cafe: "玛嘉烈蛋挞咖啡店",
    sei_kee_cafe: "世记咖啡 (氹仔店·瓦煲咖啡/猪扒包)",
    single_origin: "Single Origin (荷兰园冠军咖啡)",
    quarter_square: "Quarter Square (氹仔天台景观咖啡)",
    lord_stow_cafe: "安德鲁花园咖啡店 (路环总店)",
    commune_cafe: "Commune Cafe (雀仔园轻食咖啡)",
    miaohua_chicken: "苗花鸡 (雀仔园店)",
    wong_chi_kei: "黄枝记粥面 (议事亭前地总店)",
    lorcha: "船屋葡国餐厅 (妈阁正宗葡国菜)",
    albergue_1601: "婆仔屋1601葡国餐厅 (疯堂百年古宅)",
    chan_kwong_kei: "陈光记烧腊 (招牌黑椒烧鸭)",
    new_yaohan: "新八佰伴百货 (澳门核心商业地标)",
    shopper_venetian: "大运河购物中心 (350+国际品牌)",
    shopper_parisian: "巴黎人购物中心 (香榭丽舍名品街)",
    shopper_londoner: "伦敦人购物中心 (英伦奢品免税商场)",
    galaxy_promenade: "澳门银河 时尚汇 (顶级奢品旗舰)",
    mpu_dorm: "澳门理工大学明德楼宿舍",
    yide_center: "怡德商业中心",
    border_gate: "关闸/拱北口岸",
    qingmao_port: "青茂口岸",
    hzmb_port: "港珠澳大桥澳门口岸",
    outer_harbour: "外港客运码头",
    ferry_terminal: "氹仔客运码头",
    macau_airport: "澳门国际机场",
    hengqin_port: "横琴口岸澳门口岸区",
    macau_peninsula: "澳门半岛",
    cotai: "路氹城",
    taipa: "氹仔",
    coloane: "路环",
    comfortable: "舒适",
    moderate: "适中",
    busy: "繁忙",
    crowded: "拥挤",
    data_unavailable: "数据不可用",
    predicted_crowd: "预计客流",
    prediction_loading: "预测中…",
    user_name: "访客_8921",
    standard_user: "普通用户",
    history: "历史记录",
    crowd_status: "客流状况",
    start_planning: "开始规划",
    attraction_crowd: "景点客流",
    plan_route: "规划您的路线",
    choose_start: "选择起点",
    choose_dest: "选择目的地",
    add_dest: "添加目的地",
    start_smart_planning: "开始智能规划",
    ai_optimized: "AI 优化路线",
    peak_avoided: "已避开客流高峰！重新排序为您节省约 45 分钟。",
    edit: "编辑路线",
    start_nav: "开始导航",
    language: "语言",
    text_size: "字体大小",
    standard: "标准",
    large: "大",
    xlarge: "特大",
    visit_duration: "游览时长",
    optimizing: "正在结合 Mapbox 矩阵路耗计算最优避峰路线...",
    beijing_time: "北京时间 (UTC+8)",
    departure_time: "出发时间",
    sync_live: "设为实时",
    start_point: "行程起点",
    destination_point: "游览目的地",
    change_location: "修改地点",
    delete_dest: "删除",
    live_badge: "实时",
    custom_input_placeholder: "输入自定义地点或搜索(如: 某某餐厅/酒店)...",
    custom_mode: "自定义",
    list_mode: "列表选",
    manual_custom: "✏️ 自定义输入 / 搜索地点...",
    matched_spot: "已匹配地标",
    stop_prefix: "第 ",
    stop_suffix: " 站",
    departure_suffix: "出发",
    arrival_suffix: "到达",
    leave_suffix: "离开",
    reordered_tag: "AI避峰重排",
    orig_dest_tag: "原目的地",
    travel_time_prefix: "路程约",
    optimal_kept: "当前路线已为最佳顺路方案（平峰客流舒适，无需调换顺序）！",
    reordered_saved: "已通过 AI 避峰调整游览顺序！避开高峰拥堵，为您节省约 45 分钟。",
    visitors_unit: "人",
    env_mode_title: "环境与气象模式",
    expand: "展开",
    collapse: "收起",
    search_spots_placeholder: "搜索景点、酒店、口岸...",
    total_spots_monitored: "处地点全域实时监控",
    all_spots: "全部",
    port_hub: "口岸交通",
    locate_on_map: "位置",
    cat_heritage: "世界遗产",
    cat_resort: "综合度假村",
    cat_landmark: "城市地标",
    cat_food: "美食街区",
    cat_hotel: "名宿酒店",
    cat_nature: "滨海自然",
    cat_port: "口岸枢纽",
    filter_all: "全部",
    sort_crowd_desc: "按拥挤度从高到低",
    sort_crowd_asc: "按舒适度从高到低",
    sort_by_crowd: "拥挤优先",
    sort_by_comfort: "舒适优先",
    crowd_forecast_time: "客流预测时段",
    visitors_in_park: " 人在园",
    hourly_distribution_label: "24小时客流分布规律:",
    peak_hour_estimate: "峰值预计在 {hour}:00 前后",
    hourly_tooltip: "预计拥挤度约 {crowd}%",
    region_all: "全部",
    region_macau_peninsula: "澳门半岛",
    region_cotai: "路氹城",
    region_taipa: "氹仔",
    region_coloane: "路环",
    region_port: "口岸交通",
    no_spots_found: "未找到符合条件的地标",
    clear_search: "清空搜索",
    weather_no_rain: "无雨/晴天",
    weather_light_rain: "小雨/阴雨",
    weather_heavy_rain: "大雨/暴雨",
    weather_label: "天气与降雨",
    holiday_stage_label: "节假日阶段",
    holiday_stage_none: "非节假日 (常规工作日)",
    holiday_stage_pre: "节前蓄热期 (假期前1~2天)",
    holiday_stage_in: "节中客流高峰 (黄金周/大节)",
    holiday_stage_post: "节后回落期 (假期后1~2天)",
    mode_select_label: "模式切换",
    mode_auto_govt: "实时气象 (气象局自动同步)",
    mode_manual_scenario: "自定义情景模式",
    simulated_tag: "自定义",
    tab_map: "地图探索",
    tab_route: "避峰路线",
    tab_crowd: "客流看板",
    tab_settings: "系统设置",
    set_as_start: "设起点",
    add_as_dest: "加路线",
    close: "关闭",
    mobile_back_to_map: "返回地图",
    spot_details: "景点详情",
    search_or_custom_input: "在此处搜索景点、地标或自定义地点...",
    quick_weather_env: "气象与环境情景",
    plan_this_custom_spot: "设为自定义经停点",
    custom_spot_label: "自定义地点",
    spots_in_route: "处经停点",
    adjust_weather_sim: "天气与节假日情景设定",
    jump_to_plan: "前往路线规划",
    total_prefix: "共 ",
    stations_unit: " 站",
    custom_route_suffix: "避峰优化定制路线",
    macau_route_mgmt: "澳门路线管理",
    mode_car: "驾车/打车",
    mode_walk: "步行",
    mode_bike: "骑行",
    mode_transit: "公交/大巴",
    save_to_history: "保存当前规划至历史",
    hist_1: "澳门半岛经典历史文化避峰游",
    hist_2: "路氹金光大道奢华度假休闲游",
    hist_3: "氹仔与路环葡式风情深度漫游",
    cat_pills_attraction: "景点",
    cat_pills_food: "餐馆",
    cat_pills_hotel: "酒店",
    cat_pills_cafe: "咖啡馆",
    cat_pills_shopping: "购物",
    cat_pills_port: "口岸交通",
    exit_nav: "退出",
    route_details_btn: "路线详情",
    toggle_all_spots_expanded_title: "全城人流已展开 (点击收起)",
    toggle_all_spots_collapsed_title: "点击查看所有景点人流",
    toggle_all_spots_expanded_short: "全城人流",
    toggle_all_spots_collapsed_short: "查看全城",
    toast_all_spots_expanded: "🔍 已展开显示全部景点人流量",
    toast_only_waypoints: "📍 已恢复仅显示路线经停点热力图",
    toast_nav_enabled: "🧭 路线导航已开启：默认仅显示经停点热力图",
    toast_nav_disabled: "已退出路线导航模式",
    toast_route_cleared: "🗑️ 当前规划路线已清空，可重新添加经停景点",
    toast_history_loaded: "✓ 已载入历史路线并重新完成智能避峰规划！",
    toast_route_saved: "✓ 已将当前规划路线保存至历史记录！",
    toast_history_deleted: "已删除该历史路线记录",
    toast_set_start: "✓ 已设置为起点：{name}",
    toast_add_dest: "✓ 已成功加入路线：{name}",
  },
  'zh-TW': {
    ...routeTranslations["zh-TW"],
    ruins: "大三巴牌坊",
    monte_forte: "大炮台 / 澳門博物館",
    senado_square: "議事亭前地 / 噴水池",
    st_dominic: "玫瑰聖母堂",
    a_ma_temple: "媽閣廟",
    guia_fortress: "東望洋燈塔與炮台",
    mandarin_house: "鄭家大屋",
    lou_kau_mansion: "盧家大屋",
    macau_tower: "澳門旅遊塔會展中心",
    science_center: "澳門科學館",
    fishermans_wharf: "澳門漁人碼頭",
    kun_iam: "觀音蓮花苑",
    hotel_lisboa: "葡京酒店",
    grand_lisboa: "新葡京酒店",
    wynn_macau: "永利澳門 (音樂噴泉)",
    mgm_macau: "澳門美高梅",
    cunha: "氹仔官也街 (手信美食街)",
    taipa_houses: "龍環葡韻住宅式博物館",
    venetian: "澳門威尼斯人 (大運河)",
    parisian: "澳門巴黎人 (巴黎鐵塔)",
    londoner: "澳門倫敦人 (大笨鐘)",
    wynn_palace: "永利皇宮 (觀光纜車)",
    city_of_dreams: "新濠天地",
    studio_city: "新濠影匯 (8字摩天輪)",
    galaxy_macau: "澳門銀河渡假城",
    mgm_cotai: "美獅美高梅",
    hac_sa: "路環黑沙海灘",
    coloane_village: "路環市區 (聖方濟各聖堂/安德魯總店)",
    panda_pavilion: "澳門大熊貓館 (石排灣公園)",
    morpheus_hotel: "摩珀斯酒店 (新濠天地)",
    banyan_tree: "澳門悅榕庄 (銀河全套房渡假酒店)",
    st_regis: "澳門瑞吉酒店 (倫敦人)",
    sofitel_macau: "澳門十六浦索菲特大酒店",
    lofficiel_coffee: "lofficiel coffee (水坑尾精品手沖)",
    blooom_coffee: "Blooom Coffee House (雀仔園咖啡工坊)",
    margarets_cafe: "瑪嘉烈葡撻咖啡店",
    sei_kee_cafe: "世記咖啡 (氹仔店·瓦煲咖啡/豬扒包)",
    single_origin: "Single Origin (荷蘭園冠軍咖啡)",
    quarter_square: "Quarter Square (氹仔天台景觀咖啡)",
    lord_stow_cafe: "安德魯花園咖啡店 (路環總店)",
    commune_cafe: "Commune Cafe (雀仔園輕食咖啡)",
    miaohua_chicken: "苗花雞 (雀仔園店)",
    wong_chi_kei: "黃枝記粥麵 (議事亭前地總店)",
    lorcha: "船屋葡國餐廳 (媽閣正宗葡國菜)",
    albergue_1601: "婆仔屋1601葡國餐廳 (瘋堂百年古宅)",
    chan_kwong_kei: "陳光記燒臘 (招牌黑椒燒鴨)",
    new_yaohan: "新八佰伴百貨 (澳門核心商業地標)",
    shopper_venetian: "大運河購物中心 (350+國際品牌)",
    shopper_parisian: "巴黎人購物中心 (香榭麗舍名品街)",
    shopper_londoner: "倫敦人購物中心 (英倫奢品免稅商場)",
    galaxy_promenade: "澳門銀河 時尚匯 (頂級奢品旗艦)",
    mpu_dorm: "澳門理工大學明德樓宿舍",
    yide_center: "怡德商業中心",
    border_gate: "關閘/拱北口岸",
    qingmao_port: "青茂口岸",
    hzmb_port: "港珠澳大橋澳門口岸",
    outer_harbour: "外港客運碼頭",
    ferry_terminal: "氹仔客運碼頭",
    macau_airport: "澳門國際機場",
    hengqin_port: "橫琴口岸澳門口岸區",
    macau_peninsula: "澳門半島",
    cotai: "路氹城",
    taipa: "氹仔",
    coloane: "路環",
    comfortable: "舒適",
    moderate: "適中",
    busy: "繁忙",
    crowded: "擁擠",
    data_unavailable: "數據不可用",
    predicted_crowd: "預計客流",
    prediction_loading: "預測中…",
    user_name: "訪客_8921",
    standard_user: "普通用戶",
    history: "歷史記錄",
    crowd_status: "客流狀況",
    start_planning: "開始規劃",
    attraction_crowd: "景點客流",
    plan_route: "規劃您的路線",
    choose_start: "選擇起點",
    choose_dest: "選擇目的地",
    add_dest: "添加目的地",
    start_smart_planning: "開始智能規劃",
    ai_optimized: "AI 優化路線",
    peak_avoided: "已避開客流高峰！重新排序為您節省約 45 分鐘。",
    edit: "編輯路線",
    start_nav: "開始導航",
    language: "語言",
    text_size: "字體大小",
    standard: "標準",
    large: "大",
    xlarge: "特大",
    visit_duration: "遊覽時長",
    optimizing: "正在結合 Mapbox 矩陣路耗計算最優避峰路線...",
    beijing_time: "北京時間 (UTC+8)",
    departure_time: "出發時間",
    sync_live: "設為實時",
    start_point: "行程起點",
    destination_point: "遊覽目的地",
    change_location: "修改地點",
    delete_dest: "刪除",
    live_badge: "實時",
    custom_input_placeholder: "在此处搜索",
    custom_mode: "自定義",
    list_mode: "列表選",
    manual_custom: "✏️ 在此处搜索",
    matched_spot: "已匹配地標",
    stop_prefix: "第 ",
    stop_suffix: " 站",
    departure_suffix: "出發",
    arrival_suffix: "到達",
    leave_suffix: "離開",
    reordered_tag: "AI避峰重排",
    orig_dest_tag: "原目的地",
    travel_time_prefix: "路程約",
    optimal_kept: "當前路線已為最佳順路方案（平峰客流舒適，無需調換順序）！",
    reordered_saved: "已通過 AI 避峰調整遊覽順序！避開高峰擁堵，為您節省約 45 分鐘。",
    visitors_unit: "人",
    env_mode_title: "環境與氣象模式",
    expand: "展開",
    collapse: "收起",
    search_spots_placeholder: "在此处搜索",
    total_spots_monitored: "處地點全域實時監控",
    all_spots: "全部",
    port_hub: "口岸交通",
    locate_on_map: "地圖定位",
    cat_heritage: "世界遺產",
    cat_resort: "綜合渡假村",
    cat_landmark: "城市地標",
    cat_food: "美食街區",
    cat_hotel: "名宿酒店",
    cat_nature: "濱海自然",
    cat_port: "口岸樞紐",
    filter_all: "全部",
    sort_crowd_desc: "按擁擠度從高到低",
    sort_crowd_asc: "按舒適度從高到低",
    sort_by_crowd: "擁擠優先",
    sort_by_comfort: "舒適優先",
    crowd_forecast_time: "客流預測時段",
    visitors_in_park: " 人在園",
    hourly_distribution_label: "24小時客流分布規律:",
    peak_hour_estimate: "峰值預計在 {hour}:00 前後",
    hourly_tooltip: "預計擁擠度約 {crowd}%",
    region_all: "全部",
    region_macau_peninsula: "澳門半島",
    region_cotai: "路氹城",
    region_taipa: "氹仔",
    region_coloane: "路環",
    region_port: "口岸交通",
    no_spots_found: "未找到符合條件的地標",
    clear_search: "清空搜尋",
    weather_no_rain: "無雨/晴天",
    weather_light_rain: "小雨/陰雨",
    weather_heavy_rain: "大雨/暴雨",
    weather_label: "天氣與降雨",
    holiday_stage_label: "節假日階段",
    holiday_stage_none: "非節假日 (常規工作日)",
    holiday_stage_pre: "節前蓄熱期 (假期前1~2天)",
    holiday_stage_in: "節中客流高峰 (黃金周/大節)",
    holiday_stage_post: "節後回落期 (假期後1~2天)",
    mode_select_label: "模式切換",
    mode_auto_govt: "實時氣象 (氣象局自動同步)",
    mode_manual_scenario: "自定義情景模式",
    simulated_tag: "自定義",
    tab_map: "地圖探索",
    tab_route: "避峰路線",
    tab_crowd: "客流看板",
    tab_settings: "系統設定",
    set_as_start: "設為起點",
    add_as_dest: "加入路線",
    close: "關閉",
    mobile_back_to_map: "返回地圖",
    spot_details: "景點詳情",
    search_or_custom_input: "在此处搜索",
    quick_weather_env: "氣象與環境情景",
    plan_this_custom_spot: "設為自定義經停點",
    custom_spot_label: "自定義地點",
    spots_in_route: "處經停點",
    adjust_weather_sim: "天氣與節假日情景設定",
    jump_to_plan: "前往路線規劃",
    total_prefix: "共 ",
    stations_unit: " 站",
    custom_route_suffix: "避峰優化定制路線",
    macau_route_mgmt: "澳門路線管理",
    mode_car: "駕車/打車",
    mode_walk: "步行",
    mode_bike: "騎行",
    mode_transit: "公車/大巴",
    save_to_history: "保存當前規劃至歷史",
    hist_1: "澳門半島經典歷史文化避峰遊",
    hist_2: "路氹金光大道奢華度假休閒遊",
    hist_3: "氹仔與路環葡式風情深度漫遊",
    cat_pills_attraction: "景點",
    cat_pills_food: "餐館",
    cat_pills_hotel: "酒店",
    cat_pills_cafe: "咖啡館",
    cat_pills_shopping: "購物",
    cat_pills_port: "口岸交通",
    exit_nav: "退出",
    route_details_btn: "路線詳情",
    toggle_all_spots_expanded_title: "全城人流已展開 (點擊收起)",
    toggle_all_spots_collapsed_title: "點擊查看所有景點人流",
    toggle_all_spots_expanded_short: "全城人流",
    toggle_all_spots_collapsed_short: "查看全城",
    toast_all_spots_expanded: "🔍 已展開顯示全部景點人流量",
    toast_only_waypoints: "📍 已恢復僅顯示路線經停點熱力图",
    toast_nav_enabled: "🧭 路線導航已開啟：默認僅顯示經停點熱力圖",
    toast_nav_disabled: "已退出路線導航模式",
    toast_route_cleared: "🗑️ 當前規劃路線已清空，可重新添加經停景點",
    toast_history_loaded: "✓ 已載入歷史路線並重新完成智能避峰規劃！",
    toast_route_saved: "✓ 已將當前規劃路線保存至歷史記錄！",
    toast_history_deleted: "已刪除該歷史路線記錄",
    toast_set_start: "✓ 已設置為起點：{name}",
    toast_add_dest: "✓ 已成功加入路線：{name}",
  },
  pt: {
    ...routeTranslations["pt"],
    ruins: "Ruínas de São Paulo",
    monte_forte: "Fortaleza do Monte",
    senado_square: "Largo do Senado",
    st_dominic: "Igreja de São Domingos",
    a_ma_temple: "Templo de A-Má",
    guia_fortress: "Fortaleza da Guia",
    mandarin_house: "Casa do Mandarim",
    lou_kau_mansion: "Casa de Lou Kau",
    macau_tower: "Torre de Macau",
    science_center: "Centro de Ciência de Macau",
    fishermans_wharf: "Doca dos Pescadores",
    kun_iam: "Centro Ecuménico Kun Iam",
    hotel_lisboa: "Hotel Lisboa",
    grand_lisboa: "Grand Lisboa",
    wynn_macau: "Wynn Macau",
    mgm_macau: "MGM Macau",
    cunha: "Rua do Cunha",
    taipa_houses: "Casas-Museu da Taipa",
    venetian: "The Venetian Macao",
    parisian: "The Parisian Macao",
    londoner: "The Londoner Macao",
    wynn_palace: "Wynn Palace",
    city_of_dreams: "City of Dreams",
    studio_city: "Studio City",
    galaxy_macau: "Galaxy Macau",
    mgm_cotai: "MGM Cotai",
    hac_sa: "Praia de Hác-Sá",
    coloane_village: "Vila de Coloane",
    panda_pavilion: "Pavilhão do Panda Gigante",
    morpheus_hotel: "Hotel Morpheus (City of Dreams)",
    banyan_tree: "Banyan Tree Macau (Galaxy)",
    st_regis: "The St. Regis Macao (Londoner)",
    sofitel_macau: "Sofitel Macau At Ponte 16",
    lofficiel_coffee: "lofficiel coffee",
    blooom_coffee: "Blooom Coffee House",
    margarets_cafe: "Café e Nata Margaret",
    sei_kee_cafe: "Café Sei Kee (Taipa)",
    single_origin: "Single Origin Coffee Roasters",
    quarter_square: "Quarter Square Lifestyle & Cafe",
    lord_stow_cafe: "Lord Stow's Garden Cafe (Coloane)",
    commune_cafe: "Commune Cafe & Kitchen",
    miaohua_chicken: "Frango Miao Hua",
    wong_chi_kei: "Wong Chi Kei",
    lorcha: "Restaurante A Lorcha",
    albergue_1601: "Restaurante Albergue 1601",
    chan_kwong_kei: "Restaurante Chan Kwong Kei",
    new_yaohan: "New Yaohan",
    shopper_venetian: "Shoppes at Venetian",
    shopper_parisian: "Shoppes at Parisian",
    shopper_londoner: "Shoppes at Londoner",
    galaxy_promenade: "The Promenade Shops (Galaxy)",
    mpu_dorm: "Dormitório UPM",
    yide_center: "Centro Comercial Yide",
    border_gate: "Portas do Cerco",
    qingmao_port: "Posto Fronteiriço de Qingmao",
    hzmb_port: "Posto Fronteiriço da Ponte HZMB",
    outer_harbour: "Terminal Marítimo do Porto Exterior",
    ferry_terminal: "Terminal Marítimo da Taipa",
    macau_airport: "Aeroporto Internacional de Macau",
    hengqin_port: "Posto Fronteiriço de Hengqin",
    macau_peninsula: "Península de Macau",
    cotai: "Cotai",
    taipa: "Taipa",
    coloane: "Coloane",
    comfortable: "Confortável",
    moderate: "Moderado",
    busy: "Movimentado",
    crowded: "Lotado",
    data_unavailable: "Dados indisponíveis",
    predicted_crowd: "Fluxo previsto",
    prediction_loading: "A prever…",
    user_name: "Visitante_8921",
    standard_user: "Utilizador Padrão",
    history: "Histórico",
    crowd_status: "Fluxo de Pessoas",
    start_planning: "Começar a Planear",
    attraction_crowd: "Fluxo Turístico",
    plan_route: "Planear Rota",
    choose_start: "Escolher ponto de partida",
    choose_dest: "Escolher destino",
    add_dest: "Adicionar destino",
    start_smart_planning: "Iniciar Planeamento Inteligente",
    ai_optimized: "Rota Otimizada por IA",
    peak_avoided: "Picos evitados! Reordenado para poupar ~45 min.",
    edit: "Editar Rota",
    start_nav: "Iniciar Navegação",
    language: "Idioma",
    text_size: "Tamanho do Texto",
    standard: "Padrão",
    large: "Grande",
    xlarge: "Muito Grande",
    visit_duration: "Duração da Visita",
    optimizing: "A calcular a melhor rota com Mapbox...",
    beijing_time: "Hora de Pequim (UTC+8)",
    departure_time: "Hora de Partida",
    sync_live: "Definir para Tempo Real",
    start_point: "Ponto de Partida",
    destination_point: "Destino",
    change_location: "Mudar Local",
    delete_dest: "Eliminar",
    live_badge: "Ao Vivo",
    custom_input_placeholder: "Digite local personalizado...",
    custom_mode: "Personalizado",
    list_mode: "Lista",
    manual_custom: "✏️ Entrada Personalizada...",
    matched_spot: "Ponto Correspondido",
    stop_prefix: "Paragem ",
    stop_suffix: "",
    departure_suffix: "Partida",
    arrival_suffix: "Chegada",
    leave_suffix: "Saída",
    reordered_tag: "Reordenado por IA",
    orig_dest_tag: "Destino Original",
    travel_time_prefix: "Viagem aprox.",
    optimal_kept: "A rota atual já é a ideal!",
    reordered_saved: "Ordem reordenada por IA para evitar congestionamentos!",
    visitors_unit: "visitantes",
    env_mode_title: "Modo de Ambiente e Clima",
    expand: "Expandir",
    collapse: "Recolher",
    search_spots_placeholder: "Pesquisar locais, hotéis, portos...",
    total_spots_monitored: "locais monitorizados ao vivo",
    all_spots: "Todos",
    port_hub: "Portos e Transportes",
    locate_on_map: "Localizar no Mapa",
    cat_heritage: "Património",
    cat_resort: "Resort Integrado",
    cat_landmark: "Ponto Turístico",
    cat_food: "Gastronomia",
    cat_hotel: "Hotel",
    cat_nature: "Natureza",
    cat_port: "Porto e Hub",
    filter_all: "Todos",
    sort_crowd_desc: "Mais Lotado Primeiro",
    sort_crowd_asc: "Mais Confortável Primeiro",
    sort_by_crowd: "Pico Primeiro",
    sort_by_comfort: "Conforto Primeiro",
    crowd_forecast_time: "Hora do Prognóstico",
    visitors_in_park: " visitantes",
    hourly_distribution_label: "Padrão de Fluxo de 24h:",
    peak_hour_estimate: "Pico previsto por volta das {hour}:00",
    hourly_tooltip: "Fluxo previsto: {crowd}%",
    region_all: "Todos",
    region_macau_peninsula: "Península de Macau",
    region_cotai: "Faixa de Cotai",
    region_taipa: "Taipa",
    region_coloane: "Coloane",
    region_port: "Portos e Transportes",
    no_spots_found: "Nenhum local encontrado",
    clear_search: "Limpar Pesquisa",
    weather_no_rain: "Sem Chuva",
    weather_light_rain: "Chuva Fraca",
    weather_heavy_rain: "Chuva Forte",
    weather_label: "Clima / Chuva",
    holiday_stage_label: "Fase do Feriado",
    holiday_stage_none: "Dia Útil Normal",
    holiday_stage_pre: "Pré-Feriado",
    holiday_stage_in: "Pico do Feriado",
    holiday_stage_post: "Pós-Feriado",
    mode_select_label: "Seleção de Modo",
    mode_auto_govt: "Clima em Tempo Real",
    mode_manual_scenario: "Cenário Personalizado",
    simulated_tag: "Personalizado",
    tab_map: "Explorar",
    tab_route: "Planear Rota",
    tab_crowd: "Fluxo",
    tab_settings: "Definições",
    set_as_start: "Definir como Partida",
    add_as_dest: "Adicionar à Rota",
    close: "Fechar",
    mobile_back_to_map: "Voltar ao Mapa",
    spot_details: "Detalhes do Local",
    search_or_custom_input: "Pesquisar local...",
    quick_weather_env: "Clima e Ambiente",
    plan_this_custom_spot: "Adicionar Paragem",
    custom_spot_label: "Local Personalizado",
    spots_in_route: "paragens na rota",
    adjust_weather_sim: "Configuração de Clima e Feriados",
    jump_to_plan: "Ir para Planeamento",
    total_prefix: "Total de ",
    stations_unit: " estações",
    custom_route_suffix: " Rota Personalizada Otimizada",
    macau_route_mgmt: "Gestão de Rotas de Macau",
    mode_car: "Conduzir",
    mode_walk: "Caminhar",
    mode_bike: "Ciclismo",
    mode_transit: "Autocarro",
    save_to_history: "Salvar rota no histórico",
    hist_1: "Tour Histórico Clássico da Península de Macau",
    hist_2: "Tour de Lazer de Resort de Luxo na Faixa de Cotai",
    hist_3: "Tour Detalhado de Estilo Português em Taipa e Coloane",
    cat_pills_attraction: "Atrações",
    cat_pills_food: "Restaurantes",
    cat_pills_hotel: "Hotéis",
    cat_pills_cafe: "Cafés",
    cat_pills_shopping: "Compras",
    cat_pills_port: "Portos e Hubs",
    exit_nav: "Sair",
    route_details_btn: "Detalhes",
    toggle_all_spots_expanded_title: "Todos os locais expandidos (Clique para recolher)",
    toggle_all_spots_collapsed_title: "Clique para ver o fluxo de todos os locais",
    toggle_all_spots_expanded_short: "Todos Locais",
    toggle_all_spots_collapsed_short: "Ver Todos",
    toast_all_spots_expanded: "🔍 Expandido para mostrar o fluxo de todos os locais!",
    toast_only_waypoints: "📍 Restaurado para mostrar apenas as paragens da rota",
    toast_nav_enabled: "🧭 Navegação ativada: exibindo mapa de calor dos pontos por padrão",
    toast_nav_disabled: "Modo de navegação encerrado",
    toast_route_cleared: "🗑️ Rota atual limpa. Pode adicionar novos pontos",
    toast_history_loaded: "✓ Rota histórica carregada com sucesso!",
    toast_route_saved: "✓ Rota guardada no histórico com sucesso!",
    toast_history_deleted: "Histórico de rota apagado",
    toast_set_start: "✓ Definido como início: {name}",
    toast_add_dest: "✓ Adicionado à rota: {name}",
  }
};

const macauBounds: L.LatLngBoundsExpression = [
  [22.0900, 113.5000],
  [22.2500, 113.6200]
];

function MapController({ targetLocation }: { targetLocation: { lat?: number; lng?: number; id?: string } | null }) {
  const map = useMap();
  useEffect(() => {
    if (targetLocation) {
      const [lat, lng] = getValidLatLng(targetLocation.lat, targetLocation.lng);
      try {
        map.flyTo([lat, lng], 15, { duration: 0.8 });
      } catch (err) {
        console.warn("Map flyTo caught error:", err);
      }
    }
  }, [targetLocation?.lat, targetLocation?.lng, targetLocation?.id, map]);
  return null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'crowd' | 'plan'>('plan');
  
  // Mobile Tab & Interaction State
  const [mobileTab, setMobileTab] = useState<'map' | 'plan' | 'crowd' | 'settings'>('map');
  const [selectedMobileSpotId, setSelectedMobileSpotId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [showMobileRouteDrawer, setShowMobileRouteDrawer] = useState(false);
  const [showMobileEnvModal, setShowMobileEnvModal] = useState(false);
  const [showMobileTimeBar, setShowMobileTimeBar] = useState(false);

  const openSearchModal = () => {
    setIsMobileSearchOpen(true);
  };

  const closeSearchModal = () => {
    setIsMobileSearchOpen(false);
  };
  
  // Real-time Beijing Time (UTC+8) Initialization
  const initialBeijing = getLiveBeijingTime();
  const [liveBeijingTimeStr, setLiveBeijingTimeStr] = useState(initialBeijing.timeStr);
  const [startTime, setStartTime] = useState(initialBeijing.timeStr);
  const [time, setTime] = useState(initialBeijing.hour + initialBeijing.minute / 60);

  useEffect(() => {
    const timer = setInterval(() => {
      const live = getLiveBeijingTime();
      setLiveBeijingTimeStr(live.timeStr);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [transportMode, setTransportMode] = useState<'car' | 'transit' | 'walk' | 'bike'>('transit');
  const [isOptimized, setIsOptimized] = useState(false);

  // Route Planning History State
  const [historyList, setHistoryList] = useState<RouteHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('macau_route_history_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Error reading route history from localStorage", e);
    }
    return [];
  });
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Settings States
  const [lang, setLang] = useState<'en' | 'zh-CN' | 'zh-TW' | 'pt'>(() => {
    try {
      const saved = localStorage.getItem('macau_app_lang');
      if (saved && ['en', 'zh-CN', 'zh-TW', 'pt'].includes(saved)) return saved as any;
    } catch (e) {}
    return 'zh-CN';
  });
  const [fontSize, setFontSize] = useState<'standard' | 'large' | 'xlarge'>(() => {
    try {
      const saved = localStorage.getItem('macau_app_font_size');
      if (saved && ['standard', 'large', 'xlarge'].includes(saved)) return saved as any;
    } catch (e) {}
    return 'standard';
  });

  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('macau_app_lang', lang);
    } catch (e) {}
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem('macau_app_font_size', fontSize);
    } catch (e) {}
    if (fontSize === 'large') {
      document.documentElement.style.fontSize = '16.5px';
    } else if (fontSize === 'xlarge') {
      document.documentElement.style.fontSize = '18px';
    } else {
      document.documentElement.style.fontSize = '15px';
    }
  }, [fontSize]);
  
  // Durations State (in minutes)
  const [waypointDurations, setWaypointDurations] = useState<Record<string, number>>({
    'start': 45
  });

  // Dynamic Mapbox / LSTM Optimization States
  const [dynamicOptimizedWaypoints, setDynamicOptimizedWaypoints] = useState<any[] | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);
  const [routeOptimizationSummary, setRouteOptimizationSummary] = useState<any>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Exogenous Variables for LSTM (Holiday + Weather)
  const [envMode, setEnvMode] = useState<'auto' | 'scenario'>('auto');
  const [rainfallMm, setRainfallMm] = useState<number>(0.0);
  const [holidayStage, setHolidayStage] = useState<'none' | 'pre' | 'in' | 'post'>('none');
  const [isLstmAssisted, setIsLstmAssisted] = useState(false);
  const [realtimeEnv, setRealtimeEnv] = useState<{
    source: string;
    rainfall_prev_1h_mm: number;
    holiday_stage: 'none' | 'pre' | 'in' | 'post';
    is_weekend: boolean;
    date: string;
    description: string;
    connected_to_python: boolean;
  }>({
    source: 'macau_calendar_auto',
    rainfall_prev_1h_mm: 0.0,
    holiday_stage: 'none',
    is_weekend: false,
    date: new Date().toISOString().split('T')[0],
    description: 'Auto-syncing real-time government environment data...',
    connected_to_python: false
  });

  const fetchRealtimeEnv = async () => {
    try {
      const res = await fetch('/api/realtime/environment');
      if (res.ok) {
        const data = await res.json();
        setRealtimeEnv(data);
        if (envMode === 'auto') {
          setRainfallMm(data.rainfall_prev_1h_mm ?? 0.0);
          setHolidayStage(data.holiday_stage ?? 'none');
        }
      }
    } catch (err) {
      console.warn("Failed to fetch realtime environment data:", err);
    }
  };

  // LSTM Modal & Service Status States
  const [showModelModal, setShowModelModal] = useState(false);
  const [lstmServiceUrlInput, setLstmServiceUrlInput] = useState("http://127.0.0.1:8000");
  const [lstmStatus, setLstmStatus] = useState<{ connected: boolean; url: string; checked: boolean }>({
    connected: false,
    url: "",
    checked: false
  });
  const [isTestingLstm, setIsTestingLstm] = useState(false);

  const checkLstmHealth = async (overrideUrl?: string) => {
    setIsTestingLstm(true);
    try {
      if (overrideUrl !== undefined) {
        const updateRes = await fetch('/api/config/lstm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: overrideUrl })
        });
        const data = await updateRes.json();
        setLstmStatus({ connected: Boolean(data.connected), url: data.lstmServiceUrl || overrideUrl, checked: true });
      } else {
        const healthRes = await fetch('/api/health');
        if (healthRes.ok) {
          const hData = await healthRes.json();
          setLstmStatus({ connected: Boolean(hData.hasLstmService), url: hData.lstmServiceUrl || "", checked: true });
          if (hData.lstmServiceUrl) {
            setLstmServiceUrlInput(hData.lstmServiceUrl);
          }
        }
      }
      await fetchRealtimeEnv();
    } catch (err) {
      console.warn("LSTM health check error:", err);
      setLstmStatus(prev => ({ ...prev, connected: false, checked: true }));
    } finally {
      setIsTestingLstm(false);
    }
  };

  useEffect(() => {
    checkLstmHealth();
    fetchRealtimeEnv();
  }, []);

  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Translation function
  const t = (key: keyof typeof translations.en) => translations[lang][key] || (translations['en'] as any)[key] || key;

  useEffect(() => {
    const summary = getThresholdSummary();
    console.info("[crowd-thresholds]", {
      threshold_source: USER_FACING_THRESHOLD_SOURCE,
      threshold_source_period: USER_FACING_THRESHOLD_SOURCE_PERIOD,
      summary
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (fontSize === 'xlarge') {
      root.style.fontSize = '120%';
    } else if (fontSize === 'large') {
      root.style.fontSize = '110%'; 
    } else {
      root.style.fontSize = '100%';
    }
  }, [fontSize]);

  // --- CROWD PREDICTION MODEL ---
  const calculateCrowd = (poiId: string, hour: number, rain: number, holiday: string) => {
    const info = POI_BASE_CROWD[poiId] || { baseCrowd: 50, capacity: 5000, peakHour: 15 };
    const hourDist = Math.abs(hour - info.peakHour);
    let hourFactor = Math.exp(-(hourDist * hourDist) / 18);
    if (hour < 8 || hour > 22) hourFactor *= 0.15;

    let rainFactor = 1.0;
    const poi = MACAU_POIS.find(p => p.id === poiId);
    const isIndoor = poi?.category === 'resort' || poi?.category === 'hotel' || poi?.category === 'port' || poi?.category === 'shopping' || poi?.category === 'cafe';
    if (rain > 10) {
      rainFactor = isIndoor ? 1.25 : 0.45;
    } else if (rain > 0) {
      rainFactor = isIndoor ? 1.10 : 0.75;
    }

    let holidayFactor = 1.0;
    if (holiday === 'in') holidayFactor = 1.45;
    else if (holiday === 'pre') holidayFactor = 1.20;
    else if (holiday === 'post') holidayFactor = 1.10;

    let level = Math.round(info.baseCrowd * hourFactor * rainFactor * holidayFactor);
    level = Math.max(1, Math.min(98, level));
    const visitors = Math.round((level / 100) * info.capacity * 0.9);
    const threshold = getSpotThreshold({
      spotId: poiId,
      spotName: poi?.nameKey || poiId,
      category: poi?.category
    });
    const statusKey = classifyCongestion(level, threshold);
    const visuals = getCongestionVisual(statusKey);

    return {
      crowdLevel: level,
      predictedVisitors: visitors,
      statusKey,
      status: statusKey === 'unknown' ? t('data_unavailable') : t(statusKey as any),
      colorHex: visuals.colorHex,
      statusBg: visuals.statusBg,
      crowdBg: visuals.crowdBg,
      isIndoor,
      thresholdP50: threshold.p50,
      thresholdP85: threshold.p85,
      thresholdSource: threshold.source,
      thresholdSourcePeriod: threshold.sourcePeriod,
      thresholdFallbackUsed: threshold.fallbackUsed,
      thresholdFallbackType: threshold.fallbackType
    };
  };

  const crowdAttractions = MACAU_POIS.map(poi => {
    const crowd = calculateCrowd(poi.id, time, rainfallMm, holidayStage);
    return {
      ...poi,
      name: t(poi.nameKey as any),
      region: t(poi.regionKey as any),
      ...crowd
    };
  });

  // Filters and Sorting for Crowd Tab
  const [crowdSearchQuery, setCrowdSearchQuery] = useState('');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('all');
  const [selectedCrowdSpotId, setSelectedCrowdSpotId] = useState<string | null>(null);

  const sortedAttractions = [...crowdAttractions].sort((a, b) => {
    return sortOrder === 'desc' ? b.crowdLevel - a.crowdLevel : a.crowdLevel - b.crowdLevel;
  });

  const filteredAttractions = sortedAttractions.filter(attr => {
    if (selectedRegionFilter === 'port') {
      if (attr.category !== 'port') return false;
    } else if (selectedRegionFilter !== 'all') {
      if (attr.regionKey !== selectedRegionFilter) return false;
    }
    if (crowdSearchQuery.trim()) {
      const match = matchPoi(attr.id, crowdSearchQuery, translations, lang);
      if (!match.matched) return false;
    }
    return true;
  });

  const crowdStats = {
    crowded: crowdAttractions.filter(a => a.statusKey === 'crowded').length,
    moderate: crowdAttractions.filter(a => a.statusKey === 'moderate').length,
    comfortable: crowdAttractions.filter(a => a.statusKey === 'comfortable').length,
  };

  // --- PLAN TAB DATA ---
  const [planWaypoints, setPlanWaypoints] = useState<any[]>([
    { ...DEFAULT_START_WAYPOINT }
  ]);

  // Restore route draft after reload/reopen
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ROUTE_DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      const isLegacySeedRoute = Array.isArray(draft.planWaypoints)
        && draft.planWaypoints.length === 4
        && draft.planWaypoints.map((w: any) => String(w?.id)).join(',') === 'start,dest1,dest2,dest3';
      if (isLegacySeedRoute) {
        localStorage.removeItem(ROUTE_DRAFT_STORAGE_KEY);
        return;
      }
      if (Array.isArray(draft.planWaypoints) && draft.planWaypoints.length > 0) {
        setPlanWaypoints(draft.planWaypoints);
      }
      if (draft.waypointDurations && typeof draft.waypointDurations === 'object') {
        setWaypointDurations(draft.waypointDurations);
      }
      if (typeof draft.startTime === 'string' && draft.startTime.includes(':')) {
        setStartTime(draft.startTime);
      }
      if (['car', 'transit', 'walk', 'bike'].includes(draft.transportMode)) {
        setTransportMode(draft.transportMode);
      }
    } catch (e) {
      console.warn("Route draft restore failed", e);
    }
  }, []);

  // Persist route draft
  useEffect(() => {
    try {
      localStorage.setItem(ROUTE_DRAFT_STORAGE_KEY, JSON.stringify({
        planWaypoints,
        waypointDurations,
        startTime,
        transportMode
      }));
    } catch (e) {
      console.warn("Route draft save failed", e);
    }
  }, [planWaypoints, waypointDurations, startTime, transportMode]);

  const handleSelectPoi = (waypointId: string, newPoiId: string) => {
    if (newPoiId === '__custom__') {
      setPlanWaypoints(prev => prev.map(wp => {
        if (wp.id === waypointId) {
          return { ...wp, isCustom: true, customName: wp.customName || wp.name || '' };
        }
        return wp;
      }));
      return;
    }

    const poi = MACAU_POIS.find(p => p.id === newPoiId);
    if (!poi) return;
    setPlanWaypoints(prev => prev.map(wp => {
      if (wp.id === waypointId) {
        return {
          ...wp,
          isCustom: false,
          poiId: poi.id,
          nameKey: poi.nameKey,
          lat: poi.lat,
          lng: poi.lng,
          name: t(poi.nameKey as any),
          customName: '',
          matchedPoiName: undefined
        };
      }
      return wp;
    }));
    setIsOptimized(false);
    setHasPendingManualSort(false);
    setIsCustomOrderSaved(false);
    setDynamicOptimizedWaypoints(null);
    setRouteGeometry(null);
  };

  const handleSetCustomLocation = (waypointId: string, customName: string) => {
    const lower = customName.trim().toLowerCase();
    const matched = lower ? MACAU_POIS.find(p => {
      const en = String(translations.en[p.nameKey] || '').toLowerCase();
      const zh = String(translations['zh-CN'][p.nameKey] || '').toLowerCase();
      const tw = String(translations['zh-TW'][p.nameKey] || '').toLowerCase();
      return en.includes(lower) || zh.includes(lower) || tw.includes(lower) || lower.includes(zh) || lower.includes(en);
    }) : null;

    setPlanWaypoints(prev => prev.map((wp, idx) => {
      if (wp.id === waypointId) {
        return {
          ...wp,
          isCustom: true,
          customName: customName,
          name: customName,
          poiId: matched ? matched.id : wp.poiId,
          lat: matched ? matched.lat : (wp.lat || (22.1930 + (idx * 0.005))),
          lng: matched ? matched.lng : (wp.lng || (113.5410 + (idx * 0.005))),
          matchedPoiName: matched ? t(matched.nameKey as any) : undefined
        };
      }
      return wp;
    }));
    setIsOptimized(false);
    setHasPendingManualSort(false);
    setIsCustomOrderSaved(false);
    setDynamicOptimizedWaypoints(null);
    setRouteGeometry(null);
  };

  const handleToggleCustomMode = (waypointId: string, isCustom: boolean) => {
    setPlanWaypoints(prev => prev.map(wp => {
      if (wp.id === waypointId) {
        if (!isCustom) {
          const poi = MACAU_POIS.find(p => p.id === wp.poiId) || MACAU_POIS[0];
          return {
            ...wp,
            isCustom: false,
            poiId: poi.id,
            nameKey: poi.nameKey,
            lat: poi.lat,
            lng: poi.lng,
            name: t(poi.nameKey as any),
            matchedPoiName: undefined
          };
        } else {
          return {
            ...wp,
            isCustom: true,
            customName: wp.customName || wp.name || ''
          };
        }
      }
      return wp;
    }));
    setIsOptimized(false);
    setHasPendingManualSort(false);
    setIsCustomOrderSaved(false);
  };

  const handleAddDestination = () => {
    const dests = planWaypoints.filter(wp => wp.type === 'dest');
    if (dests.length >= 8) {
      triggerToast(maxDestinationsToast());
      return;
    }

    const newId = `dest_${Date.now()}`;
    const newWp = {
      id: newId,
      type: 'dest',
      poiId: undefined,
      isCustom: true,
      customName: '',
      name: '',
      lat: 22.1899,
      lng: 113.5437,
      bg: '#10b981'
    };
    setPlanWaypoints(prev => [...prev, newWp]);
    setWaypointDurations(prev => ({ ...prev, [newId]: 60 }));
    setIsOptimized(false);
    setHasPendingManualSort(false);
    setIsCustomOrderSaved(false);
    setDynamicOptimizedWaypoints(null);
    setRouteGeometry(null);
  };

  const handleDeleteDestination = (id: string) => {
    const destinations = planWaypoints.filter(wp => wp.type === 'dest');
    if (destinations.length <= 1) return;
    setPlanWaypoints(prev => prev.filter(wp => wp.id !== id));
    setIsOptimized(false);
    setHasPendingManualSort(false);
    setIsCustomOrderSaved(false);
    setDynamicOptimizedWaypoints(null);
    setRouteGeometry(null);
  };

  const handleMoveWaypoint = (fromIdx: number, toIdx: number) => {
    if (fromIdx < 1 || toIdx < 1 || fromIdx >= planWaypoints.length || toIdx >= planWaypoints.length) return;
    const newWaypoints = [...planWaypoints];
    const [moved] = newWaypoints.splice(fromIdx, 1);
    newWaypoints.splice(toIdx, 0, moved);
    setPlanWaypoints(newWaypoints);
    setIsOptimized(false);
    setHasPendingManualSort(true);
    setIsCustomOrderSaved(false);
    setDynamicOptimizedWaypoints(null);
    setRouteGeometry(null);
  };

  // Toast feedback state
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };
  const maxDestinationsToast = () => {
    if (lang === 'en') return 'Maximum 8 destinations allowed';
    if (lang === 'pt') return 'Máximo de 8 destinos permitidos';
    return '最多可添加 8 个目的地';
  };
  const [hasPendingManualSort, setHasPendingManualSort] = useState(false);
  const [isCustomOrderSaved, setIsCustomOrderSaved] = useState(false);

  // --- NAVIGATION MODE & MAGNIFYING GLASS ALL-SPOTS TOGGLE ---
  const [isNavigating, setIsNavigating] = useState(false);
  const [showAllSpotsInNav, setShowAllSpotsInNav] = useState(false);

  const handleConfirmManualSort = async () => {
    if (!hasPendingManualSort || isCalculatingRoute) return;
    const ok = await handleOptimizeRoute(transportMode, { keepOrder: true, skipHistory: true });
    if (!ok) {
      const failedToast = lang === 'en'
        ? '⚠️ Failed to save custom order. Please try again.'
        : lang === 'pt'
        ? '⚠️ Falha ao guardar a ordem personalizada. Tente novamente.'
        : '⚠️ 保存自定义排序失败，请重试。';
      triggerToast(failedToast);
      return;
    }
    const successToast = lang === 'en'
      ? '✅ Order saved. Navigation will follow this order.'
      : lang === 'pt'
      ? '✅ Ordem guardada. A navegação seguirá esta ordem.'
      : '✅ 已保存排序，将按此顺序继续导航。';
    triggerToast(successToast);
  };

  const handleStartNavigation = async (fromRouteDrawer: boolean = false) => {
    if (isCalculatingRoute) return;
    if (hasPendingManualSort) {
      const pendingToast = lang === 'en'
        ? 'Please confirm and save the custom order before starting navigation.'
        : lang === 'pt'
        ? 'Confirme e guarde a ordem personalizada antes de iniciar a navegação.'
        : '请先点击“确认保存排序”，再开始导航。';
      triggerToast(pendingToast);
      return;
    }
    const hasDestinations = planWaypoints.some(wp => wp.type === 'dest');

    let optimizedBeforeNavigation = isOptimized && Boolean(dynamicOptimizedWaypoints?.length);
    if (hasDestinations) {
      const optimizeOk = await handleOptimizeRoute(transportMode, { keepOrder: isCustomOrderSaved });
      optimizedBeforeNavigation = optimizeOk || optimizedBeforeNavigation;
      if (!optimizeOk) {
        const fallbackToast = lang === 'en'
          ? '⚠️ Route optimization failed. Entering navigation with current route.'
          : lang === 'pt'
          ? '⚠️ Falha na otimização da rota. A navegar com a rota atual.'
          : '⚠️ 避峰优化失败，已回退为当前路线继续导航。';
        triggerToast(fallbackToast);
      }
    }

    setIsNavigating(true);
    setShowAllSpotsInNav(false); // Default to only showing waypoints' heatmaps
    setActiveTab('plan');
    setMobileTab('map');
    setShowMobileRouteDrawer(!fromRouteDrawer);

    if (startTime) {
      const parts = startTime.split(':');
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) {
        setTime(h + m / 60);
      }
    }

    if (optimizedBeforeNavigation || !hasDestinations) {
      triggerToast(t('toast_nav_enabled') || '🧭 路线导航已开启：地图已同步至行程出发及预测时间客流');
    }
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
    setShowAllSpotsInNav(false);
    triggerToast(t('toast_nav_disabled') || '已退出路线导航模式');
  };

  const prevWaypointsCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (isNavigating && prevWaypointsCountRef.current !== null && planWaypoints.length > prevWaypointsCountRef.current) {
      handleOptimizeRoute(transportMode, { keepOrder: isCustomOrderSaved });
      const rePlanMsg = lang === 'en'
        ? "🧭 New spot added! Route dynamically re-predicted & re-planned successfully."
        : lang === 'pt'
        ? "🧭 Novo ponto adicionado! Rota recalculada e replanejada com sucesso."
        : "🧭 检测到在导航中加入新景点，已为您重新预测并规划最新避峰路线！";
      triggerToast(rePlanMsg);
    }
    prevWaypointsCountRef.current = planWaypoints.length;
  }, [planWaypoints.length, isNavigating, lang, transportMode, isCustomOrderSaved]);

  // --- ROUTE HISTORY & CLEAR PLAN HANDLERS ---
  const handleClearPlan = () => {
    setPlanWaypoints([{ ...DEFAULT_START_WAYPOINT }]);
    setWaypointDurations({ 'start': 45 });
    setIsOptimized(false);
    setHasPendingManualSort(false);
    setIsCustomOrderSaved(false);
    setDynamicOptimizedWaypoints(null);
    setRouteGeometry(null);
    setRouteOptimizationSummary(null);
    if (isNavigating) {
      setIsNavigating(false);
      setShowAllSpotsInNav(false);
    }
    triggerToast(t('toast_route_cleared') || '🗑️ 当前规划路线已清空，可重新添加经停景点');
  };

  const handleSelectAndEditHistory = (item: RouteHistoryItem) => {
    setPlanWaypoints(item.waypoints);
    setWaypointDurations(item.waypointDurations);
    setTransportMode(item.transportMode);
    setHasPendingManualSort(false);
    setIsCustomOrderSaved(false);
    setShowHistoryModal(false);
    setMobileTab('plan');
    setActiveTab('plan');
    setTimeout(() => {
      handleOptimizeRoute(item.transportMode);
    }, 120);
    triggerToast(t('toast_history_loaded') || `✓ 已载入历史路线并重新完成智能避峰规划！`);
  };

  const handleSaveCurrentToHistory = () => {
    const dests = planWaypoints.filter(wp => wp.type === 'dest');
    const firstDestName = dests[0]?.name || dests[0]?.customName || (dests[0]?.nameKey ? t(dests[0].nameKey as any) : '澳门景点');
    const title = `${firstDestName}周边避峰定制游`;
    const newItem: RouteHistoryItem = {
      id: `hist_${Date.now()}`,
      title,
      createdAt: formatCurrentDate24h(),
      timestamp: Date.now(),
      spotCount: dests.length,
      destinationsCount: dests.length,
      totalStopsCount: planWaypoints.length,
      transportMode,
      waypoints: planWaypoints.map(wp => ({
        ...wp,
        name: wp.name || wp.customName || (wp.nameKey ? t(wp.nameKey as any) : '景点')
      })),
      waypointDurations: { ...waypointDurations }
    };
    const updated = [newItem, ...historyList];
    setHistoryList(updated);
    try {
      localStorage.setItem('macau_route_history_v2', JSON.stringify(updated));
    } catch (e) {
      console.warn("Storage save error", e);
    }
    triggerToast(t('toast_route_saved') || '✓ 已将当前规划路线保存至历史记录！');
  };

  const handleDeleteHistory = (id: string) => {
    const updated = historyList.filter(h => h.id !== id);
    setHistoryList(updated);
    try {
      localStorage.setItem('macau_route_history_v2', JSON.stringify(updated));
    } catch (e) {
      console.warn("Storage save error", e);
    }
    triggerToast(t('toast_history_deleted') || '已删除该历史路线记录');
  };

  const closePoiDetails = () => {
    setSelectedMobileSpotId(null);
    setSelectedCrowdSpotId(null);
  };

  const handleSetStartFromPoi = (poiId: string) => {
    const poi = MACAU_POIS.find(p => p.id === poiId);
    if (!poi) {
      handleSetCustomStart(poiId);
      return;
    }
    const name = t(poi.nameKey as any);
    setPlanWaypoints(prev => {
      const withoutPoi = prev.filter(wp => wp.poiId !== poi.id);
      const newStart = {
        id: 'start',
        type: 'start',
        poiId: poi.id,
        nameKey: poi.nameKey,
        lat: poi.lat,
        lng: poi.lng,
        name: name,
        bg: '#3b82f6',
        isCustom: false
      };
      const rest = withoutPoi.filter(wp => wp.type === 'dest');
      return [newStart, ...rest];
    });
    setIsOptimized(false);
    setHasPendingManualSort(false);
    setIsCustomOrderSaved(false);
    setDynamicOptimizedWaypoints(null);
    setRouteGeometry(null);
    closePoiDetails();
    triggerToast((t('toast_set_start') || '✓ 已设置为起点：{name}').replace('{name}', name));
  };

  const handleAddDestFromPoi = (poiId: string) => {
    const poi = MACAU_POIS.find(p => p.id === poiId);
    if (!poi) {
      handleAddCustomDestination(poiId);
      return;
    }
    const dests = planWaypoints.filter(wp => wp.type === 'dest');
    if (dests.length >= 8) {
      triggerToast(maxDestinationsToast());
      return;
    }
    
    const name = t(poi.nameKey as any);
    const newId = `dest_${Date.now()}`;
    const newWp = {
      id: newId,
      type: 'dest',
      poiId: poi.id,
      nameKey: poi.nameKey,
      lat: poi.lat,
      lng: poi.lng,
      name: name,
      bg: '#10b981',
      isCustom: false
    };
    setPlanWaypoints(prev => [...prev, newWp]);
    setWaypointDurations(prev => ({ ...prev, [newId]: 60 }));
    setIsOptimized(false);
    setHasPendingManualSort(false);
    setIsCustomOrderSaved(false);
    setDynamicOptimizedWaypoints(null);
    setRouteGeometry(null);
    closePoiDetails();
    triggerToast((t('toast_add_dest') || '✓ 已成功加入路线：{name}').replace('{name}', name));
  };

  const handleSetCustomStart = (customName: string) => {
    if (!customName.trim()) return;
    setPlanWaypoints(prev => prev.map(wp => {
      if (wp.id === 'start') {
        return {
          ...wp,
          isCustom: true,
          customName: customName.trim(),
          name: customName.trim(),
          lat: 22.1899,
          lng: 113.5437
        };
      }
      return wp;
    }));
    setIsOptimized(false);
    setHasPendingManualSort(false);
    setIsCustomOrderSaved(false);
    setDynamicOptimizedWaypoints(null);
    setRouteGeometry(null);
    closePoiDetails();
    triggerToast((t('toast_set_start') || '✓ 已设置为起点：{name}').replace('{name}', customName.trim()));
  };

  const handleAddCustomDestination = (customName: string) => {
    if (!customName.trim()) return;
    const dests = planWaypoints.filter(wp => wp.type === 'dest');
    if (dests.length >= 8) {
      triggerToast(maxDestinationsToast());
      return;
    }

    const newId = `dest_${Date.now()}`;
    const newWp = {
      id: newId,
      type: 'dest',
      poiId: undefined,
      isCustom: true,
      customName: customName.trim(),
      name: customName.trim(),
      lat: 22.1899,
      lng: 113.5437,
      bg: '#10b981'
    };
    setPlanWaypoints(prev => [...prev, newWp]);
    setWaypointDurations(prev => ({ ...prev, [newId]: 60 }));
    setIsOptimized(false);
    setHasPendingManualSort(false);
    setIsCustomOrderSaved(false);
    setDynamicOptimizedWaypoints(null);
    setRouteGeometry(null);
    closePoiDetails();
    triggerToast((t('toast_add_dest') || '✓ 已成功加入路线：{name}').replace('{name}', customName.trim()));
  };

  // Stop at an unfinished input: later stops cannot have reliable arrival times yet.
  const firstIncompleteWaypoint = planWaypoints.findIndex(wp => wp.isCustom && !String(wp.customName || '').trim());
  const previewWaypoints = firstIncompleteWaypoint < 0 ? planWaypoints : planWaypoints.slice(0, firstIncompleteWaypoint);
  const previewDateMap = { in: '2026-05-02', pre: '2026-04-29', post: '2026-05-07', none: '2026-06-16' };
  const routePreview = useRoutePreview(!isOptimized && previewWaypoints.length > 0 && /^\d{2}:\d{2}$/.test(startTime) ? {
    waypoints: previewWaypoints.map(wp => {
      const poi = MACAU_POIS.find(p => p.id === wp.poiId);
      const [lat, lng] = getValidLatLng(wp.lat, wp.lng);
      return {
        id: wp.id,
        type: wp.type,
        poiId: wp.poiId,
        category: wp.category || poi?.category,
        name: wp.isCustom ? wp.customName : (wp.nameKey ? t(wp.nameKey as any) : wp.name),
        nameKey: wp.isCustom ? undefined : wp.nameKey,
        lat,
        lng,
        durationMinutes: waypointDurations[wp.id] || wp.durationMinutes || 60
      };
    }),
    startTime,
    transportMode,
    rainfall_prev_1h_mm: rainfallMm,
    date: envMode === 'auto' ? realtimeEnv.date : previewDateMap[holidayStage],
    holidayStage,
    keepOrder: true,
    previewOnly: true,
    // Recompute when the connected prediction service changes.
    predictionService: lstmStatus.connected ? lstmStatus.url : ''
  } : null);

  const normalizeCrowdStatusKey = (wp: any): CongestionLevel => {
    const key = String(wp.crowdStatusKey || '').toLowerCase();
    if (key === 'comfortable' || key === 'moderate' || key === 'crowded' || key === 'unknown') {
      return key as CongestionLevel;
    }
    if (key === 'busy') {
      return 'moderate';
    }

    const threshold = getSpotThreshold({
      spotId: wp.poiId || wp.id || wp.nameKey || wp.name,
      spotName: wp.name || wp.nameKey || wp.id,
      category: wp.category
    });
    const classified = classifyCongestion(wp.crowdRatio, threshold);
    if (classified !== 'unknown') {
      return classified;
    }

    const label = String(wp.crowdStatus || '').toLowerCase();
    if (label.includes('拥挤') || label.includes('擁擠') || label.includes('crowded') || label.includes('lotado')) return 'crowded';
    if (label.includes('繁忙') || label.includes('busy') || label.includes('movimentado')) return 'moderate';
    if (label.includes('适中') || label.includes('適中') || label.includes('moderate') || label.includes('moderado')) return 'moderate';
    if (label.includes('舒适') || label.includes('舒適') || label.includes('comfortable') || label.includes('confort')) return 'comfortable';
    return 'unknown';
  };

  const currentWaypoints = (isOptimized && dynamicOptimizedWaypoints
    ? dynamicOptimizedWaypoints
    : planWaypoints
  ).map((sourceWp, idx) => {
    const prediction = routePreview.waypoints.find(wp => wp.id === sourceWp.id);
    const wp = isOptimized ? sourceWp : {
      ...sourceWp,
      time: prediction?.time,
      arrivalTime: prediction?.arrivalTime,
      departureTime: prediction?.departureTime,
      travelMinutesFromPrev: prediction?.travelMinutesFromPrev,
      crowdStatusKey: prediction?.crowdStatusKey || 'unknown',
      crowdRatio: prediction?.crowdRatio,
      predictedPeople: prediction?.predictedPeople,
      stopIndex: idx,
      origDestIndex: idx,
      isReordered: false,
      predictionState: previewWaypoints.some(p => p.id === sourceWp.id) ? routePreview.status : 'idle'
    };
    const crowdStatusKey = normalizeCrowdStatusKey(wp);
    const predictedPeople = wp.predictedPeople;
    const crowdRatio = wp.crowdRatio;

    const visuals = getCongestionVisual(crowdStatusKey);
    return {
      ...wp,
      time: wp.time || (wp.type === 'start' ? startTime : undefined),
      arrivalTime: wp.arrivalTime || wp.time,
      departureTime: wp.departureTime,
      durationMinutes: waypointDurations[wp.id] || wp.durationMinutes || 60,
      travelMinutesFromPrev: wp.travelMinutesFromPrev,
      stopIndex: wp.stopIndex ?? (wp.type === 'start' ? 0 : idx),
      origDestIndex: wp.origDestIndex ?? (wp.type === 'start' ? 0 : idx),
      isReordered: Boolean(wp.isReordered),
      name: wp.isCustom 
        ? (wp.customName || wp.name || t('custom_mode'))
        : (wp.nameKey ? t(wp.nameKey as any) : (wp.name || '')),
      crowdStatusKey,
      crowdStatus: crowdStatusKey === 'unknown' ? t('data_unavailable') : t(crowdStatusKey as any),
      predictedPeople,
      crowdRatio,
      color: visuals.textClass,
      colorHex: visuals.colorHex,
      statusBg: visuals.statusBg,
      crowdBg: visuals.crowdBg,
      bg: visuals.crowdBg
    };
  });

  const safeCurrentWaypoints = currentWaypoints.map(wp => {
    const [lat, lng] = getValidLatLng(wp.lat, wp.lng);
    return {
      ...wp,
      lat,
      lng
    };
  });

  const rawRouteCoordinates: [number, number][] = (isOptimized && routeGeometry && routeGeometry.length > 0)
    ? routeGeometry
    : safeCurrentWaypoints.map(wp => [wp.lat, wp.lng]);

  const routeCoordinates: [number, number][] = rawRouteCoordinates.filter((c): c is [number, number] => 
    Array.isArray(c) && 
    c.length >= 2 && 
    typeof c[0] === 'number' && Number.isFinite(c[0]) && !isNaN(c[0]) && c[0] !== 0 &&
    typeof c[1] === 'number' && Number.isFinite(c[1]) && !isNaN(c[1]) && c[1] !== 0
  );

  const handleOptimizeRoute = async (
    mode = transportMode,
    options?: { keepOrder?: boolean; sourceWaypoints?: any[]; skipHistory?: boolean }
  ): Promise<boolean> => {
    setIsCalculatingRoute(true);
    try {
      const sourceWaypoints = options?.sourceWaypoints || planWaypoints;
      const payloadWaypoints = sourceWaypoints.map(wp => {
        const lat = Number(wp.lat);
        const lng = Number(wp.lng);
        const poiMeta = MACAU_POIS.find(p => p.id === wp.poiId);
        return {
          id: wp.id,
          type: wp.type,
          poiId: wp.poiId,
          category: wp.category || poiMeta?.category,
          name: wp.isCustom ? (wp.customName || wp.name || 'Custom Spot') : (wp.nameKey ? t(wp.nameKey as any) : (wp.name || '')),
          nameKey: wp.isCustom ? undefined : wp.nameKey,
          lat: !isNaN(lat) && lat !== 0 ? lat : 22.1899,
          lng: !isNaN(lng) && lng !== 0 ? lng : 113.5437,
          durationMinutes: waypointDurations[wp.id] || 60
        };
      });

      const dateMap = {
        'in': '2026-05-02',
        'pre': '2026-04-29',
        'post': '2026-05-07',
        'none': '2026-06-16'
      };

      const res = await fetch('/api/route/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waypoints: payloadWaypoints,
          startTime: startTime || getLiveBeijingTime().timeStr,
          transportMode: mode,
          rainfall_prev_1h_mm: rainfallMm,
          date: dateMap[holidayStage],
          holidayStage,
          keepOrder: Boolean(options?.keepOrder)
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.routeGeoJSON && Array.isArray(data.routeGeoJSON.coordinates)) {
          const leafletCoords: [number, number][] = data.routeGeoJSON.coordinates
            .map((c: [number, number]) => [Number(c[1]), Number(c[0])])
            .filter((c: [number, number]) => !isNaN(c[0]) && !isNaN(c[1]) && c[0] !== 0 && c[1] !== 0);
          setRouteGeometry(leafletCoords);
        }
        if (data.optimizedWaypoints) {
          setDynamicOptimizedWaypoints(data.optimizedWaypoints);
        }
        setRouteOptimizationSummary(data.summary || null);
        setIsLstmAssisted(Boolean(data.isLstmAssisted));
        setIsOptimized(true);
        setHasPendingManualSort(false);
        setIsCustomOrderSaved(Boolean(options?.keepOrder));

        // Auto-archive optimized route to history list
        const dests = sourceWaypoints.filter(wp => wp.type === 'dest');
        if (dests.length > 0 && !options?.skipHistory) {
          const firstDestName = dests[0]?.name || dests[0]?.customName || (dests[0]?.nameKey ? t(dests[0].nameKey as any) : '澳门景点');
          const autoHistItem: RouteHistoryItem = {
            id: `hist_${Date.now()}`,
            title: `${firstDestName}避峰优化定制路线`,
            createdAt: formatCurrentDate24h(),
            timestamp: Date.now(),
            spotCount: dests.length,
            destinationsCount: dests.length,
            totalStopsCount: (data.optimizedWaypoints || sourceWaypoints).length,
            transportMode: mode,
            waypoints: (data.optimizedWaypoints || sourceWaypoints).map((wp: any) => ({
              ...wp,
              name: wp.name || wp.customName || (wp.nameKey ? t(wp.nameKey as any) : '经停景点')
            })),
            waypointDurations: { ...waypointDurations }
          };
          setHistoryList(prev => {
            const updated = [autoHistItem, ...prev.slice(0, 19)];
            try {
              localStorage.setItem('macau_route_history_v2', JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        }
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.warn("Optimization error:", err);
      return false;
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleTransportModeChange = (mode: 'car' | 'transit' | 'walk' | 'bike') => {
    setTransportMode(mode);
    if (isOptimized) {
      handleOptimizeRoute(mode, { keepOrder: isCustomOrderSaved });
    }
  };

  const [isEnvExpanded, setIsEnvExpanded] = useState(false);

  // --- CRISP, NON-DIFFUSE CIRCULAR MAP ICONS ---
  const createCustomIcon = (attr: any, showTime: boolean = false, isCategoryMatch: boolean = true, isCategoryFilterActive: boolean = false) => {
    const isStart = attr.type === 'start';
    const isSelected = (selectedCrowdSpotId && attr.id === selectedCrowdSpotId) || (selectedMobileSpotId && attr.id === selectedMobileSpotId);
    
    // Check if this attraction/point has a waypoint stop index
    const waypointIndex = typeof attr.stopIndex === 'number' 
      ? attr.stopIndex 
      : (() => {
          const idx = currentWaypoints.findIndex(wp => {
            if (wp.poiId && attr.id && wp.poiId === attr.id) return true;
            if (wp.id && attr.id && wp.id === attr.id) return true;
            if (wp.name && attr.name && (wp.name === attr.name || wp.name.includes(attr.name) || attr.name.includes(wp.name))) return true;
            return false;
          });
          return idx >= 0 ? idx : null;
        })();
    const hasStopIndex = waypointIndex !== null;
    const stopBadgeText = hasStopIndex ? ((isStart || waypointIndex === 0) ? 'S' : String(waypointIndex)) : '';
    const predictedPeopleText = typeof attr.predictedPeople === 'number' ? `${Math.round(attr.predictedPeople).toLocaleString()}${t('visitors_unit') || '人'}` : '';
    const arrivalCrowdLabel = [attr.crowdStatus || attr.status || '', predictedPeopleText].filter(Boolean).join(' · ');

    // Crisp color badge (No diffuse glow spread across tiles)
    const badgeBg = isStart ? '#2563eb' : (attr.colorHex || attr.bg || '#10b981');
    const badgeSize = isSelected ? 18 : (isCategoryFilterActive && isCategoryMatch ? 16 : 14);
    
    const catIconMap: Record<string, string> = {
      cafe: '☕',
      hotel: '🛏️',
      resort: '🏨',
      food: '🍽️',
      shopping: '🛍️',
      port: '🚢',
      heritage: '🏛️',
      landmark: '🗼',
      nature: '🌿'
    };
    const catIcon = catIconMap[attr.category] || '📍';
    
    const html = `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; ${isSelected ? 'z-index: 1000;' : ''} ${isCategoryFilterActive && !isCategoryMatch ? 'opacity: 0.35;' : 'opacity: 1;'}">
        <div style="
          width: ${badgeSize}px; 
          height: ${badgeSize}px; 
          border-radius: 50%; 
          border: 2px solid #ffffff; 
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
          background-color: ${badgeBg};
          transform: ${isSelected ? 'scale(1.25)' : (isCategoryFilterActive && isCategoryMatch ? 'scale(1.15)' : 'scale(1)')};
          transition: transform 0.15s ease;
        "></div>
        <div style="
          margin-top: 4px; 
          padding: 2px 6px; 
          background: rgba(255, 255, 255, 0.96); 
          border-radius: 6px; 
          font-size: 11px; 
          font-weight: 700; 
          color: #1f2937; 
          box-shadow: ${isSelected ? '0 0 0 2px #4f46e5, 0 3px 6px rgba(0,0,0,0.15)' : (isCategoryFilterActive && isCategoryMatch ? '0 0 0 2px #4f46e5, 0 2px 4px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.15)')}; 
          border: 1px solid #e5e7eb; 
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          ${isCategoryFilterActive && isCategoryMatch ? `<span>${catIcon}</span>` : ''}
          ${hasStopIndex ? `<span style="background-color: #4f46e5; color: #ffffff; border-radius: 4px; padding: 1px 4.5px; font-size: 9px; font-weight: 900; font-family: monospace; margin-right: 2px; line-height: 1;">${stopBadgeText}</span>` : ''}
          <span>${attr.name}</span>
          ${showTime && attr.time ? `<span style="color: #4f46e5; font-size: 10px; font-weight: 700; background: #eef2ff; padding: 1px 4px; border-radius: 4px;">${attr.departureTime ? `${attr.time}~${attr.departureTime}` : attr.time}</span>` : ''}
          ${showTime && !isStart && arrivalCrowdLabel ? `<span style="color: ${attr.colorHex || '#065f46'}; background: ${attr.statusBg || '#ecfdf5'}; font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 4px;">${arrivalCrowdLabel}</span>` : ''}
          ${!showTime && (attr.crowdStatus || attr.status) ? `<span style="color: ${attr.colorHex || '#10b981'}; background: ${attr.statusBg || '#ecfdf5'}; font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 4px;">${attr.crowdStatus || attr.status}</span>` : ''}
        </div>
      </div>
    `;
    
    return L.divIcon({
      html,
      className: 'custom-leaflet-icon',
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  };

  // --- VERTICAL TIME SLIDER HANDLERS ---
  const updateTimeFromMouse = (clientY: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    const percentage = 1 - (y / rect.height);
    const newTime = Math.round(percentage * 24);
    setTime(Math.max(0, Math.min(24, newTime)));
  };

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateTimeFromMouse(e.clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) updateTimeFromMouse(e.clientY);
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="flex flex-col h-screen w-full bg-gray-100 p-0 md:p-3 gap-0 md:gap-3 font-sans overflow-hidden">
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[2500] bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 border border-emerald-400 animate-in fade-in slide-in-from-top-2 duration-200">
          <Check size={16} className="stroke-[3]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Application Header - Desktop Only */}
      <header className="hidden md:flex bg-white rounded-xl shadow-xs border border-gray-200 px-4 py-2.5 items-center justify-between gap-4 shrink-0 z-30">
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-indigo-600 text-white p-1.5 rounded-lg flex items-center justify-center shadow-xs">
            <Compass size={18} />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center min-w-0">
          <h1 className="text-base font-bold text-gray-800 tracking-tight text-center truncate px-1">
            Macau Tourist Attraction Crowd Flow Prediction & Peak-Avoidance Route Planning System
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Real-time Beijing Time Live Clock */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50/80 border border-indigo-200 text-xs font-medium text-indigo-950 shadow-2xs">
            <Clock size={12} className="text-indigo-600 shrink-0" />
            <span className="text-[11px] text-gray-500 font-normal">{t('beijing_time')}:</span>
            <span className="font-mono font-bold text-indigo-700 text-xs">{liveBeijingTimeStr}</span>
            <span className="flex h-2 w-2 relative ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>

          {/* AI Model Architecture Inspector Button */}
          <button
            onClick={() => setShowModelModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 text-xs font-semibold text-indigo-700 hover:from-indigo-100 hover:to-blue-100 transition-all shadow-2xs cursor-pointer"
          >
            <Cpu size={14} className="text-indigo-600" />
            <span>LSTM Model</span>
            <span className={`w-2 h-2 rounded-full ${lstmStatus.connected ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
          </button>
        </div>
      </header>

      {/* Main Desktop Container */}
      <div className="hidden md:flex flex-1 gap-3 overflow-hidden min-h-0">
        {/* Left Sidebar Panel */}
        <div className="w-96 bg-white rounded-xl shadow-xs border border-gray-200 flex flex-col overflow-hidden z-20 shrink-0">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 bg-gray-50/50 p-1 gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('crowd')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'crowd'
                  ? 'bg-white text-indigo-600 shadow-xs border border-gray-200/80'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
              }`}
            >
              <Activity size={14} />
              <span>{t('tab_crowd')}</span>
            </button>
            <button
              onClick={() => setActiveTab('plan')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'plan'
                  ? 'bg-white text-indigo-600 shadow-xs border border-gray-200/80'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
              }`}
            >
              <Navigation size={14} />
              <span>{t('tab_route')}</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'crowd' && (
              <CrowdContent 
                t={t}
                lang={lang}
                translations={translations}
                crowdAttractions={crowdAttractions}
                filteredAttractions={filteredAttractions}
                crowdStats={crowdStats}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                crowdSearchQuery={crowdSearchQuery}
                setCrowdSearchQuery={setCrowdSearchQuery}
                selectedRegionFilter={selectedRegionFilter}
                setSelectedRegionFilter={setSelectedRegionFilter}
                selectedCrowdSpotId={selectedCrowdSpotId}
                setSelectedCrowdSpotId={setSelectedCrowdSpotId}
                onSelectSpot={(id) => {
                  setSelectedCrowdSpotId(id);
                  setSelectedMobileSpotId(id);
                  setMobileTab('map');
                }}
                onSetStart={handleSetStartFromPoi}
                onAddDest={handleAddDestFromPoi}
                time={time}
                setTime={setTime}
                getLiveBeijingTime={getLiveBeijingTime}
              />
            )}

            {activeTab === 'plan' && (
              <PlanContent 
                t={t}
                lang={lang}
                isOptimized={isOptimized}
                setIsOptimized={setIsOptimized}
                isLstmAssisted={isLstmAssisted}
                routeOptimizationSummary={routeOptimizationSummary}
                transportMode={transportMode}
                handleTransportModeChange={handleTransportModeChange}
                isEnvExpanded={isEnvExpanded}
                setIsEnvExpanded={setIsEnvExpanded}
                envMode={envMode}
                setEnvMode={setEnvMode}
                realtimeEnv={realtimeEnv}
                rainfallMm={rainfallMm}
                setRainfallMm={setRainfallMm}
                holidayStage={holidayStage}
                setHolidayStage={setHolidayStage}
                handleOptimizeRoute={handleOptimizeRoute}
                fetchRealtimeEnv={fetchRealtimeEnv}
                currentWaypoints={currentWaypoints}
                startTime={startTime}
                setStartTime={setStartTime}
                liveBeijingTimeStr={liveBeijingTimeStr}
                getLiveBeijingTime={getLiveBeijingTime}
                handleToggleCustomMode={handleToggleCustomMode}
                handleDeleteDestination={handleDeleteDestination}
                handleSetCustomLocation={handleSetCustomLocation}
                handleSelectPoi={handleSelectPoi}
                waypointDurations={waypointDurations}
                setWaypointDurations={setWaypointDurations}
                handleAddDestination={handleAddDestination}
                isCalculatingRoute={isCalculatingRoute}
                onStartNavigation={handleStartNavigation}
                hasPendingManualSort={hasPendingManualSort}
                isCustomOrderSaved={isCustomOrderSaved}
                onConfirmManualSort={handleConfirmManualSort}
                onClearPlan={handleClearPlan}
                onOpenHistory={() => setShowHistoryModal(true)}
              />
            )}
          </div>

          {/* Desktop Settings Footer */}
          <div className="p-3 border-t border-gray-200 bg-gray-50/50 shrink-0">
            <SettingsContent 
              lang={lang}
              setLang={setLang}
              fontSize={fontSize}
              setFontSize={setFontSize}
              t={t}
              lstmStatus={lstmStatus}
              onTestLstm={() => checkLstmHealth(lstmServiceUrlInput)}
              realtimeEnv={realtimeEnv}
            />
          </div>
        </div>

        {/* Desktop Map Container */}
        <div className="flex-1 bg-white rounded-xl shadow-xs border border-gray-200 relative overflow-hidden flex flex-col">
          <MapContainer 
            center={[22.175, 113.55]} 
            zoom={13} 
            minZoom={12}
            maxBounds={macauBounds}
            maxBoundsViscosity={1.0}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapController 
              targetLocation={(() => {
                const targetId = selectedCrowdSpotId || selectedMobileSpotId;
                if (!targetId) return null;
                const spot = crowdAttractions.find(a => a.id === targetId || a.name === targetId);
                if (spot && Number.isFinite(Number(spot.lat)) && Number.isFinite(Number(spot.lng)) && Number(spot.lat) !== 0 && Number(spot.lng) !== 0) {
                  return { lat: Number(spot.lat), lng: Number(spot.lng), id: spot.id };
                }
                const poi = MACAU_POIS.find(p => p.id === targetId);
                if (poi && Number.isFinite(Number(poi.lat)) && Number.isFinite(Number(poi.lng)) && Number(poi.lat) !== 0 && Number(poi.lng) !== 0) {
                  return { lat: Number(poi.lat), lng: Number(poi.lng), id: poi.id };
                }
                const wp = safeCurrentWaypoints.find(w => w.id === targetId || w.poiId === targetId);
                if (wp && Number.isFinite(Number(wp.lat)) && Number.isFinite(Number(wp.lng)) && Number(wp.lat) !== 0 && Number(wp.lng) !== 0) {
                  return { lat: Number(wp.lat), lng: Number(wp.lng), id: wp.id };
                }
                return null;
              })()} 
            />

            {/* Desktop Markers: Respect Navigation Mode & Magnifying Glass Filter */}
            {((activeTab === 'crowd' && !isNavigating) || (isNavigating && showAllSpotsInNav)) && crowdAttractions.map((attr) => {
              const lat = Number(attr.lat);
              const lng = Number(attr.lng);
              if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;
              return (
                <Marker 
                  key={attr.id} 
                  position={[lat, lng]}
                  icon={createCustomIcon(attr, false)}
                  eventHandlers={{
                    click: () => setSelectedCrowdSpotId(attr.id)
                  }}
                />
              );
            })}

            {/* Waypoints Markers (Default shown during navigation) */}
            {(activeTab === 'plan' || isNavigating) && safeCurrentWaypoints.map((wp) => {
              const lat = Number(wp.lat);
              const lng = Number(wp.lng);
              if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;
              return (
                <Marker 
                  key={wp.id} 
                  position={[lat, lng]}
                  icon={createCustomIcon(wp, true)}
                />
              );
            })}

            {/* Route Geometry */}
            {(activeTab === 'plan' || isNavigating) && routeCoordinates.length >= 2 && (
              <Polyline 
                positions={routeCoordinates} 
                pathOptions={{ 
                  color: isOptimized ? '#10b981' : '#4f46e5', 
                  weight: isOptimized && routeGeometry ? 5 : 4, 
                  dashArray: isOptimized && routeGeometry ? undefined : '8, 8', 
                  opacity: 0.85 
                }} 
              />
            )}
          </MapContainer>

          {/* Desktop Magnifying Glass Control in Navigation Mode */}
          {isNavigating && (
            <div className="absolute top-4 right-4 z-[1100] flex items-center gap-2 pointer-events-auto animate-in fade-in duration-200">
              <button
                onClick={() => {
                  const next = !showAllSpotsInNav;
                  setShowAllSpotsInNav(next);
                  triggerToast(next ? (t('toast_all_spots_expanded') || '🔍 已展开显示全部景点人流量') : (t('toast_only_waypoints') || '📍 已恢复仅显示路线经停点热力图'));
                }}
                className={`px-3.5 py-2 rounded-2xl shadow-xl border flex items-center gap-2 transition-all cursor-pointer ${
                  showAllSpotsInNav
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-300 ring-2 ring-indigo-200'
                    : 'bg-white/95 text-gray-800 border-gray-200/90 hover:bg-gray-50'
                }`}
                title={showAllSpotsInNav ? (t('toggle_all_spots_expanded_title') || '点击切回仅看经停点') : (t('toggle_all_spots_collapsed_title') || '点击查看所有景点人流量')}
              >
                <Search size={16} className={showAllSpotsInNav ? 'text-white' : 'text-indigo-600'} />
                <span className="text-xs font-bold">
                  {showAllSpotsInNav ? (t('toggle_all_spots_expanded_title') || '全城人流已展开 (点击收起)') : (t('toggle_all_spots_collapsed_title') || '点击查看所有景点人流')}
                </span>
              </button>
              <button
                onClick={handleStopNavigation}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {t('exit_nav') || '退出导航'}
              </button>
            </div>
          )}

          {/* Top Floating Search Bar on Desktop Map */}
          <div className="absolute top-3 left-3 z-[1100] w-96 max-w-[calc(100%-2rem)] flex flex-col gap-2 pointer-events-none">
            <div 
              onClick={() => openSearchModal()}
              className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-gray-200/90 flex items-center px-4 py-2.5 gap-2.5 cursor-pointer transition-all hover:shadow-xl hover:border-indigo-300"
            >
              <Search size={18} className="text-gray-400 shrink-0" />
              <div className="flex-1 text-xs text-gray-500 truncate font-medium">
                {t('search_or_custom_input') || '在此处搜索景点、餐馆、酒店、口岸或输入任意地址...'}
              </div>
            </div>
          </div>

          {/* Desktop Floating POI Detail Card */}
          <MobilePoiDetailCard 
            spotId={selectedCategory ? null : (selectedCrowdSpotId || selectedMobileSpotId)}
            onClose={closePoiDetails}
            crowdAttractions={crowdAttractions}
            onSetStart={handleSetStartFromPoi}
            onAddDest={handleAddDestFromPoi}
            onLocateSpot={(id) => {
              setSelectedCrowdSpotId(id);
              setSelectedMobileSpotId(id);
              setMobileTab('map');
            }}
            t={t}
            lang={lang}
            isDesktop={true}
          />

          {/* Vertical Time Slider on Map */}
          {activeTab === 'crowd' && (
            <div className="absolute top-1/2 right-6 -translate-y-1/2 h-[64vh] w-14 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-gray-200 flex flex-col items-center py-4 z-[1000] select-none">
              <button
                onClick={() => {
                  const live = getLiveBeijingTime();
                  setTime(live.hour + live.minute / 60);
                }}
                className="text-[9px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded-full mb-2 transition-colors flex items-center gap-0.5 cursor-pointer"
              >
                <RotateCcw size={8} />
                <span>{t('live_badge')}</span>
              </button>
              
              <div className="text-[10px] font-bold text-gray-400 mb-2">24:00</div>
              
              <div 
                className="flex-1 relative w-full flex justify-center py-2 cursor-pointer"
                ref={sliderRef}
                onMouseDown={handleSliderMouseDown}
              >
                <div className="absolute top-0 bottom-0 w-1.5 bg-gray-200 rounded-full"></div>
                <div 
                  className="absolute bottom-0 w-1.5 bg-indigo-500 rounded-full transition-all duration-100"
                  style={{ height: `${(time / 24) * 100}%` }}
                ></div>
                <div 
                  className="absolute w-5 h-5 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-grab active:cursor-grabbing transform -translate-y-1/2 transition-all duration-100 hover:scale-110"
                  style={{ bottom: `calc(${(time / 24) * 100}% - 10px)` }}
                >
                  <div className="absolute -left-16 top-1/2 -translate-y-1/2 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm whitespace-nowrap flex items-center gap-1">
                    <span>{(() => {
                      const displayHour = Math.floor(time);
                      const displayMinute = Math.round((time - displayHour) * 60);
                      return `${String(displayHour).padStart(2, '0')}:${String(displayMinute).padStart(2, '0')}`;
                    })()}</span>
                    {Math.abs(time - (getLiveBeijingTime().hour + getLiveBeijingTime().minute / 60)) < 0.05 && (
                      <span className="text-[9px] bg-emerald-400 text-emerald-950 font-extrabold px-1 rounded">
                        {t('live_badge')}
                      </span>
                    )}
                  </div>
                </div>
                {[0, 6, 12, 18, 24].map((tick) => (
                  <div 
                    key={tick} 
                    className="absolute w-2.5 h-0.5 bg-gray-300 pointer-events-none"
                    style={{ bottom: `${(tick / 24) * 100}%` }}
                  ></div>
                ))}
              </div>
              <div className="text-[10px] font-bold text-gray-400 mt-2">0:00</div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MOBILE FULL-SCREEN VIEW (Matching User Images 1 - 6)       */}
      {/* ========================================================= */}
      <div className="flex md:hidden flex-1 w-full h-full flex-col relative overflow-hidden min-h-0 bg-white">
        {/* Full-bleed Map Canvas to very top */}
        <div className="flex-1 relative w-full h-full overflow-hidden">
          <MapContainer 
            center={[22.175, 113.55]} 
            zoom={13} 
            minZoom={12}
            maxBounds={macauBounds}
            maxBoundsViscosity={1.0}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapController 
              targetLocation={(() => {
                const targetId = selectedMobileSpotId || selectedCrowdSpotId;
                if (!targetId) return null;
                const spot = crowdAttractions.find(a => a.id === targetId || a.name === targetId);
                if (spot && Number.isFinite(Number(spot.lat)) && Number.isFinite(Number(spot.lng)) && Number(spot.lat) !== 0 && Number(spot.lng) !== 0) {
                  return { lat: Number(spot.lat), lng: Number(spot.lng), id: spot.id };
                }
                const poi = MACAU_POIS.find(p => p.id === targetId);
                if (poi && Number.isFinite(Number(poi.lat)) && Number.isFinite(Number(poi.lng)) && Number(poi.lat) !== 0 && Number(poi.lng) !== 0) {
                  return { lat: Number(poi.lat), lng: Number(poi.lng), id: poi.id };
                }
                const wp = safeCurrentWaypoints.find(w => w.id === targetId || w.poiId === targetId);
                if (wp && Number.isFinite(Number(wp.lat)) && Number.isFinite(Number(wp.lng)) && Number(wp.lat) !== 0 && Number(wp.lng) !== 0) {
                  return { lat: Number(wp.lat), lng: Number(wp.lng), id: wp.id };
                }
                return null;
              })()}
            />

            {/* Mobile Markers (all spots mode) */}
            {(!isNavigating || showAllSpotsInNav) && crowdAttractions.map((attr) => {
              const lat = Number(attr.lat);
              const lng = Number(attr.lng);
              if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;

              const isCategoryMatch = selectedCategory ? (
                selectedCategory === 'attraction' ? (attr.category === 'heritage' || attr.category === 'landmark' || attr.category === 'nature') :
                selectedCategory === 'food' ? attr.category === 'food' :
                selectedCategory === 'hotel' ? (attr.category === 'hotel' || attr.category === 'resort') :
                selectedCategory === 'cafe' ? attr.category === 'cafe' :
                selectedCategory === 'shopping' ? (attr.category === 'shopping' || attr.category === 'resort') :
                selectedCategory === 'port' ? attr.category === 'port' : true
              ) : true;

              return (
                <Marker 
                  key={`mob-${attr.id}`} 
                  position={[lat, lng]}
                  icon={createCustomIcon(attr, false, isCategoryMatch, selectedCategory !== null)}
                  opacity={selectedCategory && !isCategoryMatch ? 0.35 : 1}
                  eventHandlers={{
                    click: () => {
                      setSelectedMobileSpotId(attr.id);
                      setSelectedCrowdSpotId(attr.id);
                    }
                  }}
                />
              );
            })}

            {/* Navigation mode markers: always use optimized waypoint sequence/time/crowd */}
            {isNavigating && !showAllSpotsInNav && safeCurrentWaypoints.map((wp) => {
              const lat = Number(wp.lat);
              const lng = Number(wp.lng);
              if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;
              return (
                <Marker 
                  key={`mob-nav-${wp.id}`} 
                  position={[lat, lng]}
                  icon={createCustomIcon(wp, true)}
                  eventHandlers={{
                    click: () => {
                      setSelectedMobileSpotId(wp.poiId || wp.id);
                      setSelectedCrowdSpotId(wp.poiId || wp.id);
                    }
                  }}
                />
              );
            })}

            {/* Route Geometry */}
            {routeCoordinates.length >= 2 && (
              <Polyline 
                positions={routeCoordinates} 
                pathOptions={{ 
                  color: isOptimized ? '#10b981' : '#4f46e5', 
                  weight: isOptimized && routeGeometry ? 5 : 4, 
                  dashArray: isOptimized && routeGeometry ? undefined : '8, 8', 
                  opacity: 0.85 
                }} 
              />
            )}
          </MapContainer>

          {/* Top Floating Search Bar, Navigation Bar & Category Chips - Z-index high above Leaflet layers */}
          <div className="absolute top-3 left-3 right-3 z-[1100] flex flex-col gap-2 pointer-events-none">
            {/* Top Search Input Bar with User Avatar on right (Image 1) */}
            <div 
              onClick={() => openSearchModal()}
              className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-gray-200/90 flex items-center px-3.5 py-2.5 gap-2.5 cursor-pointer transition-all hover:shadow-xl"
            >
              <Search size={18} className="text-gray-400 shrink-0" />
              <div className="flex-1 text-xs text-gray-500 truncate">
                {t('search_or_custom_input') || '在此处搜索景点、餐馆、酒店...'}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setMobileTab('settings');
                  }}
                  className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs cursor-pointer ring-2 ring-white"
                  title={lang === 'en' ? 'User Settings' : lang === 'pt' ? 'Definições do Usuário' : '用户设置'}
                >
                  🇲🇴
                </div>
              </div>
            </div>

            {/* Category Pills Row (Image 1: 景点, 餐馆, 酒店, 咖啡馆, 购物, 口岸交通) */}
            <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'attraction', label: '景点', nameKey: 'cat_pills_attraction', icon: '🏛️' },
                { id: 'food', label: '餐馆', nameKey: 'cat_pills_food', icon: '🍽️' },
                { id: 'hotel', label: '酒店', nameKey: 'cat_pills_hotel', icon: '🛏️' },
                { id: 'cafe', label: '咖啡馆', nameKey: 'cat_pills_cafe', icon: '☕' },
                { id: 'shopping', label: '购物', nameKey: 'cat_pills_shopping', icon: '🛍️' },
                { id: 'port', label: '口岸交通', nameKey: 'cat_pills_port', icon: '🚢' }
              ].map(cat => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      const next = isActive ? null : cat.id;
                      setSelectedCategory(next);
                      if (next) {
                        setSelectedMobileSpotId(null);
                        setSelectedCrowdSpotId(null);
                      }
                    }}
                    className={`shrink-0 backdrop-blur-md rounded-full px-3 py-1.5 text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-indigo-600 text-white border border-indigo-600 shadow-md ring-2 ring-indigo-200' 
                        : 'bg-white/95 border border-gray-200/90 text-gray-800 hover:bg-indigo-50 hover:border-indigo-200'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{t(cat.nameKey as any) || cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Floating Magnifying Glass Action Button (Preserved for Nav Mode) */}
          {isNavigating && (
            <div className="absolute right-3.5 top-28 z-[1100] flex flex-col items-center gap-2 pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => {
                  const next = !showAllSpotsInNav;
                  setShowAllSpotsInNav(next);
                  triggerToast(next ? (t('toast_all_spots_expanded') || '🔍 已展开显示全部景点人流量') : (t('toast_only_waypoints') || '📍 已恢复仅显示路线经停点热力图'));
                }}
                className={`p-3 rounded-2xl shadow-xl border flex flex-col items-center gap-1 transition-all active:scale-90 cursor-pointer ${
                  showAllSpotsInNav
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-300 ring-4 ring-indigo-200/80 scale-105'
                    : 'bg-white/95 text-gray-800 border-gray-200/90 hover:bg-gray-50 hover:shadow-2xl'
                }`}
                title={showAllSpotsInNav ? (t('toggle_all_spots_expanded_title') || '点击切回仅看经停点') : (t('toggle_all_spots_collapsed_title') || '点击查看所有景点人流量情况')}
              >
                <div className="relative">
                  <Search size={22} className={showAllSpotsInNav ? 'text-white' : 'text-indigo-600'} />
                  {!showAllSpotsInNav && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white animate-pulse" />
                  )}
                </div>
                <span className="text-[10px] font-extrabold whitespace-nowrap">
                  {showAllSpotsInNav ? (t('toggle_all_spots_expanded_short') || '全城人流') : (t('toggle_all_spots_collapsed_short') || '查看全城')}
                </span>
              </button>
            </div>
          )}

          {/* Quick Route Summary Floating Pill on Mobile Map */}
          {mobileTab === 'map' && !selectedMobileSpotId && (
            <div className="absolute bottom-3 left-3 right-3 z-[1050] pointer-events-auto">
              {planWaypoints.filter(w => w.type === 'dest').length === 0 ? (
                <div className="flex justify-center animate-fade-in">
                  <button
                    onClick={handleStartNavigation}
                    className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-sm font-extrabold shadow-xl shadow-emerald-200/60 active:scale-95 transition-transform flex items-center gap-2 cursor-pointer"
                  >
                    <Navigation size={18} />
                    <span>{t('start_nav') || 'Start Navigation'}</span>
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => setMobileTab('plan')}
                  className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-gray-200 flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-50 transition-all animate-fade-in"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 shadow-sm ${
                      isNavigating ? 'bg-emerald-600 shadow-emerald-200' : 'bg-indigo-600 shadow-indigo-200'
                    }`}>
                      <Navigation size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                        {!isNavigating && (
                          <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-md font-extrabold tracking-wide">
                            {isOptimized 
                              ? (lang === 'en' ? 'AI Optimized' : lang === 'pt' ? 'Rota Otimizada' : '已避峰优化路线') 
                              : (lang === 'en' ? 'Current Plan' : lang === 'pt' ? 'Plano Atual' : '最新规划路线')}
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-extrabold border border-indigo-100">
                          {t('total_prefix')}{currentWaypoints.length}{t('stations_unit')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {!isNavigating ? (
                      <button
                        onClick={handleStartNavigation}
                        className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-transform flex items-center gap-1 cursor-pointer"
                      >
                        <Navigation size={13} />
                        <span>{t('start_nav') || '开始导航'}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleStopNavigation}
                          className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          title={lang === 'en' ? 'Exit navigation mode' : lang === 'pt' ? 'Sair do modo de navegação' : '退出导航模式'}
                        >
                          {t('exit_nav') || '退出'}
                        </button>
                        <button
                          onClick={() => setMobileTab('plan')}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-transform cursor-pointer"
                        >
                          {t('route_details_btn') || '路线详情'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* POI Detail Bottom Card (Image 4) */}
          <MobilePoiDetailCard 
            spotId={selectedCategory ? null : (selectedMobileSpotId || selectedCrowdSpotId)}
            onClose={closePoiDetails}
            crowdAttractions={crowdAttractions}
            onSetStart={handleSetStartFromPoi}
            onAddDest={handleAddDestFromPoi}
            onLocateSpot={(id) => {
              setSelectedCrowdSpotId(id);
              setSelectedMobileSpotId(id);
              setMobileTab('map');
            }}
            t={t}
            lang={lang}
          />

          {/* Category Places Drawer (Image 3 / 画面3) */}
          <MobileCategoryDrawer 
            category={selectedCategory}
            onClose={() => setSelectedCategory(null)}
            crowdAttractions={crowdAttractions}
            onSelectSpot={(id) => {
              setSelectedMobileSpotId(id);
              setSelectedCategory(null);
            }}
            onSetStart={handleSetStartFromPoi}
            onAddDest={handleAddDestFromPoi}
            t={t}
            lang={lang}
          />

          {/* Multi-Stop Route Management Drawer (Image 5 & 6) */}
          {showMobileRouteDrawer && (
            <MobileRouteView 
              currentWaypoints={currentWaypoints}
              waypointDurations={waypointDurations}
              setWaypointDurations={setWaypointDurations}
              onDeleteDestination={handleDeleteDestination}
              onMoveWaypoint={handleMoveWaypoint}
              onOpenAddModal={() => {
                const destCount = planWaypoints.filter(wp => wp.type === 'dest').length;
                if (destCount >= 8) {
                  triggerToast(maxDestinationsToast());
                  return;
                }
                setShowMobileRouteDrawer(false);
                setMobileTab('plan');
              }}
              isOptimized={isOptimized}
              onOptimizeRoute={() => handleOptimizeRoute()}
              isCalculatingRoute={isCalculatingRoute}
              transportMode={transportMode}
              onTransportModeChange={handleTransportModeChange}
              onClose={() => setShowMobileRouteDrawer(false)}
              t={t}
              isNavigating={isNavigating}
              onStartNavigation={handleStartNavigation}
              hasPendingManualSort={hasPendingManualSort}
              isCustomOrderSaved={isCustomOrderSaved}
              onConfirmManualSort={handleConfirmManualSort}
            />
          )}

          {/* Fullscreen Search Modal (Image 2) */}
          <MobileSearchModal 
            isOpen={isMobileSearchOpen}
            onClose={closeSearchModal}
            crowdAttractions={crowdAttractions}
            translations={translations}
            lang={lang}
            onSelectSpot={(id) => {
              setSelectedMobileSpotId(id);
              setSelectedCrowdSpotId(id);
              setSelectedCategory(null);
              closeSearchModal();
              setMobileTab('map');
            }}
            onSetCustomStart={handleSetCustomStart}
            onAddCustomDest={handleAddCustomDestination}
            onOpenEnvModal={() => {
              closeSearchModal();
              setShowMobileEnvModal(true);
            }}
            t={t}
          />
        </div>

        {/* Mobile Full Screen Overlays for Crowd, Plan, Settings */}
        {mobileTab !== 'map' && (
          <div className="absolute inset-0 z-[1200] bg-white flex flex-col animate-in fade-in duration-150">
            {/* Grab Bar / Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-white shrink-0 shadow-2xs gap-1.5 relative z-30">
              {/* Left Side: Language & Font Size Switcher (Icon-only) */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Language Switcher Dropdown - Icon Only */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowLangMenu(prev => !prev);
                      setShowFontMenu(false);
                    }}
                    className="w-8 h-8 rounded-xl border border-indigo-200/90 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-2xs transition-all active:scale-95 cursor-pointer"
                    title={t('language')}
                  >
                    <Globe size={16} className="text-indigo-600" />
                  </button>

                  {showLangMenu && (
                    <>
                      <div className="fixed inset-0 z-[1250]" onClick={() => setShowLangMenu(false)} />
                      <div className="absolute left-0 top-full mt-1.5 z-[1300] bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 w-36 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-1">
                          {t('language')}
                        </div>
                        {LANG_OPTIONS.map(opt => (
                          <button
                            key={opt.code}
                            onClick={() => {
                              setLang(opt.code);
                              setShowLangMenu(false);
                              triggerToast(translations[opt.code].language_changed.replace('{name}', opt.fullLabel));
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-indigo-50 transition-colors cursor-pointer ${
                              lang === opt.code ? 'font-bold text-indigo-600 bg-indigo-50/60' : 'text-gray-700'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>{opt.flag}</span>
                              <span>{opt.fullLabel}</span>
                            </span>
                            {lang === opt.code && <Check size={13} className="text-indigo-600" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Font Size Switcher Dropdown - Icon Only */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowFontMenu(prev => !prev);
                      setShowLangMenu(false);
                    }}
                    className="w-8 h-8 rounded-xl border border-gray-200/90 bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center justify-center shadow-2xs transition-all active:scale-95 cursor-pointer"
                    title={t('text_size')}
                  >
                    <Type size={16} className="text-gray-600" />
                  </button>

                  {showFontMenu && (
                    <>
                      <div className="fixed inset-0 z-[1250]" onClick={() => setShowFontMenu(false)} />
                      <div className="absolute left-0 top-full mt-1.5 z-[1300] bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 w-36 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-1">
                          {t('text_size')}
                        </div>
                        {FONT_OPTIONS.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => {
                              setFontSize(opt.id);
                              setShowFontMenu(false);
                              triggerToast(t('font_changed').replace('{name}', t(opt.id)));
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-indigo-50 transition-colors cursor-pointer ${
                              fontSize === opt.id ? 'font-bold text-indigo-600 bg-indigo-50/60' : 'text-gray-700'
                            }`}
                          >
                            <div>
                              <div>{t(opt.id)}</div>
                              <div className="text-[10px] text-gray-400 font-normal">{opt.id === 'standard' ? '100%' : opt.id === 'large' ? '110%' : '120%'}</div>
                            </div>
                            {fontSize === opt.id && <Check size={13} className="text-indigo-600" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right Side: Action Buttons (Icon-only for Clear & History, clear prominent Return to Map) */}
              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                {mobileTab === 'plan' && (
                  <>
                    <button
                      onClick={handleClearPlan}
                      className="w-8 h-8 rounded-xl border border-rose-200/90 bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-all active:scale-95 shrink-0 cursor-pointer shadow-2xs"
                      title={t('clear_plan')}
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      onClick={() => setShowHistoryModal(true)}
                      className="w-8 h-8 rounded-xl border border-indigo-200/90 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center transition-all active:scale-95 shrink-0 cursor-pointer shadow-2xs"
                      title={lang === 'en' ? 'History Records' : lang === 'pt' ? 'Histórico de Rotas' : '历史规划记录'}
                    >
                      <History size={15} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setMobileTab('map')}
                  className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap active:scale-95"
                >
                  <span>{t('mobile_back_to_map') || '返回地图'} ✕</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              {mobileTab === 'crowd' && (
                <CrowdContent 
                  t={t}
                  lang={lang}
                  translations={translations}
                  crowdAttractions={crowdAttractions}
                  filteredAttractions={filteredAttractions}
                  crowdStats={crowdStats}
                  sortOrder={sortOrder}
                  setSortOrder={setSortOrder}
                  crowdSearchQuery={crowdSearchQuery}
                  setCrowdSearchQuery={setCrowdSearchQuery}
                  selectedRegionFilter={selectedRegionFilter}
                  setSelectedRegionFilter={setSelectedRegionFilter}
                  selectedCrowdSpotId={selectedCrowdSpotId}
                  setSelectedCrowdSpotId={setSelectedCrowdSpotId}
                  onSelectSpot={(id) => {
                    setSelectedMobileSpotId(id);
                    setMobileTab('map');
                  }}
                  onSetStart={(id) => {
                    handleSetStartFromPoi(id);
                  }}
                  onAddDest={(id) => {
                    handleAddDestFromPoi(id);
                  }}
                  time={time}
                  setTime={setTime}
                  getLiveBeijingTime={getLiveBeijingTime}
                  onClose={() => setMobileTab('map')}
                />
              )}

              {mobileTab === 'plan' && (
                <PlanContent 
                  t={t}
                  lang={lang}
                  isOptimized={isOptimized}
                  setIsOptimized={setIsOptimized}
                  isLstmAssisted={isLstmAssisted}
                  routeOptimizationSummary={routeOptimizationSummary}
                  transportMode={transportMode}
                  handleTransportModeChange={handleTransportModeChange}
                  isEnvExpanded={isEnvExpanded}
                  setIsEnvExpanded={setIsEnvExpanded}
                  envMode={envMode}
                  setEnvMode={setEnvMode}
                  realtimeEnv={realtimeEnv}
                  rainfallMm={rainfallMm}
                  setRainfallMm={setRainfallMm}
                  holidayStage={holidayStage}
                  setHolidayStage={setHolidayStage}
                  handleOptimizeRoute={handleOptimizeRoute}
                  fetchRealtimeEnv={fetchRealtimeEnv}
                  currentWaypoints={currentWaypoints}
                  startTime={startTime}
                  setStartTime={setStartTime}
                  liveBeijingTimeStr={liveBeijingTimeStr}
                  getLiveBeijingTime={getLiveBeijingTime}
                  handleToggleCustomMode={handleToggleCustomMode}
                  handleDeleteDestination={handleDeleteDestination}
                  handleSetCustomLocation={handleSetCustomLocation}
                  handleSelectPoi={handleSelectPoi}
                  waypointDurations={waypointDurations}
                  setWaypointDurations={setWaypointDurations}
                  handleAddDestination={handleAddDestination}
                  isCalculatingRoute={isCalculatingRoute}
                  onNavigateToMap={() => setMobileTab('map')}
                  onStartNavigation={handleStartNavigation}
                  hasPendingManualSort={hasPendingManualSort}
                  isCustomOrderSaved={isCustomOrderSaved}
                  onConfirmManualSort={handleConfirmManualSort}
                  onClearPlan={handleClearPlan}
                  onOpenHistory={() => setShowHistoryModal(true)}
                />
              )}

              {mobileTab === 'settings' && (
                <SettingsContent 
                  lang={lang}
                  setLang={setLang}
                  fontSize={fontSize}
                  setFontSize={setFontSize}
                  t={t}
                  lstmStatus={lstmStatus}
                  onTestLstm={() => checkLstmHealth(lstmServiceUrlInput)}
                  realtimeEnv={realtimeEnv}
                  onResetItinerary={() => {
                    setPlanWaypoints([{ ...DEFAULT_START_WAYPOINT }]);
                    setWaypointDurations({ 'start': 45 });
                    setIsOptimized(false);
                    setHasPendingManualSort(false);
                    setIsCustomOrderSaved(false);
                    setDynamicOptimizedWaypoints(null);
                    setRouteGeometry(null);
                    setMobileTab('map');
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Mobile Environmental / Weather Modal */}
        {showMobileEnvModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end animate-in fade-in duration-200">
            <div className="w-full bg-white rounded-t-3xl shadow-2xl border-t border-gray-200 p-4 space-y-3.5 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <CloudRain size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{t('quick_weather_env')}</h3>
                    <p className="text-[10px] text-gray-500">
                      {envMode === 'auto' ? '实时同步气象局与法定假期' : '自定义降雨量与节假日客流情景'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMobileEnvModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full bg-gray-100"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Mode Toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => {
                    setEnvMode('auto');
                    setRainfallMm(realtimeEnv.rainfall_prev_1h_mm);
                    setHolidayStage(realtimeEnv.holiday_stage);
                    if (isOptimized) handleOptimizeRoute();
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    envMode === 'auto' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600'
                  }`}
                >
                  {t('mode_auto_govt')}
                </button>
                <button
                  onClick={() => setEnvMode('scenario')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    envMode === 'scenario' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600'
                  }`}
                >
                  {t('mode_manual_scenario')}
                </button>
              </div>

              {/* Weather Rain Options */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <CloudRain size={13} className="text-blue-500" />
                  <span>{t('weather_label')}</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'no_rain', labelKey: 'weather_no_rain', val: 0.0, icon: Sun, color: 'text-amber-500' },
                    { id: 'light_rain', labelKey: 'weather_light_rain', val: 5.0, icon: CloudDrizzle, color: 'text-sky-500' },
                    { id: 'heavy_rain', labelKey: 'weather_heavy_rain', val: 20.0, icon: CloudRain, color: 'text-blue-600' }
                  ].map(r => {
                    const Icon = r.icon;
                    const isSelected = rainfallMm === r.val;
                    return (
                      <button
                        key={r.val}
                        onClick={() => {
                          setEnvMode('scenario');
                          setRainfallMm(r.val);
                          if (isOptimized) handleOptimizeRoute();
                        }}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          isSelected 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Icon size={18} className={isSelected ? 'text-white' : r.color} />
                        <span className="mt-1">{t(r.labelKey as any)}</span>
                        <span className="text-[9px] opacity-75 font-mono">{r.val}mm</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Holiday Stage */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <Calendar size={13} className="text-amber-500" />
                  <span>{t('holiday_stage_label')}</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'none', labelKey: 'holiday_stage_none' },
                    { id: 'pre', labelKey: 'holiday_stage_pre' },
                    { id: 'in', labelKey: 'holiday_stage_in' },
                    { id: 'post', labelKey: 'holiday_stage_post' }
                  ].map(h => {
                    const isSelected = holidayStage === h.id;
                    return (
                      <button
                        key={h.id}
                        onClick={() => {
                          setEnvMode('scenario');
                          setHolidayStage(h.id as any);
                          if (isOptimized) handleOptimizeRoute();
                        }}
                        className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all ${
                          isSelected 
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs font-bold' 
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {t(h.labelKey as any)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => setShowMobileEnvModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition-colors"
                >
                  {t('close')}
                </button>
                <button
                  onClick={() => {
                    setShowMobileEnvModal(false);
                    setShowMobileRouteDrawer(true);
                    handleOptimizeRoute();
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-xs"
                >
                  <Navigation size={13} />
                  <span>{t('jump_to_plan')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Bottom Navigation Bar (Google Maps Style) */}
        <div className="h-14 bg-white border-t border-gray-200 flex items-center justify-around z-[1000] shrink-0 select-none">
          <button
            onClick={() => {
              setMobileTab('map');
              setSelectedCategory(null);
            }}
            className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              mobileTab === 'map' ? 'text-indigo-600 font-bold' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MapIcon size={18} />
            <span className="text-[10px]">{t('tab_map')}</span>
          </button>

          <button
            onClick={() => setMobileTab('crowd')}
            className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              mobileTab === 'crowd' ? 'text-indigo-600 font-bold' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Activity size={18} />
            <span className="text-[10px]">{t('tab_crowd')}</span>
          </button>

          <button
            onClick={() => setMobileTab('plan')}
            className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              mobileTab === 'plan' ? 'text-indigo-600 font-bold' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Navigation size={18} />
            <span className="text-[10px]">{t('tab_route')}</span>
          </button>

          <button
            onClick={() => setMobileTab('settings')}
            className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              mobileTab === 'settings' ? 'text-indigo-600 font-bold' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings size={18} />
            <span className="text-[10px]">{t('tab_settings')}</span>
          </button>
        </div>
      </div>

      {/* LSTM Model Inspector & Connection Modal (Desktop/Global) */}
      {showModelModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Cpu size={18} className="text-indigo-600" />
                <h3 className="font-bold text-gray-800 text-sm">
                  LSTM Model Service Settings & Diagnostics
                </h3>
              </div>
              <button 
                onClick={() => setShowModelModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                <div className="font-semibold text-gray-700">🔬 Model Feature Engineering (29 Dimensions):</div>
                <div className="text-gray-500 leading-relaxed font-mono text-[11px]">
                  • Sequence History: LOOKBACK = 96 (24h, 15-min intervals, flow_lag_1~96)<br/>
                  • Holiday Stages: holiday_stage_pre, holiday_stage_in, holiday_stage_post<br/>
                  • Meteorological Feature: rainfall_prev_1h_mm (Previous 1-hour rainfall in mm)<br/>
                  • Spatial Attribute: is_indoor (1: Indoor / 0: Outdoor)
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1">
                <div className="font-semibold text-blue-800 flex items-center gap-1.5">
                  <span>🏛️ Macau Government Open Data Integration:</span>
                </div>
                <div className="text-blue-900/80 leading-relaxed text-[11px]">
                  • <strong>Weather Data</strong>: Macao SMG (hourly precipitation telemetry).<br/>
                  • <strong>Crowd Level</strong>: Macao MGTO real-time tourist flow index.<br/>
                  • <strong>Calendar Engine</strong>: Macau statutory public holiday stage encoder.<br/>
                  • <strong>Dual Mode</strong>: <em>Auto Mode</em> synchronizes live government feeds; <em>Manual Scenario</em> enables future trip simulation and model ablation testing.
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-gray-700 block">
                  Python FastAPI Service URL (Localhost or Public Tunnel / ngrok):
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={lstmServiceUrlInput}
                    onChange={(e) => setLstmServiceUrlInput(e.target.value)}
                    placeholder="e.g. http://127.0.0.1:8000 or ngrok public URL"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <button 
                    onClick={() => checkLstmHealth(lstmServiceUrlInput)}
                    disabled={isTestingLstm}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    {isTestingLstm ? <Loader2 size={14} className="animate-spin" /> : null}
                    <span>Test Connection</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl border flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-gray-800">Connection Status:</div>
                  <div className="text-gray-500 mt-0.5">
                    {lstmStatus.connected 
                      ? "Successfully connected to external Python LSTM inference service" 
                      : "Operating in high-precision standalone Macau simulation mode"}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  lstmStatus.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {lstmStatus.connected ? "Online" : "Standalone Mode"}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button 
                onClick={() => setShowModelModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Route History Modal */}
      <RouteHistoryModal 
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        historyList={historyList}
        onSelectAndEdit={handleSelectAndEditHistory}
        onDeleteHistory={handleDeleteHistory}
        onSaveCurrentToHistory={handleSaveCurrentToHistory}
        lang={lang}
        t={t}
      />
    </div>
  );
}
