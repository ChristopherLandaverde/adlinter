import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolWorkspace } from '@/components/ToolWorkspace';
import { getToolBySlug } from '@/lib/tools';
import { parseAdsCSV } from '@/lib/parsers/adsParser';
import { parseAdsReportCSV } from '@/lib/parsers/adsReportParser';
import { parseGTMJSON } from '@/lib/parsers/gtmParser';
import { parseMetaPixelCSV } from '@/lib/parsers/metaPixelParser';
import { parseTikTokPixelCSV } from '@/lib/parsers/tiktokPixelParser';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/lib/parsers/gtmParser', () => ({
  parseGTMJSON: jest.fn(),
}));

jest.mock('@/lib/parsers/adsParser', () => ({
  parseAdsCSV: jest.fn(),
}));

jest.mock('@/lib/parsers/adsReportParser', () => ({
  parseAdsReportCSV: jest.fn(),
}));

jest.mock('@/lib/parsers/metaPixelParser', () => ({
  parseMetaPixelCSV: jest.fn(),
}));

jest.mock('@/lib/parsers/tiktokPixelParser', () => ({
  parseTikTokPixelCSV: jest.fn(),
}));

const mockParseGTMJSON = jest.mocked(parseGTMJSON);
const mockParseAdsCSV = jest.mocked(parseAdsCSV);
const mockParseAdsReportCSV = jest.mocked(parseAdsReportCSV);
const mockParseMetaPixelCSV = jest.mocked(parseMetaPixelCSV);
const mockParseTikTokPixelCSV = jest.mocked(parseTikTokPixelCSV);

function fileWithText(name: string, text: string, type = 'text/plain') {
  const file = new File([text], name, { type });
  Object.defineProperty(file, 'text', {
    value: jest.fn().mockResolvedValue(text),
  });
  return file;
}

function renderTool(slug: string) {
  const tool = getToolBySlug(slug);
  if (!tool) throw new Error(`Missing test tool: ${slug}`);
  return render(<ToolWorkspace tool={tool} />);
}

