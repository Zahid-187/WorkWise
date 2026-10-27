'use strict';

/**
 * Keyword dictionary for rule-based feedback theme analysis.
 * Works across both Construction Site and College industries.
 */
const THEME_DEFINITIONS = [
  {
    key: 'safety',
    name: 'Safety',
    keywords: [
      'safety', 'hazard', 'helmet', 'helmets', 'harness', 'harnesses',
      'fall', 'injury', 'injuries', 'danger', 'dangerous', 'safe', 'safer',
      'accident', 'protective', 'ppe', 'toilet', 'toilets', 'clean', 'hygiene',
      'scaffold', 'scaffolding', 'risk', 'sanitation', 'unhygienic',
    ],
    categories: ['safety'],
  },
  {
    key: 'pay',
    name: 'Pay',
    keywords: [
      'pay', 'salary', 'overtime', 'money', 'wage', 'wages', 'compensation',
      'bonus', 'rate', 'rates', 'deduction', 'slip', 'paid', 'payment',
      'payments', 'owed', 'arrears', 'unpaid',
    ],
    categories: ['pay'],
  },
  {
    key: 'equipment_and_facilities',
    name: 'Equipment and Facilities',
    keywords: [
      'equipment', 'facility', 'facilities', 'tool', 'tools', 'machine',
      'power tool', 'power tools', 'projector', 'projectors', 'ac', 'air conditioning',
      'room', 'rest room', 'canteen', 'water', 'building', 'library', 'system',
      'broken', 'serviced', 'cables', 'hardware',
    ],
    categories: ['tools', 'facilities', 'equipment'],
  },
  {
    key: 'management_behaviour',
    name: 'Management Behaviour',
    keywords: [
      'management', 'manager', 'head', 'leadership', 'supervisor', 'foreman',
      'communication', 'respect', 'disrespectful', 'promise', 'promises',
      'listen', 'listened', 'supportive', 'transparent', 'decision', 'decisions',
      'schedule', 'planning', 'meeting', 'meetings',
    ],
    categories: ['management'],
  },
  {
    key: 'workload_and_hours',
    name: 'Workload and Hours',
    keywords: [
      'workload', 'hour', 'hours', 'overwork', 'exhausting', 'exhausted',
      'break', 'breaks', 'lunch', 'course', 'courses', 'shift', 'shifts',
      'marking', 'exam', '12-hour', 'timing', 'timings', 'extra', 'rest time',
    ],
    categories: ['workload'],
  },
  {
    key: 'wellbeing',
    name: 'Wellbeing',
    keywords: [
      'wellbeing', 'well-being', 'exhausted', 'exhausting', 'rest', 'morale',
      'spirit', 'comfort', 'uncomfortable', 'health', 'mental', 'stress',
      'tired', 'feeling', 'support', 'dignity',
    ],
    categories: ['wellbeing'],
  },
];

// Safety-critical keywords that trigger the "Urgent" flag
const SAFETY_ALERT_KEYWORDS = [
  'safety', 'hazard', 'injury', 'injuries', 'danger', 'dangerous', 'accident',
  'toilet', 'toilets', 'unhygienic', 'scaffold', 'scaffolding', 'loose',
  'unacceptable', 'fall', 'risk', 'broken', 'ppe',
];

/**
 * Analyzes an array of anonymous feedback messages using keyword heuristics.
 *
 * @param {Array<{ message: string, sentiment: string, category?: string }>} feedbackEntries
 * @returns {Array<{ theme: string, key: string, count: number, sentiment: { positive: number, neutral: number, negative: number }, urgent: boolean, sampleMessages: string[] }>}
 */
function analyzeFeedbackThemes(feedbackEntries = []) {
  if (!Array.isArray(feedbackEntries) || feedbackEntries.length === 0) {
    return [];
  }

  const results = THEME_DEFINITIONS.map(def => {
    let count = 0;
    const sentiment = { positive: 0, neutral: 0, negative: 0 };
    const sampleMessages = [];
    let hasSafetyKeyword = false;

    for (const entry of feedbackEntries) {
      const msg = (entry.message || '').toLowerCase();
      const cat = (entry.category || '').toLowerCase();
      const sent = (entry.sentiment || 'neutral').toLowerCase();

      // Check if entry matches either via predefined category or keyword hit
      const matchesCategory = def.categories.some(c => cat === c || cat.includes(c));
      const matchesKeyword = def.keywords.some(kw => msg.includes(kw));

      if (matchesCategory || matchesKeyword) {
        count++;

        if (sent === 'positive') sentiment.positive++;
        else if (sent === 'negative') sentiment.negative++;
        else sentiment.neutral++;

        if (sampleMessages.length < 3) {
          sampleMessages.push(entry.message);
        }

        // Check if message mentions any safety-critical keywords
        if (SAFETY_ALERT_KEYWORDS.some(skw => msg.includes(skw))) {
          hasSafetyKeyword = true;
        }
      }
    }

    // Urgent if safety category has mentions OR safety keywords appeared in matched feedback
    const urgent = (def.key === 'safety' && count > 0) || hasSafetyKeyword;

    return {
      theme: def.name,
      key: def.key,
      count,
      sentiment,
      urgent,
      sampleMessages,
    };
  });

  // Sort by count descending so most active themes appear first
  return results.sort((a, b) => b.count - a.count);
}

module.exports = {
  THEME_DEFINITIONS,
  SAFETY_ALERT_KEYWORDS,
  analyzeFeedbackThemes,
};
