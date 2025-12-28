
// import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001/api';

async function testLogin(username, password) {
    console.log('\n--- Testing Login for ' + username + ' ---');
    try {
        const res = await fetch(BASE_URL + '/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (res.status !== 200) {
            console.log('Login failed: ' + res.status + ' ' + res.statusText);
            const text = await res.text();
            console.log('Response:', text);
            return;
        }

        const data = await res.json();
        console.log('Login success. Token:', data.token ? 'Received' : 'Missing');
        
        if (data.token) {
            await getAccount(data.token);
            await listOwnedAreas(data.token, data.user.id);
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

async function getAccount(token) {
    const res = await fetch(BASE_URL + '/account', {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    console.log('Account Info:', { id: data.id, username: data.username });
}

async function listOwnedAreas(token, userId) {
    const res = await fetch(BASE_URL + '/areas?expand=owners', {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    // Filter for areas owned by this user
    const owned = data.filter(a => a.ownerId === userId);
    console.log('Owned Areas (' + owned.length + '):', owned.map(a => a.id + ' (' + a.name + ')').join(', '));
}

async function run() {
    // Test 'Test' (known to exist)
    await testLogin('Test', 'password');

    // Test 'Test1' (known to exist and own Shadow Wood)
    await testLogin('Test1', 'password');

    // Test 'NonExistent' (should fail)
    await testLogin('NonExistent', 'password');
}

run();
