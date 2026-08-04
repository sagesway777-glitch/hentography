// diagnostic.js - directly tests the login API and DB state
const http = require('http');
const { execSync } = require('child_process');

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 3000,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== PHASE 1: LOGIN API TEST ===\n');
  
  const email = 'sampadchowdhury777@gmail.com';
  const password = 'wb24q0929';
  
  console.log(`Attempting login with email: ${email}`);
  console.log(`Password: (redacted, length: ${password.length})\n`);
  
  try {
    const result = await post('http://localhost:3000/api/admin/login', { email, password });
    console.log(`HTTP Status: ${result.status}`);
    console.log(`Response Body: ${result.body}`);
    console.log(`Set-Cookie: ${result.headers['set-cookie'] || 'NONE'}`);
    
    if (result.status === 200) {
      console.log('\nStep 1 LOGIN API: PASS');
      console.log('admin_token cookie was set:', result.headers['set-cookie'] ? result.headers['set-cookie'].join('; ') : 'MISSING');
    } else {
      console.log('\nStep 1 LOGIN API: FAIL');
      console.log('Reason:', result.body);
    }
  } catch (e) {
    console.log('Step 1 LOGIN API: FAIL');
    console.log('Error connecting to server:', e.message);
  }
}

main().catch(console.error);
