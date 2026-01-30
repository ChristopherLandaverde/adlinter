import { GTMContainer, GTMTag, AuditCheck, AuditContext, Severity } from '../types';

// ── CRITICAL CHECK #1 ───────────────────────────────────────
export const checkConversionLinker = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const tags = container.containerVersion.tag || [];
  const hasConversionLinker = tags.some(tag => tag.type === 'gclidw');

  return {
    id: 'missing-conversion-linker',
    severity: 'critical',
    passed: hasConversionLinker,
    title: 'Missing Google Ads Conversion Linker',
    description: hasConversionLinker
      ? 'Conversion Linker tag found'
      : 'No Conversion Linker tag found. This breaks all Google Ads conversion tracking.',
    recommendation: 'Add a Google Ads Conversion Linker tag that fires on All Pages.',
  };
};

// ── CRITICAL CHECK #2 (Context-Aware) ───────────────────────
export const checkConsentViolations = (
  container: GTMContainer,
  context?: AuditContext
): AuditCheck => {
  const tags = container.containerVersion.tag || [];

  if (context?.needsConsent === 'no') {
    return {
      id: 'consent-violations',
      severity: 'info',
      passed: true,
      title: 'GDPR Consent Check',
      description: 'Consent check skipped - you indicated no EU/UK traffic',
      recommendation: 'N/A',
    };
  }

  const googleAdsTags = tags.filter(
    tag => tag.type === 'awct' || tag.type === 'gaawe'
  );

  const tagsWithoutConsent = googleAdsTags.filter(tag => !tag.consentSettings);

  const severity: Severity = context?.needsConsent === 'yes' ? 'critical' : 'warning';

  return {
    id: 'consent-violations',
    severity,
    passed: tagsWithoutConsent.length === 0,
    title: 'Google Ads Tags May Fire Without Consent',
    description:
      tagsWithoutConsent.length > 0
        ? `${tagsWithoutConsent.length} Google Ads tags may fire before consent is granted`
        : 'All Google Ads tags have consent checks',
    details: { tags: tagsWithoutConsent.map(t => t.name) },
    recommendation: 'Add consent checks to all Google Ads tags to comply with GDPR',
  };
};

// ── CRITICAL CHECK #3 ───────────────────────────────────────
export const checkDuplicateConversions = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const tags = container.containerVersion.tag || [];
  const conversionTags = tags.filter(tag => tag.type === 'awct');

  // Group by conversionId + trigger combination
  const tagKeys = new Map<string, GTMTag[]>();
  conversionTags.forEach(tag => {
    const conversionId =
      tag.parameter?.find(p => p.key === 'conversionId')?.value || '';
    const triggers = (tag.firingTriggerId || []).sort().join(',');
    const key = `${conversionId}|${triggers}`;
    if (!tagKeys.has(key)) {
      tagKeys.set(key, []);
    }
    tagKeys.get(key)!.push(tag);
  });

  const duplicates = Array.from(tagKeys.entries())
    .filter(([, group]) => group.length > 1)
    .map(([, group]) => ({
      name: group[0].name,
      count: group.length,
      tagNames: group.map(t => t.name),
    }));

  return {
    id: 'duplicate-conversions',
    severity: 'critical',
    passed: duplicates.length === 0,
    title: 'Duplicate Conversion Tags',
    description:
      duplicates.length > 0
        ? `Found ${duplicates.length} sets of duplicate conversion tags`
        : 'No duplicate conversion tags found',
    details: { duplicates },
    recommendation: 'Remove duplicate conversion tags to prevent double-counting',
  };
};

