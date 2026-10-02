export type DeliverySettings = { freeDeliveryThreshold: number; deliveryCharge: number }

export const defaultDeliverySettings: DeliverySettings = { freeDeliveryThreshold: 1999, deliveryCharge: 99 }
export const serviceableLocations = [
  { city: 'Delhi', state: 'Delhi', prefixes: ['110'] },
  { city: 'Noida', state: 'Uttar Pradesh', prefixes: ['201'] },
  { city: 'Greater Noida', state: 'Uttar Pradesh', prefixes: ['201'] },
  { city: 'Ghaziabad', state: 'Uttar Pradesh', prefixes: ['201'] },
  { city: 'Gurugram', state: 'Haryana', prefixes: ['122'] },
  { city: 'Faridabad', state: 'Haryana', prefixes: ['121'] },
]
export const serviceableStates = ['Delhi', 'Haryana', 'Uttar Pradesh']
export const defaultServiceArea = { enabled: true, cities: serviceableLocations.map(location => location.city), pincodes: [] as string[] }

export function calculateDelivery(subtotal: number, settings: DeliverySettings = defaultDeliverySettings) {
  return subtotal >= settings.freeDeliveryThreshold ? 0 : settings.deliveryCharge
}

export function isServiceableLocation(city: string, pincode: string, serviceArea = defaultServiceArea) {
  if (!serviceArea.enabled) return false
  const normalizedCity = city.trim().toLowerCase()
  const cityMatch = serviceArea.cities.some(item => item.toLowerCase() === normalizedCity)
  const normalizedPincode = pincode.trim()
  if (!cityMatch || !/^\d{6}$/.test(normalizedPincode)) return false
  if (serviceArea.pincodes.length > 0) return serviceArea.pincodes.includes(normalizedPincode)
  const location = serviceableLocations.find(item => item.city.toLowerCase() === normalizedCity || (normalizedCity === 'gurgaon' && item.city === 'Gurugram'))
  return Boolean(location?.prefixes.some(prefix => normalizedPincode.startsWith(prefix)))
}

export function locationForPincode(pincode: string) {
  const normalizedPincode = pincode.trim()
  return serviceableLocations.find(location => location.prefixes.some(prefix => normalizedPincode.startsWith(prefix)))
}

export function getBulkOrderUrl(number: string, details: { name: string; phone: string; location: string; requirement: string }) {
  const message = `Hello LATTEY WALA,\n\nI want to enquire about a bulk/outside-service-area order.\n\nName: ${details.name}\nPhone: ${details.phone}\nLocation: ${details.location}\nRequirement: ${details.requirement}\n\nPlease contact me regarding availability and delivery.`
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}
