import {
  checkMissingDataLayerVariables,
  checkDataLayerNaming,
  checkEcommerceDataLayer,
  checkDuplicateDataLayerPaths,
  checkUnusedDataLayerVariables,
  checkDataLayerVersionConflicts,
  checkConversionLinkerSequencing,
  checkCircularDependencies,
  checkSequencingDepth,
  checkOrphanedSequences,
  checkOverlappingTriggers,
  checkInvalidCSSSelectors,
  checkUnusedTriggers,
  checkPerformanceHeavyTriggers,
  checkContainerSize,
  checkCustomHTMLCount,
  checkMissingDescriptions,
  checkStaleTags,
} from '@/lib/checks/advancedGTMChecks';
import { GTMContainer, AuditContext } from '@/lib/types';

// ──────────────────────────────────────────────────────────────
// 1. checkMissingDataLayerVariables (CRITICAL)
// ──────────────────────────────────────────────────────────────
describe('checkMissingDataLayerVariables', () => {
  it('should PASS when all referenced variables are defined', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Tag A',
            type: 'gaawe',
            parameter: [{ key: 'value', value: '{{Purchase Value}}', type: 'template' }],
            firingTriggerId: ['1'],
          },
        ],
        variable: [
          {
            name: 'Purchase Value',
            type: 'v',
            parameter: [{ key: 'dataLayerVersion', value: 'ecommerce.value', type: 'template' }],
          },
        ],
      },
    };
    const result = checkMissingDataLayerVariables(container);

    expect(result.passed).toBe(true);
    expect(result.id).toBe('missing-datalayer-variables');
    expect(result.severity).toBe('critical');
  });

  it('should FAIL when tags reference undefined variables', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Tag A',
            type: 'gaawe',
            parameter: [{ key: 'value', value: '{{Undefined Var}}', type: 'template' }],
            firingTriggerId: ['1'],
          },
        ],
        variable: [],
      },
    };
    const result = checkMissingDataLayerVariables(container);

    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
    expect(result.id).toBe('missing-datalayer-variables');
  });

  it('should PASS when only built-in variables are referenced', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Tag A',
            type: 'gaawe',
            parameter: [{ key: 'url', value: '{{Page URL}}', type: 'template' }],
            firingTriggerId: ['1'],
          },
        ],
        variable: [],
      },
    };
    const result = checkMissingDataLayerVariables(container);

    expect(result.passed).toBe(true);
    expect(result.severity).toBe('critical');
  });
});

// ──────────────────────────────────────────────────────────────
// 2. checkDataLayerNaming (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkDataLayerNaming', () => {
  it('should PASS with INFO when no dataLayer variables exist', () => {
    const container: GTMContainer = {
      containerVersion: {
        variable: [],
      },
    };
    const result = checkDataLayerNaming(container);

    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('datalayer-naming-inconsistency');
  });

  it('should PASS when variables consistently use camelCase', () => {
    const container: GTMContainer = {
      containerVersion: {
        variable: [
          { name: 'purchaseValue', type: 'v' },
          { name: 'transactionId', type: 'v' },
          { name: 'userId', type: 'v' },
          { name: 'cartTotal', type: 'v' },
          { name: 'itemCount', type: 'v' },
        ],
      },
    };
    const result = checkDataLayerNaming(container);

    expect(result.passed).toBe(true);
    expect(result.severity).toBe('warning');
    expect(result.id).toBe('datalayer-naming-inconsistency');
  });

  it('should FAIL when naming is mixed below 80% consistency', () => {
    const container: GTMContainer = {
      containerVersion: {
        variable: [
          { name: 'purchaseValue', type: 'v' },
          { name: 'Transaction_ID', type: 'v' },
          { name: 'USER-ID', type: 'v' },
          { name: 'Cart Total', type: 'v' },
          { name: 'item count', type: 'v' },
        ],
      },
    };
    const result = checkDataLayerNaming(container);

    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
    expect(result.id).toBe('datalayer-naming-inconsistency');
  });
});

