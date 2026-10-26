import { describe, expect, it } from 'vitest';
import { maskFindings, protectText, scanText } from './protection';

const OPENAI_EXAMPLE = 'sk-proj-9f8e7d6c5b4a39281726hdKs';

describe('local sensitive-data detection', () => {
  it('detects contextual PII, secrets, and valid payment cards', () => {
    const text = `Customer: Maya Chen\nEmail: maya.chen@example.com\nPhone: +1 415 555 0198\nAPI key: ${OPENAI_EXAMPLE}\nCard: 4242 4242 4242 4242`;
    const ids = scanText(text).map((finding) => finding.detectorId);
    expect(ids).toEqual(expect.arrayContaining(['person-name', 'email', 'phone', 'openai-key', 'credit-card']));
  });

  it('uses Luhn validation to reject invalid card numbers', () => {
    expect(scanText('Card: 4242 4242 4242 4242').some((finding) => finding.detectorId === 'credit-card')).toBe(true);
    expect(scanText('Card: 4242 4242 4242 4241').some((finding) => finding.detectorId === 'credit-card')).toBe(false);
  });

  it('does not duplicate a specific API key with the generic secret rule', () => {
    const findings = scanText(`API key: ${OPENAI_EXAMPLE}`);
    expect(findings).toHaveLength(1);
    expect(findings[0].detectorId).toBe('openai-key');
  });

  it('detects high-entropy AWS secret assignments by their field label', () => {
    const findings = scanText('AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
    expect(findings.some((finding) => finding.detectorId === 'generic-secret')).toBe(true);
  });

  it('honors independently disabled policies', () => {
    const findings = scanText('Email maya.chen@example.com', { email: false });
    expect(findings.some((finding) => finding.detectorId === 'email')).toBe(false);
  });

  it('requires a context label for person-name detection', () => {
    expect(scanText('Customer: Maya Chen').some((finding) => finding.detectorId === 'person-name')).toBe(true);
    expect(scanText('Maya Chen wrote this ordinary sentence.').some((finding) => finding.detectorId === 'person-name')).toBe(false);
  });

  it('masks later first-name and full-name references linked to a labeled person', async () => {
    const text = 'Customer: Maya Chen\nMaya was charged twice. Ask Maya Chen for the receipt.';
    const result = await protectText(text);
    expect(result.findings.filter((finding) => finding.detectorId === 'person-name')).toHaveLength(3);
    expect(result.text).not.toContain('Maya');
    expect(result.text).not.toContain('Chen');
    expect(result.text).toContain('was charged twice.');
  });

  it('rejects invalid SSN area and group ranges', () => {
    expect(scanText('SSN: 000-45-6789')).toHaveLength(0);
    expect(scanText('SSN: 123-00-6789')).toHaveLength(0);
    expect(scanText('SSN: 123-45-6789').some((finding) => finding.detectorId === 'ssn')).toBe(true);
  });

  it('continues scanning large prompts instead of failing open', () => {
    const text = `${'safe context '.repeat(90_000)}Email: maya.chen@example.com`;
    expect(text.length).toBeGreaterThan(1_000_000);
    expect(scanText(text).some((finding) => finding.detectorId === 'email')).toBe(true);
  });

  it('leaves ordinary text unchanged', async () => {
    const text = 'Explain the difference between encryption and tokenization.';
    const result = await protectText(text);
    expect(result.text).toBe(text);
    expect(result.changed).toBe(false);
    expect(result.risk).toBe('none');
  });
});

describe('local masking and hashing', () => {
  it('removes original values while preserving safe surrounding context', async () => {
    const text = `Customer: Maya Chen\nEmail: maya.chen@example.com\nAPI key: ${OPENAI_EXAMPLE}\nPlease summarize this synthetic record.`;
    const result = await protectText(text);
    expect(result.text).not.toContain('Maya Chen');
    expect(result.text).not.toContain('maya.chen@example.com');
    expect(result.text).not.toContain(OPENAI_EXAMPLE);
    expect(result.text).toContain('Please summarize this synthetic record.');
    expect(result.text).toMatch(/\[EMAIL_[A-F0-9]{6}\]/);
    expect(result.changed).toBe(true);
    expect(result.risk).toBe('critical');
  });

  it('supports full redaction and deterministic SHA-256 placeholders', async () => {
    const text = 'Email: maya.chen@example.com';
    const redacted = await protectText(text, undefined, 'redact');
    const hashed = await protectText(text, undefined, 'hash');
    const hashedAgain = await protectText(text, undefined, 'hash');
    expect(redacted.text).toBe('Email: [REDACTED_EMAIL]');
    expect(hashed.text).toMatch(/\[EMAIL_SHA256:[a-f0-9]{16}\]/);
    expect(hashed.text).toBe(hashedAgain.text);
  });

  it('masks an entire private key block', async () => {
    const text = '-----BEGIN PRIVATE KEY-----\nabc123\nxyz789\n-----END PRIVATE KEY-----';
    const result = await protectText(text);
    expect(result.text).toMatch(/^\[PRIVATE_KEY_[A-F0-9]{6}\]$/);
    expect(result.text).not.toContain('abc123');
  });

  it('replaces credential-bearing database URLs', async () => {
    const findings = scanText('Database: postgresql://demo_user:demo_password@db.example.com:5432/support');
    expect(findings.some((finding) => finding.detectorId === 'connection-string')).toBe(true);
    const masked = await maskFindings('Database: postgresql://demo_user:demo_password@db.example.com:5432/support', findings);
    expect(masked).not.toContain('demo_password');
    expect(masked).toContain('Database:');
  });
});
