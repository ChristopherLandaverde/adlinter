import { AdsData } from '@/lib/types';
import {
  checkNamingConvention,
  checkSemanticDuplicates,
  checkAttributionModelChaos,
  checkWindowAsymmetry,
  checkCategoryNameMismatch,
  checkCountingCategoryMismatch,
  checkAllLastClick,
  checkDuplicateStaticValues,
} from '@/lib/checks/structureChecks';

describe('Structure Audit Checks', () => {
  describe('checkNamingConvention', () => {
    it('should pass when naming is consistent', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase_complete', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'add_to_cart', category: 'Add to cart', value: 0, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'form_submit', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkNamingConvention(adsData);
      expect(result.passed).toBe(true);
      expect(result.id).toBe('struct-naming-convention');
    });

    it('should flag inconsistent naming conventions', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase_complete', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'AddToCart', category: 'Add to cart', value: 0, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'form-submit', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'Page View Event', category: 'Page view', value: 0, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'lead123', category: 'Lead', value: 0, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkNamingConvention(adsData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('info');
    });
  });

  describe('checkSemanticDuplicates', () => {
    it('should detect semantic duplicates', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'order_complete', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'transaction', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkSemanticDuplicates(adsData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('warning');
      expect((result.details as { semanticDuplicates: Array<{ conversions: string[] }> }).semanticDuplicates[0].conversions.length).toBe(3);
    });

    it('should pass when no semantic duplicates exist', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'lead', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkSemanticDuplicates(adsData);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkAttributionModelChaos', () => {
    it('should flag deprecated attribution models', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'First click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'lead', category: 'Lead', value: 50, count: 'One', attributionModel: 'Linear', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkAttributionModelChaos(adsData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('warning');
    });

    it('should pass with consistent modern attribution models', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'Data-driven', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'lead', category: 'Lead', value: 50, count: 'One', attributionModel: 'Data-driven', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkAttributionModelChaos(adsData);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkWindowAsymmetry', () => {
    it('should flag view window longer than click window', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '7 days', viewWindow: '30 days', status: 'Enabled' },
        ],
      };

      const result = checkWindowAsymmetry(adsData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('warning');
    });

    it('should pass when windows are properly configured', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkWindowAsymmetry(adsData);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkCategoryNameMismatch', () => {
    it('should flag when name suggests purchase but category is lead', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase_complete', category: 'Lead', value: 100, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkCategoryNameMismatch(adsData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('info');
    });

    it('should pass when name and category align', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase_complete', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkCategoryNameMismatch(adsData);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkCountingCategoryMismatch', () => {
    it('should flag purchase with count "One"', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkCountingCategoryMismatch(adsData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('critical');
    });

    it('should flag lead with count "Every"', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'lead', category: 'Lead', value: 50, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkCountingCategoryMismatch(adsData);
      expect(result.passed).toBe(false);
    });

    it('should pass with correct counting methods', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'lead', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkCountingCategoryMismatch(adsData);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkAllLastClick', () => {
    it('should flag when all conversions use Last click', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'lead', category: 'Lead', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkAllLastClick(adsData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('info');
    });

    it('should pass with diversified attribution models', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'Data-driven', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'lead', category: 'Lead', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkAllLastClick(adsData);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkDuplicateStaticValues', () => {
    it('should flag multiple conversions with same value', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase_a', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'purchase_b', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'purchase_c', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkDuplicateStaticValues(adsData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('info');
    });

    it('should pass with unique values', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase_small', category: 'Purchase', value: 50, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'purchase_medium', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'purchase_large', category: 'Purchase', value: 200, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkDuplicateStaticValues(adsData);
      expect(result.passed).toBe(true);
    });
  });
});