// ──────────────────────────────────────────────────────────────
// 3. checkEcommerceDataLayer (CRITICAL)
// ──────────────────────────────────────────────────────────────
describe('checkEcommerceDataLayer', () => {
  it('should PASS with INFO when context is not ecommerce', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [],
        variable: [],
      },
    };
    const context: AuditContext = { businessModel: 'leadgen' };
    const result = checkEcommerceDataLayer(container, context);

    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('ecommerce-datalayer-structure');
  });

  it('should FAIL when ecommerce context with missing paths and no ecommerce tag', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'GA4 Config', type: 'gaawe', firingTriggerId: ['1'] },
        ],
        variable: [
          {
            name: 'DLV - ecommerce.value',
            type: 'v',
            parameter: [{ key: 'dataLayerVersion', value: 'ecommerce.value', type: 'template' }],
          },
        ],
      },
    };
    const context: AuditContext = { businessModel: 'ecommerce' };
    const result = checkEcommerceDataLayer(container, context);

    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
    expect(result.id).toBe('ecommerce-datalayer-structure');
  });

  it('should PASS when ecommerce context with complete setup', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'GA4 - Purchase',
            type: 'gaawe',
            parameter: [{ key: 'eventName', value: 'purchase', type: 'template' }],
            firingTriggerId: ['1'],
          },
        ],
        variable: [
          {
            name: 'DLV - ecommerce.purchase',
            type: 'v',
            parameter: [{ key: 'dataLayerVersion', value: 'ecommerce.purchase', type: 'template' }],
          },
          {
            name: 'DLV - ecommerce.items',
            type: 'v',
            parameter: [{ key: 'dataLayerVersion', value: 'ecommerce.items', type: 'template' }],
          },
          {
            name: 'DLV - ecommerce.transaction_id',
            type: 'v',
            parameter: [{ key: 'dataLayerVersion', value: 'ecommerce.transaction_id', type: 'template' }],
          },
          {
            name: 'DLV - ecommerce.value',
            type: 'v',
            parameter: [{ key: 'dataLayerVersion', value: 'ecommerce.value', type: 'template' }],
          },
          {
            name: 'DLV - ecommerce.currency',
            type: 'v',
            parameter: [{ key: 'dataLayerVersion', value: 'ecommerce.currency', type: 'template' }],
          },
        ],
      },
    };
    const context: AuditContext = { businessModel: 'ecommerce' };
    const result = checkEcommerceDataLayer(container, context);

    expect(result.passed).toBe(true);
    expect(result.severity).toBe('critical');
    expect(result.id).toBe('ecommerce-datalayer-structure');
  });
});

// ──────────────────────────────────────────────────────────────
// 4. checkDuplicateDataLayerPaths (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkDuplicateDataLayerPaths', () => {
  it('should PASS when all paths are unique', () => {
    const container: GTMContainer = {
      containerVersion: {
        variable: [
          {
            name: 'DLV - value',
            type: 'v',
            parameter: [{ key: 'dataLayerVersion', value: 'ecommerce.value', type: 'template' }],
          },
          {
            name: 'DLV - currency',
            type: 'v',
            parameter: [{ key: 'dataLayerVersion', value: 'ecommerce.currency', type: 'template' }],
          },
        ],
      },
    };
    const result = checkDuplicateDataLayerPaths(container);

    expect(result.passed).toBe(true);
    expect(result.id).toBe('duplicate-datalayer-paths');
    expect(result.severity).toBe('warning');
  });

  it('should FAIL when two variables read the same path', () => {
    const container: GTMContainer = {
      containerVersion: {
        variable: [
          {
            name: 'DLV - value A',
            type: 'v',
            parameter: [{ key: 'dataLayerVersion', value: 'ecommerce.value', type: 'template' }],
          },
          {
            name: 'DLV - value B',
            type: 'v',
            parameter: [{ key: 'dataLayerVersion', value: 'ecommerce.value', type: 'template' }],
          },
        ],
      },
    };
    const result = checkDuplicateDataLayerPaths(container);

    expect(result.passed).toBe(false);
    expect(result.id).toBe('duplicate-datalayer-paths');
    expect(result.severity).toBe('warning');
  });
});

