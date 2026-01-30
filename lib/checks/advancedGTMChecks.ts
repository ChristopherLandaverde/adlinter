import { GTMContainer, AuditCheck, AuditContext, Severity } from '../types';

// ── DATA LAYER ANALYSIS ─────────────────────────────────────

// CRITICAL: Missing Data Layer Variables
export const checkMissingDataLayerVariables = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const definedVars = container.containerVersion.variable
    ?.filter(v => v.type === 'v')
    .map(v => ({
      name: v.name,
      path: v.parameter?.find(p => p.key === 'dataLayerVersion')?.value || '',
    })) || [];

  const tags = container.containerVersion.tag || [];
  const usedVars = new Set<string>();

  tags.forEach(tag => {
    const tagString = JSON.stringify(tag);
    const matches = tagString.match(/\{\{([^}]+)\}\}/g);
    if (matches) {
      matches.forEach(match => {
        const varName = match.replace(/\{\{|\}\}/g, '').trim();
        usedVars.add(varName);
      });
    }
  });

  const definedVarNames = new Set(definedVars.map(v => v.name));
  const missingVars = Array.from(usedVars).filter(v => !definedVarNames.has(v));

  const actuallyMissing = missingVars.filter(v =>
    !v.match(/^(Page|Click|Event|Container|Environment|Debug|Random|gtm\.)/)
  );

  return {
    id: 'missing-datalayer-variables',
    severity: 'critical',
    passed: actuallyMissing.length === 0,
    title: 'Tags Reference Undefined Variables',
    description: actuallyMissing.length > 0
      ? `${actuallyMissing.length} variables are referenced but not defined: ${actuallyMissing.slice(0, 3).join(', ')}${actuallyMissing.length > 3 ? '...' : ''}`
      : 'All variable references are defined',
    details: {
      missingVariables: actuallyMissing,
      definedCount: definedVars.length,
      usedCount: usedVars.size,
    },
    recommendation: 'Create missing Data Layer Variables or remove references from tags',
  };
};

// WARNING: Data Layer Variable Naming Inconsistency
export const checkDataLayerNaming = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const dataLayerVars = container.containerVersion.variable
    ?.filter(v => v.type === 'v')
    .map(v => v.name) || [];

  if (dataLayerVars.length === 0) {
    return {
      id: 'datalayer-naming-inconsistency',
      severity: 'info',
      passed: true,
      title: 'Inconsistent Data Layer Variable Naming',
      description: 'No dataLayer variables to analyze',
      recommendation: 'N/A',
    };
  }

  const patterns: Record<string, RegExp> = {
    camelCase: /^[a-z][a-zA-Z0-9]*$/,
    snake_case: /^[a-z][a-z0-9_]*$/,
    kebabCase: /^[a-z][a-z0-9-]*$/,
    PascalCase: /^[A-Z][a-zA-Z0-9]*$/,
  };

  const matches = Object.entries(patterns).map(([name, regex]) => ({
    pattern: name,
    count: dataLayerVars.filter(v => regex.test(v)).length,
  }));

  const dominantPattern = matches.reduce((a, b) =>
    a.count > b.count ? a : b
  );

  const inconsistentCount = dataLayerVars.length - dominantPattern.count;
  const consistencyPercent = (dominantPattern.count / dataLayerVars.length) * 100;

  return {
    id: 'datalayer-naming-inconsistency',
    severity: 'warning',
    passed: consistencyPercent >= 80,
    title: 'Inconsistent Data Layer Variable Naming',
    description: `${consistencyPercent.toFixed(0)}% of variables follow ${dominantPattern.pattern} convention`,
    details: {
      dominantPattern: dominantPattern.pattern,
      inconsistentCount,
      patterns: matches,
    },
    recommendation: `Standardize on ${dominantPattern.pattern} for all dataLayer variables`,
  };
};

