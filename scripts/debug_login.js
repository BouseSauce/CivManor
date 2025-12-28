import fs from 'fs';

console.log('Starting debug script...');

async function testLogin() {
    const usersToTest = [
        { username: 'test01', password: 'any' }, // Should fail (not found)
        { username: 'Test', password: 'wrongpassword' } // Should succeed (permissive)
    ];

    for (const { username, password } of usersToTest) {
        console.log(`Attempting login for ${username}...`);
        try {
            const res = await fetch('http://localhost:3001/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const text = await res.text();
            console.log(`Status for ${username}:`, res.status);
            console.log(`Response for ${username}:`, text);
        } catch (e) {
            console.error(`Error for ${username}:`, e.message);
        }
    }
}

testLogin();
