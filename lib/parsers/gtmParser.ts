import { GTMContainer, GTMTag } from '../types';

export const parseGTMJSON = (fileContent: string): GTMContainer => {
  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(fileContent);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format. Please upload a valid GTM container export.');
    }
    throw error;
  }

  if (!parsed.containerVersion) {
    throw new Error('Invalid GTM container: missing containerVersion');
  }

  const cv = parsed.containerVersion as Record<string, unknown>;

  const container: GTMContainer = {
    containerVersion: {
      tag: Array.isArray(cv.tag) ? cv.tag : [],
      trigger: Array.isArray(cv.trigger) ? cv.trigger : [],
      variable: Array.isArray(cv.variable) ? cv.variable : [],
      builtInVariable: Array.isArray(cv.builtInVariable) ? cv.builtInVariable : [],
      ...cv,
    },
  };

  // Ensure arrays override spread values
  container.containerVersion.tag = Array.isArray(cv.tag) ? cv.tag : [];
  container.containerVersion.trigger = Array.isArray(cv.trigger) ? cv.trigger : [];
  container.containerVersion.variable = Array.isArray(cv.variable) ? cv.variable : [];

  return container;
};

export const getTagsByType = (container: GTMContainer, type: string): GTMTag[] => {
  return container.containerVersion.tag?.filter(tag => tag.type === type) || [];
};

export const getGoogleAdsTags = (container: GTMContainer): GTMTag[] => {
  const adsTypes = ['awct', 'gclidw', 'gaawe'];
  return container.containerVersion.tag?.filter(tag =>
    adsTypes.includes(tag.type)
  ) || [];
};