// CRITICAL: E-commerce Data Layer Structure
export const checkEcommerceDataLayer = (
  container: GTMContainer,
  context?: AuditContext
): AuditCheck => {
  if (context?.businessModel !== 'ecommerce') {
    return {
      id: 'ecommerce-datalayer-structure',
      severity: 'info',
      passed: true,
      title: 'E-commerce Data Layer Structure',
      description: 'Not applicable - not an e-commerce site',
      recommendation: 'N/A',
    };
  }

  const dataLayerVars = container.containerVersion.variable
    ?.filter(v => v.type === 'v') || [];

  const ecommerceVarPaths = dataLayerVars
    .map(v => v.parameter?.find(p => p.key === 'dataLayerVersion')?.value || '')
    .filter(path => path.toLowerCase().includes('ecommerce'));

  const requiredPaths = [
    'ecommerce.purchase',
    'ecommerce.items',
    'ecommerce.transaction_id',
    'ecommerce.value',
    'ecommerce.currency',
  ];

  const missingPaths = requiredPaths.filter(required =>
    !ecommerceVarPaths.some(path => path.includes(required))
  );

  const tags = container.containerVersion.tag || [];
  const hasEcommerceTag = tags.some(tag =>
    tag.type === 'gaawe' &&
    JSON.stringify(tag).toLowerCase().includes('purchase')
  );

  const issues: string[] = [];
  if (missingPaths.length > 0) {
    issues.push(`Missing dataLayer paths: ${missingPaths.join(', ')}`);
  }
  if (!hasEcommerceTag) {
    issues.push('No e-commerce tracking tags found');
  }

  return {
    id: 'ecommerce-datalayer-structure',
    severity: 'critical',
    passed: issues.length === 0,
    title: 'E-commerce Data Layer Structure',
    description: issues.length > 0
      ? issues.join('; ')
      : 'E-commerce dataLayer structure looks complete',
    details: {
      foundPaths: ecommerceVarPaths,
      missingPaths,
      hasEcommerceTag,
    },
    recommendation: 'Implement standard GA4 e-commerce dataLayer structure',
  };
};

// WARNING: Duplicate Data Layer Paths
export const checkDuplicateDataLayerPaths = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const dataLayerVars = container.containerVersion.variable
    ?.filter(v => v.type === 'v')
    .map(v => ({
      name: v.name,
      path: v.parameter?.find(p => p.key === 'dataLayerVersion')?.value || '',
    })) || [];

  const pathGroups = new Map<string, string[]>();
  dataLayerVars.forEach(v => {
    if (v.path) {
      if (!pathGroups.has(v.path)) {
        pathGroups.set(v.path, []);
      }
      pathGroups.get(v.path)!.push(v.name);
    }
  });

  const duplicates = Array.from(pathGroups.entries())
    .filter(([, names]) => names.length > 1)
    .map(([path, names]) => ({ path, names }));

  return {
    id: 'duplicate-datalayer-paths',
    severity: 'warning',
    passed: duplicates.length === 0,
    title: 'Duplicate Data Layer Variable Paths',
    description: duplicates.length > 0
      ? `${duplicates.length} dataLayer paths are read by multiple variables`
      : 'No duplicate dataLayer paths found',
    details: { duplicates },
    recommendation: 'Consolidate variables reading from the same dataLayer path',
  };
};

// INFO: Unused Data Layer Variables
export const checkUnusedDataLayerVariables = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const definedVars = container.containerVersion.variable
    ?.filter(v => v.type === 'v')
    .map(v => v.name) || [];

  const tags = container.containerVersion.tag || [];
  const triggers = container.containerVersion.trigger || [];

  const usedVars = new Set<string>();

  [...tags, ...triggers].forEach(item => {
    const itemString = JSON.stringify(item);
    definedVars.forEach(varName => {
      if (itemString.includes(`{{${varName}}}`)) {
        usedVars.add(varName);
      }
    });
  });

  const unusedVars = definedVars.filter(v => !usedVars.has(v));

  return {
    id: 'unused-datalayer-variables',
    severity: 'info',
    passed: unusedVars.length === 0,
    title: 'Unused Data Layer Variables',
    description: unusedVars.length > 0
      ? `${unusedVars.length} dataLayer variables are defined but never used`
      : 'All dataLayer variables are being used',
    details: {
      unusedVariables: unusedVars,
      totalDefined: definedVars.length,
      totalUsed: usedVars.size,
    },
    recommendation: 'Remove unused variables or implement them in tags',
  };
};

