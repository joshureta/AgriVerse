import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CircleAlert,
  Check,
  Truck,
  Store,
  Banknote,
  Smartphone,
  X,
} from 'lucide-react'
import { BuyerFooter, BuyerHeader, BuyerJourneyNav } from '../../components/BuyerChrome.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { clearCheckoutRequestKey, getCheckoutRequestKey } from '../../services/checkoutAttempt.js'
import pineappleImage from '../../assets/buyer/pineapple-product-clean.png'
import {
  createBuyerDeliveryAddress,
  createGcashCheckout,
  loadBuyerDeliveryAddresses,
  loadPineappleProducts,
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

// Displays one selectable checkout option.
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

// Finds a location option by name.
function matchingLocation(items, name) {
  const normalizedName = String(name || '').trim().toLocaleLowerCase()
  return items.find(
    (item) => String(item.name || '').trim().toLocaleLowerCase() === normalizedName,
  )
}

const CITY_OF_MANILA_CODE = '1380600000'
const CITY_OF_MANILA_PREFIX = CITY_OF_MANILA_CODE.slice(0, 5)

// Checks whether a location is a Manila district.
function isManilaDistrict(item) {
  return String(item?.code || '').startsWith(CITY_OF_MANILA_PREFIX)
    && item.code !== CITY_OF_MANILA_CODE
}

// Lists the district choices for Manila.
function getManilaDistricts(items) {
  return items
    .filter(isManilaDistrict)
    .sort((first, second) => first.name.localeCompare(second.name))
}

// Prepares city and municipality choices for display.
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

// Displays the delivery location fields in checkout.
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
  const [manualLocationEntry, setManualLocationEntry] = useState(false)
  const provinceNotApplicable = Boolean(regionCode)
    && !loadingProvinces
    && provinces.length === 0
  const manilaSelected = cityMunicipalityCode === CITY_OF_MANILA_CODE
  const selectedDistrict = districts.find((item) => item.code === districtCode)

  // Reports whether the selected delivery location is complete.
  useEffect(() => {
    const locationIsValid = manualLocationEntry ? Boolean(
      address.region.trim()
      && address.city_municipality.trim()
      && address.barangay.trim(),
    ) : Boolean(
      regionCode
      && cityMunicipalityCode
      && (!manilaSelected || districtCode)
      && barangayCode
      && (provinceNotApplicable || provinceCode),
    )
    onValidityChange(locationIsValid)
  }, [
    address.barangay,
    address.city_municipality,
    address.region,
    barangayCode,
    cityMunicipalityCode,
    districtCode,
    manilaSelected,
    manualLocationEntry,
    onValidityChange,
    provinceCode,
    provinceNotApplicable,
    regionCode,
  ])

  // Loads location choices for the saved delivery address.
  useEffect(() => {
    mountedRef.current = true
    const initialAddress = initialAddressRef.current
    const requestVersion = requestVersionRef.current + 1
    requestVersionRef.current = requestVersion

    // Matches saved address values to location choices.
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
      } catch {
        if (mountedRef.current && requestVersionRef.current === requestVersion) {
          setLocationError('Location options are unavailable. Enter your location manually.')
          setManualLocationEntry(true)
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

  // Loads provinces after a region is selected.
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
    } catch {
      if (mountedRef.current && requestVersionRef.current === requestVersion) {
        setLocationError('Location options are unavailable. Enter your location manually.')
        setManualLocationEntry(true)
      }
    } finally {
      if (mountedRef.current && requestVersionRef.current === requestVersion) {
        setLoadingProvinces(false)
        setLoadingCities(false)
      }
    }
  }

  // Loads cities after a province is selected.
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
    } catch {
      if (mountedRef.current && requestVersionRef.current === requestVersion) {
        setLocationError('Location options are unavailable. Enter your location manually.')
        setManualLocationEntry(true)
      }
    } finally {
      if (mountedRef.current && requestVersionRef.current === requestVersion) {
        setLoadingCities(false)
      }
    }
  }

  // Loads barangays or districts for a city.
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
    } catch {
      if (mountedRef.current && requestVersionRef.current === requestVersion) {
        setLocationError('Location options are unavailable. Enter your location manually.')
        setManualLocationEntry(true)
      }
    } finally {
      if (mountedRef.current && requestVersionRef.current === requestVersion) {
        setLoadingDistricts(false)
        setLoadingBarangays(false)
      }
    }
  }

  // Loads barangays for a Manila district.
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
    } catch {
      if (mountedRef.current && requestVersionRef.current === requestVersion) {
        setLocationError('Location options are unavailable. Enter your location manually.')
        setManualLocationEntry(true)
      }
    } finally {
      if (mountedRef.current && requestVersionRef.current === requestVersion) {
        setLoadingBarangays(false)
      }
    }
  }

  // Saves the selected delivery barangay.
  function selectBarangay(event) {
    const nextCode = event.target.value
    const selectedBarangay = barangays.find((item) => item.code === nextCode)
    setBarangayCode(nextCode)
    onChange({ barangay: selectedBarangay?.name || '' })
  }

  return <>
    {manualLocationEntry ? <>
      {[
        ['region', 'Region', 'Enter region'],
        ['province', 'Province', 'Enter province (optional)'],
        ['city_municipality', 'City / Municipality', 'Enter city or municipality'],
        ['barangay', 'Barangay', 'Enter barangay'],
      ].map(([name, label, placeholder]) => <label key={name}><span>{label}{name !== 'province' && <em>*</em>}</span><input name={name} value={address[name]} placeholder={placeholder} maxLength={150} disabled={disabled} onChange={(event) => onChange({ [name]: event.target.value })} /></label>)}
    </> : <>
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
      <span>Province{!provinceNotApplicable && <em>*</em>}</span>
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
    </>}
    {locationError && <p className="checkout-location-error" role="alert">{locationError}</p>}
  </>
}