// ── CRITICAL CHECK #4 ───────────────────────────────────────
export const checkEnhancedConversions = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const tags = container.containerVersion.tag || [];

  const enhancedTags = tags.filter(tag =>
    tag.parameter?.some(
      p => p.key === 'enableEnhancedConversions' && p.value === 'true'
    )
  );

  if (enhancedTags.length === 0) {
    return {
      id: 'enhanced-conversions-missing-data',
      severity: 'critical',
      passed: true,
      title: 'Enhanced Conversions User Data',
      description: 'No enhanced conversion tags found (check skipped)',
      recommendation: 'Consider enabling enhanced conversions for better attribution',
    };
  }

  const tagsWithoutUserData = enhancedTags.filter(tag => {
    const hasUserDataParam = tag.parameter?.some(
      p =>
        p.key === 'enhancedConversionsUserDataVariable' ||
        p.key === 'enhancedConversionsUserData'
    );
    return !hasUserDataParam;
  });

  return {
    id: 'enhanced-conversions-missing-data',
    severity: 'critical',
    passed: tagsWithoutUserData.length === 0,
    title: 'Enhanced Conversions Missing User Data',
    description:
      tagsWithoutUserData.length > 0
        ? `Enhanced conversions enabled but ${tagsWithoutUserData.length} tag(s) have no user data variables`
        : 'All enhanced conversion tags have user data variables configured',
    details: { tagsWithoutUserData: tagsWithoutUserData.map(t => t.name) },
    recommendation:
      'Add user data variables (email, phone, address) for enhanced conversions',
  };
};

// ── CRITICAL CHECK #5 ───────────────────────────────────────
export const checkErrorHandling = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const tags = container.containerVersion.tag || [];
  const triggers = container.containerVersion.trigger || [];

  const redirectTriggerTypes = ['formSubmit', 'linkClick', 'customEvent'];
  const redirectTriggerIds = new Set(
    triggers
      .filter(t => redirectTriggerTypes.includes(t.type))
      .map(t => t.triggerId)
  );

  const conversionTags = tags.filter(tag => tag.type === 'awct');

  const tagsAtRisk = conversionTags.filter(tag => {
    const firesOnRedirect = tag.firingTriggerId?.some(id =>
      redirectTriggerIds.has(id)
    );
    if (!firesOnRedirect) return false;

    const hasSequencing =
      (tag.setupTag && tag.setupTag.length > 0) ||
      (tag.teardownTag && tag.teardownTag.length > 0);
    const hasCallback = tag.parameter?.some(
      p => p.key === 'eventCallback' || p.key === 'callback'
    );

    return !hasSequencing && !hasCallback;
  });

  return {
    id: 'conversion-error-handling',
    severity: 'critical',
    passed: tagsAtRisk.length === 0,
    title: 'Conversion Tags Missing Error Handling',
    description:
      tagsAtRisk.length > 0
        ? `${tagsAtRisk.length} conversion tag(s) on redirect triggers without callback or sequencing`
        : 'All conversion tags on redirect triggers have proper error handling',
    details: { tagsAtRisk: tagsAtRisk.map(t => t.name) },
    recommendation:
      'Add event callbacks or use tag sequencing for conversion tags on form/click triggers',
  };
};

// ── WARNING CHECK #6 ────────────────────────────────────────
export const checkNamingConventions = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const tags = container.containerVersion.tag || [];

  if (tags.length === 0) {
    return {
      id: 'naming-conventions',
      severity: 'warning',
      passed: true,
      title: 'Tag Naming Conventions',
      description: 'No tags to evaluate',
      recommendation: 'Use consistent naming patterns like "Platform - Description"',
    };
  }

  // Check for "Platform - Description" pattern (e.g. "GA4 - ", "Ads - ", "FB - ")
  const conventionPattern = /^[A-Z][A-Za-z0-9]+ - .+$/;
  const followingConvention = tags.filter(tag =>
    conventionPattern.test(tag.name)
  );
  const percentage = (followingConvention.length / tags.length) * 100;

  return {
    id: 'naming-conventions',
    severity: 'warning',
    passed: percentage >= 70,
    title: 'Tag Naming Conventions',
    description:
      percentage >= 70
        ? `${Math.round(percentage)}% of tags follow naming conventions`
        : `Only ${Math.round(percentage)}% of tags follow naming convention "Platform - Description"`,
    details: {
      percentage: Math.round(percentage),
      nonConforming: tags
        .filter(tag => !conventionPattern.test(tag.name))
        .map(t => t.name),
    },
    recommendation: 'Use consistent naming patterns like "Platform - Description"',
  };
};