// WARNING: Data Layer Version Conflicts
export const checkDataLayerVersionConflicts = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const dataLayerVars = container.containerVersion.variable
    ?.filter(v => v.type === 'v') || [];

  let v1Count = 0;
  let v2Count = 0;

  dataLayerVars.forEach(v => {
    const version = v.parameter?.find(p => p.key === 'dataLayerVersion')?.value;
    if (version === '1') v1Count++;
    if (version === '2') v2Count++;
  });

  const hasMixedVersions = v1Count > 0 && v2Count > 0;

  return {
    id: 'datalayer-version-conflicts',
    severity: 'warning',
    passed: !hasMixedVersions,
    title: 'Mixed Data Layer Versions',
    description: hasMixedVersions
      ? `Container uses both dataLayer v1 (${v1Count}) and v2 (${v2Count})`
      : 'Consistent dataLayer version usage',
    details: { v1Count, v2Count },
    recommendation: 'Standardize on dataLayer version 2 for all variables',
  };
};

// ── TAG SEQUENCING & DEPENDENCIES ───────────────────────────

// CRITICAL: Conversion Linker Fires Before Conversion Tags
export const checkConversionLinkerSequencing = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const tags = container.containerVersion.tag || [];

  const linkerTag = tags.find(tag => tag.type === 'gclidw');

  if (!linkerTag) {
    return {
      id: 'conversion-linker-sequencing',
      severity: 'info',
      passed: true,
      title: 'Conversion Linker Sequencing',
      description: 'No Conversion Linker to sequence',
      recommendation: 'N/A',
    };
  }

  const conversionTags = tags.filter(tag => tag.type === 'awct');

  const tagsWithoutSequencing = conversionTags.filter(tag => {
    const setupTags = tag.setupTag || [];
    const hasLinkerInSetup = setupTags.some(
      (setupTag: any) => setupTag.tagName === linkerTag.name
    );

    const blockingTags = (tag as any).blockingTag || [];
    const isBlockedByLinker = blockingTags.some(
      (blockingTag: any) => blockingTag.tagName === linkerTag.name
    );

    return !hasLinkerInSetup && !isBlockedByLinker;
  });

  return {
    id: 'conversion-linker-sequencing',
    severity: 'critical',
    passed: tagsWithoutSequencing.length === 0,
    title: 'Conversion Linker Sequencing',
    description: tagsWithoutSequencing.length > 0
      ? `${tagsWithoutSequencing.length} conversion tags don't wait for Conversion Linker`
      : 'All conversion tags properly sequenced after Conversion Linker',
    details: {
      tagsWithoutSequencing: tagsWithoutSequencing.map(t => t.name),
    },
    recommendation: 'Set up tag sequencing to fire Conversion Linker before conversion tags',
  };
};

