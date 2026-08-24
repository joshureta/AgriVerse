const PSGC_API = 'https://psgc.cloud/api/v2';

export type PsgcItem = { code: string; name: string };

async function getItems(path: string): Promise<PsgcItem[]> {
  const response = await fetch(`${PSGC_API}${path}`);
  if (!response.ok) throw new Error('The Philippine address list is temporarily unavailable.');
  const payload = await response.json();
  return Array.isArray(payload) ? payload : payload.data ?? [];
}

export function getRegions() { return getItems('/regions'); }
export function getRegionProvinces(regionCode: string) { return getItems(`/regions/${encodeURIComponent(regionCode)}/provinces`); }
export function getRegionCitiesMunicipalities(regionCode: string) { return getItems(`/regions/${encodeURIComponent(regionCode)}/cities-municipalities`); }
export function getProvinceCitiesMunicipalities(provinceCode: string) { return getItems(`/provinces/${encodeURIComponent(provinceCode)}/cities-municipalities`); }
export function getCityMunicipalityBarangays(cityCode: string) { return getItems(`/cities-municipalities/${encodeURIComponent(cityCode)}/barangays`); }
