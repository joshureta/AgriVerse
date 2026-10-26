import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CircleAlert,
  Check,
  Pencil,
  Plus,
  QrCode,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react'
import { BuyerFooter, BuyerHeader, BuyerJourneyNav } from '../../components/BuyerChrome.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { clearCheckoutRequestKey, getCheckoutRequestKey } from '../../services/checkoutAttempt.js'
import pineappleImage from '../../assets/buyer/pineapple-product-clean.png'
import cashIcon from '../../assets/buyer/checkout/cash.png'
import deliveryIcon from '../../assets/buyer/checkout/delivery.png'
import pickupIcon from '../../assets/buyer/checkout/pickup.png'
import {
  createBuyerDeliveryAddress,
  createGcashCheckout,
  deleteBuyerDeliveryAddress,
  loadPineappleProducts,
  loadBuyerDeliveryAddresses,
  buyerCartQuantity,
  placeBuyerOrder,
  readBuyerCart,
  saveDefaultBuyerDeliveryAddress,
  writeBuyerCart,
} from '../../services/buyerMarketplace.js'
import {
  getCityMunicipalityBarangays,
  getProvinceCitiesMunicipalities,
  getRegionCitiesMunicipalities,
  getRegionProvinces,
  getRegionSubMunicipalities,
  getRegions,
} from '../../services/psgc.js'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/checkout.css'

function ChoiceCard({ checked, children, className = '', onSelect }) {
  return (
    <button
      className={`checkout-choice ${checked ? 'is-selected' : ''} ${className}`}
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
    >
      {children}
      <span className="checkout-radio" aria-hidden="true" />
    </button>
  )
}

function CheckoutIcon({ name }) {
  const icons = { cash: cashIcon, delivery: deliveryIcon, pickup: pickupIcon }
  return <img className="checkout-generated-icon" src={icons[name]} alt="" aria-hidden="true" />
}

function matchingLocation(items, name) {
  const normalizedName = String(name || '').trim().toLocaleLowerCase()
  return items.find(
    (item) => String(item.name || '').trim().toLocaleLowerCase() === normalizedName,
  )
}

const CITY_OF_MANILA_CODE = '1380600000'
const CITY_OF_MANILA_PREFIX = CITY_OF_MANILA_CODE.slice(0, 5)

function isManilaDistrict(item) {
  return String(item?.code || '').startsWith(CITY_OF_MANILA_PREFIX)
    && item.code !== CITY_OF_MANILA_CODE
}

function getManilaDistricts(items) {
  return items
    .filter(isManilaDistrict)
    .sort((first, second) => first.name.localeCompare(second.name))
}

function normalizeCitiesMunicipalities(items) {
  const hasManilaLocation = items.some(
    (item) => item.code === CITY_OF_MANILA_CODE || isManilaDistrict(item),
  )
  if (!hasManilaLocation) return items

  const withoutManilaDistricts = items.filter((item) => !isManilaDistrict(item))
  const hasCityOfManila = withoutManilaDistricts.some(
    (item) => item.code === CITY_OF_MANILA_CODE,
  )
  const normalizedItems = hasCityOfManila
    ? withoutManilaDistricts
    : [...withoutManilaDistricts, { code: CITY_OF_MANILA_CODE, name: 'City of Manila' }]

  return normalizedItems.sort((first, second) => first.name.localeCompare(second.name))
}