// WARNING: Circular Tag Dependencies
export const checkCircularDependencies = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const tags = container.containerVersion.tag || [];

  const dependencies = new Map<string, string[]>();

  tags.forEach(tag => {
    const setupTags = (tag.setupTag || []).map((t: any) => t.tagName);
    const blockingTags = ((tag as any).blockingTag || []).map((t: any) => t.tagName);
    dependencies.set(tag.name, [...setupTags, ...blockingTags]);
  });

  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];

  function detectCycle(tagName: string, path: string[]): void {
    if (recursionStack.has(tagName)) {
      const cycleStart = path.indexOf(tagName);
      cycles.push(path.slice(cycleStart));
      return;
    }

    if (visited.has(tagName)) {
      return;
    }

    visited.add(tagName);
    recursionStack.add(tagName);
    path.push(tagName);

    const deps = dependencies.get(tagName) || [];
    for (const dep of deps) {
      detectCycle(dep, [...path]);
    }

    recursionStack.delete(tagName);
  }

  tags.forEach(tag => {
    if (!visited.has(tag.name)) {
      detectCycle(tag.name, []);
    }
  });

  return {
    id: 'circular-tag-dependencies',
    severity: 'warning',
    passed: cycles.length === 0,
    title: 'Circular Tag Dependencies',
    description: cycles.length > 0
      ? `Found ${cycles.length} circular dependency chain(s)`
      : 'No circular dependencies detected',
    details: {
      cycles: cycles.map(cycle => cycle.join(' → ')),
    },
    recommendation: 'Remove circular dependencies in tag sequencing',
  };
};

// WARNING: Excessive Tag Sequencing Depth
export const checkSequencingDepth = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const tags = container.containerVersion.tag || [];

  if (tags.length === 0) {
    return {
      id: 'excessive-sequencing-depth',
      severity: 'info',
      passed: true,
      title: 'Excessive Tag Sequencing Depth',
      description: 'No tags to analyze',
      recommendation: 'N/A',
    };
  }

  const dependencies = new Map<string, string[]>();
  tags.forEach(tag => {
    const setupTags = (tag.setupTag || []).map((t: any) => t.tagName);
    dependencies.set(tag.name, setupTags);
  });

  const depths = new Map<string, number>();

  function calculateDepth(tagName: string, visited = new Set<string>()): number {
    if (depths.has(tagName)) {
      return depths.get(tagName)!;
    }

    if (visited.has(tagName)) {
      return 0;
    }

    visited.add(tagName);
    const deps = dependencies.get(tagName) || [];

    if (deps.length === 0) {
      depths.set(tagName, 0);
      return 0;
    }

    const maxDepth = Math.max(...deps.map(dep => calculateDepth(dep, visited)));
    depths.set(tagName, maxDepth + 1);
    return maxDepth + 1;
  }

  tags.forEach(tag => calculateDepth(tag.name));

  const maxDepth = Math.max(...Array.from(depths.values()));
  const deepTags = Array.from(depths.entries())
    .filter(([, depth]) => depth > 3)
    .map(([name, depth]) => ({ name, depth }));

  return {
    id: 'excessive-sequencing-depth',
    severity: 'warning',
    passed: maxDepth <= 3,
    title: 'Excessive Tag Sequencing Depth',
    description: maxDepth > 3
      ? `Maximum sequencing depth is ${maxDepth} (${deepTags.length} tags affected)`
      : `Maximum sequencing depth is ${maxDepth}`,
    details: { maxDepth, deepTags },
    recommendation: 'Simplify tag sequencing chains to improve page load performance',
  };
};

// INFO: Orphaned Tag Sequences
export const checkOrphanedSequences = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const tags = container.containerVersion.tag || [];
  const tagNames = new Set(tags.map(t => t.name));

  const orphanedReferences: Array<{ tag: string; reference: string; type: string }> = [];

  tags.forEach(tag => {
    const setupTags = (tag.setupTag || []).map((t: any) => t.tagName);
    const blockingTags = ((tag as any).blockingTag || []).map((t: any) => t.tagName);

    setupTags.forEach((setupTag: string) => {
      if (!tagNames.has(setupTag)) {
        orphanedReferences.push({ tag: tag.name, reference: setupTag, type: 'setup' });
      }
    });

    blockingTags.forEach((blockingTag: string) => {
      if (!tagNames.has(blockingTag)) {
        orphanedReferences.push({ tag: tag.name, reference: blockingTag, type: 'blocking' });
      }
    });
  });

  return {
    id: 'orphaned-tag-sequences',
    severity: 'info',
    passed: orphanedReferences.length === 0,
    title: 'Orphaned Tag Sequence References',
    description: orphanedReferences.length > 0
      ? `${orphanedReferences.length} tags reference non-existent tags in sequencing`
      : 'All tag sequence references are valid',
    details: { orphanedReferences },
    recommendation: 'Remove references to deleted tags or recreate missing tags',
  };
};

