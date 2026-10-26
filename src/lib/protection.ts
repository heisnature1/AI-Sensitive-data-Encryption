export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type DetectionCategory = 'Secrets' | 'PII' | 'Financial';
export type MaskStyle = 'token' | 'redact' | 'hash';
export type ProtectionMode = 'mask' | 'block';

export interface Detector {
  id: string;
  label: string;
  code: string;
  description: string;
  category: DetectionCategory;
  severity: Severity;
  pattern: RegExp;
  baseConfidence: number;
  captureGroup?: number;
  validate?: (value: string) => boolean;
  validationLabel: string;
}

export interface Finding {
  id: string;
  detectorId: string;
  label: string;
  code: string;
  category: DetectionCategory;
  severity: Severity;
  confidence: number;
  value: string;
  start: number;
  end: number;
  validationLabel: string;
}

export interface ProtectionResult {
  text: string;
  findings: Finding[];
  changed: boolean;
  risk: Severity | 'none';
}

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function passesLuhn(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

function hasSecretEntropy(value: string): boolean {
  if (value.length < 12 || /^(.)\1+$/.test(value)) return false;
  const counts = new Map<string, number>();
  for (const char of value) counts.set(char, (counts.get(char) ?? 0) + 1);
  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy >= 3.2;
}

export const DETECTORS: Detector[] = [
  {
    id: 'private-key',
    label: 'Private key',
    code: 'PRIVATE_KEY',
    description: 'RSA, EC, DSA, and OpenSSH private key blocks.',
    category: 'Secrets',
    severity: 'critical',
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    baseConfidence: 1,
    validationLabel: 'Complete key block',
  },
  {
    id: 'openai-key',
    label: 'OpenAI API key',
    code: 'API_KEY',
    description: 'Standard, project, and service-account API key formats.',
    category: 'Secrets',
    severity: 'critical',
    pattern: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/g,
    baseConfidence: 0.99,
    validationLabel: 'Known prefix + length',
  },
  {
    id: 'aws-key',
    label: 'AWS access key',
    code: 'AWS_KEY',
    description: 'AWS access key IDs, including temporary credentials.',
    category: 'Secrets',
    severity: 'critical',
    pattern: /\b(?:AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}\b/g,
    baseConfidence: 0.98,
    validationLabel: 'Known prefix + length',
  },
  {
    id: 'github-token',
    label: 'GitHub token',
    code: 'GITHUB_TOKEN',
    description: 'Personal, OAuth, refresh, and fine-grained GitHub tokens.',
    category: 'Secrets',
    severity: 'critical',
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{30,255})\b/g,
    baseConfidence: 0.99,
    validationLabel: 'Known prefix + length',
  },
  {
    id: 'jwt',
    label: 'JSON Web Token',
    code: 'JWT',
    description: 'Signed JWTs found in prompts, headers, or config snippets.',
    category: 'Secrets',
    severity: 'critical',
    pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
    baseConfidence: 0.97,
    validationLabel: 'Three-part token structure',
  },
  {
    id: 'connection-string',
    label: 'Connection string',
    code: 'CONNECTION',
    description: 'Database and cache URLs containing embedded credentials.',
    category: 'Secrets',
    severity: 'critical',
    pattern: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s:@/]+:[^\s@/]+@[^\s]+/gi,
    baseConfidence: 0.98,
    validationLabel: 'Credential-bearing URI',
  },
  {
    id: 'generic-secret',
    label: 'Password or secret',
    code: 'SECRET',
    description: 'High-entropy values assigned to password, token, or secret fields.',
    category: 'Secrets',
    severity: 'critical',
    pattern: /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|aws[_-]?secret[_-]?access[_-]?key|secret[_-]?access[_-]?key|aws[_-]?session[_-]?token|private[_-]?token|secret|password|passwd|pwd)\s*[:=]\s*["']?([A-Za-z0-9_\-\/+.]{12,})["']?/gi,
    baseConfidence: 0.88,
    captureGroup: 1,
    validate: hasSecretEntropy,
    validationLabel: 'Context label + entropy',
  },
  {
    id: 'credit-card',
    label: 'Payment card',
    code: 'PAYMENT_CARD',
    description: 'Thirteen to nineteen digit card numbers validated with Luhn.',
    category: 'Financial',
    severity: 'critical',
    pattern: /\b(?:\d[ -]?){12,18}\d\b/g,
    baseConfidence: 0.96,
    validate: passesLuhn,
    validationLabel: 'Luhn validated',
  },
  {
    id: 'ssn',
    label: 'US Social Security number',
    code: 'SSN',
    description: 'Formatted SSNs with invalid area and group ranges excluded.',
    category: 'PII',
    severity: 'high',
    pattern: /\b(?!000|666|9\d\d)\d{3}[- ](?!00)\d{2}[- ](?!0000)\d{4}\b/g,
    baseConfidence: 0.9,
    validationLabel: 'Format + range checks',
  },
  {
    id: 'person-name',
    label: 'Person name',
    code: 'PERSON',
    description: 'Context-labeled names and linked first-name, surname, or full-name references.',
    category: 'PII',
    severity: 'medium',
    pattern: /\b(?:[Cc]ustomer|[Cc]lient|[Pp]atient|[Ee]mployee|[Ff]ull [Nn]ame|[Nn]ame)\s*[:=]\s*([A-Z][a-z]{1,30}(?:[ \t]+[A-Z][a-z]{1,30}){1,3})\b/g,
    baseConfidence: 0.82,
    captureGroup: 1,
    validationLabel: 'Nearby context label',
  },
  {
    id: 'email',
    label: 'Email address',
    code: 'EMAIL',
    description: 'Personal and work email addresses in prompt text.',
    category: 'PII',
    severity: 'medium',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    baseConfidence: 0.96,
    validationLabel: 'Address structure',
  },
  {
    id: 'phone',
    label: 'Phone number',
    code: 'PHONE',
    description: 'Formatted North American phone numbers with optional country code.',
    category: 'PII',
    severity: 'medium',
    pattern: /(?<!\w)(?:\+?\d{1,3}[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]\d{3}[ .-]\d{4}(?!\w)/g,
    baseConfidence: 0.86,
    validationLabel: 'Context-aware number format',
  },
];