function CheckoutLocationFields({ address, disabled, onChange, onValidityChange }) {
  const mountedRef = useRef(true)
  const requestVersionRef = useRef(0)
  const initialAddressRef = useRef(address)
  const [regions, setRegions] = useState([])
  const [provinces, setProvinces] = useState([])
  const [citiesMunicipalities, setCitiesMunicipalities] = useState([])
  const [districts, setDistricts] = useState([])
  const [barangays, setBarangays] = useState([])
  const [regionCode, setRegionCode] = useState('')
  const [provinceCode, setProvinceCode] = useState('')
  const [cityMunicipalityCode, setCityMunicipalityCode] = useState('')
  const [districtCode, setDistrictCode] = useState('')
  const [barangayCode, setBarangayCode] = useState('')
  const [loadingRegions, setLoadingRegions] = useState(true)
  const [loadingProvinces, setLoadingProvinces] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [loadingBarangays, setLoadingBarangays] = useState(false)
  const [locationError, setLocationError] = useState('')
  const provinceNotApplicable = Boolean(regionCode)
    && !loadingProvinces
    && provinces.length === 0
  const manilaSelected = cityMunicipalityCode === CITY_OF_MANILA_CODE
  const selectedDistrict = districts.find((item) => item.code === districtCode)

  useEffect(() => {
    const locationIsValid = Boolean(
      regionCode
      && cityMunicipalityCode
      && (!manilaSelected || districtCode)
      && barangayCode
      && (provinceNotApplicable || provinceCode),
    )
    onValidityChange(locationIsValid)
  }, [
    barangayCode,
    cityMunicipalityCode,
    districtCode,
    manilaSelected,
    onValidityChange,
    provinceCode,
    provinceNotApplicable,
    regionCode,
  ])

  useEffect(() => {
    mountedRef.current = true
    const initialAddress = initialAddressRef.current
    const requestVersion = requestVersionRef.current + 1
    requestVersionRef.current = requestVersion

    async function loadInitialLocation() {
      setLoadingRegions(true)
      setLocationError('')

      try {
        const regionItems = await getRegions()
        if (!mountedRef.current || requestVersionRef.current !== requestVersion) return
        setRegions(regionItems)

        const selectedRegion = matchingLocation(regionItems, initialAddress.region)
        if (!selectedRegion) return
        setRegionCode(selectedRegion.code)
        setLoadingProvinces(true)
        setLoadingCities(true)

        const [provinceItems, regionCityItems] = await Promise.all([
          getRegionProvinces(selectedRegion.code),
          getRegionCitiesMunicipalities(selectedRegion.code),
        ])
        if (!mountedRef.current || requestVersionRef.current !== requestVersion) return
        setProvinces(provinceItems)
        setLoadingProvinces(false)

        let rawCityItems = regionCityItems
        if (provinceItems.length > 0) {
          const selectedProvince = matchingLocation(provinceItems, initialAddress.province)
          if (!selectedProvince) return
          setProvinceCode(selectedProvince.code)
          rawCityItems = await getProvinceCitiesMunicipalities(selectedProvince.code)
          if (!mountedRef.current || requestVersionRef.current !== requestVersion) return
        }

        const cityItems = normalizeCitiesMunicipalities(rawCityItems)
        setCitiesMunicipalities(cityItems)
        setLoadingCities(false)
        let selectedCity = matchingLocation(cityItems, initialAddress.city_municipality)
        let districtItems = []
        let initialDistrict = null

        if (!selectedCity && cityItems.some((item) => item.code === CITY_OF_MANILA_CODE)) {
          setLoadingDistricts(true)
          districtItems = getManilaDistricts(
            await getRegionSubMunicipalities(selectedRegion.code),
          )
          if (!mountedRef.current || requestVersionRef.current !== requestVersion) return
          initialDistrict = matchingLocation(districtItems, initialAddress.city_municipality)
          if (initialDistrict) {
            selectedCity = cityItems.find((item) => item.code === CITY_OF_MANILA_CODE)
          }
        }

        if (!selectedCity) return
        setCityMunicipalityCode(selectedCity.code)
        setLoadingBarangays(true)

        let barangaySourceCode = selectedCity.code
        if (selectedCity.code === CITY_OF_MANILA_CODE) {
          setLoadingDistricts(true)
          if (districtItems.length === 0) {
            districtItems = getManilaDistricts(
              await getRegionSubMunicipalities(selectedRegion.code),
            )
            if (!mountedRef.current || requestVersionRef.current !== requestVersion) return
          }
          setDistricts(districtItems)
          setLoadingDistricts(false)
          initialDistrict ??= matchingLocation(districtItems, initialAddress.city_municipality)
          if (!initialDistrict) return
          setDistrictCode(initialDistrict.code)
          barangaySourceCode = initialDistrict.code
        }

        const barangayItems = await getCityMunicipalityBarangays(barangaySourceCode)
        if (!mountedRef.current || requestVersionRef.current !== requestVersion) return
        setBarangays(barangayItems)
        setLoadingBarangays(false)
        const selectedBarangay = matchingLocation(barangayItems, initialAddress.barangay)
        if (selectedBarangay) setBarangayCode(selectedBarangay.code)
      } catch (loadError) {
        if (mountedRef.current && requestVersionRef.current === requestVersion) {
          setLocationError(loadError.message)
        }
      } finally {
        if (mountedRef.current && requestVersionRef.current === requestVersion) {
          setLoadingRegions(false)
          setLoadingProvinces(false)
          setLoadingCities(false)
          setLoadingDistricts(false)
          setLoadingBarangays(false)
        }
      }
    }

    loadInitialLocation()
    return () => {
      mountedRef.current = false
    }
  }, [])

  async function selectRegion(event) {
    const nextCode = event.target.value
    const selectedRegion = regions.find((item) => item.code === nextCode)
    const requestVersion = requestVersionRef.current + 1
    requestVersionRef.current = requestVersion
    setRegionCode(nextCode)
    setProvinceCode('')
    setCityMunicipalityCode('')
    setDistrictCode('')
    setBarangayCode('')
    setProvinces([])
    setCitiesMunicipalities([])
    setDistricts([])
    setBarangays([])
    setLocationError('')
    onChange({
      region: selectedRegion?.name || '',
      province: '',
      city_municipality: '',
      barangay: '',
    })

    if (!nextCode) return
    setLoadingProvinces(true)
    setLoadingCities(true)
    try {
      const [provinceItems, cityItems] = await Promise.all([
        getRegionProvinces(nextCode),
        getRegionCitiesMunicipalities(nextCode),
      ])
      if (!mountedRef.current || requestVersionRef.current !== requestVersion) return
      setProvinces(provinceItems)
      if (provinceItems.length === 0) {
        setCitiesMunicipalities(normalizeCitiesMunicipalities(cityItems))
      }
    } catch (loadError) {
      if (mountedRef.current && requestVersionRef.current === requestVersion) {
        setLocationError(loadError.message)
      }
    } finally {
      if (mountedRef.current && requestVersionRef.current === requestVersion) {
        setLoadingProvinces(false)
        setLoadingCities(false)
      }
    }
  }

  async function selectProvince(event) {
    const nextCode = event.target.value
    const selectedProvince = provinces.find((item) => item.code === nextCode)
    const requestVersion = requestVersionRef.current + 1
    requestVersionRef.current = requestVersion
    setProvinceCode(nextCode)
    setCityMunicipalityCode('')
    setDistrictCode('')
    setBarangayCode('')
    setCitiesMunicipalities([])
    setDistricts([])
    setBarangays([])
    setLocationError('')
    onChange({
      province: selectedProvince?.name || '',
      city_municipality: '',
      barangay: '',
    })

    if (!nextCode) return
    setLoadingCities(true)
    try {
      const cityItems = await getProvinceCitiesMunicipalities(nextCode)
      if (!mountedRef.current || requestVersionRef.current !== requestVersion) return
      setCitiesMunicipalities(normalizeCitiesMunicipalities(cityItems))
    } catch (loadError) {
      if (mountedRef.current && requestVersionRef.current === requestVersion) {
        setLocationError(loadError.message)
      }
    } finally {
      if (mountedRef.current && requestVersionRef.current === requestVersion) {
        setLoadingCities(false)
      }
    }
  }

  async function selectCityMunicipality(event) {
    const nextCode = event.target.value
    const selectedCity = citiesMunicipalities.find((item) => item.code === nextCode)
    const requestVersion = requestVersionRef.current + 1
    requestVersionRef.current = requestVersion
    setCityMunicipalityCode(nextCode)
    setDistrictCode('')
    setBarangayCode('')
    setDistricts([])
    setBarangays([])
    setLocationError('')
    onChange({ city_municipality: selectedCity?.name || '', barangay: '' })

    if (!nextCode) return
    if (nextCode === CITY_OF_MANILA_CODE) setLoadingDistricts(true)
    else setLoadingBarangays(true)
    try {
      const locationItems = nextCode === CITY_OF_MANILA_CODE
        ? getManilaDistricts(await getRegionSubMunicipalities(regionCode))
        : await getCityMunicipalityBarangays(nextCode)
      if (!mountedRef.current || requestVersionRef.current !== requestVersion) return
      if (nextCode === CITY_OF_MANILA_CODE) setDistricts(locationItems)
      else setBarangays(locationItems)
    } catch (loadError) {
      if (mountedRef.current && requestVersionRef.current === requestVersion) {
        setLocationError(loadError.message)
      }
    } finally {
      if (mountedRef.current && requestVersionRef.current === requestVersion) {
        setLoadingDistricts(false)
        setLoadingBarangays(false)
      }
    }
  }

  async function selectDistrict(event) {
    const nextCode = event.target.value
    const district = districts.find((item) => item.code === nextCode)
    const requestVersion = requestVersionRef.current + 1
    requestVersionRef.current = requestVersion
    setDistrictCode(nextCode)
    setBarangayCode('')
    setBarangays([])
    setLocationError('')
    onChange({
      city_municipality: district?.name || 'City of Manila',
      barangay: '',
    })

    if (!nextCode) return
    setLoadingBarangays(true)
    try {
      const barangayItems = await getCityMunicipalityBarangays(nextCode)
      if (!mountedRef.current || requestVersionRef.current !== requestVersion) return
      setBarangays(barangayItems)
    } catch (loadError) {
      if (mountedRef.current && requestVersionRef.current === requestVersion) {
        setLocationError(loadError.message)
      }
    } finally {
      if (mountedRef.current && requestVersionRef.current === requestVersion) {
        setLoadingBarangays(false)
      }
    }
  }

  function selectBarangay(event) {
    const nextCode = event.target.value
    const selectedBarangay = barangays.find((item) => item.code === nextCode)
    setBarangayCode(nextCode)
    onChange({ barangay: selectedBarangay?.name || '' })
  }

  return <>
    <label>
      <span>Region<em>*</em></span>
      <select
        name="region"
        value={regionCode}
        onChange={selectRegion}
        disabled={disabled || loadingRegions}
        required
      >
        <option value="">{loadingRegions ? 'Loading regions…' : 'Select region'}</option>
        {regions.map((region) => <option key={region.code} value={region.code}>{region.name}</option>)}
      </select>
    </label>
    <label>
      <span>Province</span>
      {provinceNotApplicable ? (
        <select value="not-applicable" disabled>
          <option value="not-applicable">Not applicable</option>
        </select>
      ) : (
        <select
          name="province"
          value={provinceCode}
          onChange={selectProvince}
          disabled={disabled || !regionCode || loadingProvinces}
          required
        >
          <option value="">{loadingProvinces ? 'Loading provinces…' : 'Select province'}</option>
          {provinces.map((province) => <option key={province.code} value={province.code}>{province.name}</option>)}
        </select>
      )}
    </label>
    <label>
      <span>City / Municipality<em>*</em></span>
      <select
        name="city_municipality"
        value={cityMunicipalityCode}
        onChange={selectCityMunicipality}
        disabled={
          disabled
          || !regionCode
          || (!provinceNotApplicable && !provinceCode)
          || loadingCities
        }
        required
      >
        <option value="">{loadingCities ? 'Loading cities…' : 'Select city or municipality'}</option>
        {citiesMunicipalities.map((city) => <option key={city.code} value={city.code}>{city.name}</option>)}
      </select>
    </label>
    {manilaSelected && (
      <label>
        <span>District<em>*</em></span>
        <select
          name="district"
          value={districtCode}
          onChange={selectDistrict}
          disabled={disabled || loadingDistricts || districts.length === 0}
          required
        >
          <option value="">{loadingDistricts ? 'Loading Manila districts…' : 'Select Manila district'}</option>
          {districts.map((district) => <option key={district.code} value={district.code}>{district.name}</option>)}
        </select>
      </label>
    )}
    <label>
      <span>Barangay<em>*</em></span>
      <select
        name="barangay"
        value={barangayCode}
        onChange={selectBarangay}
        disabled={
          disabled
          || !cityMunicipalityCode
          || (manilaSelected && !districtCode)
          || loadingBarangays
        }
        required
      >
        <option value="">{loadingBarangays ? 'Loading barangays…' : 'Select barangay'}</option>
        {barangays.map((barangay) => (
          <option key={barangay.code} value={barangay.code}>
            {barangay.name}{manilaSelected && selectedDistrict ? ` — ${selectedDistrict.name}` : ''}
          </option>
        ))}
      </select>
    </label>
    {locationError && <p className="checkout-location-error" role="alert">{locationError}</p>}
  </>
}

