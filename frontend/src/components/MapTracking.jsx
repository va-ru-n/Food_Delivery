import React from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const icon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
  });

const restaurantIcon = icon('red');
const customerIcon = icon('green');
const deliveryIcon = icon('blue');

const toLatLng = (point) => {
  if (!point || !Array.isArray(point.coordinates) || point.coordinates.length !== 2) {
    return null;
  }

  const [longitude, latitude] = point.coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return [latitude, longitude];
};

function MapTracking({ restaurantPoint, customerPoint, deliveryPoint }) {
  const restaurantLatLng = toLatLng(restaurantPoint);
  const customerLatLng = toLatLng(customerPoint);
  const deliveryLatLng = toLatLng(deliveryPoint);

  const center = deliveryLatLng || restaurantLatLng || customerLatLng || [16.5062, 80.648];

  return (
    <div className="h-80 w-full overflow-hidden rounded-xl border">
      <MapContainer center={center} zoom={13} className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {restaurantLatLng && (
          <Marker position={restaurantLatLng} icon={restaurantIcon}>
            <Popup>Restaurant</Popup>
          </Marker>
        )}

        {customerLatLng && (
          <Marker position={customerLatLng} icon={customerIcon}>
            <Popup>Customer</Popup>
          </Marker>
        )}

        {deliveryLatLng && (
          <Marker position={deliveryLatLng} icon={deliveryIcon}>
            <Popup>Delivery Partner</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

export default MapTracking;