// ── TRIGGER ANALYSIS ────────────────────────────────────────

// WARNING: Overlapping Trigger Conditions
export const checkOverlappingTriggers = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const triggers = container.containerVersion.trigger || [];

  const triggersByType = new Map<string, any[]>();
  triggers.forEach(trigger => {
    const type = trigger.type;
    if (!triggersByType.has(type)) {
      triggersByType.set(type, []);
    }
    triggersByType.get(type)!.push(trigger);
  });

  const overlaps: Array<{ trigger1: string; trigger2: string; reason: string }> = [];

  triggersByType.forEach((triggersOfType) => {
    for (let i = 0; i < triggersOfType.length; i++) {
      for (let j = i + 1; j < triggersOfType.length; j++) {
        const t1 = triggersOfType[i];
        const t2 = triggersOfType[j];

        const t1Filters = JSON.stringify(t1.filter || []);
        const t2Filters = JSON.stringify(t2.filter || []);

        if (t1Filters === t2Filters) {
          overlaps.push({
            trigger1: t1.name,
            trigger2: t2.name,
            reason: 'Identical conditions',
          });
        }
      }
    }
  });

  return {
    id: 'overlapping-triggers',
    severity: 'warning',
    passed: overlaps.length === 0,
    title: 'Overlapping Trigger Conditions',
    description: overlaps.length > 0
      ? `Found ${overlaps.length} pairs of overlapping triggers`
      : 'No overlapping triggers detected',
    details: { overlaps },
    recommendation: 'Consolidate overlapping triggers to reduce complexity',
  };
};

// WARNING: Invalid CSS Selectors in Triggers
export const checkInvalidCSSSelectors = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const triggers = container.containerVersion.trigger || [];

  const elementTriggers = triggers.filter(t =>
    t.type === 'linkClick' ||
    t.type === 'elementVisibility' ||
    t.type === 'click'
  );

  const invalidSelectors: Array<{ trigger: string; selector: string; error: string }> = [];

  elementTriggers.forEach(trigger => {
    const filters = trigger.filter || [];
    filters.forEach((filter: any) => {
      if (filter.type === 'cssSelector') {
        const selector = filter.parameter?.[0]?.value;
        if (selector) {
          // Basic CSS selector validation without DOM
          // Check for common syntax errors
          const hasUnclosedBracket = (selector.match(/\[/g) || []).length !== (selector.match(/\]/g) || []).length;
          const hasUnclosedParen = (selector.match(/\(/g) || []).length !== (selector.match(/\)/g) || []).length;
          const hasEmptySelector = selector.trim() === '';
          const hasDoubleColon = selector.includes(':::');

          if (hasUnclosedBracket || hasUnclosedParen || hasEmptySelector || hasDoubleColon) {
            invalidSelectors.push({
              trigger: trigger.name,
              selector,
              error: 'Invalid CSS selector syntax',
            });
          }
        }
      }
    });
  });

  return {
    id: 'invalid-css-selectors',
    severity: 'warning',
    passed: invalidSelectors.length === 0,
    title: 'Invalid CSS Selectors in Triggers',
    description: invalidSelectors.length > 0
      ? `${invalidSelectors.length} triggers have invalid CSS selectors`
      : 'All CSS selectors are valid',
    details: { invalidSelectors },
    recommendation: 'Fix CSS selector syntax in element triggers',
  };
};