// ──────────────────────────────────────────────────────────────
// 5. checkUnusedDataLayerVariables (INFO)
// ──────────────────────────────────────────────────────────────
describe('checkUnusedDataLayerVariables', () => {
  it('should PASS when all dataLayer variables are used', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Tag A',
            type: 'gaawe',
            parameter: [{ key: 'value', value: '{{Purchase Value}}', type: 'template' }],
            firingTriggerId: ['1'],
          },
        ],
        variable: [{ name: 'Purchase Value', type: 'v' }],
      },
    };
    const result = checkUnusedDataLayerVariables(container);

    expect(result.passed).toBe(true);
    expect(result.id).toBe('unused-datalayer-variables');
    expect(result.severity).toBe('info');
  });

  it('should FAIL when a dataLayer variable is unused', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Tag A', type: 'gaawe', firingTriggerId: ['1'] },
        ],
        variable: [{ name: 'Unused DLV', type: 'v' }],
      },
    };
    const result = checkUnusedDataLayerVariables(container);

    expect(result.passed).toBe(false);
    expect(result.id).toBe('unused-datalayer-variables');
    expect(result.severity).toBe('info');
  });
});

// ──────────────────────────────────────────────────────────────
// 6. checkDataLayerVersionConflicts (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkDataLayerVersionConflicts', () => {
  it('should PASS when all variables use version 2', () => {
    const container: GTMContainer = {
      containerVersion: {
        variable: [
          {
            name: 'DLV A',
            type: 'v',
            parameter: [{ key: 'dataLayerVersion', value: '2', type: 'template' }],
          },
          {
            name: 'DLV B',
            type: 'v',
            parameter: [{ key: 'dataLayerVersion', value: '2', type: 'template' }],
          },
        ],
      },
    };
    const result = checkDataLayerVersionConflicts(container);

    expect(result.passed).toBe(true);
    expect(result.id).toBe('datalayer-version-conflicts');
    expect(result.severity).toBe('warning');
  });

  it('should FAIL when mixed v1 and v2 versions exist', () => {
    const container: GTMContainer = {
      containerVersion: {
        variable: [
          {
            name: 'DLV A',
            type: 'v',
            parameter: [{ key: 'dataLayerVersion', value: '1', type: 'template' }],
          },
          {
            name: 'DLV B',
            type: 'v',
            parameter: [{ key: 'dataLayerVersion', value: '2', type: 'template' }],
          },
        ],
      },
    };
    const result = checkDataLayerVersionConflicts(container);

    expect(result.passed).toBe(false);
    expect(result.id).toBe('datalayer-version-conflicts');
    expect(result.severity).toBe('warning');
  });
});

// ──────────────────────────────────────────────────────────────
// 7. checkConversionLinkerSequencing (CRITICAL)
// ──────────────────────────────────────────────────────────────
describe('checkConversionLinkerSequencing', () => {
  it('should PASS with INFO when no conversion linker exists', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'GA4 Config', type: 'gaawe', firingTriggerId: ['1'] },
        ],
      },
    };
    const result = checkConversionLinkerSequencing(container);

    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('conversion-linker-sequencing');
  });

  it('should PASS when conversion tags have setupTag referencing linker', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Conversion Linker', type: 'gclidw', firingTriggerId: ['1'] },
          {
            name: 'Ads Conversion',
            type: 'awct',
            firingTriggerId: ['1'],
            setupTag: [{ tagName: 'Conversion Linker' }],
          },
        ],
      },
    };
    const result = checkConversionLinkerSequencing(container);

    expect(result.passed).toBe(true);
    expect(result.severity).toBe('critical');
    expect(result.id).toBe('conversion-linker-sequencing');
  });

  it('should FAIL when conversion tags lack sequencing with linker', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Conversion Linker', type: 'gclidw', firingTriggerId: ['1'] },
          { name: 'Ads Conversion', type: 'awct', firingTriggerId: ['1'] },
        ],
      },
    };
    const result = checkConversionLinkerSequencing(container);

    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
    expect(result.id).toBe('conversion-linker-sequencing');
  });
});

