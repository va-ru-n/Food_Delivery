const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
    try {
        console.log('--- Order flow test started ---');
        // We already have mongdb connected, so wait let's just make API calls.

        // 1. Create a customer to test with.
        console.log('Creating customer...');
        const customerPassword = 'password123';
        const customerPhone = `+919999999${Math.floor(Math.random() * 100)}`;
        const custRes = await axios.post(`${BASE_URL}/auth/register`, {
            name: 'Test Customer',
            phoneNumber: customerPhone,
            password: customerPassword
        });
        const customerToken = custRes.data.token;

        // 2. We need a restaurant. Let's get the list of restaurants to borrow an item.
        console.log('Fetching restaurants...');
        const restRes = await axios.get(`${BASE_URL}/restaurants`);
        const restaurants = restRes.data;
        if (restaurants.length === 0) {
            console.error('No restaurants found to test with.');
            return;
        }

        const restaurant = restaurants[0];
        const restMenuRes = await axios.get(`${BASE_URL}/restaurants/${restaurant._id}/foods`);
        const foods = restMenuRes.data;
        if (foods.length === 0) {
            console.error('No foods found in the first restaurant.');
            return;
        }

        const foodItem = foods[0];

        // 3. Place an order as the customer
        console.log('Placing order...');
        const orderRes = await axios.post(`${BASE_URL}/orders`, {
            items: [{
                foodItem: foodItem._id,
                name: foodItem.name,
                price: foodItem.price,
                quantity: 1
            }],
            totalAmount: foodItem.price,
            deliveryAddress: '123 Test St',
            phoneNumber: customerPhone
        }, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });

        const order = orderRes.data;
        console.log('Order created successfully:', order._id);

        // 4. Try getting user orders to see if it shows up
        const myOrdersRes = await axios.get(`${BASE_URL}/orders/mine`, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        console.log(`Customer has ${myOrdersRes.data.length} orders. Mode: `, myOrdersRes.data[0].status);

        console.log('--- Test passed successfully ---');
    } catch (error) {
        if (error.response) {
            console.error('API Error Response:', error.response.status, error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

runTest();
