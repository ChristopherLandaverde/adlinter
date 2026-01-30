import {
  checkConversionLinker,
  checkConsentViolations,
  checkDuplicateConversions,
  checkEnhancedConversions,
  checkErrorHandling,
  checkNamingConventions,
  checkCrossDomainTracking,
  checkRemarketingTags,
  checkDataLayerDependencies,
  checkTriggerConflicts,
  checkDebugTags,
  checkUnusedVariables,
} from '@/lib/checks/gtmChecks';
import { GTMContainer, AuditContext } from '@/lib/types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseGTMJSON } from '@/lib/parsers/gtmParser';

// Helper to load fixtures
const loadFixture = (name: string) =>
  parseGTMJSON(readFileSync(join(__dirname, `../fixtures/${name}`), 'utf-8'));

// ──────────────────────────────────────────────────────────────
// 1. checkConversionLinker (CRITICAL)
// ──────────────────────────────────────────────────────────────
describe('checkConversionLinker', () => {
  it('should PASS when conversion linker exists', () => {
    const container = loadFixture('gtm-container-clean.json');
    const result = checkConversionLinker(container);

    expect(result.passed).toBe(true);
    expect(result.id).toBe('missing-conversion-linker');
    expect(result.severity).toBe('critical');
  });

  it('should FAIL when conversion linker missing', () => {
    const container = loadFixture('gtm-container-missing-linker.json');
    const result = checkConversionLinker(container);

    expect(result.passed).toBe(false);
    expect(result.description).toContain('No Conversion Linker');
    expect(result.recommendation).toBeDefined();
  });

  it('should handle empty container', () => {
    const container: GTMContainer = { containerVersion: { tag: [] } };
    const result = checkConversionLinker(container);
    expect(result.passed).toBe(false);
  });

  it('should handle missing tag array', () => {
    const container: GTMContainer = { containerVersion: {} };
    const result = checkConversionLinker(container);
    expect(result.passed).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// 2. checkConsentViolations (CRITICAL, Context-Aware)
// ──────────────────────────────────────────────────────────────
describe('checkConsentViolations', () => {
  it('should be INFO level when user has no EU traffic', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [{ name: 'Ads Tag', type: 'awct', firingTriggerId: ['1'] }],
      },
    };
    const context: AuditContext = { needsConsent: 'no' };
    const result = checkConsentViolations(container, context);

    expect(result.severity).toBe('info');
    expect(result.passed).toBe(true);
  });

  it('should be CRITICAL when consent needed but missing', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [{ name: 'Ads Tag', type: 'awct', firingTriggerId: ['1'] }],
      },
    };
    const context: AuditContext = { needsConsent: 'yes' };
    const result = checkConsentViolations(container, context);

    expect(result.severity).toBe('critical');
    expect(result.passed).toBe(false);
  });

  it('should be WARNING when consent need is uncertain', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [{ name: 'Ads Tag', type: 'awct', firingTriggerId: ['1'] }],
      },
    };
    const result = checkConsentViolations(container);

    expect(result.severity).toBe('warning');
    expect(result.passed).toBe(false);
  });

  it('should PASS when tags have consent settings', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Ads Tag',
            type: 'awct',
            firingTriggerId: ['1'],
            consentSettings: { consentStatus: 'needed' },
          },
        ],
      },
    };
    const context: AuditContext = { needsConsent: 'yes' };
    const result = checkConsentViolations(container, context);

    expect(result.passed).toBe(true);
  });

  it('should handle empty tag array', () => {
    const container: GTMContainer = { containerVersion: { tag: [] } };
    const result = checkConsentViolations(container, { needsConsent: 'yes' });

    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 3. checkDuplicateConversions (CRITICAL)
// ──────────────────────────────────────────────────────────────
describe('checkDuplicateConversions', () => {
  it('should PASS when no duplicates', () => {
    const container = loadFixture('gtm-container-clean.json');
    const result = checkDuplicateConversions(container);
    expect(result.passed).toBe(true);
  });

  it('should FAIL when duplicates exist', () => {
    const container = loadFixture('gtm-container-duplicates.json');
    const result = checkDuplicateConversions(container);

    expect(result.passed).toBe(false);
    expect(result.details).toHaveProperty('duplicates');
    expect((result.details as { duplicates: unknown[] }).duplicates.length).toBeGreaterThan(0);
  });

  it('should detect same conversionId on same trigger', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Conv A',
            type: 'awct',
            parameter: [{ key: 'conversionId', value: '111', type: 'template' }],
            firingTriggerId: ['1'],
          },
          {
            name: 'Conv B',
            type: 'awct',
            parameter: [{ key: 'conversionId', value: '111', type: 'template' }],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const result = checkDuplicateConversions(container);
    expect(result.passed).toBe(false);
  });

  it('should handle empty tag array', () => {
    const container: GTMContainer = { containerVersion: { tag: [] } };
    const result = checkDuplicateConversions(container);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 4. checkEnhancedConversions (CRITICAL)
// ──────────────────────────────────────────────────────────────
describe('checkEnhancedConversions', () => {
  it('should PASS when no enhanced conversion tags exist', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [{ name: 'Basic Tag', type: 'awct', firingTriggerId: ['1'] }],
      },
    };
    const result = checkEnhancedConversions(container);
    expect(result.passed).toBe(true);
  });

  it('should FAIL when enhanced conversions enabled but no user data variables', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'EC Tag',
            type: 'awct',
            parameter: [
              { key: 'enableEnhancedConversions', value: 'true', type: 'boolean' },
            ],
            firingTriggerId: ['1'],
          },
        ],
        variable: [],
      },
    };
    const result = checkEnhancedConversions(container);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
    expect(result.description).toContain('Enhanced conversions enabled');
  });

  it('should PASS when enhanced conversions have user data variables', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'EC Tag',
            type: 'awct',
            parameter: [
              { key: 'enableEnhancedConversions', value: 'true', type: 'boolean' },
              { key: 'enhancedConversionsUserDataVariable', value: '{{User Email}}', type: 'template' },
            ],
            firingTriggerId: ['1'],
          },
        ],
        variable: [{ name: 'User Email', type: 'v' }],
      },
    };
    const result = checkEnhancedConversions(container);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 5. checkErrorHandling (CRITICAL)
