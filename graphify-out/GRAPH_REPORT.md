# Graph Report - LifeSync  (2026-05-22)

## Corpus Check
- 352 files · ~344,398 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1291 nodes · 1893 edges · 66 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 135 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1f65c5bc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 133|Community 133]]

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 67 edges
2. `useAuth()` - 43 edges
3. `main()` - 23 edges
4. `main()` - 18 edges
5. `main()` - 17 edges
6. `main()` - 16 edges
7. `analyzeFood()` - 16 edges
8. `ScreenWrapper()` - 15 edges
9. `computeTrainingInsights()` - 15 edges
10. `normalizeForIntent()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `ExerciseHistoryPage()` --calls--> `useTheme()`  [INFERRED]
  client/src/components/ExerciseHistoryPage.jsx → App/constants/Theme.js
- `HabitTracker()` --calls--> `useTheme()`  [INFERRED]
  client/src/components/HabitTracker.jsx → App/constants/Theme.js
- `ActiveWorkoutScreen()` --calls--> `formatTime()`  [INFERRED]
  App/app/training/active.js → client/src/components/NutritionTracker.jsx
- `GymTracker()` --calls--> `useTheme()`  [INFERRED]
  client/src/components/GymTracker.jsx → App/constants/Theme.js
- `LabsPanel()` --calls--> `useTheme()`  [INFERRED]
  client/src/components/LabsPanel.jsx → App/constants/Theme.js

## Communities (237 total, 16 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (43): Index(), MacroIndicator(), styles(), MuscleHeatmap(), styles(), SkeletonDashboard(), SkeletonLoader(), SkeletonNutrition() (+35 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (21): AnimatedCard(), createEmptyFoodRow(), formatTime(), NutritionTracker(), RestTimer(), ActiveWorkoutSession(), ActiveWorkoutView(), createEmptyFoodRow() (+13 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (30): resolveCanonicalFood(), clamp01(), computeDerivedMetrics(), getMean(), label3(), buildBullets(), buildCautions(), buildNarrative() (+22 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (29): compositionEntryHasData(), createEmptyBodyComposition(), emptySegmental(), hydrateCompositionFromServer(), mergeCompositionStateFromApi(), normalizeBodyCompositionForSave(), normalizeMeasurementsForSave(), calculateReadiness() (+21 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (37): buildFingerprints(), buildSearchText(), columnArrayToMap(), ensureIndbDataLoaded(), firstAvailableNumeric(), firstNonEmpty(), firstNumeric(), formatServingLabel() (+29 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (30): normalizeTargetKey(), normExerciseName(), rollupTargetToRegion(), targetsForExercise(), clamp01(), computeMuscleHeatmap(), emptyTotals(), inWindow() (+22 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (24): analyzeGutHealth(), analyzeCarbTolerance(), analyzeNutritionalDNA(), analyzeSaltSensitivity(), analyzeProgressNarrative(), calculateTrend(), analyzeRecoveryCapacity(), analyzeSatietyPatterns() (+16 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (25): buildDeterministicReflectQuestion(), buildLowConfidenceExplanation(), buildReflectiveInsight(), buildRotatedFollowUpQuestion(), classifyFollowUpPattern(), countRecentSignals(), detectDegradedState(), detectDirectAnswerMode() (+17 more)

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (31): append_jsonl(), build_list_page_url(), clean_food_name_from_title(), collect_recipe_links(), detect_local_chrome_major_version(), ensure_output_dir(), extract_detail_payload(), extract_serving_weight_grams() (+23 more)

### Community 9 - "Community 9"
Cohesion: 0.1
Nodes (24): avg(), buildSignal(), chooseSummaryState(), clamp01(), computeDailyLifeState(), countFinite(), hashInputs(), moodEnumTo01() (+16 more)

### Community 10 - "Community 10"
Cohesion: 0.17
Nodes (27): append_ingredients_csv(), append_jsonl(), derive_recipe_url(), detect_local_chrome_major_version(), ensure_output_dir(), extract_recipe_payload(), flatten_ingredient_rows(), get_local_chrome_path() (+19 more)

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (28): buildDayKeys(), buildDayKeysInclusive(), dateForDayKeyLocalLate(), dateForDayKeyLocalNoon(), dayKeyFromDateLocal(), dayKeyPlus(), dayRangeLocal(), ensureGoals() (+20 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (15): baseGuardrails(), buildSystemPrompt(), clamp(), getOrInitPrior(), proposeHypothesis(), recordHypothesisFeedback(), updatePosteriorConfidence(), callGeminiGenerateContent() (+7 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (3): ExerciseHistoryPage(), AuthProvider(), useAuth()

### Community 14 - "Community 14"
Cohesion: 0.18
Nodes (18): applyMemoryOverrides(), clamp01(), debugLog(), isValidDayKey(), applyDecay(), attenuatedConfidenceFromSupportDays(), clamp01(), computePatternMemory() (+10 more)

### Community 15 - "Community 15"
Cohesion: 0.24
Nodes (20): dayAtMidnight(), daysAgo(), ensureFitnessLogs(), ensureGoals(), ensureGymWorkouts(), ensureHabitLogs(), ensureHabits(), ensureJournalEntries() (+12 more)

### Community 16 - "Community 16"
Cohesion: 0.16
Nodes (15): computeRecipeTotals(), normalizeKey(), searchLocalFoods(), buildMealObject(), buildRuleExplanation(), labelDiabetes(), labelGutHealth(), labelHeartHealth() (+7 more)

### Community 17 - "Community 17"
Cohesion: 0.25
Nodes (16): clamp(), detectFoodLogIntent(), endOfDay(), ingestFromChat(), parseMoodEnum(), parseNumberToken10(), parseScale10(), parseSleepHours() (+8 more)

### Community 18 - "Community 18"
Cohesion: 0.13
Nodes (4): getPackages(), MainApplication, LifeSyncWidgetModule, LifeSyncWidgetPackage

### Community 19 - "Community 19"
Cohesion: 0.24
Nodes (15): buildMealContext(), buildResult(), calculateCalcium(), calculateEffectiveNutrients(), calculateFolate(), calculateIron(), calculateMagnesium(), calculateVitaminA() (+7 more)

### Community 20 - "Community 20"
Cohesion: 0.22
Nodes (13): clamp01(), debugLog(), decideInsight(), getSignal(), identityMatchesToday(), identityReasonKey(), isHigh(), isLow() (+5 more)

### Community 21 - "Community 21"
Cohesion: 0.2
Nodes (8): getEmbedding(), endOfDay(), getCachedEmbedding(), NutritionAgentSession, recalcDailyTotals(), startOfDay(), embedCollection(), run()

### Community 22 - "Community 22"
Cohesion: 0.34
Nodes (14): dayAtMidnight(), daysAgo(), ensureFitnessLogs(), ensureGoal(), ensureHabitLogs(), ensureHabits(), ensureLongTermGoal(), ensureMemorySummary() (+6 more)

### Community 23 - "Community 23"
Cohesion: 0.28
Nodes (14): buildBullets(), buildNarrativeContext(), computeDailyInsight(), computeMealSignals(), ensureDailyInsightNarrative(), maxDate(), normalizeDay(), normFoodKey() (+6 more)

### Community 24 - "Community 24"
Cohesion: 0.35
Nodes (12): buildIdentityCandidates(), clamp01(), computeIdentityMemory(), computeStabilityScore(), daysBetween(), debugLog(), decayIdentity(), identityClaimText() (+4 more)

### Community 25 - "Community 25"
Cohesion: 0.24
Nodes (9): buildSupplementAdvice(), summarizeLabs(), summarizeSymptoms(), uniqByKey(), buildInteractionFlags(), hasAny(), listFromUser(), medsFromUser() (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.32
Nodes (9): analyzeDiseaseImpact(), buildDefaultDiseaseProfiles(), clamp01(), computeContribution(), computeExposure(), conditionToDiseaseIdCandidates(), getMetricScore(), normalizeKey() (+1 more)

### Community 27 - "Community 27"
Cohesion: 0.27
Nodes (4): GymTracker(), useWorkout(), WorkoutProvider(), ActiveWorkoutBanner()

### Community 28 - "Community 28"
Cohesion: 0.4
Nodes (9): buildTomorrowOutlook(), clamp01(), conditionSatisfied(), confidenceForConditions(), effectLabel(), isHigh(), isLow(), nextDayKey() (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.44
Nodes (8): buildDoctorQuestions(), detectRedFlags(), extractDurationDays(), hasAny(), medicationAwareness(), normalize(), runHealthTriage(), toConfidence()

### Community 30 - "Community 30"
Cohesion: 0.39
Nodes (7): Citation, _confidence_from_distance(), _get_collection(), rag_answer(), RagAnswerRequest, RagAnswerResponse, BaseModel

### Community 31 - "Community 31"
Cohesion: 0.44
Nodes (8): Chunk, _chunk_text(), _clean_text(), _get_collection(), ingest_folder(), _iter_pdf_chunks(), main(), _require_env()

### Community 35 - "Community 35"
Cohesion: 0.42
Nodes (7): classifyColumn(), describeColumn(), inferServingWeightG(), main(), median(), parseLooseNumber(), toSafeString()

### Community 36 - "Community 36"
Cohesion: 0.36
Nodes (7): buildCsvRow(), clamp01(), generateMonthlyReport(), isValidMonth(), monthRangeDayKeys(), pickSignal(), toCsv()

### Community 37 - "Community 37"
Cohesion: 0.39
Nodes (5): blendColorsHex(), clamp01(), heatColor(), normToken(), resolveRegionKeyFromName()

### Community 40 - "Community 40"
Cohesion: 0.54
Nodes (7): buildReminderText(), currentTimeVariants(), getClientBaseUrl(), normalizeHHMM(), pad2(), runReminderTick(), sendReminderEmail()

### Community 41 - "Community 41"
Cohesion: 0.5
Nodes (6): buildStateReflection(), getSignal(), isHigh(), isLow(), oneSentence(), signalOk()

### Community 42 - "Community 42"
Cohesion: 0.52
Nodes (6): connectMongo(), daysAgo(), ex(), main(), mkWorkout(), parseArgs()

### Community 43 - "Community 43"
Cohesion: 0.67
Nodes (6): buildFlags(), buildNutritionReview(), clamp01(), completenessScore(), parseDayKey(), safeNumber()

### Community 44 - "Community 44"
Cohesion: 0.47
Nodes (5): login_to_myfitnesspal(), main(), Search for a food on MyFitnessPal and return its nutrition data., Log into MyFitnessPal to bypass restricted access to the calorie chart., scrape_food_nutrition()

### Community 45 - "Community 45"
Cohesion: 0.6
Nodes (5): clamp(), dayAtMidnight(), daysAgo(), main(), mulberry32()

### Community 46 - "Community 46"
Cohesion: 0.6
Nodes (3): buildViews(), TodayDashboardWidgetProvider, updateAll()

### Community 48 - "Community 48"
Cohesion: 0.7
Nodes (4): clamp01(), heatFill(), heatStroke(), MuscleHeatmapFigure()

### Community 49 - "Community 49"
Cohesion: 0.6
Nodes (3): LabsPanel(), newResultRow(), toDateInputValue()

### Community 52 - "Community 52"
Cohesion: 0.7
Nodes (4): normalize_to_base(), process(), remove_parenthesis(), singularize()

### Community 53 - "Community 53"
Cohesion: 0.7
Nodes (4): normalize(), process(), remove_parenthesis(), singularize()

### Community 55 - "Community 55"
Cohesion: 0.6
Nodes (3): buildColumnsArray(), parseServingQtyParts(), safeString()

### Community 57 - "Community 57"
Cohesion: 0.83
Nodes (3): _aggregateEffectiveTotals(), getRandomMeals(), run()

### Community 60 - "Community 60"
Cohesion: 0.83
Nodes (3): detectAssistantMode(), normalize(), scoreAny()

### Community 61 - "Community 61"
Cohesion: 0.83
Nodes (3): googleRecognize(), inferGoogleEncoding(), joinTranscript()

## Knowledge Gaps
- **2 isolated node(s):** `Log into MyFitnessPal to bypass restricted access to the calorie chart.`, `Search for a food on MyFitnessPal and return its nutrition data.`
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `Community 13` to `Community 0`, `Community 1`, `Community 3`, `Community 133`, `Community 5`, `Community 135`, `Community 136`, `Community 137`, `Community 138`, `Community 139`, `Community 140`, `Community 141`, `Community 142`, `Community 134`, `Community 27`, `Community 34`, `Community 38`, `Community 49`, `Community 50`, `Community 51`, `Community 56`, `Community 77`, `Community 78`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **Why does `toNum()` connect `Community 3` to `Community 6`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Why does `triggerDailyLifeStateRecompute()` connect `Community 9` to `Community 3`, `Community 21`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Are the 43 inferred relationships involving `useTheme()` (e.g. with `Index()` and `CalendarScreen()`) actually correct?**
  _`useTheme()` has 43 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Log into MyFitnessPal to bypass restricted access to the calorie chart.`, `Search for a food on MyFitnessPal and return its nutrition data.` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._