// ──────────────────────────────────────────────────────────────
// 8. checkCircularDependencies (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkCircularDependencies', () => {
  it('should PASS when no circular dependencies exist', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Tag A', type: 'gaawe', firingTriggerId: ['1'], setupTag: [{ tagName: 'Tag B' }] },
          { name: 'Tag B', type: 'gaawe', firingTriggerId: ['1'] },
        ],
      },
    };
    const result = checkCircularDependencies(container);

    expect(result.passed).toBe(true);
    expect(result.id).toBe('circular-tag-dependencies');
    expect(result.severity).toBe('warning');
  });

  it('should FAIL when A depends on B and B depends on A', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Tag A', type: 'gaawe', firingTriggerId: ['1'], setupTag: [{ tagName: 'Tag B' }] },
          { name: 'Tag B', type: 'gaawe', firingTriggerId: ['1'], setupTag: [{ tagName: 'Tag A' }] },
        ],
      },
    };
    const result = checkCircularDependencies(container);

    expect(result.passed).toBe(false);
    expect(result.id).toBe('circular-tag-dependencies');
    expect(result.severity).toBe('warning');
  });
});

// ──────────────────────────────────────────────────────────────
// 9. checkSequencingDepth (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkSequencingDepth', () => {
  it('should PASS when sequencing depth is <= 3', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Tag A', type: 'gaawe', firingTriggerId: ['1'], setupTag: [{ tagName: 'Tag B' }] },
          { name: 'Tag B', type: 'gaawe', firingTriggerId: ['1'], setupTag: [{ tagName: 'Tag C' }] },
          { name: 'Tag C', type: 'gaawe', firingTriggerId: ['1'] },
        ],
      },
    };
    const result = checkSequencingDepth(container);

    expect(result.passed).toBe(true);
    expect(result.id).toBe('excessive-sequencing-depth');
    expect(result.severity).toBe('warning');
  });

  it('should FAIL when sequencing depth exceeds 3', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Tag A', type: 'gaawe', firingTriggerId: ['1'], setupTag: [{ tagName: 'Tag B' }] },
          { name: 'Tag B', type: 'gaawe', firingTriggerId: ['1'], setupTag: [{ tagName: 'Tag C' }] },
          { name: 'Tag C', type: 'gaawe', firingTriggerId: ['1'], setupTag: [{ tagName: 'Tag D' }] },
          { name: 'Tag D', type: 'gaawe', firingTriggerId: ['1'], setupTag: [{ tagName: 'Tag E' }] },
          { name: 'Tag E', type: 'gaawe', firingTriggerId: ['1'] },
        ],
      },
    };
    const result = checkSequencingDepth(container);

    expect(result.passed).toBe(false);
    expect(result.id).toBe('excessive-sequencing-depth');
    expect(result.severity).toBe('warning');
  });

  it('should PASS with INFO when no tags exist', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [],
      },
    };
    const result = checkSequencingDepth(container);

    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('excessive-sequencing-depth');
  });
});

// ──────────────────────────────────────────────────────────────
// 10. checkOrphanedSequences (INFO)
// ──────────────────────────────────────────────────────────────
describe('checkOrphanedSequences', () => {
  it('should PASS when all sequence references are valid', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Tag A', type: 'gaawe', firingTriggerId: ['1'], setupTag: [{ tagName: 'Tag B' }] },
          { name: 'Tag B', type: 'gaawe', firingTriggerId: ['1'] },
        ],
      },
    };
    const result = checkOrphanedSequences(container);

    expect(result.passed).toBe(true);
    expect(result.id).toBe('orphaned-tag-sequences');
    expect(result.severity).toBe('info');
  });

  it('should FAIL when setupTag references a non-existent tag', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Tag A', type: 'gaawe', firingTriggerId: ['1'], setupTag: [{ tagName: 'Deleted Tag' }] },
        ],
      },
    };
    const result = checkOrphanedSequences(container);

    expect(result.passed).toBe(false);
    expect(result.id).toBe('orphaned-tag-sequences');
    expect(result.severity).toBe('info');
  });
});