// ──────────────────────────────────────────────────────────────
describe('checkErrorHandling', () => {
  it('should PASS when conversion tags on pageview triggers', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Conv Tag', type: 'awct', firingTriggerId: ['1'] },
        ],
        trigger: [{ name: 'All Pages', type: 'pageview', triggerId: '1' }],
      },
    };
    const result = checkErrorHandling(container);
    expect(result.passed).toBe(true);
  });

  it('should FAIL when conversion tag on form/click trigger without callback', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Form Conv', type: 'awct', firingTriggerId: ['1'] },
        ],
        trigger: [{ name: 'Form Submit', type: 'formSubmit', triggerId: '1' }],
      },
    };
    const result = checkErrorHandling(container);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
  });

  it('should PASS when conversion tag has tag sequencing', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Form Conv',
            type: 'awct',
            firingTriggerId: ['1'],
            setupTag: [{ tagName: 'Helper' }],
          },
        ],
        trigger: [{ name: 'Form Submit', type: 'formSubmit', triggerId: '1' }],
      },
    };
    const result = checkErrorHandling(container);
    expect(result.passed).toBe(true);
  });

  it('should handle empty containers', () => {
    const container: GTMContainer = { containerVersion: { tag: [], trigger: [] } };
    const result = checkErrorHandling(container);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 6. checkNamingConventions (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkNamingConventions', () => {
  it('should PASS when 70%+ tags follow naming patterns', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'GA4 - Page View', type: 'gaawe', firingTriggerId: ['1'] },
          { name: 'GA4 - Purchase', type: 'gaawe', firingTriggerId: ['1'] },
          { name: 'Ads - Conversion', type: 'awct', firingTriggerId: ['1'] },
          { name: 'random tag', type: 'html', firingTriggerId: ['1'] },
        ],
      },
    };
    const result = checkNamingConventions(container);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('should FAIL when <70% follow naming patterns', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'asdf', type: 'gaawe', firingTriggerId: ['1'] },
          { name: 'tag2', type: 'awct', firingTriggerId: ['1'] },
          { name: 'whatever', type: 'html', firingTriggerId: ['1'] },
          { name: 'GA4 - Config', type: 'gaawe', firingTriggerId: ['1'] },
        ],
      },
    };
    const result = checkNamingConventions(container);
    expect(result.passed).toBe(false);
  });

  it('should handle empty tag array', () => {
    const container: GTMContainer = { containerVersion: { tag: [] } };
    const result = checkNamingConventions(container);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 7. checkCrossDomainTracking (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkCrossDomainTracking', () => {
  it('should PASS when no auto-link needed (single domain setup)', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Linker', type: 'gclidw', firingTriggerId: ['1'] },
        ],
      },
    };
    const result = checkCrossDomainTracking(container);
    // Single domain - linker present, no cross-domain issues
    expect(result.severity).toBe('warning');
  });

  it('should FAIL when conversion linker missing auto-link domains', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Linker',
            type: 'gclidw',
            parameter: [
              { key: 'conversionCookiePrefix', value: '_gcl', type: 'template' },
            ],
            firingTriggerId: ['1'],
          },
          {
            name: 'GA4 Config',
            type: 'gaawe',
            parameter: [
              { key: 'linkerDomains', value: 'example.com,shop.example.com', type: 'template' },
            ],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const result = checkCrossDomainTracking(container);
    expect(result.passed).toBe(false);
  });

  it('should handle empty container', () => {
    const container: GTMContainer = { containerVersion: { tag: [] } };
    const result = checkCrossDomainTracking(container);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 8. checkRemarketingTags (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkRemarketingTags', () => {
  it('should PASS when remarketing tags have required parameters', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Remarketing',
            type: 'sp',
            parameter: [
              { key: 'conversionId', value: '123456', type: 'template' },
            ],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const result = checkRemarketingTags(container);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('should FAIL when remarketing tags missing conversion ID', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Remarketing',
            type: 'sp',
            parameter: [],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const result = checkRemarketingTags(container);
    expect(result.passed).toBe(false);
  });

  it('should handle no remarketing tags', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [{ name: 'GA4', type: 'gaawe', firingTriggerId: ['1'] }],
      },
    };
    const result = checkRemarketingTags(container);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 9. checkDataLayerDependencies (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkDataLayerDependencies', () => {
  it('should PASS when all referenced variables exist', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Tag',
            type: 'awct',
            parameter: [
              { key: 'conversionValue', value: '{{Purchase Value}}', type: 'template' },
            ],
            firingTriggerId: ['1'],
          },
        ],
        variable: [{ name: 'Purchase Value', type: 'v' }],
      },
    };
    const result = checkDataLayerDependencies(container);
    expect(result.passed).toBe(true);
  });

  it('should FAIL when tags reference non-existent variables', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Tag',
            type: 'awct',
            parameter: [
              { key: 'conversionValue', value: '{{Missing Var}}', type: 'template' },
            ],
            firingTriggerId: ['1'],
          },
        ],
        variable: [],
      },
    };
    const result = checkDataLayerDependencies(container);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
  });

  it('should handle tags with no parameters', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [{ name: 'Tag', type: 'awct', firingTriggerId: ['1'] }],
        variable: [],
      },
    };
    const result = checkDataLayerDependencies(container);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 10. checkTriggerConflicts (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkTriggerConflicts', () => {
  it('should PASS when tags have single triggers', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Tag', type: 'awct', firingTriggerId: ['1'] },
        ],
        trigger: [{ name: 'All Pages', type: 'pageview', triggerId: '1' }],
      },
    };
    const result = checkTriggerConflicts(container);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('should FAIL when tag has conflicting trigger types', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Bad Tag', type: 'awct', firingTriggerId: ['1', '2'] },
        ],
        trigger: [
          { name: 'All Pages', type: 'pageview', triggerId: '1' },
          { name: 'Form Submit', type: 'formSubmit', triggerId: '2' },
        ],
      },
    };
    const result = checkTriggerConflicts(container);
    expect(result.passed).toBe(false);
  });

  it('should handle empty containers', () => {
    const container: GTMContainer = { containerVersion: { tag: [], trigger: [] } };
    const result = checkTriggerConflicts(container);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 11. checkDebugTags (INFO)
// ──────────────────────────────────────────────────────────────
describe('checkDebugTags', () => {
  it('should PASS when no debug/test tags found', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'GA4 - Config', type: 'gaawe', firingTriggerId: ['1'] },
        ],
        trigger: [{ name: 'All Pages', type: 'pageview', triggerId: '1' }],
      },
    };
    const result = checkDebugTags(container);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
  });

  it('should FAIL when debug/test tags exist on All Pages', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'DEBUG - Test Pixel', type: 'html', firingTriggerId: ['1'] },
          { name: 'Preview Tag', type: 'html', firingTriggerId: ['1'] },
        ],
        trigger: [{ name: 'All Pages', type: 'pageview', triggerId: '1' }],
      },
    };
    const result = checkDebugTags(container);
    expect(result.passed).toBe(false);
    expect(result.details).toHaveProperty('debugTags');
  });

  it('should handle empty containers', () => {
    const container: GTMContainer = { containerVersion: { tag: [], trigger: [] } };
    const result = checkDebugTags(container);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 12. checkUnusedVariables (INFO)
// ──────────────────────────────────────────────────────────────
describe('checkUnusedVariables', () => {
  it('should PASS when all variables are referenced', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Tag',
            type: 'awct',
            parameter: [
              { key: 'value', value: '{{Purchase Value}}', type: 'template' },
            ],
            firingTriggerId: ['1'],
          },
        ],
        variable: [{ name: 'Purchase Value', type: 'v' }],
      },
    };
    const result = checkUnusedVariables(container);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
  });

  it('should FAIL when unused variables exist', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Tag', type: 'awct', firingTriggerId: ['1'] },
        ],
        variable: [
          { name: 'Unused Var', type: 'v' },
          { name: 'Also Unused', type: 'v' },
        ],
      },
    };
    const result = checkUnusedVariables(container);
    expect(result.passed).toBe(false);
    expect(result.details).toHaveProperty('unusedVariables');
  });

  it('should handle no variables', () => {
    const container: GTMContainer = {
      containerVersion: {
        tag: [{ name: 'Tag', type: 'awct', firingTriggerId: ['1'] }],
        variable: [],
      },
    };
    const result = checkUnusedVariables(container);
    expect(result.passed).toBe(true);
  });
});
