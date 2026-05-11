import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditContextPicker } from '@/components/AuditContextPicker';

const STORAGE_KEY = 'adlint:auditContext';

describe('AuditContextPicker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render all five dropdowns', () => {
    render(<AuditContextPicker onSubmit={jest.fn()} onSkip={jest.fn()} />);

    expect(screen.getByLabelText("What's your business model?")).toBeInTheDocument();
    expect(screen.getByLabelText('How do you track conversion values?')).toBeInTheDocument();
    expect(screen.getByLabelText('How do you count conversions?')).toBeInTheDocument();
    expect(screen.getByLabelText('How long is your typical sales cycle?')).toBeInTheDocument();
    expect(screen.getByLabelText('Do you need to handle consent (GDPR/cookie banners)?')).toBeInTheDocument();
  });

  it('should call onSkip when skipping defaults', async () => {
    const user = userEvent.setup();
    const onSkip = jest.fn();
    render(<AuditContextPicker onSubmit={jest.fn()} onSkip={onSkip} />);

    await user.click(screen.getByRole('button', { name: 'Skip — use defaults' }));

    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('should submit selected values and strip empty fields', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<AuditContextPicker onSubmit={onSubmit} onSkip={jest.fn()} />);

    await user.selectOptions(screen.getByLabelText("What's your business model?"), 'ecommerce');
    await user.selectOptions(screen.getByLabelText('How do you track conversion values?'), 'dynamic');
    await user.selectOptions(screen.getByLabelText('How do you count conversions?'), 'once');
    await user.selectOptions(screen.getByLabelText('How long is your typical sales cycle?'), 'short');
    await user.selectOptions(screen.getByLabelText('Do you need to handle consent (GDPR/cookie banners)?'), 'yes');
    await user.selectOptions(screen.getByLabelText('How do you count conversions?'), '');
    await user.click(screen.getByRole('button', { name: 'Continue to results' }));

    expect(onSubmit).toHaveBeenCalledWith({
      businessModel: 'ecommerce',
      valueStrategy: 'dynamic',
      salesCycle: 'short',
      needsConsent: 'yes',
    });
  });

  it('should prefill from localStorage when no initial prop is provided', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ businessModel: 'saas', valueStrategy: 'fixed', needsConsent: 'no' }),
    );

    render(<AuditContextPicker onSubmit={jest.fn()} onSkip={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText("What's your business model?")).toHaveValue('saas');
    });
    expect(screen.getByLabelText('How do you track conversion values?')).toHaveValue('fixed');
    expect(screen.getByLabelText('Do you need to handle consent (GDPR/cookie banners)?')).toHaveValue('no');
  });

  it('should prefer initial prop over localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ businessModel: 'saas' }));

    render(
      <AuditContextPicker
        initial={{ businessModel: 'agency', salesCycle: 'long' }}
        onSubmit={jest.fn()}
        onSkip={jest.fn()}
      />,
    );

    expect(screen.getByLabelText("What's your business model?")).toHaveValue('agency');
    expect(screen.getByLabelText('How long is your typical sales cycle?')).toHaveValue('long');
  });

  it('should persist the chosen context on submit', async () => {
    const user = userEvent.setup();
    render(<AuditContextPicker onSubmit={jest.fn()} onSkip={jest.fn()} />);

    await user.selectOptions(screen.getByLabelText("What's your business model?"), 'local-service');
    await user.selectOptions(screen.getByLabelText('How do you track conversion values?'), 'no-values');
    await user.click(screen.getByRole('button', { name: 'Continue to results' }));

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
      businessModel: 'local-service',
      valueStrategy: 'no-values',
    });
  });
});