// ──────────────────────────────────────────────────────────────
// 11. checkOverlappingTriggers (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkOverlappingTriggers', () => {
  it('should PASS when triggers have different types', () => {
    const container: GTMContainer = {
      containerVersion: {
        trigger: [
          { name: 'All Pages', type: 'pageview', triggerId: '1' },
          { name: 'Form Submit', type: 'formSubmit', triggerId: '2' },
        ],
      },
    };
    const result = checkOverlappingTriggers(container);

    expect(result.passed).toBe(true);
    expect(result.id).toBe('overlapping-triggers');
    expect(result.severity).toBe('warning');
  });

  it('should FAIL when two triggers of same type have identical filters', () => {
    const container: GTMContainer = {
      containerVersion: {
        trigger: [
          {
            name: 'Pageview A',
            type: 'pageview',
            triggerId: '1',
            filter: [{ type: 'contains', parameter: [{ key: 'arg0', value: '{{Page URL}}', type: 'template' }] }],
          },
          {
            name: 'Pageview B',
            type: 'pageview',
            triggerId: '2',
            filter: [{ type: 'contains', parameter: [{ key: 'arg0', value: '{{Page URL}}', type: 'template' }] }],
          },
        ],
      },
    };
    const result = checkOverlappingTriggers(container);

    expect(result.passed).toBe(false);
    expect(result.id).toBe('overlapping-triggers');
    expect(result.severity).toBe('warning');
  });
});

// ──────────────────────────────────────────────────────────────
// 12. checkInvalidCSSSelectors (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkInvalidCSSSelectors', () => {
  it('should PASS when selectors are valid', () => {
    const container: GTMContainer = {
      containerVersion: {
        trigger: [
          {
            name: 'Click Trigger',
            type: 'click',
            triggerId: '1',
            filter: [
              {
                type: 'cssSelector',
                parameter: [{ key: 'arg0', value: '.btn-primary', type: 'template' }],
              },
            ],
          },
        ],
      },
    };
    const result = checkInvalidCSSSelectors(container);

    expect(result.passed).toBe(true);
    expect(result.id).toBe('invalid-css-selectors');
    expect(result.severity).toBe('warning');
  });

  it('should FAIL when selector has unclosed bracket', () => {
    const container: GTMContainer = {
      containerVersion: {
        trigger: [
          {
            name: 'Click Trigger',
            type: 'click',
            triggerId: '1',
            filter: [
              {
                type: 'cssSelector',
                parameter: [{ key: 'arg0', value: 'div[class="test"', type: 'template' }],
              },
            ],
          },
        ],
      },
    };
    const result = checkInvalidCSSSelectors(container);

    expect(result.passed).toBe(false);
    expect(result.id).toBe('invalid-css-selectors');
    expect(result.severity).toBe('warning');
  });
});

// ──────────────────────────────────────────────────────────────
// 13. checkUnusedTriggers (INFO)
// ──────────────────────────────────────────────────────────────
describe('checkUnusedTriggers', () => {
  it('should PASS when all triggers are used by tags', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Tag A', type: 'gaawe', firingTriggerId: ['1'] },
        ],
        trigger: [
          { name: 'All Pages', type: 'pageview', triggerId: '1' },
        ],
      },
    };
    const result = checkUnusedTriggers(container);

    expect(result.passed).toBe(true);
    expect(result.id).toBe('unused-triggers');
    expect(result.severity).toBe('info');
  });

  it('should FAIL when a trigger is not used by any tag', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Tag A', type: 'gaawe', firingTriggerId: ['1'] },
        ],
        trigger: [
          { name: 'All Pages', type: 'pageview', triggerId: '1' },
          { name: 'Orphaned Trigger', type: 'click', triggerId: '99' },
        ],
      },
    };
    const result = checkUnusedTriggers(container);

    expect(result.passed).toBe(false);
    expect(result.id).toBe('unused-triggers');
    expect(result.severity).toBe('info');
  });
});

