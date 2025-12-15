// Simple wrapper around a public nutrition API (FatSecret)
// It expects env vars FATSECRET_CLIENT_ID and FATSECRET_CLIENT_SECRET.
// If they are missing or the API calls fail, it returns an empty list.

const TOKEN_URL = process.env.FATSECRET_TOKEN_URL || 'https://oauth.fatsecret.com/connect/token'
const API_BASE = process.env.FATSECRET_API_BASE || 'https://platform.fatsecret.com/rest/server.api'

async function searchFoods(query) {
  if (!query || !query.trim()) return []

  console.log('[NutritionProvider] searchFoods called with query:', query.trim())

  const clientId = process.env.FATSECRET_CLIENT_ID
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.warn('[NutritionProvider] FATSECRET_CLIENT_ID/SECRET not configured; skipping API call')
    // API not configured; caller should handle empty result gracefully
    return []
  }

  try {
    if (typeof fetch !== 'function') {
      throw new Error('Fetch is not available in this Node runtime')
    }

    // 1) Get OAuth2 access token from FatSecret
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    console.log('[NutritionProvider] Requesting FatSecret token from', TOKEN_URL)

    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'basic',
      }),
    })

    if (!tokenRes.ok) {
      console.error('[NutritionProvider] FatSecret token error:', tokenRes.status)
      return []
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token
    if (!accessToken) {
      console.error('[NutritionProvider] FatSecret token missing access_token field')
      return []
    }

    console.log('[NutritionProvider] Obtained FatSecret token successfully')

    // 2) Search foods
    const searchUrl = `${API_BASE}?method=foods.search&search_expression=${encodeURIComponent(
      query.trim()
    )}&max_results=10&format=json`

    const res = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!res.ok) {
      console.error('[NutritionProvider] FatSecret search error:', res.status)
      return []
    }

    const data = await res.json()
    const foodsRoot = data.foods || {}
    const foodsField = foodsRoot.food
    const foods = !foodsField
      ? []
      : Array.isArray(foodsField)
        ? foodsField
        : [foodsField]

    if (!foods.length) {
      console.log('[NutritionProvider] FatSecret search returned 0 foods, raw response:', JSON.stringify(data))
      return []
    }

    // 3) For each food, fetch detailed nutrition via food.get
    const results = await Promise.all(
      foods.slice(0, 10).map(async (f) => {
        const foodId = f.food_id

        let calories = 0
        let protein = 0
        let carbs = 0
        let fat = 0
        let fiber = 0
        let sugar = 0
        let sodium = 0
        let servingQty = 1
        let servingUnit = 'serving'

        try {
          const detailUrl = `${API_BASE}?method=food.get&food_id=${encodeURIComponent(
            foodId
          )}&format=json`
          const detailRes = await fetch(detailUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          })

          if (detailRes.ok) {
            const detail = await detailRes.json()
            const foodDetail = detail.food || {}
            const servings = foodDetail.servings || {}
            const serving = Array.isArray(servings.serving)
              ? servings.serving[0]
              : servings.serving || null

            if (serving) {
              const toNum = (v) => (v != null ? Number(v) || 0 : 0)
              calories = toNum(serving.calories)
              protein = toNum(serving.protein)
              carbs = toNum(serving.carbohydrate)
              fat = toNum(serving.fat)
              fiber = toNum(serving.fiber)
              sugar = toNum(serving.sugar)
              sodium = toNum(serving.sodium)
              servingQty = toNum(serving.number_of_units) || 1
              servingUnit = serving.measure || 'serving'
            }
          }
        } catch (e) {
          console.error('[NutritionProvider] FatSecret detail error:', e.message)
        }

        return {
          id: String(foodId),
          name: f.food_name,
          brand: f.brand_name || null,
          servingQty,
          servingUnit,
          calories,
          protein,
          carbs,
          fat,
          fiber,
          sugar,
          sodium,
        }
      })
    )

    console.log('[NutritionProvider] FatSecret search returned', results.length, 'normalized foods')

    return results
  } catch (err) {
    console.error('[NutritionProvider] Nutrition API call failed:', err.message)
    return []
  }
}

module.exports = { searchFoods }
