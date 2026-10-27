'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { analyzeFeedbackThemes } = require('../server/lib/feedbackThemes');

describe('Feedback Themes (Rule-based Keyword Engine)', () => {
  test('returns empty array on empty input', () => {
    assert.deepEqual(analyzeFeedbackThemes([]), []);
    assert.deepEqual(analyzeFeedbackThemes(null), []);
  });

  test('correctly identifies safety theme and marks urgent when safety keywords appear', () => {
    const feedback = [
      { message: 'Scaffolding on Block C has loose joints and feels dangerous', sentiment: 'negative', category: 'safety' },
      { message: 'New helmets and harnesses are much better quality', sentiment: 'positive', category: 'safety' },
      { message: 'Portable toilets have not been cleaned in over a week', sentiment: 'negative', category: 'safety' },
    ];

    const themes = analyzeFeedbackThemes(feedback);
    const safetyTheme = themes.find(t => t.key === 'safety');

    assert.ok(safetyTheme, 'Safety theme should be identified');
    assert.equal(safetyTheme.count, 3);
    assert.equal(safetyTheme.sentiment.positive, 1);
    assert.equal(safetyTheme.sentiment.negative, 2);
    assert.equal(safetyTheme.urgent, true, 'Safety theme should have urgent=true');
  });

  test('correctly identifies pay and equipment themes with sentiment split', () => {
    const feedback = [
      { message: 'Promises about overtime payment have not been kept', sentiment: 'negative', category: 'management' },
      { message: 'Power tools were serviced and upgraded last week', sentiment: 'positive', category: 'tools' },
      { message: 'Projectors in classrooms work sometimes', sentiment: 'neutral', category: 'facilities' },
    ];

    const themes = analyzeFeedbackThemes(feedback);

    const payTheme = themes.find(t => t.key === 'pay');
    assert.ok(payTheme, 'Pay theme should be identified');
    assert.ok(payTheme.count >= 1);
    assert.equal(payTheme.sentiment.negative, 1);

    const equipTheme = themes.find(t => t.key === 'equipment_and_facilities');
    assert.ok(equipTheme, 'Equipment theme should be identified');
    assert.ok(equipTheme.count >= 2);
    assert.equal(equipTheme.sentiment.positive, 1);
    assert.equal(equipTheme.sentiment.neutral, 1);
  });

  test('works for College industry feedback (workload and staff wellbeing)', () => {
    const collegeFeedback = [
      { message: 'Staff meetings are scheduled during lunch hours with no compensation', sentiment: 'negative', category: 'wellbeing' },
      { message: 'The new rest room for staff is a great addition', sentiment: 'positive', category: 'wellbeing' },
      { message: 'AC in the staff room has been broken for 3 weeks', sentiment: 'negative', category: 'facilities' },
    ];

    const themes = analyzeFeedbackThemes(collegeFeedback);
    const wellbeingTheme = themes.find(t => t.key === 'wellbeing');

    assert.ok(wellbeingTheme);
    assert.ok(wellbeingTheme.count >= 2);
    assert.equal(wellbeingTheme.sentiment.positive, 1);
    assert.equal(wellbeingTheme.sentiment.negative, 1);
  });
});
