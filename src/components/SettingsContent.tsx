import React from 'react';
import { Globe, Type, Cpu, CloudSun, ShieldCheck, RefreshCw, Smartphone, Layers, CheckCircle2, AlertCircle } from 'lucide-react';

interface SettingsContentProps {
  lang: 'en' | 'zh-CN' | 'zh-TW' | 'pt';
  setLang: (lang: 'en' | 'zh-CN' | 'zh-TW' | 'pt') => void;
  fontSize: 'standard' | 'large' | 'xlarge';
  setFontSize: (size: 'standard' | 'large' | 'xlarge') => void;
  t: (key: any) => string;
  lstmStatus?: { connected: boolean; url: string; checked: boolean };
  onTestLstm?: () => void;
  realtimeEnv?: {
    source: string;
    rainfall_prev_1h_mm: number;
    holiday_stage: string;
    is_weekend: boolean;
    date: string;
    description: string;
    connected_to_python: boolean;
  };
  onResetItinerary?: () => void;
}

export const SettingsContent: React.FC<SettingsContentProps> = ({
  lang,
  setLang,
  fontSize,
  setFontSize,
  t,
  lstmStatus,
  onTestLstm,
  realtimeEnv,
  onResetItinerary
}) => {
  return (
    <div className="p-4 space-y-5 bg-white text-gray-800 text-xs overflow-y-auto max-h-[80vh]">
      {/* User Profile Card */}
      <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl shadow-xs">
        <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-bold shadow-md ring-2 ring-white">
          🇲🇴
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-gray-900 truncate">Macau Explorer</h3>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-600 text-white rounded-full">
              PRO
            </span>
          </div>
          <p className="text-[11px] text-gray-500 truncate mt-0.5">
            {t('settings_sub')}
          </p>
        </div>
      </div>

      {/* Language & Display */}
      <div className="space-y-3 bg-gray-50/80 p-3.5 rounded-xl border border-gray-100">
        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Globe size={13} className="text-indigo-500" />
          {t('language')}
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { code: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
            { code: 'zh-TW', label: '繁體中文', flag: '🇭🇰' },
            { code: 'en', label: 'English', flag: '🇺🇸' },
            { code: 'pt', label: 'Português', flag: '🇵🇹' }
          ].map(item => (
            <button
              key={item.code}
              onClick={() => setLang(item.code as any)}
              className={`flex items-center gap-2 p-2.5 rounded-lg border text-left font-medium transition-all ${
                lang === item.code
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-200'
              }`}
            >
              <span className="text-sm">{item.flag}</span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="pt-2 border-t border-gray-200/60">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Type size={13} className="text-indigo-500" />
            {t('text_size')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'standard', label: t('standard') },
              { id: 'large', label: t('large') },
              { id: 'xlarge', label: t('xlarge') }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setFontSize(item.id as any)}
                className={`py-2 px-1 rounded-lg border text-center font-medium transition-all text-xs ${
                  fontSize === item.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI LSTM Engine Status */}
      <div className="space-y-3 bg-gray-50/80 p-3.5 rounded-xl border border-gray-100">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu size={13} className="text-indigo-500" />
            {t('lstm_engine_title')}
          </h4>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
            lstmStatus?.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {lstmStatus?.connected ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
            {lstmStatus?.connected ? t('service_running') : t('simulation_engine')}
          </span>
        </div>

        <div className="p-2.5 bg-white rounded-lg border border-gray-200/80 text-[11px] space-y-1.5">
          <div className="flex justify-between text-gray-500">
            <span>{t('model_arch')}</span>
            <span className="font-semibold text-gray-800">Bi-LSTM + Attention (PyTorch)</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>{t('service_node')}</span>
            <span className="font-mono text-gray-800">{lstmStatus?.url || '127.0.0.1:8000 (Internal)'}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>{t('exogenous_vars')}</span>
            <span className="font-semibold text-indigo-600">{t('exogenous_vars_val')}</span>
          </div>
        </div>

        {onTestLstm && (
          <button
            onClick={onTestLstm}
            className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCw size={12} />
            {t('test_ai_service')}
          </button>
        )}
      </div>

      {/* Real-time Environment Sensor Status */}
      {realtimeEnv && (
        <div className="space-y-2 bg-gray-50/80 p-3.5 rounded-xl border border-gray-100">
          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <CloudSun size={13} className="text-amber-500" />
            {t('smg_sensor_data')}
          </h4>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 bg-white rounded-lg border border-gray-200">
              <span className="text-gray-400 block text-[10px]">{t('past_1h_rain')}</span>
              <span className="font-bold text-gray-800 text-xs">{realtimeEnv.rainfall_prev_1h_mm} mm</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-gray-200">
              <span className="text-gray-400 block text-[10px]">{t('holiday_stage_text')}</span>
              <span className="font-bold text-gray-800 text-xs">{realtimeEnv.holiday_stage}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 space-y-2">
        {onResetItinerary && (
          <button
            onClick={onResetItinerary}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors text-xs"
          >
            <RefreshCw size={13} />
            {t('reset_default_itinerary')}
          </button>
        )}
        <div className="text-center text-[10px] text-gray-400 pt-1">
          {t('system_version')}
        </div>
      </div>
    </div>
  );
};
