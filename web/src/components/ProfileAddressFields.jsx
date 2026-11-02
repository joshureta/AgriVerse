import { useEffect, useRef, useState } from 'react'
import {
  getRegions, getRegionProvinces, getRegionCitiesMunicipalities,
  getProvinceCitiesMunicipalities, getCityMunicipalityBarangays, getRegionSubMunicipalities,
} from '../services/psgc.js'

const keys = ['region', 'province', 'city_municipality', 'barangay']
const MANILA_CODE = '1380600000'
const MANILA_PREFIX = MANILA_CODE.slice(0, 5)
function normalizedCities(items) {
  const hasManila = items.some((item) => item.code === MANILA_CODE || item.code.startsWith(MANILA_PREFIX))
  const cities = items.filter((item) => !item.code.startsWith(MANILA_PREFIX) || item.code === MANILA_CODE)
  if (hasManila && !cities.some((item) => item.code === MANILA_CODE)) cities.push({ code: MANILA_CODE, name: 'City of Manila' })
  return cities.sort((a, b) => a.name.localeCompare(b.name))
}
const manilaDistricts = (items) => items.filter((item) => item.code.startsWith(MANILA_PREFIX) && item.code !== MANILA_CODE)
  .sort((a, b) => a.name.localeCompare(b.name))
const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
function matching(items, value) {
  const target = normalize(value)
  if (!target) return null
  return items.find((item) => normalize(item.name) === target)
    || items.find((item) => normalize(item.name).includes(target) || target.includes(normalize(item.name)))
}

