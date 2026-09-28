export type DeliverySettings = { freeDeliveryThreshold: number; deliveryCharge: number }

export const defaultDeliverySettings: DeliverySettings = { freeDeliveryThreshold: 1999, deliveryCharge: 99 }
export const defaultServiceArea = { enabled: true, cities: ['Delhi', 'Noida', 'Greater Noida', 'Ghaziabad', 'Gurugram', 'Gurgaon', 'Faridabad'], pincodes: [] as string[] }

export function calculateDelivery(subtotal: number, settings: DeliverySettings = defaultDeliverySettings) {
  return subtotal >= settings.freeDeliveryThreshold ? 0 : settings.deliveryCharge
}

export function isServiceableLocation(city: string, pincode: string, serviceArea = defaultServiceArea) {
  if (!serviceArea.enabled) return false
  const normalizedCity = city.trim().toLowerCase()
  const cityMatch = serviceArea.cities.some(item => item.toLowerCase() === normalizedCity)
  const pincodeMatch = serviceArea.pincodes.length === 0 || serviceArea.pincodes.includes(pincode.trim())
  return cityMatch && pincodeMatch
}

export function getBulkOrderUrl(number: string, details: { name: string; phone: string; location: string; requirement: string }) {
  const message = `Hello Lattey Wallah,\n\nI want to enquire about a bulk/outside-service-area order.\n\nName: ${details.name}\nPhone: ${details.phone}\nLocation: ${details.location}\nRequirement: ${details.requirement}\n\nPlease contact me regarding availability and delivery.`
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}