export const DEFAULT_POLICIES: Record<string, boolean> = Object.fromEntries(
  DETECTORS.map((detector) => [detector.id, true]),
);

function contextBoost(text: string, start: number, end: number): number {
  const context = text.slice(Math.max(0, start - 48), Math.min(text.length, end + 32)).toLowerCase();
  const sensitiveContext = [
    'customer', 'client', 'patient', 'employee', 'secret', 'credential', 'password',
    'private', 'confidential', 'payment', 'card', 'ssn', 'token', 'production', 'internal',
  ];
  return sensitiveContext.some((term) => context.includes(term)) ? 0.02 : 0;
}

export function scanText(text: string, enabledPolicies: Record<string, boolean> = DEFAULT_POLICIES): Finding[] {
  if (!text) return [];
  const findings: Finding[] = [];

  for (const detector of DETECTORS) {
    if (enabledPolicies[detector.id] === false) continue;
    const pattern = new RegExp(detector.pattern.source, detector.pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const value = detector.captureGroup ? match[detector.captureGroup] : match[0];
      if (!value) continue;
      const relativeStart = detector.captureGroup ? match[0].indexOf(value) : 0;
      const start = match.index + Math.max(0, relativeStart);
      const end = start + value.length;
      if (detector.validate && !detector.validate(value)) continue;

      // Prefer earlier, more specific detectors when patterns cover the same characters.
      const overlaps = findings.some((finding) => start < finding.end && end > finding.start);
      if (overlaps) continue;

      findings.push({
        id: `${detector.id}:${start}:${end}`,
        detectorId: detector.id,
        label: detector.label,
        code: detector.code,
        category: detector.category,
        severity: detector.severity,
        confidence: Math.min(1, detector.baseConfidence + contextBoost(text, start, end)),
        value,
        start,
        end,
        validationLabel: detector.validationLabel,
      });

      if (match[0].length === 0) pattern.lastIndex += 1;
    }
  }

  addLinkedNameReferences(text, findings);
  return findings.sort((a, b) => a.start - b.start || b.end - a.end);
}

// Lightweight co-reference heuristic: once a full name is explicitly labeled, later
// references to that identity are sensitive too, even when only a first name is used.
function addLinkedNameReferences(text: string, findings: Finding[]): void {
  const labeledNames = findings.filter((finding) => finding.detectorId === 'person-name' && finding.value.includes(' '));
  for (const labeledName of labeledNames) {
    const parts = labeledName.value.split(/[ \t]+/);
    const references = [labeledName.value, parts[0], parts.at(-1)].filter((value): value is string => Boolean(value && value.length > 1));
    for (const reference of new Set(references)) {
      const pattern = new RegExp(`\\b${reference}\\b`, 'g');
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        const overlaps = findings.some((finding) => start < finding.end && end > finding.start);
        if (!overlaps) {
          findings.push({
            ...labeledName,
            id: `person-name-reference:${start}:${end}`,
            value: match[0],
            start,
            end,
            confidence: Math.max(0.76, labeledName.confidence - 0.04),
            validationLabel: 'Linked name reference',
          });
        }
      }
    }
  }
}

async function sha256(value: string): Promise<string | null> {
  try {
    if (!globalThis.crypto?.subtle) return null;
    const input = new TextEncoder().encode(value);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', input);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

export async function maskFindings(
  text: string,
  findings: Finding[],
  style: MaskStyle = 'token',
): Promise<string> {
  if (findings.length === 0) return text;
  const digests = new Map<string, string | null>();
  await Promise.all(
    [...new Set(findings.map((finding) => finding.value))].map(async (value) => {
      digests.set(value, await sha256(value));
    }),
  );

  let result = text;
  const descending = [...findings].sort((a, b) => b.start - a.start || b.end - a.end);
  for (const finding of descending) {
    const digest = digests.get(finding.value);
    // If Web Crypto is unavailable, fail closed to full redaction rather than weak hashing.
    const replacement = !digest
      ? `[REDACTED_${finding.code}]`
      : style === 'redact'
        ? `[REDACTED_${finding.code}]`
        : style === 'hash'
          ? `[${finding.code}_SHA256:${digest.slice(0, 16)}]`
          : `[${finding.code}_${digest.slice(0, 6).toUpperCase()}]`;
    result = `${result.slice(0, finding.start)}${replacement}${result.slice(finding.end)}`;
  }
  return result;
}

export async function protectText(
  text: string,
  enabledPolicies: Record<string, boolean> = DEFAULT_POLICIES,
  style: MaskStyle = 'token',
): Promise<ProtectionResult> {
  const findings = scanText(text, enabledPolicies);
  const protectedText = await maskFindings(text, findings, style);
  const risk = findings.reduce<Severity | 'none'>((highest, finding) => {
    if (highest === 'none' || SEVERITY_WEIGHT[finding.severity] > SEVERITY_WEIGHT[highest]) {
      return finding.severity;
    }
    return highest;
  }, 'none');
  return { text: protectedText, findings, changed: protectedText !== text, risk };
}

export function previewValue(value: string): string {
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}${'•'.repeat(Math.min(8, value.length - 8))}${value.slice(-4)}`;
}