// ──────────────────────────────────────────────────────────────
// 14. checkPerformanceHeavyTriggers (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkPerformanceHeavyTriggers', () => {
  it('should PASS when triggers are normal', () => {
    const container: GTMContainer = {
      containerVersion: {
        trigger: [
          { name: 'All Pages', type: 'pageview', triggerId: '1' },
        ],
      },
    };
    const result = checkPerformanceHeavyTriggers(container);

    expect(result.passed).toBe(true);
    expect(result.id).toBe('performance-heavy-triggers');
    expect(result.severity).toBe('warning');
  });

  it('should FAIL when elementVisibility has low threshold', () => {
    const container: GTMContainer = {
      containerVersion: {
        trigger: [
          {
            name: 'Visibility Trigger',
            type: 'elementVisibility',
            triggerId: '1',
            parameter: [{ key: 'onScreenRatio', value: '10', type: 'template' }],
          } as any,
        ],
      },
    };
    const result = checkPerformanceHeavyTriggers(container);

    expect(result.passed).toBe(false);
    expect(result.id).toBe('performance-heavy-triggers');
    expect(result.severity).toBe('warning');
  });

  it('should FAIL when timer has short interval', () => {
    const container: GTMContainer = {
      containerVersion: {
        trigger: [
          {
            name: 'Fast Timer',
            type: 'timer',
            triggerId: '1',
            parameter: [{ key: 'interval', value: '1000', type: 'template' }],
          } as any,
        ],
      },
    };
    const result = checkPerformanceHeavyTriggers(container);

    expect(result.passed).toBe(false);
    expect(result.id).toBe('performance-heavy-triggers');
    expect(result.severity).toBe('warning');
  });

  it('should FAIL when scrollDepth has too many thresholds', () => {
    const container: GTMContainer = {
      containerVersion: {
        trigger: [
          {
            name: 'Scroll Trigger',
            type: 'scrollDepth',
            triggerId: '1',
            parameter: [{ key: 'verticalThresholdsPercent', value: '5,10,15,20,25,30,35', type: 'template' }],
          } as any,
        ],
      },
    };
    const result = checkPerformanceHeavyTriggers(container);

    expect(result.passed).toBe(false);
    expect(result.id).toBe('performance-heavy-triggers');
    expect(result.severity).toBe('warning');
  });
});

// ──────────────────────────────────────────────────────────────
// 15. checkContainerSize (dynamic severity)
// ──────────────────────────────────────────────────────────────
describe('checkContainerSize', () => {
  it('should PASS when container is small', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Tag A', type: 'gaawe', firingTriggerId: ['1'] },
        ],
        trigger: [
          { name: 'All Pages', type: 'pageview', triggerId: '1' },
        ],
        variable: [
          { name: 'Var A', type: 'v' },
        ],
      },
    };
    const result = checkContainerSize(container);

    expect(result.passed).toBe(true);
    expect(result.id).toBe('container-size-score');
  });

  it('should FAIL when container has many tags, triggers, and variables', () => {
    const tags = Array.from({ length: 60 }, (_, i) => ({
      name: `Tag ${i}`,
      type: i < 15 ? 'html' : 'gaawe',
      firingTriggerId: ['1'],
    }));
    const triggers = Array.from({ length: 120 }, (_, i) => ({
      name: `Trigger ${i}`,
      type: 'pageview',
      triggerId: `${i}`,
    }));
    const variables = Array.from({ length: 60 }, (_, i) => ({
      name: `Var ${i}`,
      type: 'v',
    }));

    const container: GTMContainer = {
      containerVersion: { tag: tags, trigger: triggers, variable: variables },
    };
    const result = checkContainerSize(container);

    expect(result.passed).toBe(false);
    expect(result.id).toBe('container-size-score');
  });
});