describe('ToolWorkspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    mockParseGTMJSON.mockReturnValue({ containerVersion: { tag: [] } });
    mockParseAdsCSV.mockReturnValue({ conversions: [] });
    mockParseAdsReportCSV.mockReturnValue({ conversions: [] });
    mockParseMetaPixelCSV.mockReturnValue({ events: [] });
    mockParseTikTokPixelCSV.mockReturnValue({ events: [] });
  });

  it('moves a single-file tool from upload UI to the context step after parsing a file', async () => {
    const user = userEvent.setup();
    const file = fileWithText('container.json', '{"containerVersion":{}}', 'application/json');
    const { container } = renderTool('gtm-auditor');

    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, file);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Refine your audit' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Skip — use defaults' })).toBeInTheDocument();
    expect(mockParseGTMJSON).toHaveBeenCalledWith('{"containerVersion":{}}');
  });

  it('stores parsed single-file data in sessionStorage before showing context', async () => {
    const user = userEvent.setup();
    const parsed = { containerVersion: { tag: [{ name: 'Purchase' }] } } as unknown as ReturnType<typeof parseGTMJSON>;
    mockParseGTMJSON.mockReturnValue(parsed);
    const file = fileWithText('container.json', '{}', 'application/json');
    const { container } = renderTool('gtm-auditor');

    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, file);

    await waitFor(() => {
      expect(JSON.parse(sessionStorage.getItem('gtmData') ?? '{}')).toEqual(parsed);
    });
  });

  it('keeps a multi-file audit disabled after only one required file is uploaded', async () => {
    const user = userEvent.setup();
    const { container } = renderTool('full-audit');
    const inputs = container.querySelectorAll('input[type="file"]');

    await user.upload(inputs[0] as HTMLInputElement, fileWithText('container.json', '{}'));

    const runButton = screen.getByRole('button', { name: 'Run Full Audit' });
    await waitFor(() => expect(screen.getByText('container.json')).toBeInTheDocument());
    expect(runButton).toBeDisabled();
    expect(screen.getByText('Upload required files to continue')).toBeInTheDocument();
  });

  it('enables a multi-file audit when all required uploads are complete', async () => {
    const user = userEvent.setup();
    const { container } = renderTool('full-audit');
    const inputs = container.querySelectorAll('input[type="file"]');

    await user.upload(inputs[0] as HTMLInputElement, fileWithText('container.json', '{}'));
    await user.upload(inputs[1] as HTMLInputElement, fileWithText('ads.csv', 'name,status'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Run Full Audit' })).toBeEnabled();
    });
    expect(screen.getByText('2 of 3 files uploaded — ready to audit')).toBeInTheDocument();
  });

  it('tracks optional uploads without requiring them for the run button', async () => {
    const user = userEvent.setup();
    const { container } = renderTool('full-audit');
    const inputs = container.querySelectorAll('input[type="file"]');

    await user.upload(inputs[0] as HTMLInputElement, fileWithText('container.json', '{}'));
    await user.upload(inputs[1] as HTMLInputElement, fileWithText('ads.csv', 'name,status'));
    await user.upload(inputs[2] as HTMLInputElement, fileWithText('report.csv', 'campaign,conversions'));

    await waitFor(() => {
      expect(screen.getByText('3 of 3 files uploaded — ready to audit')).toBeInTheDocument();
    });
    expect(JSON.parse(sessionStorage.getItem('reportData') ?? '{}')).toEqual({ conversions: [] });
  });

  it('moves a complete multi-file audit to the context step when Run Audit is clicked', async () => {
    const user = userEvent.setup();
    const { container } = renderTool('full-audit');
    const inputs = container.querySelectorAll('input[type="file"]');

    await user.upload(inputs[0] as HTMLInputElement, fileWithText('container.json', '{}'));
    await user.upload(inputs[1] as HTMLInputElement, fileWithText('ads.csv', 'name,status'));
    await user.click(await screen.findByRole('button', { name: 'Run Full Audit' }));

    expect(screen.getByRole('heading', { name: 'Refine your audit' })).toBeInTheDocument();
  });

  it('clears auditContext and navigates to results when context is skipped', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem('auditContext', JSON.stringify({ businessModel: 'saas' }));
    const { container } = renderTool('gtm-auditor');

    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, fileWithText('container.json', '{}'));
    await user.click(await screen.findByRole('button', { name: 'Skip — use defaults' }));

    expect(sessionStorage.getItem('auditContext')).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/audit');
  });

  it('stores selected audit context and navigates to results on submit', async () => {
    const user = userEvent.setup();
    const { container } = renderTool('gtm-auditor');

    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, fileWithText('container.json', '{}'));
    await user.selectOptions(await screen.findByLabelText("What's your business model?"), 'ecommerce');
    await user.selectOptions(screen.getByLabelText('How do you track conversion values?'), 'dynamic');
    await user.selectOptions(screen.getByLabelText('How long is your typical sales cycle?'), 'short');
    await user.click(screen.getByRole('button', { name: 'Continue to results' }));

    expect(JSON.parse(sessionStorage.getItem('auditContext') ?? '{}')).toEqual({
      businessModel: 'ecommerce',
      valueStrategy: 'dynamic',
      salesCycle: 'short',
    });
    expect(mockPush).toHaveBeenCalledWith('/audit');
  });

  it('shows parser errors in the drop zone without transitioning to context', async () => {
    const user = userEvent.setup();
    mockParseGTMJSON.mockImplementation(() => {
      throw new Error('Invalid GTM export');
    });
    const { container } = renderTool('gtm-auditor');

    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, fileWithText('bad.json', 'not json'));

    expect(await screen.findByText('Invalid GTM export')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Refine your audit' })).not.toBeInTheDocument();
    expect(sessionStorage.getItem('gtmData')).toBeNull();
  });

  it('keeps the multi-file upload UI when Run Audit is clicked before required files are ready', async () => {
    const user = userEvent.setup();
    renderTool('full-audit');

    await user.click(screen.getByRole('button', { name: 'Run Full Audit' }));

    expect(screen.queryByRole('heading', { name: 'Refine your audit' })).not.toBeInTheDocument();
    expect(screen.getByText('Upload required files to continue')).toBeInTheDocument();
  });

  it('stores both required multi-file payloads in their sessionStorage slots', async () => {
    const user = userEvent.setup();
    const { container } = renderTool('full-audit');
    const inputs = container.querySelectorAll('input[type="file"]');

    await user.upload(inputs[0] as HTMLInputElement, fileWithText('container.json', '{"containerVersion":{}}'));
    await user.upload(inputs[1] as HTMLInputElement, fileWithText('ads.csv', 'name,status'));

    await waitFor(() => expect(sessionStorage.getItem('adsData')).not.toBeNull());
    expect(JSON.parse(sessionStorage.getItem('gtmData') ?? '{}')).toEqual({ containerVersion: { tag: [] } });
    expect(JSON.parse(sessionStorage.getItem('adsData') ?? '{}')).toEqual({ conversions: [] });
    expect(mockParseAdsCSV).toHaveBeenCalledWith('name,status');
  });

  it('uses the Google Ads parser and storage key for the Google Ads single-file tool', async () => {
    const user = userEvent.setup();
    const parsed = { conversions: [{ name: 'Lead' }] } as unknown as ReturnType<typeof parseAdsCSV>;
    mockParseAdsCSV.mockReturnValue(parsed);
    const { container } = renderTool('google-ads-linter');

    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, fileWithText('ads.csv', 'name,status'));

    await screen.findByRole('heading', { name: 'Refine your audit' });
    expect(mockParseAdsCSV).toHaveBeenCalledWith('name,status');
    expect(JSON.parse(sessionStorage.getItem('adsData') ?? '{}')).toEqual(parsed);
  });

  it('uses the report parser and storage key for the performance analyzer', async () => {
    const user = userEvent.setup();
    const parsed = { conversions: [{ name: 'Purchase', conversions: 5 }] } as unknown as ReturnType<typeof parseAdsReportCSV>;
    mockParseAdsReportCSV.mockReturnValue(parsed);
    const { container } = renderTool('performance-analyzer');

    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, fileWithText('report.csv', 'campaign,conversions'));

    await screen.findByRole('heading', { name: 'Refine your audit' });
    expect(mockParseAdsReportCSV).toHaveBeenCalledWith('campaign,conversions');
    expect(JSON.parse(sessionStorage.getItem('reportData') ?? '{}')).toEqual(parsed);
  });

  it('uses the Meta parser and storage key for the Meta auditor', async () => {
    const user = userEvent.setup();
    const parsed = { pixelName: 'Main Pixel', events: [] };
    mockParseMetaPixelCSV.mockReturnValue(parsed);
    const { container } = renderTool('meta-auditor');

    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, fileWithText('meta.csv', 'event,status'));

    await screen.findByRole('heading', { name: 'Refine your audit' });
    expect(mockParseMetaPixelCSV).toHaveBeenCalledWith('event,status');
    expect(JSON.parse(sessionStorage.getItem('metaData') ?? '{}')).toEqual(parsed);
  });

  it('uses the TikTok parser and storage key for the TikTok auditor', async () => {
    const user = userEvent.setup();
    const parsed = { pixelName: 'TikTok Pixel', events: [] };
    mockParseTikTokPixelCSV.mockReturnValue(parsed);
    const { container } = renderTool('tiktok-auditor');

    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, fileWithText('tiktok.csv', 'event,status'));

    await screen.findByRole('heading', { name: 'Refine your audit' });
    expect(mockParseTikTokPixelCSV).toHaveBeenCalledWith('event,status');
    expect(JSON.parse(sessionStorage.getItem('tiktokData') ?? '{}')).toEqual(parsed);
  });

  it('can recover from a parse error by uploading a valid replacement file', async () => {
    const user = userEvent.setup();
    mockParseGTMJSON
      .mockImplementationOnce(() => {
        throw new Error('Invalid GTM export');
      })
      .mockReturnValueOnce({ containerVersion: { trigger: [] } });
    const { container } = renderTool('gtm-auditor');
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, fileWithText('bad.json', 'bad'));
    expect(await screen.findByText('Invalid GTM export')).toBeInTheDocument();

    await user.upload(input, fileWithText('container.json', '{}'));

    expect(await screen.findByRole('heading', { name: 'Refine your audit' })).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem('gtmData') ?? '{}')).toEqual({ containerVersion: { trigger: [] } });
  });

  it('prefills the context step from saved localStorage context', async () => {
    const user = userEvent.setup();
    localStorage.setItem('adlint:auditContext', JSON.stringify({ businessModel: 'saas', needsConsent: 'no' }));
    const { container } = renderTool('gtm-auditor');

    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, fileWithText('container.json', '{}'));

    await waitFor(() => {
      expect(screen.getByLabelText("What's your business model?")).toHaveValue('saas');
    });
    expect(screen.getByLabelText('Do you need to handle consent (GDPR/cookie banners)?')).toHaveValue('no');
  });
});