const emptyAddress = {
  full_name: '', mobile_number: '', country: '', region: '', province: '', city_municipality: '', barangay: '',
}
const MINIMUM_PINEAPPLE_SUBTOTAL = 1500

// Checks whether an address has all required fields.
function addressIsComplete(address) {
  return ['full_name', 'mobile_number', 'country', 'region', 'city_municipality', 'barangay']
    .every((field) => String(address[field] || '').trim())
}

// Checks whether two delivery addresses match.
function sameDeliveryAddress(first, second) {
  return Object.keys(emptyAddress).every((field) =>
    String(first?.[field] || '').trim().toLocaleLowerCase()
      === String(second?.[field] || '').trim().toLocaleLowerCase(),
  )
}

// Displays delivery, payment, and order review steps.
export default function BuyerCheckout() {
  const { profile } = useAuth()
  const [items, setItems] = useState([])
  const [deliveryMethod, setDeliveryMethod] = useState('delivery')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [orderConnectionUncertain, setOrderConnectionUncertain] = useState(false)
  const [notice, setNotice] = useState('')
  const [placedOrder, setPlacedOrder] = useState(null)
  const [orderToastVisible, setOrderToastVisible] = useState(false)
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [orderAddress, setOrderAddress] = useState(null)
  const [savedAddresses, setSavedAddresses] = useState([])
  const [alternateAddress, setAlternateAddress] = useState(emptyAddress)
  const [addressLocationValid, setAddressLocationValid] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)
  const [retryingPayment, setRetryingPayment] = useState(false)

  // Starts another online payment attempt for the order.
  async function retryOnlinePayment() {
    if (!placedOrder || retryingPayment) return
    setRetryingPayment(true)
    setError('')
    try {
      const checkoutUrl = await createGcashCheckout(placedOrder.id)
      window.location.href = checkoutUrl
    } catch (requestError) {
      setError(requestError.message)
      setRetryingPayment(false)
    }
  }

  // Clears the uncertain connection state after an error resolves.
  useEffect(() => {
    if (!error && orderConnectionUncertain) setOrderConnectionUncertain(false)
  }, [error, orderConnectionUncertain])

  // Opens tracking after a non-GCash order is placed.
  useEffect(() => {
    if (!placedOrder || placedOrder.payment_method === 'gcash') return undefined
    const redirectTimer = window.setTimeout(() => {
      window.location.replace(`/buyer/delivery-progress?track=${encodeURIComponent(placedOrder.id)}`)
    }, 2000)
    return () => window.clearTimeout(redirectTimer)
  }, [placedOrder])

  // Loads the buyer's saved delivery addresses.
  useEffect(() => {
    let active = true
    loadBuyerDeliveryAddresses().then(({ addresses, defaultAddressId }) => {
      if (!active) return
      setSavedAddresses((current) => [
        ...addresses,
        ...current.filter((entry) => !addresses.some((address) => address.id === entry.id)),
      ])
      const preferred = addresses.find((address) => address.id === defaultAddressId)
        || addresses.at(-1)
      if (preferred) setOrderAddress((current) => current || preferred)
    }).catch((requestError) => {
      if (active) setError(requestError.message)
    })
    return () => { active = false }
  }, [])

  // Checks cart items against current stock before checkout.
  useEffect(() => {
    let active = true
    // Loads and verifies the items to be ordered.
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

  // Builds the buyer's saved profile address.
  const savedAddress = useMemo(() => ({
    full_name: profile?.full_name || '',
    mobile_number: profile?.mobile_number || '',
    country: profile?.country || '',
    region: profile?.region || '',
    province: profile?.province || '',
    city_municipality: profile?.city_municipality || '',
    barangay: profile?.barangay || '',
  }), [profile])

  const deliveryAddress = orderAddress || savedAddress

  // Chooses the address used for this order.
  const address = useMemo(() => {
    const locality = [deliveryAddress.barangay, deliveryAddress.city_municipality].filter(Boolean).join(', ')
    const region = [deliveryAddress.province, deliveryAddress.region, deliveryAddress.country].filter(Boolean).join(', ')
    return { locality, region }
  }, [deliveryAddress])

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shippingFee = deliveryMethod === 'delivery' && items.length > 0 ? 100 : 0
  const total = subtotal + shippingFee
  let orderButtonLabel = 'Place Order'
  if (placing) orderButtonLabel = 'Placing order…'
  else if (placedOrder) orderButtonLabel = 'Order placed'
  else if (deliveryMethod === 'delivery' && !addressIsComplete(deliveryAddress)) orderButtonLabel = 'Add delivery address'

  // Closes the delivery address editor.
  function closeAddressModal() {
    if (savingAddress) return
    setAddressModalOpen(false)
    setError('')
  }

  // Opens the delivery address editor.
  function openAddressEditor() {
    setAlternateAddress({ ...emptyAddress, ...deliveryAddress, country: 'Philippines' })
    setAddressLocationValid(false)
    setAddressModalOpen(true)
    setError('')
  }

  // Saves the delivery address chosen for this order.
  async function saveAddressForOrder() {
    if (!addressIsComplete(alternateAddress) || !addressLocationValid || savingAddress) return
    const address = Object.fromEntries(
      Object.keys(emptyAddress).map((field) => [field, String(alternateAddress[field] || '').trim()]),
    )
    setSavingAddress(true)
    setError('')
    try {
      let saved = savedAddresses.find((entry) => sameDeliveryAddress(entry, address))
      if (!saved) {
        try {
          saved = await createBuyerDeliveryAddress(address)
        } catch (requestError) {
          if (!/already saved/i.test(requestError.message)) throw requestError
          const refreshed = await loadBuyerDeliveryAddresses()
          setSavedAddresses(refreshed.addresses)
          saved = refreshed.addresses.find((entry) => sameDeliveryAddress(entry, address))
          if (!saved) throw requestError
        }
      }
      await saveDefaultBuyerDeliveryAddress(saved.id)
      setSavedAddresses((current) => current.some((entry) => entry.id === saved.id)
        ? current : [...current, saved])
      setOrderAddress(saved)
      setAddressModalOpen(false)
      setNotice('Delivery address saved for future checkouts.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSavingAddress(false)
    }
  }

  // Places the order with the selected delivery and payment details.
  async function completeOrder(addressForOrder = null) {
    if (items.length === 0 || placedOrder || placing) return
    if (subtotal < MINIMUM_PINEAPPLE_SUBTOTAL) {
      setError('Add more pineapples to reach the PHP 1,500 minimum before shipping.')
      return
    }
    setPlacing(true)
    setOrderConnectionUncertain(false)
    setError('')
    try {
      const orderDetails = {
        delivery_method: deliveryMethod,
        payment_method: paymentMethod,
        customer_note: notes,
        delivery_address: deliveryMethod === 'delivery' ? addressForOrder : null,
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

      setOrderToastVisible(true)
    } catch (requestError) {
      setOrderConnectionUncertain(requestError.code === 'CHECKOUT_CONNECTION_UNCERTAIN')
      setError(requestError.message)
      if (/insufficient stock|product.*unavailable/i.test(requestError.message)) {
        try {
          const products = await loadPineappleProducts()
          const productById = new Map(products.map((product) => [String(product.id), product]))
          const updatedItems = items.flatMap((item) => {
            const product = productById.get(String(item.id))
            const quantity = Math.min(item.quantity, Number(product?.stock_quantity) || 0)
            return quantity > 0 ? [{ ...product, quantity }] : []
          })
          if (updatedItems.length !== items.length
            || updatedItems.some((item, index) => item.quantity !== items[index].quantity)) {
            setItems(updatedItems)
            writeBuyerCart(updatedItems)
            setError('Stock changed while you were checking out. Review your updated order and place it again.')
          }
        } catch {
          // Keep the original order error if inventory cannot be refreshed.
        }
      }
    } finally {
      setPlacing(false)
    }
  }

  // Validates checkout and starts order placement.
  async function submitOrder(event) {
    event.preventDefault()
    if (items.length === 0 || placedOrder) return
    if (subtotal < MINIMUM_PINEAPPLE_SUBTOTAL) {
      setError('Add more pineapples to reach the PHP 1,500 minimum before shipping.')
      return
    }
    if (deliveryMethod === 'delivery' && !addressIsComplete(deliveryAddress)) {
      openAddressEditor()
      return
    }
    await completeOrder(deliveryMethod === 'delivery' ? deliveryAddress : null)
  }

  return (
    <main className="buyer-page checkout-page">
      {/* Marketplace navigation and checkout progress. */}
      <BuyerHeader active="orders" cartCount={placedOrder ? 0 : buyerCartQuantity(items)} />
      <BuyerJourneyNav current="checkout" />

      <div className="checkout-shell">
        <header className="checkout-heading">
          <h1>Delivery Information</h1>
          <p>Review your order, select delivery and payment options, then place your order.</p>
        </header>

        {notice && <p className="checkout-notice" role="status">{notice}</p>}
        {error && (
          <aside className={`checkout-error-toast${orderConnectionUncertain ? ' is-persistent' : ''}`} role="alert" aria-live="assertive">
            <span className="checkout-error-toast-icon"><CircleAlert aria-hidden="true" /></span>
            <div>
              <strong>{orderConnectionUncertain ? 'Order status uncertain' : 'Unable to continue'}</strong>
              <p>{error}</p>
              {orderConnectionUncertain && <a href="/buyer/delivery-progress">View orders</a>}
            </div>
            <button type="button" className="checkout-error-dismiss" onClick={() => setError('')} aria-label="Dismiss error"><X aria-hidden="true" /></button>
          </aside>
        )}
        {/* Delivery address selection and editing. */}
        <section className="checkout-card checkout-address" aria-labelledby="delivery-address-title">
          <div className="checkout-address-head">
            <h2 id="delivery-address-title">Delivery Information</h2>
            <button type="button" onClick={openAddressEditor}>{addressIsComplete(deliveryAddress) ? 'Edit information' : 'Add information'}</button>
          </div>
          <div className="checkout-address-rule" />
          {Object.values(deliveryAddress).some((value) => String(value || '').trim()) ? <address>
            <strong>{deliveryAddress.full_name}</strong><br />
            {address.locality}<br />
            {address.region}<br />
            {deliveryAddress.mobile_number}
          </address> : <p className="checkout-address-empty">No delivery information has been added.</p>}
          {!addressIsComplete(deliveryAddress) && <p className="checkout-address-empty">Add the missing delivery details before placing your order.</p>}
        </section>

        {addressModalOpen && <div className="checkout-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAddressModal() }}>
          {/* Form for a different delivery address. */}
          <section className="checkout-address-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-address-modal-title">
            <header><div><span>Delivery information</span><h2 id="checkout-address-modal-title">Delivery Address</h2><p>Enter the address to use for this order and future checkouts.</p></div><button type="button" onClick={closeAddressModal} disabled={savingAddress} aria-label="Close address form"><X /></button></header>
            <div className="checkout-address-fields checkout-new-address-fields">
              {[
                ['full_name', 'Full Name', 'Enter recipient name'],
                ['mobile_number', 'Phone Number', 'Enter mobile number'],
              ].map(([name, label, placeholder]) => <label key={name}><span>{label}<em>*</em></span><input name={name} value={alternateAddress[name]} placeholder={placeholder} maxLength={150} onChange={(event) => setAlternateAddress((current) => ({ ...current, [name]: event.target.value }))} required /></label>)}
              <CheckoutLocationFields
                address={alternateAddress}
                disabled={false}
                onChange={(changes) => setAlternateAddress((current) => ({ ...current, ...changes }))}
                onValidityChange={setAddressLocationValid}
              />
              <label><span>Country<em>*</em></span><input name="country" value="Philippines" disabled /></label>
            </div>
            <footer><button type="button" className="is-cancel" onClick={closeAddressModal} disabled={savingAddress}>Cancel</button><button type="button" className="is-save" disabled={savingAddress || !addressIsComplete(alternateAddress) || !addressLocationValid} onClick={saveAddressForOrder}>{savingAddress ? 'Saving…' : 'Save and Use Address'}</button></footer>
          </section>
        </div>}
        {/* Items and order cost summary. */}
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
          {/* Delivery or pickup choice. */}
          <section className="checkout-column" aria-labelledby="delivery-method-title">
            <h2 id="delivery-method-title">Delivery Method</h2>
            <div className="checkout-choice-list" role="radiogroup" aria-labelledby="delivery-method-title">
              <ChoiceCard checked={deliveryMethod === 'delivery'} onSelect={() => setDeliveryMethod('delivery')}>
                <Truck aria-hidden="true" />
                <span><strong>Standard Delivery</strong><small>Delivery to the address shown above.</small></span>
              </ChoiceCard>
              <ChoiceCard checked={deliveryMethod === 'pickup'} onSelect={() => setDeliveryMethod('pickup')}>
                <Store aria-hidden="true" />
                <span><strong>On-site Pickup</strong><small>Collect your order directly from JToledo Trading.</small></span>
              </ChoiceCard>
            </div>

            <label className="checkout-notes-label" htmlFor="checkout-notes">Additional information</label>
            <textarea id="checkout-notes" value={notes} maxLength="1000" onChange={(event) => setNotes(event.target.value)} placeholder="Delivery instructions or order notes (optional)" />
          </section>

          {/* Payment method choice. */}
          <section className="checkout-column" aria-labelledby="payment-method-title">
            <h2 id="payment-method-title">Payment Method</h2>
            <div className="checkout-choice-list" role="radiogroup" aria-labelledby="payment-method-title">
              <ChoiceCard checked={paymentMethod === 'cash'} onSelect={() => setPaymentMethod('cash')}>
                <Banknote aria-hidden="true" />
                <span>
                  <strong>{deliveryMethod === 'pickup' ? 'Cash on Pickup' : 'Cash on Delivery'}</strong>
                  <small>{deliveryMethod === 'pickup' ? 'Pay with cash when you collect your pineapples.' : 'Pay with cash when your pineapples arrive.'}</small>
                </span>
              </ChoiceCard>
              <ChoiceCard checked={paymentMethod === 'gcash'} onSelect={() => setPaymentMethod('gcash')}>
                <Smartphone aria-hidden="true" />
                <span><strong>GCash</strong><small>Pay securely using your GCash mobile wallet.</small></span>
              </ChoiceCard>
            </div>
          </section>

          <button className="checkout-submit" type="submit" disabled={loading || placing || items.length === 0 || Boolean(placedOrder)}>
            {orderButtonLabel}
          </button>
          {placedOrder && orderToastVisible && (
            <aside className={`checkout-order-toast ${placedOrder.payment_method === 'gcash' ? '' : 'is-success'}`} role="status" aria-live="polite">
              <span className="checkout-order-toast-icon"><Check aria-hidden="true" /></span>
              <div>
                {placedOrder.payment_method === 'gcash' ? (
                  <>
                    <strong>GCash payment not started</strong>
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
              {placedOrder.payment_method === 'gcash' && <button type="button" onClick={() => setOrderToastVisible(false)} aria-label="Dismiss order notification"><X aria-hidden="true" /></button>}
            </aside>
          )}
        </form>

        <p className="checkout-terms">By placing your order, you agree to our <a href="#terms">Terms &amp; Conditions</a>.</p>
      </div>

      <BuyerFooter />
    </main>
  )
}