// ──────────────────────────────────────────────────────────────
// 16. checkCustomHTMLCount (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkCustomHTMLCount', () => {
  it('should PASS with INFO when no tags exist', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [],
      },
    };
    const result = checkCustomHTMLCount(container);

    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('excessive-custom-html');
  });

  it('should PASS when custom HTML is less than 30%', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'HTML Tag', type: 'html', firingTriggerId: ['1'] },
          { name: 'GA4 A', type: 'gaawe', firingTriggerId: ['1'] },
          { name: 'GA4 B', type: 'gaawe', firingTriggerId: ['1'] },
          { name: 'GA4 C', type: 'gaawe', firingTriggerId: ['1'] },
        ],
      },
    };
    const result = checkCustomHTMLCount(container);

    expect(result.passed).toBe(true);
    expect(result.severity).toBe('warning');
    expect(result.id).toBe('excessive-custom-html');
  });

  it('should FAIL when custom HTML is >= 30%', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'HTML Tag 1', type: 'html', firingTriggerId: ['1'] },
          { name: 'HTML Tag 2', type: 'html', firingTriggerId: ['1'] },
          { name: 'HTML Tag 3', type: 'html', firingTriggerId: ['1'] },
          { name: 'GA4 A', type: 'gaawe', firingTriggerId: ['1'] },
        ],
      },
    };
    const result = checkCustomHTMLCount(container);

    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
    expect(result.id).toBe('excessive-custom-html');
  });
});

// ──────────────────────────────────────────────────────────────
// 17. checkMissingDescriptions (INFO)
// ──────────────────────────────────────────────────────────────
describe('checkMissingDescriptions', () => {
  it('should PASS with INFO when no items exist', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [],
        trigger: [],
        variable: [],
      },
    };
    const result = checkMissingDescriptions(container);

    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('missing-descriptions');
  });

  it('should PASS when items have notes', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Tag A', type: 'gaawe', firingTriggerId: ['1'], notes: 'Tracks page views' } as any,
          { name: 'Tag B', type: 'gaawe', firingTriggerId: ['1'], notes: 'Tracks purchases' } as any,
        ],
        trigger: [
          { name: 'All Pages', type: 'pageview', triggerId: '1', notes: 'Fires on all pages' } as any,
        ],
        variable: [
          { name: 'Var A', type: 'v', notes: 'Purchase value' } as any,
        ],
      },
    };
    const result = checkMissingDescriptions(container);

    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('missing-descriptions');
  });

  it('should FAIL when less than 50% of items have descriptions', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Tag A', type: 'gaawe', firingTriggerId: ['1'] },
          { name: 'Tag B', type: 'gaawe', firingTriggerId: ['1'] },
          { name: 'Tag C', type: 'gaawe', firingTriggerId: ['1'] },
        ],
        trigger: [
          { name: 'All Pages', type: 'pageview', triggerId: '1' },
        ],
        variable: [
          { name: 'Var A', type: 'v', notes: 'Has description' } as any,
        ],
      },
    };
    const result = checkMissingDescriptions(container);

    expect(result.passed).toBe(false);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('missing-descriptions');
  });
});

// ──────────────────────────────────────────────────────────────
// 18. checkStaleTags (INFO)
// ──────────────────────────────────────────────────────────────
describe('checkStaleTags', () => {
  it('should PASS when no tags have stale-sounding names', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'GA4 - Page View', type: 'gaawe', firingTriggerId: ['1'] },
          { name: 'Ads - Conversion', type: 'awct', firingTriggerId: ['1'] },
        ],
      },
    };
    const result = checkStaleTags(container);

    expect(result.passed).toBe(true);
    expect(result.id).toBe('stale-tags');
    expect(result.severity).toBe('info');
  });

  it('should FAIL when a tag has "legacy" in its name', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'GA4 - Page View', type: 'gaawe', firingTriggerId: ['1'] },
          { name: 'Legacy - Old Pixel', type: 'html', firingTriggerId: ['1'] },
        ],
      },
    };
    const result = checkStaleTags(container);

    expect(result.passed).toBe(false);
    expect(result.id).toBe('stale-tags');
    expect(result.severity).toBe('info');
  });
});
