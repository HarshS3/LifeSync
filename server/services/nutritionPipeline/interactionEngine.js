const { Interaction, KnowledgeEdge, EvidenceUnit, CausalLink } = require('../../models/nutritionKnowledge')

function normKey(s) {
  return String(s || '').trim().toLowerCase()
}

function riskFromScore(score) {
  if (score >= 0.75) return 'high'
  if (score >= 0.45) return 'moderate'
  if (score > 0.15) return 'low'
  return 'none'
}

async function buildInteractions({ canonicalId, derivedMetrics, user }) {
  const interactions = []
  const conditions = (user?.conditions || []).map(normKey).filter(Boolean)
  const meds = (user?.medications || []).map((m) => normKey(m?.name)).filter(Boolean)

  const gly = Number(derivedMetrics?.glycemic_pressure?.score) || 0
  const infl = Number(derivedMetrics?.inflammatory_potential?.score) || 0
  const sodiumRisk = Number(derivedMetrics?.inputs?.sodium || 0) / 2000
  const sodiumScore = Math.max(0, Math.min(1, sodiumRisk))

  if (conditions.includes('diabetes') || conditions.includes('type 2 diabetes') || conditions.includes('type 1 diabetes')) {
    interactions.push({
      canonicalId,
      targetKind: 'condition',
      targetKey: 'diabetes',
      interactionType: 'metabolic',
      direction: 'conditional',
      strength: gly,
      riskLevel: riskFromScore(gly),
      uncertainty: 0.45,
      meta: { driver: 'glycemic_pressure' },
    })
  }

  if (conditions.includes('hypertension') || conditions.includes('high blood pressure')) {
    interactions.push({
      canonicalId,
      targetKind: 'condition',
      targetKey: 'hypertension',
      interactionType: 'cardiovascular',
      direction: 'conditional',
      strength: sodiumScore,
      riskLevel: riskFromScore(sodiumScore),
      uncertainty: 0.55,
      meta: { driver: 'sodium' },
    })
  }

  if (conditions.includes('ibs') || conditions.includes('irritable bowel syndrome')) {
    interactions.push({
      canonicalId,
      targetKind: 'condition',
      targetKey: 'ibs',
      interactionType: 'gut',
      direction: 'conditional',
      strength: infl,
      riskLevel: riskFromScore(infl),
      uncertainty: 0.6,
      meta: { driver: 'inflammatory_potential' },
    })
  }

  if (meds.includes('metformin')) {
    interactions.push({
      canonicalId,
      targetKind: 'drug',
      targetKey: 'metformin',
      interactionType: 'glycemic_modulation',
      direction: 'conditional',
      strength: 0.25,
      riskLevel: 'low',
      uncertainty: 0.7,
      meta: { note: 'Rule-driven placeholder (expand with literature-backed evidence).' },
    })
  }

  // Persist/upsert rule outputs (as estimates, not facts)
  for (const i of interactions) {
    const evidence = await EvidenceUnit.create({
      subjectKind: 'food',
      subjectKey: canonicalId,
      claimType: 'interaction_estimate',
      claimKey: `${i.targetKind}:${i.targetKey}:${i.interactionType}`,
      value: {
        targetKind: i.targetKind,
        targetKey: i.targetKey,
        interactionType: i.interactionType,
        direction: i.direction,
        strength: i.strength,
        riskLevel: i.riskLevel,
        uncertainty: i.uncertainty,
      },
      unit: null,
      source: 'rule_engine',
      strength: 0.55,
      meta: i.meta,
    })

    await Interaction.updateOne(
      {
        canonicalId: i.canonicalId,
        targetKind: i.targetKind,
        targetKey: i.targetKey,
        interactionType: i.interactionType,
      },
      {
        $set: {
          direction: i.direction,
          strength: i.strength,
          riskLevel: i.riskLevel,
          uncertainty: i.uncertainty,
          meta: i.meta,
          evidenceIds: [evidence._id],
        },
      },
      { upsert: true }
    )

    // Minimal causal link representation for explainability
    if (i.targetKind === 'condition' && i.targetKey === 'diabetes') {
      await CausalLink.updateOne(
        {
          subjectKind: 'food',
          subjectKey: canonicalId,
          cause: 'carbohydrate_intake',
          effect: 'blood_glucose_rise',
        },
        {
          $set: {
            mediators: ['fiber', 'protein', 'portion_size', 'meal_context'],
            strength: i.strength,
            uncertainty: i.uncertainty,
            evidenceIds: [evidence._id],
            meta: { driver: i.meta?.driver || 'glycemic_pressure' },
          },
        },
        { upsert: true }
      )
    }

    await KnowledgeEdge.updateOne(
      {
        fromKind: 'food',
        fromKey: canonicalId,
        predicate: 'interacts_with',
        toKind: i.targetKind,
        toKey: i.targetKey,
      },
      {
        $set: {
          strength: i.strength,
          uncertainty: i.uncertainty,
          evidenceIds: [evidence._id],
          meta: { interactionType: i.interactionType, riskLevel: i.riskLevel },
        },
      },
      { upsert: true }
    )
  }

  return interactions
}

module.exports = { buildInteractions }