const emptyAddress = {
  full_name: '', mobile_number: '', country: '', region: '', province: '', city_municipality: '', barangay: '',
}

function addressIsComplete(address) {
  return ['full_name', 'mobile_number', 'country', 'region', 'city_municipality', 'barangay']
    .every((field) => String(address[field] || '').trim())
}

function deliveryAddressToSlot(row) {
  return {
    id: row.id,
    label: row.label || 'New address',
    address: Object.fromEntries(Object.keys(emptyAddress).map((field) => [field, row[field] || ''])),
  }
}

export default function BuyerCheckout() {
  const { profile } = useAuth()
  const [items, setItems] = useState([])
  const [deliveryMethod, setDeliveryMethod] = useState('delivery')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [addressesLoaded, setAddressesLoaded] = useState(false)
  const [addressLoadError, setAddressLoadError] = useState('')
  const [addressLoadAttempt, setAddressLoadAttempt] = useState(0)
  const [savingAddress, setSavingAddress] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [placedOrder, setPlacedOrder] = useState(null)
  const [orderToastVisible, setOrderToastVisible] = useState(false)
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [addressModalView, setAddressModalView] = useState('confirm')
  const [customAddresses, setCustomAddresses] = useState([])
  const [pendingAddressId, setPendingAddressId] = useState('saved')
  const [confirmedAddressId, setConfirmedAddressId] = useState(null)
  const [addressConfirmed, setAddressConfirmed] = useState(false)
  const [alternateAddress, setAlternateAddress] = useState(emptyAddress)
  const [addressLocationValid, setAddressLocationValid] = useState(false)
  const [retryingPayment, setRetryingPayment] = useState(false)

  async function retryOnlinePayment() {
    if (!placedOrder || retryingPayment) return
    setRetryingPayment(true)
    setError('')
    try {
      if (placedOrder.payment_method === 'qrph') {
        window.location.href = `/buyer/qrph-payment?order=${encodeURIComponent(placedOrder.id)}`
      } else {
        const checkoutUrl = await createGcashCheckout(placedOrder.id)
        window.location.href = checkoutUrl
      }
    } catch (requestError) {
      setError(requestError.message)
      setRetryingPayment(false)
    }
  }

  useEffect(() => {
    if (!error) return undefined
    const dismissTimer = window.setTimeout(() => setError(''), 4000)
    return () => window.clearTimeout(dismissTimer)
  }, [error])

  useEffect(() => {
    if (!placedOrder || ['gcash', 'qrph'].includes(placedOrder.payment_method)) return undefined
    const redirectTimer = window.setTimeout(() => {
      window.location.replace(`/buyer/delivery-progress?track=${encodeURIComponent(placedOrder.id)}`)
    }, 2000)
    return () => window.clearTimeout(redirectTimer)
  }, [placedOrder])

  useEffect(() => {
    let active = true
    async function prepareCheckout() {
      const savedItems = readBuyerCart()
      if (savedItems.length === 0) {
        if (active) setLoading(false)
        return
      }
      try {
        const products = await loadPineappleProducts()
        const productById = new Map(products.map((product) => [String(product.id), product]))
        const verifiedItems = savedItems.flatMap((savedItem) => {
          const product = productById.get(String(savedItem.id))
          if (!product || product.stock_quantity <= 0) return []
          const quantity = Math.min(Number(savedItem.quantity) || 0, product.stock_quantity)
          return quantity > 0 ? [{ ...product, quantity }] : []
        })
        if (!active) return
        setItems(verifiedItems)
        writeBuyerCart(verifiedItems)
        if (verifiedItems.length !== savedItems.length
          || verifiedItems.some((item, index) => item.quantity !== Number(savedItems[index]?.quantity))) {
          setNotice('Your order was updated to match the latest available stock.')
        }
      } catch (requestError) {
        if (active) setError(requestError.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    prepareCheckout()
    return () => { active = false }
  }, [])

  const savedAddress = useMemo(() => ({
    full_name: profile?.full_name || '',
    mobile_number: profile?.mobile_number || '',
    country: profile?.country || '',
    region: profile?.region || '',
    province: profile?.province || '',
    city_municipality: profile?.city_municipality || '',
    barangay: profile?.barangay || '',
  }), [profile])

  useEffect(() => {
    if (!profile) return undefined
    let active = true
    setAddressesLoaded(false)
    setAddressLoadError('')
    loadBuyerDeliveryAddresses()
      .then(({ addresses, defaultAddressId }) => {
        if (!active) return
        const slots = addresses.map(deliveryAddressToSlot)
        const customDefaultExists = defaultAddressId && slots.some((slot) => slot.id === defaultAddressId)
        const resolvedDefaultId = customDefaultExists
          ? defaultAddressId
          : addressIsComplete(savedAddress) ? 'saved' : null
        setCustomAddresses(slots)
        setConfirmedAddressId(resolvedDefaultId)
        setPendingAddressId(resolvedDefaultId || (addressIsComplete(savedAddress) ? 'saved' : slots[0]?.id || 'saved'))
        setAddressConfirmed(Boolean(resolvedDefaultId))
      })
      .catch((requestError) => {
        if (active) setAddressLoadError(requestError.message)
      })
      .finally(() => {
        if (active) setAddressesLoaded(true)
      })
    return () => { active = false }
  }, [profile, savedAddress, addressLoadAttempt])

  useEffect(() => {
    if (loading || !addressesLoaded || addressLoadError || items.length === 0 || !profile) return
    const url = new URL(window.location.href)
    if (url.searchParams.get('confirmDelivery') !== '1') return

    url.searchParams.delete('confirmDelivery')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    if (addressConfirmed) return

    const savedProfileIsComplete = addressIsComplete(savedAddress)
    const firstCustomAddress = customAddresses[0]
    setPendingAddressId(savedProfileIsComplete ? 'saved' : firstCustomAddress?.id || 'saved')
    setAlternateAddress({ ...emptyAddress, ...savedAddress, country: savedAddress.country || 'Philippines' })
    setAddressModalView(savedProfileIsComplete || firstCustomAddress ? 'confirm' : 'edit')
    setAddressModalOpen(true)
  }, [addressConfirmed, addressesLoaded, addressLoadError, customAddresses, items.length, loading, profile, savedAddress])

  const addressSlots = useMemo(() => {
    const slots = addressIsComplete(savedAddress) ? [{ id: 'saved', label: 'Saved address', address: savedAddress }] : []
    return [...slots, ...customAddresses]
  }, [customAddresses, savedAddress])
  const pendingSlot = addressSlots.find((slot) => slot.id === pendingAddressId) || null
  const confirmedSlot = addressSlots.find((slot) => slot.id === confirmedAddressId) || null
  const deliveryAddress = confirmedSlot?.address || emptyAddress
  const address = useMemo(() => {
    const locality = [deliveryAddress.barangay, deliveryAddress.city_municipality].filter(Boolean).join(', ')
    const region = [deliveryAddress.province, deliveryAddress.region, deliveryAddress.country].filter(Boolean).join(', ')
    return { locality, region }
  }, [deliveryAddress])

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shippingFee = deliveryMethod === 'delivery' && items.length > 0 ? 100 : 0
  const total = subtotal + shippingFee
  const deliveryAddressReady = deliveryMethod !== 'delivery' || (addressesLoaded && !addressLoadError)
  let orderButtonLabel = 'Place Order'
  if (placing) orderButtonLabel = 'Placing order…'
  else if (placedOrder) orderButtonLabel = 'Order placed'
  else if (deliveryMethod === 'delivery' && !addressesLoaded) orderButtonLabel = 'Loading delivery address…'
  else if (deliveryMethod === 'delivery' && addressLoadError) orderButtonLabel = 'Delivery address unavailable'
  else if (deliveryMethod === 'delivery' && !addressConfirmed) orderButtonLabel = 'Confirm delivery address'

  function closeAddressModal() {
    setAddressModalOpen(false)
    setError('')
  }

  function openAddressConfirmation() {
    const firstAvailableId = confirmedAddressId || addressSlots[0]?.id
    if (firstAvailableId) {
      setPendingAddressId(firstAvailableId)
      setAddressModalView('confirm')
    } else {
      setAlternateAddress({ ...emptyAddress, ...savedAddress, country: savedAddress.country || 'Philippines' })
      setAddressModalView('edit')
    }
    setAddressModalOpen(true)
    setError('')
  }

  function editSelectedAddress(slot) {
    setAlternateAddress({
      ...emptyAddress,
      ...slot.address,
      country: slot.address.country || 'Philippines',
    })
    setAddressLocationValid(false)
    setAddressModalView('edit')
  }

  function addNewAddress() {
    setAlternateAddress({ ...emptyAddress, country: 'Philippines' })
    setAddressLocationValid(false)
    setAddressModalView('edit')
  }

  async function completeOrder(confirmedAddress = null) {
    if (items.length === 0 || placedOrder || placing) return
    setPlacing(true)
    setError('')
    try {
      const orderDetails = {
        delivery_method: deliveryMethod,
        payment_method: paymentMethod,
        customer_note: notes,
        delivery_address: deliveryMethod === 'delivery' ? confirmedAddress : null,
        items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      }
      const order = await placeBuyerOrder({
        ...orderDetails,
        idempotency_key: getCheckoutRequestKey(orderDetails),
      })
      setPlacedOrder({ ...order, payment_method: paymentMethod })
      try {
        writeBuyerCart([])
        clearCheckoutRequestKey()
      } catch {
        setNotice('Your order was placed, but the cart could not be cleared on this device.')
      }

      if (paymentMethod === 'gcash') {
        try {
          const checkoutUrl = await createGcashCheckout(order.id)
          window.location.href = checkoutUrl
          return
        } catch (paymentError) {
          setOrderToastVisible(true)
          setError(`Order placed, but GCash checkout could not be started: ${paymentError.message}. You can retry payment below.`)
          return
        }
      }

      if (paymentMethod === 'qrph') {
        window.location.href = `/buyer/qrph-payment?order=${encodeURIComponent(order.id)}`
        return
      }

      setOrderToastVisible(true)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setPlacing(false)
    }
  }

  async function submitOrder(event) {
    event.preventDefault()
    if (items.length === 0 || placedOrder) return
    if (!deliveryAddressReady) return
    if (deliveryMethod === 'delivery' && !addressConfirmed) {
      openAddressConfirmation()
      return
    }
    await completeOrder(deliveryMethod === 'delivery' ? deliveryAddress : null)
  }

  async function reviewDeliveryAddress() {
    if (!addressIsComplete(alternateAddress) || !addressLocationValid || savingAddress) return
    setSavingAddress(true)
    setError('')
    try {
      const saved = await createBuyerDeliveryAddress({
        ...alternateAddress,
        label: `New address ${customAddresses.length + 1}`,
      })
      const slot = deliveryAddressToSlot(saved)
      setCustomAddresses((current) => [...current, slot])
      setPendingAddressId(slot.id)
      setAddressModalView('confirm')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSavingAddress(false)
    }
  }

  async function confirmDeliveryAddress() {
    if (!pendingSlot || !addressIsComplete(pendingSlot.address) || savingAddress) return
    setSavingAddress(true)
    setError('')
    try {
      await saveDefaultBuyerDeliveryAddress(pendingSlot.id)
      setConfirmedAddressId(pendingSlot.id)
      setAddressConfirmed(true)
      closeAddressModal()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSavingAddress(false)
    }
  }

  async function deleteAddressSlot(slot) {
    if (slot.id === 'saved' || !window.confirm(`Delete ${slot.label}?`)) return
    setError('')
    try {
      await deleteBuyerDeliveryAddress(slot.id)
      setCustomAddresses((current) => current.filter((addressSlot) => addressSlot.id !== slot.id))
      if (confirmedAddressId === slot.id) {
        setConfirmedAddressId(null)
        setAddressConfirmed(false)
      }
      if (pendingAddressId === slot.id) setPendingAddressId(addressIsComplete(savedAddress) ? 'saved' : null)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <main className="buyer-page checkout-page">
      <BuyerHeader active="orders" cartCount={placedOrder ? 0 : buyerCartQuantity(items)} />
      <BuyerJourneyNav current="checkout" />

      <div className="checkout-shell">
        <header className="checkout-heading">
          <h1>Delivery Information</h1>
          <p>Review your order, select delivery and payment options, then place your order.</p>
        </header>

        {notice && <p className="checkout-notice" role="status">{notice}</p>}
        {error && !addressLoadError && (
          <aside className="checkout-error-toast" role="alert" aria-live="assertive">
            <span className="checkout-error-toast-icon"><CircleAlert aria-hidden="true" /></span>
            <div><strong>Unable to continue</strong><p>{error}</p></div>
          </aside>
        )}
        {addressLoadError && (
          <aside className="checkout-error-toast is-persistent" role="alert">
            <span className="checkout-error-toast-icon"><CircleAlert aria-hidden="true" /></span>
            <div><strong>Delivery information could not be loaded</strong><p>{addressLoadError}</p>
              <button type="button" className="checkout-retry-address" onClick={() => setAddressLoadAttempt((attempt) => attempt + 1)}>Try again</button>
            </div>
          </aside>
        )}

        <section className="checkout-card checkout-address" aria-labelledby="delivery-address-title">
          <div className="checkout-address-head">
            <h2 id="delivery-address-title">Delivery Information</h2>
            <button type="button" onClick={openAddressConfirmation}>{addressIsComplete(deliveryAddress) ? 'Edit information' : 'Add information'}</button>
          </div>
          <div className="checkout-address-rule" />
          {addressIsComplete(deliveryAddress) ? <address>
            <strong>{deliveryAddress.full_name}</strong><br />
            {address.locality}<br />
            {address.region}<br />
            {deliveryAddress.mobile_number}
          </address> : <p className="checkout-address-empty">No delivery information has been added.</p>}
        </section>

        {addressModalOpen && <div className="checkout-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAddressModal() }}>
          <section className="checkout-address-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-address-modal-title">
            <header><div><span>Delivery information</span><h2 id="checkout-address-modal-title">{addressModalView === 'confirm' ? 'Choose Delivery Address' : 'Add Delivery Address'}</h2><p>{addressModalView === 'confirm' ? 'Choose an address slot, then confirm your selection.' : 'Complete the fields below to create an address slot.'}</p></div><button type="button" onClick={closeAddressModal} aria-label="Close address form"><X /></button></header>
            {addressModalView === 'confirm' ? <>
              <div className="checkout-address-slots" role="radiogroup" aria-label="Delivery addresses">
                {addressSlots.map((slot) => <div key={slot.id} className={`checkout-address-confirmation ${pendingAddressId === slot.id ? 'is-pending' : ''} ${confirmedAddressId === slot.id ? 'is-confirmed' : ''}`} role="radio" aria-checked={pendingAddressId === slot.id} tabIndex={0} onClick={() => setPendingAddressId(slot.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setPendingAddressId(slot.id) } }}>
                  <div className="checkout-address-slot-head"><span>{confirmedAddressId === slot.id && <Check aria-hidden="true" />} {slot.label}</span><div className="checkout-address-slot-tools"><button type="button" onClick={(event) => { event.stopPropagation(); editSelectedAddress(slot) }} aria-label={`Edit ${slot.label}`} title="Edit information"><Pencil aria-hidden="true" /></button>{slot.id !== 'saved' && <button type="button" className="is-delete" onClick={(event) => { event.stopPropagation(); deleteAddressSlot(slot) }} aria-label={`Delete ${slot.label}`} title="Delete address"><Trash2 aria-hidden="true" /></button>}</div></div>
                  <h3>{slot.address.full_name}</h3>
                  <p>{slot.address.mobile_number}</p>
                  <address>{[slot.address.barangay, slot.address.city_municipality, slot.address.province, slot.address.region, slot.address.country].filter(Boolean).join(', ')}</address>
                </div>)}
              </div>
              <button type="button" className="checkout-add-address" onClick={addNewAddress}><Plus aria-hidden="true" /> Add New Address</button>
              <p className="checkout-address-question">Confirm the address you want to use for this order.</p>
            </> : <>
              <div className="checkout-address-fields checkout-new-address-fields">
                {[
                  ['full_name', 'Full Name', 'Enter recipient name'],
                  ['mobile_number', 'Phone Number', 'Enter mobile number'],
                ].map(([name, label, placeholder]) => <label key={name}><span>{label}{name !== 'province' && <em>*</em>}</span><input name={name} value={alternateAddress[name]} placeholder={placeholder} onChange={(event) => setAlternateAddress((current) => ({ ...current, [name]: event.target.value }))} required={name !== 'province'} /></label>)}
                <label><span>Country<em>*</em></span><input name="country" value="Philippines" disabled /></label>
                <CheckoutLocationFields
                  address={alternateAddress}
                  disabled={savingAddress}
                  onChange={(changes) => setAlternateAddress((current) => ({ ...current, ...changes }))}
                  onValidityChange={setAddressLocationValid}
                />
              </div>
            </>}
            <footer><button type="button" className="is-cancel" onClick={() => addressModalView === 'edit' && addressSlots.length > 0 ? setAddressModalView('confirm') : closeAddressModal()}>{addressModalView === 'edit' && addressSlots.length > 0 ? 'Back' : 'Cancel'}</button>{addressModalView === 'confirm' ? <button type="button" className="is-save" disabled={!pendingSlot || savingAddress} onClick={confirmDeliveryAddress}>{savingAddress ? 'Saving default…' : 'Confirm Address'}</button> : <button type="button" className="is-save" disabled={!addressIsComplete(alternateAddress) || !addressLocationValid || savingAddress} onClick={reviewDeliveryAddress}>{savingAddress ? 'Saving address…' : 'Add Address'}</button>}</footer>
          </section>
        </div>}

        <section className="checkout-card checkout-summary" aria-labelledby="checkout-summary-title">
          <h2 id="checkout-summary-title">Order Summary</h2>
          {loading ? <p className="checkout-empty">Checking cart and inventory…</p>
            : items.length > 0 ? <div className="checkout-items">
              {items.map((item) => (
                <article className="checkout-item" key={item.id}>
                  <img src={pineappleImage} alt={item.name} />
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.weight}</p>
                    <small>Quantity: {item.quantity}</small>
                  </div>
                  <strong>PHP {(item.price * item.quantity).toLocaleString()}</strong>
                </article>
              ))}
            </div> : <div className="checkout-empty">Your cart is empty. <a href="/buyer/order">Return to the Order page</a>.</div>}
          <div className="checkout-price-breakdown">
            <div><span>Subtotal</span><strong>PHP {subtotal.toLocaleString()}</strong></div>
            <div><span>Shipping Fee</span><strong>PHP {shippingFee.toLocaleString()}</strong></div>
          </div>
          <div className="checkout-total"><span>Order Total</span><strong>PHP {total.toLocaleString()}</strong></div>
        </section>

        <form className="checkout-card checkout-options" onSubmit={submitOrder}>
          <section className="checkout-column" aria-labelledby="delivery-method-title">
            <h2 id="delivery-method-title">Delivery Method</h2>
            <div className="checkout-choice-list" role="radiogroup" aria-labelledby="delivery-method-title">
              <ChoiceCard checked={deliveryMethod === 'delivery'} onSelect={() => setDeliveryMethod('delivery')}>
                <CheckoutIcon name="delivery" />
                <span><strong>Standard Delivery</strong><small>Delivery service straight to your registered address.</small></span>
              </ChoiceCard>
              <ChoiceCard checked={deliveryMethod === 'pickup'} onSelect={() => setDeliveryMethod('pickup')}>
                <CheckoutIcon name="pickup" />
                <span><strong>On-site Pickup</strong><small>Collect your order directly from JToledo Trading.</small></span>
              </ChoiceCard>
            </div>

            <label className="checkout-notes-label" htmlFor="checkout-notes">Additional information</label>
            <textarea id="checkout-notes" value={notes} maxLength="1000" onChange={(event) => setNotes(event.target.value)} placeholder="Delivery instructions or order notes (optional)" />
          </section>

          <section className="checkout-column" aria-labelledby="payment-method-title">
            <h2 id="payment-method-title">Payment Method</h2>
            <div className="checkout-choice-list" role="radiogroup" aria-labelledby="payment-method-title">
              <ChoiceCard checked={paymentMethod === 'cash'} onSelect={() => setPaymentMethod('cash')}>
                <CheckoutIcon name="cash" />
                <span><strong>Cash on Delivery</strong><small>Pay with cash when your pineapples arrive.</small></span>
              </ChoiceCard>
              <ChoiceCard checked={paymentMethod === 'qrph'} onSelect={() => setPaymentMethod('qrph')}>
                <QrCode aria-hidden="true" />
                <span><strong>QR Ph</strong><small>Pay with BDO Pay or another supported banking app.</small></span>
              </ChoiceCard>
              <ChoiceCard checked={paymentMethod === 'gcash'} onSelect={() => setPaymentMethod('gcash')}>
                <WalletCards aria-hidden="true" />
                <span><strong>GCash</strong><small>Pay securely using your GCash mobile wallet.</small></span>
              </ChoiceCard>
            </div>
          </section>

          <button className="checkout-submit" type="submit" disabled={loading || placing || items.length === 0 || Boolean(placedOrder) || !deliveryAddressReady}>
            {orderButtonLabel}
          </button>
          {placedOrder && orderToastVisible && (
            <aside className={`checkout-order-toast ${['gcash', 'qrph'].includes(placedOrder.payment_method) ? '' : 'is-success'}`} role="status" aria-live="polite">
              <span className="checkout-order-toast-icon"><Check aria-hidden="true" /></span>
              <div>
                {['gcash', 'qrph'].includes(placedOrder.payment_method) ? (
                  <>
                    <strong>{placedOrder.payment_method === 'gcash' ? 'GCash' : 'QR Ph'} payment not started</strong>
                    <p>Order <b>{placedOrder.order_number}</b> was placed. Continue to payment.</p>
                    <button type="button" className="checkout-retry-payment" onClick={retryOnlinePayment} disabled={retryingPayment}>
                      {retryingPayment ? 'Opening…' : 'Continue to Payment'}
                    </button>
                  </>
                ) : (
                  <>
                    <strong>Order placed successfully</strong>
                    <p>Order <b>{placedOrder.order_number}</b> was placed successfully.</p>
                  </>
                )}
              </div>
              <a href={`/buyer/delivery-progress?track=${encodeURIComponent(placedOrder.id)}`}>View Order Details</a>
              {['gcash', 'qrph'].includes(placedOrder.payment_method) && <button type="button" onClick={() => setOrderToastVisible(false)} aria-label="Dismiss order notification"><X aria-hidden="true" /></button>}
            </aside>
          )}
        </form>

        <p className="checkout-terms">By placing your order, you agree to our <a href="#terms">Terms &amp; Conditions</a>.</p>
      </div>

      <BuyerFooter />
    </main>
  )
}
