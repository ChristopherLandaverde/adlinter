// adlint-mcp: AdLint's engine as read-only MCP tools.
//
// Every tool calls the same modules as the `adlint` CLI: auditFiles() and
// auditLive() from ../run (parsers → runAudit → buildReport), the check
// registry and the explainers. Nothing here computes a finding, a count or a
// score. Live reads go through cli/live (credentials from this machine, the
// read-only request guard in cli/live/http.ts, the metadata-probe switch in
// cli/live/auth.ts). File paths are only ever read.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as z from 'zod';
import { getExplainerOrStub } from '../../lib/checks/explainers';
import { checkRegistry } from '../../lib/checks/registry.generated';
import { isCliError, UsageError } from '../errors';
import type { AdlintReport } from '../report';
import { auditFiles, auditLive, defaultDeps, type CliDeps, type FileInput } from '../run';

export const SERVER_NAME = 'adlint-mcp';
export const SERVER_VERSION = '0.1.0';

const SEVERITIES = ['critical', 'warning', 'info'] as const;
const PLATFORMS = ['gtm', 'ads', 'report', 'cross', 'meta', 'tiktok', 'linkedin', 'pinterest', 'twitter', 'snapchat'] as const;
// The sources the audit tools run (the same as the CLI): GTM, Google Ads and
// the cross-source checks between them.
const AUDITED_SOURCES = new Set<string>(['gtm', 'ads', 'cross']);

// ── Output schemas (the CLI's JSON report, schema version 1) ───────────────

const findingSchema = z.object({
  checkId: z.string(),
  severity: z.enum(SEVERITIES),
  source: z.enum(['gtm', 'ads', 'cross']),
  title: z.string(),
  evidence: z.object({
    observed: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
  fix: z.string(),
});

const reportShape = {
  schemaVersion: z.literal('1'),
  tool: z.literal('adlint'),
  source: z.looseObject({ mode: z.enum(['file', 'live']) }),
  summary: z.object({
    healthScore: z.number().nullable(),
    band: z.string().nullable(),
    checksRun: z.number(),
    checksPassed: z.number(),
    counts: z.object({ critical: z.number(), warning: z.number(), info: z.number(), passed: z.number() }),
  }),
  findings: z.array(findingSchema),
};

const checkEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  platform: z.enum(PLATFORMS),
  severity: z.enum(SEVERITIES),
  runByAuditTools: z.boolean(),
});

const listChecksShape = { count: z.number(), checks: z.array(checkEntrySchema) };

const explainShape = {
  id: z.string(),
  name: z.string(),
  platform: z.enum(PLATFORMS),
  severity: z.enum(SEVERITIES),
  status: z.enum(['full', 'stub']),
  summary: z.string(),
  directAnswer: z.string().optional(),
  why: z.string(),
  howToFix: z.string(),
  example: z.string().optional(),
  citationTemplate: z.string().optional(),
  references: z.array(z.object({ label: z.string(), url: z.string() })),
  relatedChecks: z.array(z.string()),
  lastUpdated: z.string().optional(),
};

// ── Results ─────────────────────────────────────────────────────────────────

function ok(data: object): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data as Record<string, unknown>,
  };
}

/** A tool error the model can read: { error: { kind, message } }. Never a credential. */
export function toolError(e: unknown): CallToolResult {
  const kind = isCliError(e) ? e.kind : 'refused';
  const message = e instanceof Error ? e.message : String(e);
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify({ error: { kind, message } }, null, 2) }],
  };
}

const reportResult = (report: AdlintReport) => ok(report);

// ── Server ──────────────────────────────────────────────────────────────────