// ── WARNING CHECK #7 ────────────────────────────────────────
export const checkCrossDomainTracking = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const tags = container.containerVersion.tag || [];

  // Check if any tag references multiple domains (linkerDomains, autoLinkDomains)
  const hasMultipleDomainRefs = tags.some(tag =>
    tag.parameter?.some(
      p =>
        (p.key === 'linkerDomains' || p.key === 'autoLinkDomains') &&
        p.value.includes(',')
    )
  );

  if (!hasMultipleDomainRefs) {
    return {
      id: 'cross-domain-tracking',
      severity: 'warning',
      passed: true,
      title: 'Cross-Domain Tracking',
      description: 'No cross-domain configuration detected (single domain setup)',
      recommendation:
        'If you use multiple domains, configure auto-link domains in GTM Settings',
    };
  }

  // If cross-domain is referenced, check the linker has auto-link
  const linkerTags = tags.filter(tag => tag.type === 'gclidw');
  const linkerHasAutoLink = linkerTags.some(tag =>
    tag.parameter?.some(
      p => p.key === 'autoLinkDomains' || p.key === 'linkerDomains'
    )
  );

  return {
    id: 'cross-domain-tracking',
    severity: 'warning',
    passed: linkerHasAutoLink,
    title: 'Cross-Domain Tracking Misconfigured',
    description: linkerHasAutoLink
      ? 'Conversion Linker has auto-link domains configured'
      : 'Cross-domain tracking detected but Conversion Linker missing auto-link domains',
    details: {
      linkerCount: linkerTags.length,
      hasAutoLink: linkerHasAutoLink,
    },
    recommendation:
      'Configure auto-link domains in the Conversion Linker tag for cross-domain tracking',
  };
};

// ── WARNING CHECK #8 ────────────────────────────────────────
export const checkRemarketingTags = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const tags = container.containerVersion.tag || [];

  // Remarketing tags: Google Ads remarketing (sp) or floodlight counter (dc)
  const remarketingTags = tags.filter(
    tag => tag.type === 'sp' || tag.type === 'googtag'
  );

  if (remarketingTags.length === 0) {
    return {
      id: 'remarketing-tag-issues',
      severity: 'warning',
      passed: true,
      title: 'Remarketing Tag Issues',
      description: 'No remarketing tags found',
      recommendation: 'Consider adding remarketing tags for audience building',
    };
  }

  const tagsMissingParams = remarketingTags.filter(tag => {
    const hasConversionId = tag.parameter?.some(
      p => p.key === 'conversionId' || p.key === 'tagId'
    );
    return !hasConversionId;
  });

  return {
    id: 'remarketing-tag-issues',
    severity: 'warning',
    passed: tagsMissingParams.length === 0,
    title: 'Remarketing Tag Issues',
    description:
      tagsMissingParams.length > 0
        ? `${tagsMissingParams.length} remarketing tag(s) missing required parameters`
        : 'All remarketing tags have required parameters',
    details: { tagsMissingParams: tagsMissingParams.map(t => t.name) },
    recommendation: 'Add required parameters (conversion ID) to remarketing tags',
  };
};

// ── WARNING CHECK #9 ────────────────────────────────────────
export const checkDataLayerDependencies = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const tags = container.containerVersion.tag || [];
  const variables = container.containerVersion.variable || [];

  const variableNames = new Set(variables.map(v => v.name));

  // Built-in variables that don't need to be defined
  const builtInNames = new Set([
    'Page URL',
    'Page Hostname',
    'Page Path',
    'Referrer',
    'Event',
    'Container ID',
    'Container Version',
    'Random Number',
    'HTML ID',
    'Click Element',
    'Click Classes',
    'Click ID',
    'Click Target',
    'Click URL',
    'Click Text',
    'Form Element',
    'Form Classes',
    'Form ID',
    'Form Target',
    'Form URL',
    'Form Text',
    'Debug Mode',
    'History Source',
    'New History Fragment',
    'Old History Fragment',
    'New History State',
    'Old History State',
    'Environment Name',
  ]);

  // Extract all {{variable}} references from tag parameters
  const varRefPattern = /\{\{(.+?)\}\}/g;
  const missingVars: Array<{ tagName: string; varName: string }> = [];

  tags.forEach(tag => {
    tag.parameter?.forEach(param => {
      let match: RegExpExecArray | null;
      while ((match = varRefPattern.exec(param.value)) !== null) {
        const varName = match[1];
        if (!variableNames.has(varName) && !builtInNames.has(varName)) {
          missingVars.push({ tagName: tag.name, varName });
        }
      }
    });
  });

  return {
    id: 'datalayer-dependencies',
    severity: 'warning',
    passed: missingVars.length === 0,
    title: 'DataLayer Variable Dependencies',
    description:
      missingVars.length > 0
        ? `${missingVars.length} tag parameter(s) reference variables that don't exist in the container`
        : 'All referenced variables exist in the container',
    details: { missingVars },
    recommendation: 'Create missing variables or remove references',
  };
};