// INFO: Unused Triggers
export const checkUnusedTriggers = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const triggers = container.containerVersion.trigger || [];
  const tags = container.containerVersion.tag || [];

  const usedTriggerIds = new Set<string>();

  tags.forEach(tag => {
    const firingTriggerIds = tag.firingTriggerId || [];
    const blockingTriggerIds = (tag as any).blockingTriggerId || [];

    [...firingTriggerIds, ...blockingTriggerIds].forEach((id: string) => {
      usedTriggerIds.add(id);
    });
  });

  const unusedTriggers = triggers.filter(t =>
    !usedTriggerIds.has(t.triggerId)
  );

  return {
    id: 'unused-triggers',
    severity: 'info',
    passed: unusedTriggers.length === 0,
    title: 'Unused Triggers',
    description: unusedTriggers.length > 0
      ? `${unusedTriggers.length} triggers are defined but not used by any tags`
      : 'All triggers are being used',
    details: {
      unusedTriggers: unusedTriggers.map(t => t.name),
    },
    recommendation: 'Remove unused triggers to simplify container',
  };
};

// WARNING: Performance-Heavy Triggers
export const checkPerformanceHeavyTriggers = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const triggers = container.containerVersion.trigger || [];

  const heavyTriggers: Array<{ trigger: string; reason: string }> = [];

  triggers.forEach(trigger => {
    if (trigger.type === 'elementVisibility') {
      const threshold = (trigger as any).parameter?.find(
        (p: any) => p.key === 'onScreenRatio'
      )?.value;

      if (threshold && parseInt(threshold) < 25) {
        heavyTriggers.push({
          trigger: trigger.name,
          reason: `Low visibility threshold (${threshold}%) causes frequent checking`,
        });
      }
    }

    if (trigger.type === 'scrollDepth') {
      const percentages = (trigger as any).parameter?.find(
        (p: any) => p.key === 'verticalThresholdsPercent'
      )?.value;

      if (percentages) {
        const thresholds = percentages.split(',');
        if (thresholds.length > 5) {
          heavyTriggers.push({
            trigger: trigger.name,
            reason: `Too many scroll thresholds (${thresholds.length})`,
          });
        }
      }
    }

    if (trigger.type === 'timer') {
      const interval = (trigger as any).parameter?.find(
        (p: any) => p.key === 'interval'
      )?.value;

      if (interval && parseInt(interval) < 5000) {
        heavyTriggers.push({
          trigger: trigger.name,
          reason: `Short timer interval (${interval}ms) fires very frequently`,
        });
      }
    }
  });

  return {
    id: 'performance-heavy-triggers',
    severity: 'warning',
    passed: heavyTriggers.length === 0,
    title: 'Performance-Heavy Triggers',
    description: heavyTriggers.length > 0
      ? `${heavyTriggers.length} triggers may impact page performance`
      : 'No performance concerns with triggers',
    details: { heavyTriggers },
    recommendation: 'Optimize trigger settings to reduce performance impact',
  };
};

// ── PERFORMANCE & TECHNICAL DEBT ────────────────────────────

// Container Size Score (dynamic severity)
export const checkContainerSize = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const tags = container.containerVersion.tag || [];
  const triggers = container.containerVersion.trigger || [];
  const variables = container.containerVersion.variable || [];

  const tagCount = tags.length;
  const triggerCount = triggers.length;
  const variableCount = variables.length;

  const customHTMLTags = tags.filter(t => t.type === 'html').length;

  const baseScore = Math.min((tagCount / 50) * 40, 40) +
                    Math.min((triggerCount / 100) * 30, 30) +
                    Math.min((variableCount / 50) * 20, 20) +
                    Math.min((customHTMLTags / 10) * 10, 10);

  const score = Math.round(100 - baseScore);

  let severity: Severity = 'info';
  if (score < 40) severity = 'critical';
  else if (score < 60) severity = 'warning';

  return {
    id: 'container-size-score',
    severity,
    passed: score >= 60,
    title: 'Container Complexity Score',
    description: `Container health score: ${score}/100`,
    details: { score, tagCount, triggerCount, variableCount, customHTMLTags },
    recommendation: score < 60
      ? 'Consider cleanup and optimization to reduce container complexity'
      : 'Container size is manageable',
  };
};