export function createServer(deps: CliDeps = defaultDeps(process.env)): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  server.registerTool(
    'audit_export',
    {
      title: 'Audit GTM / Google Ads exports',
      description:
        'Read-only. Runs AdLint\'s GTM, Google Ads and cross-source checks on a GTM container export (JSON) and/or a Google Ads conversions download (CSV) and returns the same JSON report as `adlint audit` (schemaVersion 1): health score, counts and one finding per failed check with its evidence and fix. Give each input either as a local file path (only read, never written) or as its text. Makes no network requests. Every number comes from the engine; quote them, do not recompute them.',
      inputSchema: {
        gtmExportPath: z.string().min(1).optional().describe('Path to a GTM container export (.json) on this machine. Read only.'),
        gtmExportJson: z.string().min(1).optional().describe('The GTM container export JSON as text, instead of gtmExportPath.'),
        adsCsvPath: z.string().min(1).optional().describe('Path to a Google Ads conversions download (.csv) on this machine. Read only.'),
        adsCsv: z.string().min(1).optional().describe('The Google Ads conversions CSV as text, instead of adsCsvPath.'),
      },
      outputSchema: reportShape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ gtmExportPath, gtmExportJson, adsCsvPath, adsCsv }) => {
      try {
        if (gtmExportPath !== undefined && gtmExportJson !== undefined) {
          throw new UsageError('Give gtmExportPath or gtmExportJson, not both');
        }
        if (adsCsvPath !== undefined && adsCsv !== undefined) {
          throw new UsageError('Give adsCsvPath or adsCsv, not both');
        }
        const gtmExport: FileInput | undefined =
          gtmExportPath !== undefined
            ? { label: gtmExportPath, name: 'gtmExportPath' }
            : gtmExportJson !== undefined
              ? { label: '(inline gtmExportJson)', name: 'gtmExportJson', text: gtmExportJson }
              : undefined;
        const ads: FileInput | undefined =
          adsCsvPath !== undefined
            ? { label: adsCsvPath, name: 'adsCsvPath' }
            : adsCsv !== undefined
              ? { label: '(inline adsCsv)', name: 'adsCsv', text: adsCsv }
              : undefined;
        if (!gtmExport && !ads) {
          throw new UsageError('Nothing to audit: give gtmExportPath or gtmExportJson, and/or adsCsvPath or adsCsv');
        }
        return reportResult(await auditFiles({ gtmExport, adsCsv: ads }, deps));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    'audit_live_container',
    {
      title: 'Audit a live GTM container (and Google Ads account)',
      description:
        'Read-only. Reads the published (live) version of a GTM container from the Tag Manager API (tagmanager.readonly) and, if adsCustomerId is given, the account\'s Google Ads conversion actions (GoogleAdsService search only, never a mutate call), then runs the same checks as audit_export and returns the same JSON report. Uses credentials already on this machine (Application Default Credentials; GOOGLE_ADS_* environment variables for Google Ads); none are accepted as arguments. Calls only Google\'s APIs and token endpoints. Fixture-verified; not yet run against a real account.',
      inputSchema: {
        container: z
          .string()
          .min(1)
          .describe('GTM container path: accounts/<accountId>/containers/<containerId> (numeric IDs from the Tag Manager URL).'),
        adsCustomerId: z
          .string()
          .min(1)
          .optional()
          .describe('10-digit Google Ads customer ID, dashes allowed. Needs GOOGLE_ADS_DEVELOPER_TOKEN on this machine.'),
      },
      outputSchema: reportShape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ container, adsCustomerId }) => {
      try {
        const report = await auditLive({ gtmContainer: container, adsCustomer: adsCustomerId }, deps, {
          gtmContainer: 'container',
          adsCustomer: 'adsCustomerId',
        });
        return reportResult(report);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    'list_checks',
    {
      title: 'List AdLint checks',
      description:
        'Read-only. Lists the checks in AdLint\'s check registry (lib/checks/registry.generated.ts): ID, title, platform and default severity. runByAuditTools is true for the GTM, Google Ads and cross-source checks that audit_export and audit_live_container run. Filter by platform and/or severity.',
      inputSchema: {
        platform: z.enum(PLATFORMS).optional().describe('Registry source, e.g. gtm, ads, cross, report, meta.'),
        severity: z.enum(SEVERITIES).optional(),
      },
      outputSchema: listChecksShape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ platform, severity }) => {
      const checks = checkRegistry
        .filter(c => (!platform || c.source === platform) && (!severity || c.severity === severity))
        .map(c => ({
          id: c.id,
          title: c.title,
          platform: c.source,
          severity: c.severity,
          runByAuditTools: AUDITED_SOURCES.has(c.source),
        }));
      return ok({ count: checks.length, checks });
    }
  );

  server.registerTool(
    'explain_check',
    {
      title: 'Explain an AdLint check',
      description:
        'Read-only. Returns the explainer for one check ID (the content of its /checks/<id> page): what it means, why it matters, how to fix it, a citation paragraph for a client report and the platform documentation it cites. status "stub" means no full write-up exists yet.',
      inputSchema: {
        checkId: z.string().min(1).describe('A check ID from list_checks or a finding\'s checkId, e.g. no-primary-conversion.'),
      },
      outputSchema: explainShape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ checkId }) => {
      const ex = getExplainerOrStub(checkId);
      if (!ex) {
        return toolError(new UsageError(`Unknown checkId "${checkId}". Call list_checks for the valid IDs.`));
      }
      return ok({
        id: ex.id,
        name: ex.name,
        platform: ex.source,
        severity: ex.severity,
        status: ex.status ?? 'full',
        summary: ex.summary,
        ...(ex.directAnswer ? { directAnswer: ex.directAnswer } : {}),
        why: ex.why,
        howToFix: ex.howToFix,
        ...(ex.example ? { example: ex.example } : {}),
        ...(ex.citationTemplate ? { citationTemplate: ex.citationTemplate } : {}),
        references: ex.references ?? [],
        relatedChecks: ex.relatedChecks ?? [],
        ...(ex.lastUpdated ? { lastUpdated: ex.lastUpdated } : {}),
      });
    }
  );

  return server;
}
