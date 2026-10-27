'use strict';

const industries = {
  construction: {
    label: 'Construction Site',
    icon: '🏗️',
    workerLabel: 'Worker',
    shiftLabel: 'Shift',
    grievanceCategories: [
      { key: 'safety',      label: 'Safety',      icon: '⛑️'  },
      { key: 'pay',         label: 'Pay',          icon: '💰'  },
      { key: 'harassment',  label: 'Harassment',   icon: '🚫'  },
      { key: 'equipment',   label: 'Equipment',    icon: '🔧'  },
      { key: 'other',       label: 'Other',        icon: '📝'  },
    ],
    feedbackCategories: ['wellbeing', 'safety', 'management', 'tools', 'other'],
    colors: { primary: '#F97316', accent: '#1E3A5F' },
    twPrimary: 'orange',
    twAccent: 'blue',
  },
  college: {
    label: 'College',
    icon: '🎓',
    workerLabel: 'Staff Member',
    shiftLabel: 'Session',
    grievanceCategories: [
      { key: 'workload',    label: 'Workload',     icon: '📚'  },
      { key: 'harassment',  label: 'Harassment',   icon: '🚫'  },
      { key: 'pay',         label: 'Pay',          icon: '💰'  },
      { key: 'facilities',  label: 'Facilities',   icon: '🏛️'  },
      { key: 'other',       label: 'Other',        icon: '📝'  },
    ],
    feedbackCategories: ['wellbeing', 'workload', 'management', 'facilities', 'other'],
    colors: { primary: '#4F46E5', accent: '#0F766E' },
    twPrimary: 'indigo',
    twAccent: 'teal',
  },
};

module.exports = industries;
