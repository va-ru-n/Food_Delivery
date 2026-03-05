import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const authAPI = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  forgotPassword: (payload) => api.post('/auth/forgot-password', payload),
  resetPassword: (payload) => api.post('/auth/reset-password', payload),
  createUserByAdmin: (payload) => api.post('/auth/admin/users', payload),
  getRestaurantOwners: () => api.get('/auth/admin/restaurant-owners'),
  getDeliveryPartners: () => api.get('/auth/admin/delivery-partners')
};

export const restaurantAPI = {
  getAll: () => api.get('/restaurants'),
  getById: (id) => api.get(`/restaurants/${id}`),
  getFoodByRestaurant: (restaurantId) => api.get(`/restaurants/${restaurantId}/foods`),
  addRestaurant: (payload) => api.post('/restaurants', payload),
  addFoodItem: (payload) => api.post('/restaurants/foods', payload),
  updateFoodItemQuantity: (id, quantity) => api.patch(`/restaurants/foods/${id}/quantity`, { quantity }),
  deleteRestaurant: (id) => api.delete(`/restaurants/${id}`)
};

export const orderAPI = {
  create: (payload) => api.post('/orders', payload),
  getMine: () => api.get('/orders/mine'),
  getAll: () => api.get('/orders'),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  cancelByCustomer: (id) => api.patch(`/orders/${id}/cancel`),
  hideByCustomer: (id) => api.patch(`/orders/${id}/hide`)
};

export const restaurantOwnerAPI = {
  getMyRestaurant: () => api.get('/restaurant/my-restaurant'),
  updateMyRestaurantOpenStatus: (isOpen) => api.patch('/restaurant/my-restaurant/open-status', { isOpen }),
  updateMyRestaurantTimings: (openingTime, closingTime) =>
    api.patch('/restaurant/my-restaurant/timings', { openingTime, closingTime }),
  getOrders: () => api.get('/restaurant/orders'),
  updateOrderStatus: (id, status) => api.patch(`/restaurant/orders/${id}/status`, { status }),
  getDeliveryPartners: () => api.get('/restaurant/delivery-partners'),
  assignDeliveryPartner: (id, deliveryPartnerId) =>
    api.patch(`/restaurant/orders/${id}/assign-delivery`, { deliveryPartnerId }),
  getFoodItems: () => api.get('/restaurant/foods'),
  updateFoodItemAvailability: (id, availabilityStatus) =>
    api.patch(`/restaurant/foods/${id}/availability`, { availabilityStatus })
};

export const deliveryAPI = {
  getMyOrders: () => api.get('/delivery/orders'),
  markPickedUp: (id) => api.patch(`/delivery/orders/${id}/pickup`),
  markDelivered: (id) => api.patch(`/delivery/orders/${id}/delivered`)
};

export default api;