export default function ProfileAddressFields({ value, onChange, disabled = false }) {
  const initialValue = useRef(value)
  const [lists, setLists] = useState({ regions: [], provinces: [], cities: [], districts: [], barangays: [] })
  const [codes, setCodes] = useState({ region: '', province: '', city_municipality: '', district: '', barangay: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [manual, setManual] = useState(false)
  const [provinceNotApplicable, setProvinceNotApplicable] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      setBusy(true)
      try {
        const regions = await getRegions()
        if (!active) return
        setLists((current) => ({ ...current, regions }))
        const region = matching(regions, initialValue.current.region)
        if (!region) return
        const provinces = await getRegionProvinces(region.code)
        if (!active) return
        setProvinceNotApplicable(provinces.length === 0)
        setLists((current) => ({ ...current, provinces }))
        const province = matching(provinces, initialValue.current.province)
        const cities = normalizedCities(province
          ? await getProvinceCitiesMunicipalities(province.code)
          : provinces.length === 0 ? await getRegionCitiesMunicipalities(region.code) : [])
        if (!active) return
        setLists((current) => ({ ...current, cities }))
        let city = matching(cities, initialValue.current.city_municipality)
        let district = null
        let districts = []
        if ((!city && cities.some((item) => item.code === MANILA_CODE)) || city?.code === MANILA_CODE) {
          districts = manilaDistricts(await getRegionSubMunicipalities(region.code))
          district = matching(districts, initialValue.current.city_municipality)
          if (district) city = cities.find((item) => item.code === MANILA_CODE)
        }
        const barangays = city && (city.code !== MANILA_CODE || district)
          ? await getCityMunicipalityBarangays(district?.code || city.code) : []
        if (!active) return
        setLists((current) => ({ ...current, districts, barangays }))
        const barangay = matching(barangays, initialValue.current.barangay)
        setCodes({ region: region.code, province: province?.code || '', city_municipality: city?.code || '', district: district?.code || '', barangay: barangay?.code || '' })
      } catch (caught) {
        if (active) { setError(caught.message || 'Address choices could not be loaded.'); setManual(true) }
      } finally {
        if (active) setBusy(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  async function selectRegion(code) {
    const item = lists.regions.find((entry) => entry.code === code)
    setCodes({ region: code, province: '', city_municipality: '', district: '', barangay: '' })
    setLists((current) => ({ ...current, provinces: [], cities: [], districts: [], barangays: [] }))
    onChange({ region: item?.name || '', province: '', city_municipality: '', barangay: '' })
    setProvinceNotApplicable(false)
    if (!code) return
    setBusy(true); setError('')
    try {
      const provinces = await getRegionProvinces(code)
      const cities = provinces.length === 0 ? normalizedCities(await getRegionCitiesMunicipalities(code)) : []
      setLists((current) => ({ ...current, provinces, cities }))
      setProvinceNotApplicable(provinces.length === 0)
    } catch (caught) { setError(caught.message || 'Could not load provinces. Enter your address manually.'); setManual(true) }
    finally { setBusy(false) }
  }

  async function selectProvince(code) {
    const item = lists.provinces.find((entry) => entry.code === code)
    setCodes((current) => ({ ...current, province: code, city_municipality: '', district: '', barangay: '' }))
    setLists((current) => ({ ...current, cities: [], districts: [], barangays: [] }))
    onChange({ province: item?.name || '', city_municipality: '', barangay: '' })
    if (!code) return
    setBusy(true); setError('')
    try { const cities = normalizedCities(await getProvinceCitiesMunicipalities(code)); setLists((current) => ({ ...current, cities })) }
    catch (caught) { setError(caught.message || 'Could not load cities. Enter your address manually.'); setManual(true) }
    finally { setBusy(false) }
  }

  async function selectCity(code) {
    const item = lists.cities.find((entry) => entry.code === code)
    setCodes((current) => ({ ...current, city_municipality: code, district: '', barangay: '' }))
    setLists((current) => ({ ...current, districts: [], barangays: [] }))
    onChange({ city_municipality: item?.name || '', barangay: '' })
    if (!code) return
    setBusy(true); setError('')
    try {
      if (code === MANILA_CODE) {
        const districts = manilaDistricts(await getRegionSubMunicipalities(codes.region))
        setLists((current) => ({ ...current, districts }))
      } else {
        const barangays = await getCityMunicipalityBarangays(code)
        setLists((current) => ({ ...current, barangays }))
      }
    }
    catch (caught) { setError(caught.message || 'Could not load barangays. Enter your address manually.'); setManual(true) }
    finally { setBusy(false) }
  }

  async function selectDistrict(code) {
    const item = lists.districts.find((entry) => entry.code === code)
    setCodes((current) => ({ ...current, district: code, barangay: '' }))
    setLists((current) => ({ ...current, barangays: [] }))
    onChange({ city_municipality: item?.name || '', barangay: '' })
    if (!code) return
    setBusy(true); setError('')
    try { const barangays = await getCityMunicipalityBarangays(code); setLists((current) => ({ ...current, barangays })) }
    catch (caught) { setError(caught.message || 'Could not load barangays. Enter your address manually.'); setManual(true) }
    finally { setBusy(false) }
  }

  function selectBarangay(code) {
    const item = lists.barangays.find((entry) => entry.code === code)
    setCodes((current) => ({ ...current, barangay: code }))
    onChange({ barangay: item?.name || '' })
  }

  const choices = [
    { key: 'region', label: 'Region', list: lists.regions, select: selectRegion, blocked: false },
    { key: 'province', label: 'Province', list: lists.provinces, select: selectProvince, blocked: !codes.region },
    { key: 'city_municipality', label: 'City / Municipality', list: lists.cities, select: selectCity, blocked: !codes.region || (!provinceNotApplicable && !codes.province) },
    ...(codes.city_municipality === MANILA_CODE ? [{ key: 'district', label: 'Manila District', list: lists.districts, select: selectDistrict, blocked: false }] : []),
    { key: 'barangay', label: 'Barangay', list: lists.barangays, select: selectBarangay, blocked: !codes.city_municipality || (codes.city_municipality === MANILA_CODE && !codes.district) },
  ]

  return <>
    {error && <p className="profile-address-error" role="alert">{error}</p>}
    {manual ? keys.map((key) => <label className="profile-form-field" key={key}><span>{key === 'city_municipality' ? 'City / Municipality' : key[0].toUpperCase() + key.slice(1)}</span><input value={value[key]} onChange={(event) => onChange({ [key]: event.target.value })} disabled={disabled} required={key !== 'province'} /></label>)
      : choices.map(({ key, label, list, select, blocked }) => <label className="profile-form-field" key={key}>
        <span>{label} {key !== 'province' && <em className="required-star">*</em>}</span>
        <select value={key === 'province' && provinceNotApplicable ? '' : codes[key]} onChange={(event) => select(event.target.value)} disabled={disabled || busy || blocked || (key === 'province' && provinceNotApplicable)} required={key !== 'province'}>
          <option value="">{key === 'province' && provinceNotApplicable ? 'Not applicable' : busy && !list.length ? 'Loading…' : `Select ${label.toLowerCase()}`}</option>
          {list.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select>
      </label>)}
    <label className="profile-form-field"><span>Country</span><input value="Philippines" readOnly /></label>
  </>
}
