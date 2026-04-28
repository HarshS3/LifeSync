const API_BASE = 'http://localhost:5000'; 

async function test() {
  console.log('Testing LifeSync Insights Endpoints (using native fetch)...');
  
  try {
    // 1. Login
    console.log('Logging in demo user...');
    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo_insights@lifesync.ai',
        password: 'password123'
      })
    });
    
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    
    const token = loginData.token;
    console.log('Login successful.');

    const headers = { Authorization: `Bearer ${token}` };

    const endpoints = [
      '/api/insights/progress',
      '/api/insights/nutritional-dna',
      '/api/insights/recovery-capacity',
      '/api/insights/sleep-architecture'
    ];

    for (const endpoint of endpoints) {
      console.log(`\nTesting ${endpoint}...`);
      const res = await fetch(`${API_BASE}${endpoint}`, { headers });
      const data = await res.json();
      if (!res.ok) {
        console.error(`Error at ${endpoint}:`, data);
      } else {
        console.log('Response Status:', res.status);
        console.log('Data (first few keys):', Object.keys(data));
        if (data.status === 'success' || data.narratives) {
          console.log('✅ Logic verified.');
        } else if (data.status === 'insufficient_data') {
          console.log('ℹ️ Insufficient data response (Expected if seeding was partial).');
        } else {
          console.log('Data:', JSON.stringify(data, null, 2));
        }
      }
    }

  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

test();
