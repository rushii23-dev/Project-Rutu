import { useStore } from '../lib/store.jsx'
import { useForecast } from '../lib/useForecast.js'
import { fmtIsoLong, fmtIsoShort, relDayLabel } from '../i18n/index.js'
import { useToday } from '../lib/useToday.js'
import { decodeWeather, sowingAdvice } from '../data/weather.js'
import { Card, Chip, EyebrowLabel } from '../components/ui.jsx'

export default function Weather() {
  const { t, lang, village, district, districtName } = useStore()
  const { week, current, isSample, loading } = useForecast(district)
  const today = useToday()

  const now = decodeWeather(current.code)
  // same rule as Home: no sowing instruction is issued from the sample week
  const advice = isSample ? null : sowingAdvice(week, lang)

  return (
    <div className="px-5 pb-[130px] pt-4">
      <h1 className="display text-[34px] text-ink">{t('weather')}</h1>
      <p className="mt-0.5 text-base text-muted">
        {village ? village + ', ' : ''}
        {districtName()}
      </p>
      <p className="mt-1 text-[15px] font-medium text-faint">{fmtIsoLong(today, lang)}</p>

      <Card className="mt-5 px-6 py-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="display text-[74px] leading-[.95] text-ink">
                {isSample ? '—' : current.temp}
              </span>
              {isSample ? null : (
                <span className="text-xl font-medium text-faint">{t('degC')}</span>
              )}
            </div>
            <div className="mt-1.5 text-[17px] font-medium text-ink-2">
              {isSample ? (loading ? t('fcLoading') : t('fcOffline')) : now[lang]}
            </div>
          </div>
          {isSample ? null : <span className="text-[44px]">{now.icon}</span>}
        </div>
        {isSample ? null : (
          <div className="mt-4.5 flex flex-wrap gap-2" style={{ marginTop: 18 }}>
            <Chip>
              {t('humidity')} {current.humidity}%
            </Chip>
            <Chip>
              {t('wind')} {current.wind} {t('kmh')}
            </Chip>
            <Chip>
              {t('rain')} {current.mm} {t('mm')}
            </Chip>
          </div>
        )}
      </Card>

      {advice ? (
        <div
          className={`mt-3.5 rounded-[28px] p-6 ${advice.tone === 'good' ? 'bg-grow-l' : 'bg-warn-l'}`}
        >
          <EyebrowLabel tone={advice.tone === 'good' ? 'faint' : 'warn'}>
            {t('whatToDo')}
          </EyebrowLabel>
          <div
            className={`display mt-2 text-[26px] leading-snug ${
              advice.tone === 'good' ? 'text-grow-d' : 'text-warn-d'
            }`}
          >
            {advice.title}
          </div>
          <div
            className={`mt-2 text-base leading-relaxed ${
              advice.tone === 'good' ? 'text-grow' : 'text-warn-m'
            }`}
          >
            {advice.body}
          </div>
        </div>
      ) : (
        <div className="mt-3.5 rounded-[28px] bg-chip p-6">
          <EyebrowLabel>{t('whatToDo')}</EyebrowLabel>
          <div className="display mt-2 text-[26px] leading-snug text-ink-2">
            {loading ? t('fcLoading') : t('fcOffline')}
          </div>
          <div className="mt-2 text-base leading-relaxed text-muted">
            {loading ? t('fcLoadingBody') : t('fcOfflineBody')}
          </div>
        </div>
      )}

      <h2 className="display mx-1 mb-3 mt-6 text-[22px] text-ink">{t('forecast7')}</h2>
      <Card className="px-5.5" style={{ paddingLeft: 22, paddingRight: 22 }}>
        {week.map((d, i) => {
          const w = decodeWeather(d.code)
          return (
            <div
              key={i}
              className={`flex items-center gap-3.5 py-4 ${
                i === week.length - 1 ? '' : 'border-b border-hair'
              }`}
            >
              <span className="w-[62px] flex-none">
                <span className="block text-base font-medium text-ink">
                  {relDayLabel(d.iso, today, lang)}
                </span>
                <span className="num block text-[11px] text-faint">
                  {fmtIsoShort(d.iso, lang)}
                </span>
              </span>
              <span className="w-7 text-xl">{isSample ? '' : w.icon}</span>
              <span className="flex-1 text-[15px] font-medium text-muted">
                {isSample ? '' : w[lang]}
              </span>
              <span
                className="num w-[58px] text-right text-[15px] font-semibold"
                style={{ color: isSample ? '#8A8574' : d.mm ? '#2E6B3F' : '#C1531B' }}
              >
                {isSample ? '—' : `${d.mm} ${t('mm')}`}
              </span>
              <span className="num w-11 text-right text-[17px] font-semibold text-ink">
                {isSample ? '—' : `${d.temp}°`}
              </span>
            </div>
          )
        })}
      </Card>

      <p className="mt-3 text-[11px] leading-relaxed text-faint">
        {loading
          ? '…'
          : isSample
            ? {
                mr: 'हवामान सेवेशी संपर्क झाला नाही. जोडणी मिळताच अंदाज दिसेल.',
                hi: 'मौसम सेवा से संपर्क नहीं हुआ. कनेक्शन मिलते ही अनुमान दिखेगा.',
                en: 'Could not reach the forecast service. The forecast appears once a connection is available.',
              }[lang]
            : {
                mr: 'थेट अंदाज — Open-Meteo (विनामूल्य, API की लागत नाही).',
                hi: 'लाइव अनुमान — Open-Meteo (निःशुल्क, API की ज़रूरत नहीं).',
                en: 'Live forecast from Open-Meteo (free, no API key).',
              }[lang]}
      </p>
    </div>
  )
}
