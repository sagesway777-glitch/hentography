// check_redirect.js - diagnose what happens after login
const http = require('http');

function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  // Step 1: POST login
  console.log('=== Step 1: POST /api/admin/login ===');
  const loginBody = JSON.stringify({ email: 'sampadchowdhury777@gmail.com', password: 'wb24q0929' });
  const loginResult = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) }
  }, loginBody);
  
  console.log(`Status: ${loginResult.status}`);
  console.log(`Body: ${loginResult.body}`);
  const cookies = loginResult.headers['set-cookie'];
  console.log(`Set-Cookie: ${cookies}`);
  
  if (loginResult.status !== 200) {
    console.log('Login failed, stopping.');
    return;
  }
  
  // Extract cookie
  const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
  console.log(`\nCookie to use: ${cookieHeader.substring(0, 60)}...`);
  
  // Step 2: GET /admin with that cookie
  console.log('\n=== Step 2: GET /admin (with cookie) ===');
  const adminResult = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/admin',
    method: 'GET',
    headers: { 'Cookie': cookieHeader }
  });
  console.log(`Status: ${adminResult.status}`);
  console.log(`Location header: ${adminResult.headers['location'] || 'NONE'}`);
  console.log(`Body (first 500 chars): ${adminResult.body.substring(0, 500)}`);
  
  // Step 3: GET /admin without cookie (to see what happens)
  console.log('\n=== Step 3: GET /admin (WITHOUT cookie) ===');
  const noCookieResult = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/admin',
    method: 'GET',
    headers: {}
  });
  console.log(`Status: ${noCookieResult.status}`);
  console.log(`Location header: ${noCookieResult.headers['location'] || 'NONE'}`);
}

main().catch(console.error);
