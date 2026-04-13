export interface AddressLocation {
  lat: number;
  lng: number;
}

export interface Address {
  id: string;
  label: string;
  addressType: string;
  contactName: string;
  phone: string;
  shortAddress: string;
  fullAddress: string;
  location: AddressLocation | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  houseNumber?: string;
  building?: string;
  landmark?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface AddressMutationPayload {
  label: string;
  addressType: string;
  contactName: string;
  phone: string;
  houseNumber: string;
  building: string;
  landmark: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
}
