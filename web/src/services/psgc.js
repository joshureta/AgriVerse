const PSGC_API = 'https://psgc.cloud/api/v2'

async function getItems(path) {
  const response = await fetch(`${PSGC_API}${path}`)

  if (!response.ok) {
    throw new Error('The Philippine address list is temporarily unavailable.')
  }

  const payload = await response.json()
  return Array.isArray(payload) ? payload : payload.data ?? []
}

export function getRegions() {
  return getItems('/regions')
}

export function getRegionProvinces(regionCode) {
  return getItems(`/regions/${encodeURIComponent(regionCode)}/provinces`)
}

export function getRegionCitiesMunicipalities(regionCode) {
  return getItems(
    `/regions/${encodeURIComponent(regionCode)}/cities-municipalities`,
  )
}

export function getProvinceCitiesMunicipalities(provinceCode) {
  return getItems(
    `/provinces/${encodeURIComponent(provinceCode)}/cities-municipalities`,
  )
}

export function getCityMunicipalityBarangays(cityMunicipalityCode) {
  return getItems(
    `/cities-municipalities/${encodeURIComponent(cityMunicipalityCode)}/barangays`,
  )
}

