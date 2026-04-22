const mongoose = require('mongoose');
const IndbFood = require('../../models/IndbFood');
const { NutritionLog } = require('../../models/Logs');
const { dayKeyFromDate } = require('../dailyLifeState/dayKey');
const { getEmbedding } = require('./embeddingService');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// Tools definition
const nutritionTools = [
  {
    type: "function",
    function: {
      name: "search_db_and_estimate",
      description: "Searches the local food database for the exact food name. If the literal string is not found, the LLM will be asked to estimate its nutritional values in commit_to_ledger.",
      parameters: {
        type: "object",
        properties: {
          food_string: { type: "string" }
        },
        required: ["food_string"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "ask_user_clarification",
      description: "Use this ONLY if there is critical ambiguity surrounding the food that you cannot guess.",
      parameters: {
        type: "object",
        properties: {
          question_to_ask: { type: "string" }
        },
        required: ["question_to_ask"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "commit_to_ledger",
      description: "Saves the finalized nutritional data to the user's daily log. If a food was not found in the DB, you MUST synthesize ALL tracked nutrients intelligently, not just macros.",
      parameters: {
        type: "object",
        properties: {
          meal_type: { type: "string", description: "breakfast, snack, lunch, dinner." },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" },
                unit: { type: "string" },
                calories: { type: "number" },
                protein: { type: "number" },
                carbs: { type: "number" },
                fat: { type: "number" },
                fiber: { type: "number" },
                sugar: { type: "number" },
                sodium: { type: "number" },
                potassium: { type: "number" },
                iron: { type: "number" },
                calcium: { type: "number" },
                vitaminB: { type: "number" },
                magnesium: { type: "number" },
                zinc: { type: "number" },
                vitaminC: { type: "number" },
                omega3: { type: "number" },
                saturatedFat: { type: "number" },
                monounsaturatedFat: { type: "number" },
                polyunsaturatedFat: { type: "number" },
                cholesterol: { type: "number" },
                phosphorus: { type: "number" },
                copper: { type: "number" },
                vitaminB9: { type: "number" },
                vitaminB12: { type: "number" },
                folate: { type: "number" }
              },
              required: ["name", "quantity", "unit", "calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"]
            }
          }
        },
        required: ["meal_type", "items"]
      }
    }
  }
];

const NUTRITION_SYSTEM_PROMPT = `
You are a highly precise voice nutrition assistant.
Tools:
1. 'search_db_and_estimate': Finds semantic database matches. If no match is found, you MUST guess all tracked nutrients (macros, vitamins, minerals, etc.) inside commit_to_ledger.
2. 'ask_user_clarification': Use for unresolvable ambiguity.
3. 'commit_to_ledger': Complete the operation.

RULES:
- When commit_to_ledger returns success, output a brief response detailing the success.
- If querying a food fails or yields an unknown response, estimate ALL listed nutrients mathematically.
`;

class NutritionAgentSession {
  constructor(userId) {
    this.userId = userId;
    this.messageHistory = [{ role: 'system', content: NUTRITION_SYSTEM_PROMPT.trim() }];
  }

  async handleVoiceInput(transcript) {
    this.messageHistory.push({ role: 'user', content: transcript });

    let loopCount = 0;
    while (loopCount < 5) {
      loopCount++;

      const payload = {
        model: GROQ_MODEL,
        messages: this.messageHistory,
        tools: nutritionTools,
        tool_choice: "auto",
        temperature: 0.2
      };

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("LLM failure: " + await res.text());
      
      const data = await res.json();
      const messageResponse = data.choices[0]?.message;

      if (!messageResponse) break;

      this.messageHistory.push(messageResponse);

      if (messageResponse.tool_calls && messageResponse.tool_calls.length > 0) {
        for (const toolCall of messageResponse.tool_calls) {
          const { id, function: func } = toolCall;
          const { name, arguments: argsString } = func;
          const args = JSON.parse(argsString || "{}");
          console.log(`[Groq] Tool execution requested: ${name}`);

          let functionResponse = {};

          if (name === 'search_db_and_estimate') {
             functionResponse = await this._executeSearchDB(args.food_string);
          } else if (name === 'ask_user_clarification') {
             return { audioResponseText: args.question_to_ask, isComplete: false };
          } else if (name === 'commit_to_ledger') {
             functionResponse = await this._executeCommit(args);
          }

          this.messageHistory.push({
            role: 'tool',
            tool_call_id: id,
            name: name,
            content: JSON.stringify(functionResponse || {})
          });
        }
        continue;
      }

      if (messageResponse.content) {
        return { audioResponseText: messageResponse.content, isComplete: true };
      }
    } 

    return { audioResponseText: "Error processing.", isComplete: false };
  }

  async _executeSearchDB(foodString) {
    if (!foodString) return { status: "Please estimate macros and all micronutrients." }
    try {
      const queryVector = await getEmbedding(foodString);
      const results = await IndbFood.aggregate([
        {
          $vectorSearch: {
            index: "vector_index",
            path: "embedding",
            queryVector: queryVector,
            numCandidates: 10,
            limit: 1
          }
        },
        {
          $project: {
            displayName: 1,
            score: { $meta: "vectorSearchScore" } 
          }
        }
      ]);

      if (results && results.length > 0 && results[0].score > 0.85) {
        return {
          status: "Found high-confidence match.",
          food: results[0].displayName,
          message: "Apply standard portion scaling."
        };
      }

      return { status: "Low Similarity.", food: "unknown", message: "Estimate standard macros AND micronutrients." };

    } catch(err) {
      return { status: "Error searching DB. Estimate all nutrients." };
    }
  }

  async _executeCommit({ meal_type, items }) {
    if (!this.userId) return { success: false, error: "No user ID bound." };
    
    const dKey = dayKeyFromDate(new Date());
    let log = await NutritionLog.findOne({ user: this.userId, dayKey: dKey });
    
    if (!log) {
      log = new NutritionLog({ user: this.userId, dayKey: dKey, meals: [] });
    }

    log.meals.push({
      name: items.map(i => i.name).join(' + '),
      mealType: meal_type || 'snack',
      foods: items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        calories: item.calories || 0,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        fiber: item.fiber || 0,
        sugar: item.sugar || 0,
        sodium: item.sodium || 0,
        potassium: item.potassium || 0,
        iron: item.iron || 0,
        calcium: item.calcium || 0,
        vitaminB: item.vitaminB || 0,
        magnesium: item.magnesium || 0,
        zinc: item.zinc || 0,
        vitaminC: item.vitaminC || 0,
        omega3: item.omega3 || 0,
        saturatedFat: item.saturatedFat || 0,
        monounsaturatedFat: item.monounsaturatedFat || 0,
        polyunsaturatedFat: item.polyunsaturatedFat || 0,
        cholesterol: item.cholesterol || 0,
        phosphorus: item.phosphorus || 0,
        copper: item.copper || 0,
        vitaminB9: item.vitaminB9 || 0,
        vitaminB12: item.vitaminB12 || 0,
        folate: item.folate || 0,
        sourceFoodId: 'llm-agent-estimate',
        sourceKind: 'voice-agent'
      }))
    });

    await log.save();

    const { triggerDailyLifeStateRecompute } = require('../dailyLifeState/triggerDailyLifeStateRecompute');
    await triggerDailyLifeStateRecompute(this.userId, dKey);

    return { success: true, message: "Ledger commit successful!" };
  }
}

module.exports = { NutritionAgentSession };