// WARNING: Excessive Custom HTML Tags
export const checkCustomHTMLCount = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const tags = container.containerVersion.tag || [];

  if (tags.length === 0) {
    return {
      id: 'excessive-custom-html',
      severity: 'info',
      passed: true,
      title: 'Excessive Custom HTML Tags',
      description: 'No tags to analyze',
      recommendation: 'N/A',
    };
  }

  const customHTMLTags = tags.filter(t => t.type === 'html');
  const totalTags = tags.length;
  const customHTMLPercent = (customHTMLTags.length / totalTags) * 100;

  return {
    id: 'excessive-custom-html',
    severity: 'warning',
    passed: customHTMLPercent < 30,
    title: 'Excessive Custom HTML Tags',
    description: `${customHTMLTags.length} Custom HTML tags (${customHTMLPercent.toFixed(0)}% of total)`,
    details: {
      customHTMLCount: customHTMLTags.length,
      totalTags,
      percentage: customHTMLPercent,
    },
    recommendation: 'Migrate Custom HTML tags to native tag templates where possible',
  };
};

// INFO: Missing Descriptions
export const checkMissingDescriptions = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const tags = container.containerVersion.tag || [];
  const triggers = container.containerVersion.trigger || [];
  const variables = container.containerVersion.variable || [];

  const missingDescriptions = {
    tags: tags.filter(t => !(t as any).notes).length,
    triggers: triggers.filter(t => !(t as any).notes).length,
    variables: variables.filter(v => !(v as any).notes).length,
  };

  const total = tags.length + triggers.length + variables.length;

  if (total === 0) {
    return {
      id: 'missing-descriptions',
      severity: 'info',
      passed: true,
      title: 'Documentation Completeness',
      description: 'No items to analyze',
      recommendation: 'N/A',
    };
  }

  const missing = missingDescriptions.tags +
                  missingDescriptions.triggers +
                  missingDescriptions.variables;

  const documentationPercent = ((total - missing) / total) * 100;

  return {
    id: 'missing-descriptions',
    severity: 'info',
    passed: documentationPercent >= 50,
    title: 'Documentation Completeness',
    description: `${documentationPercent.toFixed(0)}% of items have descriptions`,
    details: {
      missingDescriptions,
      total,
      documented: total - missing,
    },
    recommendation: 'Add descriptions to tags, triggers, and variables for better maintainability',
  };
};

// INFO: Stale Tags
export const checkStaleTags = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const tags = container.containerVersion.tag || [];

  const potentiallyStale = tags.filter(tag =>
    tag.name.toLowerCase().match(/old|legacy|backup|deprecated|temp|test/i)
  );

  return {
    id: 'stale-tags',
    severity: 'info',
    passed: potentiallyStale.length === 0,
    title: 'Potentially Stale Tags',
    description: potentiallyStale.length > 0
      ? `${potentiallyStale.length} tags may be outdated or temporary`
      : 'No obviously stale tags detected',
    details: {
      potentiallyStale: potentiallyStale.map(t => t.name),
    },
    recommendation: 'Review and remove outdated or temporary tags',
  };
};

// Export all advanced GTM checks
export const allAdvancedGTMChecks = [
  // Data Layer Analysis
  checkMissingDataLayerVariables,
  checkDataLayerNaming,
  checkEcommerceDataLayer,
  checkDuplicateDataLayerPaths,
  checkUnusedDataLayerVariables,
  checkDataLayerVersionConflicts,

  // Tag Sequencing
  checkConversionLinkerSequencing,
  checkCircularDependencies,
  checkSequencingDepth,
  checkOrphanedSequences,

  // Trigger Analysis
  checkOverlappingTriggers,
  checkInvalidCSSSelectors,
  checkUnusedTriggers,
  checkPerformanceHeavyTriggers,

  // Performance & Technical Debt
  checkContainerSize,
  checkCustomHTMLCount,
  checkMissingDescriptions,
  checkStaleTags,
];
