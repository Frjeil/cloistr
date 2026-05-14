export type Point = {
  id: string
  name: string
  address: string | null
  latitude: number
  longitude: number
  kind: string | null
  availability: string | null
  wifi: boolean
  power: boolean
  quiet: boolean
  airConditioning: boolean
}
