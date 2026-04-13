import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

export interface ReverseGeocodeResult {
  houseNumber: string;
  building: string;
  landmark: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
}

interface NominatimAddress {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  postcode?: string;
  amenity?: string;
}

interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
}

@Injectable({
  providedIn: 'root',
})
export class GeocodingService {
  constructor(private readonly http: HttpClient) {}

  reverseGeocode(lat: number, lng: number): Observable<ReverseGeocodeResult> {
    const params = new HttpParams()
      .set('format', 'jsonv2')
      .set('lat', String(lat))
      .set('lon', String(lng))
      .set('addressdetails', '1');

    return this.http
      .get<NominatimResponse>('https://nominatim.openstreetmap.org/reverse', { params })
      .pipe(
        map((response) => {
          const address = response.address ?? {};
          const city =
            address.city ??
            address.town ??
            address.village ??
            address.municipality ??
            address.county ??
            '';

          const building = address.road ?? '';
          const area = address.suburb ?? address.neighbourhood ?? '';
          const landmark = address.amenity ?? response.display_name?.split(',')[0]?.trim() ?? '';

          return {
            houseNumber: address.house_number?.trim() ?? '',
            building: building.trim(),
            landmark: landmark.trim(),
            area: area.trim(),
            city: city.trim(),
            state: address.state?.trim() ?? '',
            pincode: address.postcode?.replace(/\D/g, '').slice(0, 6) ?? '',
          };
        }),
      );
  }
}
