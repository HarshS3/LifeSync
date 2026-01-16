require('dotenv').config();

const TOKEN_URL = process.env.FATSECRET_TOKEN_URL || 'https://oauth.fatsecret.com/connect/token';
const API_BASE = process.env.FATSECRET_API_BASE || 'https://platform.fatsecret.com/rest/server.api';

async function getAccessToken() {
  const clientId = process.env.FATSECRET_CLIENT_ID;
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Missing FATSECRET_CLIENT_ID/SECRET');

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'basic' }),
  });
  if (!tokenRes.ok) throw new Error(`Token request failed: ${tokenRes.status}`);
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Token response missing access_token');
  return tokenData.access_token;
}

async function main() {
  const query = process.argv.slice(2).join(' ').trim() || 'banana';
  const accessToken = await getAccessToken();

  const searchUrl = `${API_BASE}?method=foods.search&search_expression=${encodeURIComponent(query)}&max_results=1&format=json`;
  const searchRes = await fetch(searchUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  const searchText = await searchRes.text();
  if (!searchRes.ok) {
    throw new Error(`foods.search failed: ${searchRes.status} body=${searchText.slice(0, 500)}`);
  }

  let searchData;
  try {
    searchData = JSON.parse(searchText);
  } catch {
    throw new Error(`foods.search returned non-JSON body=${searchText.slice(0, 500)}`);
  }

  const foodsField = searchData?.foods?.food;
  const foods = !foodsField ? [] : Array.isArray(foodsField) ? foodsField : [foodsField];
  if (!foods.length) {
    console.log('No foods found for query:', query);
    console.log('Raw foods.search response (truncated):', JSON.stringify(searchData).slice(0, 1000));
    return;
  }

  const food = foods[0];
  const foodId = food.food_id;
  console.log('Query:', query);
  console.log('Top food:', { food_id: foodId, food_name: food.food_name, brand_name: food.brand_name || null });

  const detailUrl = `${API_BASE}?method=food.get&food_id=${encodeURIComponent(foodId)}&format=json`;
  const detailRes = await fetch(detailUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!detailRes.ok) throw new Error(`food.get failed: ${detailRes.status}`);
  const detail = await detailRes.json();
  const servingField = detail?.food?.servings?.serving;
  const serving = Array.isArray(servingField) ? servingField[0] : servingField;

  if (!serving) {
    console.log('No serving found on food.get response');
    return;
  }

  const keys = Object.keys(serving).sort();
  console.log('Serving keys:', keys);

  const interesting = [
    'calories',
    'protein',
    'carbohydrate',
    'fat',
    'fiber',
    'sugar',
    'sodium',
    'potassium',
    'calcium',
    'iron',
    'magnesium',
    'zinc',
    'vitamin_c',
    'vitamin_c_mg',
    'vitamin_b',
    'vitamin_b6',
    'vitamin_b12',
    'omega_3_fatty_acid',
    'omega_3',
    'cholesterol',
  ];

  const present = interesting
    .filter((k) => Object.prototype.hasOwnProperty.call(serving, k))
    .reduce((acc, k) => {
      acc[k] = serving[k];
      return acc;
    }, {});

  console.log('Selected present fields:', present);
}

main().catch((err) => {
  console.error('[dev_fatsecret_probe_nutrients] failed:', err?.message || err);
  process.exitCode = 1;
});