// ── WARNING CHECK #10 ───────────────────────────────────────
export const checkTriggerConflicts = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const tags = container.containerVersion.tag || [];
  const triggers = container.containerVersion.trigger || [];

  const triggerMap = new Map(triggers.map(t => [t.triggerId, t]));

  const conflictingTags: Array<{ tagName: string; triggerTypes: string[] }> = [];

  tags.forEach(tag => {
    const firingIds = tag.firingTriggerId || [];
    if (firingIds.length <= 1) return;

    const triggerTypes = firingIds
      .map(id => triggerMap.get(id)?.type)
      .filter((t): t is string => t !== undefined);

    const uniqueTypes = new Set(triggerTypes);
    if (uniqueTypes.size > 1) {
      conflictingTags.push({
        tagName: tag.name,
        triggerTypes: Array.from(uniqueTypes),
      });
    }
  });

  return {
    id: 'trigger-conflicts',
    severity: 'warning',
    passed: conflictingTags.length === 0,
    title: 'Trigger Conflicts',
    description:
      conflictingTags.length > 0
        ? `${conflictingTags.length} tag(s) have conflicting trigger types`
        : 'No trigger conflicts detected',
    details: { conflictingTags },
    recommendation: 'Review trigger logic to prevent tags firing multiple times',
  };
};

// ── INFO CHECK #11 ──────────────────────────────────────────
export const checkDebugTags = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const tags = container.containerVersion.tag || [];
  const triggers = container.containerVersion.trigger || [];

  const debugKeywords = ['debug', 'test', 'preview', 'staging', 'dev'];

  // Find pageview/all-pages trigger IDs
  const allPagesTriggerIds = new Set(
    triggers
      .filter(t => t.type === 'pageview')
      .map(t => t.triggerId)
  );

  const debugTags = tags.filter(tag => {
    const nameLC = tag.name.toLowerCase();
    const isDebugName = debugKeywords.some(kw => nameLC.includes(kw));
    const firesOnAllPages = tag.firingTriggerId?.some(id =>
      allPagesTriggerIds.has(id)
    );
    return isDebugName && firesOnAllPages;
  });

  return {
    id: 'debug-tags-in-production',
    severity: 'info',
    passed: debugTags.length === 0,
    title: 'Preview/Debug Tags in Production',
    description:
      debugTags.length > 0
        ? `Found ${debugTags.length} possible test/debug tag(s) firing on All Pages`
        : 'No debug/test tags found in production',
    details: { debugTags: debugTags.map(t => t.name) },
    recommendation: 'Remove or disable test/debug tags before publishing',
  };
};

// ── INFO CHECK #12 ──────────────────────────────────────────
export const checkUnusedVariables = (
  container: GTMContainer,
  _context?: AuditContext
): AuditCheck => {
  const tags = container.containerVersion.tag || [];
  const triggers = container.containerVersion.trigger || [];
  const variables = container.containerVersion.variable || [];

  if (variables.length === 0) {
    return {
      id: 'unused-variables',
      severity: 'info',
      passed: true,
      title: 'Unused Variables',
      description: 'No user-defined variables in container',
      recommendation: 'No action needed',
    };
  }

  // Build a single string of all tag/trigger parameter values for searching
  const allRefs = JSON.stringify(tags) + JSON.stringify(triggers);

  const unusedVariables = variables.filter(v => {
    const ref = `{{${v.name}}}`;
    return !allRefs.includes(ref);
  });

  return {
    id: 'unused-variables',
    severity: 'info',
    passed: unusedVariables.length === 0,
    title: 'Unused Variables',
    description:
      unusedVariables.length > 0
        ? `${unusedVariables.length} unused variable(s) found`
        : 'All variables are referenced by tags or triggers',
    details: { unusedVariables: unusedVariables.map(v => v.name) },
    recommendation: 'Remove unused variables for easier container management',
  };
};

// Export all checks as an array
export const allGTMChecks = [
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
];
