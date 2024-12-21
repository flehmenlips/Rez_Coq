const fetch = require('node-fetch');
const BASE_URL = 'http://localhost:3000';

async function testEndpoints() {
    console.log('=== Testing API Endpoints ===\n');

    // Test auth
    console.log('1. Testing Authentication:');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'admin',
            password: 'CHANGE_ME_ON_FIRST_LOGIN'
        })
    });
    const { token } = await loginRes.json();
    console.log('✓ Login test complete\n');

    // Test reservations
    console.log('2. Testing Reservations:');
    const reservation = {
        date: '2024-12-25',
        time: '12:00 PM',
        guests: 4,
        name: 'Test User',
        email: 'test@example.com'
    };

    const resRes = await fetch(`${BASE_URL}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reservation)
    });
    console.log('✓ Create reservation test complete');

    // Test capacity
    console.log('\n3. Testing Capacity:');
    const capRes = await fetch(`${BASE_URL}/api/capacity/2024-12-25`);
    console.log('✓ Capacity check test complete');

    // Test time slots
    console.log('\n4. Testing Time Slots:');
    const timeRes = await fetch(`${BASE_URL}/api/available-times?date=2024-12-25`);
    console.log('✓ Time slots test complete');

    console.log('\nAll tests completed!');
}

testEndpoints().catch(console.error); 