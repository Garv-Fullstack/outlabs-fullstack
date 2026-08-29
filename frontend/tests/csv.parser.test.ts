import { describe, it, expect } from 'vitest';
import { parseAndValidateCsv, MAX_CSV_RECIPIENTS } from '../src/utils/csv.parser.js';

describe('CSV Parser & Recipient Validation Tests', () => {
  it('Test 1: should parse valid CSV with standard Email and Name headers', () => {
    const csv = `Email,Name\nalice@example.com,Alice\nbob@example.com,Bob`;
    const result = parseAndValidateCsv(csv);

    expect(result.totalRows).toBe(2);
    expect(result.validCount).toBe(2);
    expect(result.invalidCount).toBe(0);
    expect(result.duplicateCount).toBe(0);
    expect(result.validRecipients).toEqual([
      { email: 'alice@example.com', name: 'Alice' },
      { email: 'bob@example.com', name: 'Bob' }
    ]);
  });

  it('Test 2 & 3: should autodetect case-insensitive and alternative headers (recipient_email, first_name)', () => {
    const csv = `RECIPIENT_EMAIL,FIRST_NAME\nlead@enterprise.com,Jane Lead`;
    const result = parseAndValidateCsv(csv);

    expect(result.validCount).toBe(1);
    expect(result.validRecipients[0]).toEqual({
      email: 'lead@enterprise.com',
      name: 'Jane Lead'
    });
  });

  it('Test 4: should identify missing email rows as MISSING_EMAIL', () => {
    const csv = `Email,Name\n,Nameless Contact\nvalid@domain.com,Valid User`;
    const result = parseAndValidateCsv(csv);

    expect(result.totalRows).toBe(2);
    expect(result.validCount).toBe(1);
    expect(result.invalidCount).toBe(1);
    expect(result.rows[0]?.status).toBe('MISSING_EMAIL');
  });

  it('Test 5: should reject malformed email syntax as INVALID_EMAIL', () => {
    const csv = `Email,Name\nnot-an-email-address,Bad User\ngood@domain.com,Good User`;
    const result = parseAndValidateCsv(csv);

    expect(result.totalRows).toBe(2);
    expect(result.validCount).toBe(1);
    expect(result.invalidCount).toBe(1);
    expect(result.rows[0]?.status).toBe('INVALID_EMAIL');
  });

  it('Test 6 & 7: should detect duplicates case-insensitively and preserve first valid occurrence', () => {
    const csv = `Email,Name\nsales@domain.com,First Sales\nSALES@DOMAIN.COM,Second Sales\nSales@domain.com,Third Sales`;
    const result = parseAndValidateCsv(csv);

    expect(result.totalRows).toBe(3);
    expect(result.validCount).toBe(1);
    expect(result.duplicateCount).toBe(2);
    expect(result.validRecipients.length).toBe(1);
    expect(result.validRecipients[0]?.name).toBe('First Sales');
    expect(result.rows[1]?.status).toBe('DUPLICATE');
    expect(result.rows[2]?.status).toBe('DUPLICATE');
  });

  it('Test 8: should enforce maximum 5,000 recipient cap safely', () => {
    const lines = ['Email,Name'];
    for (let i = 0; i < 5500; i++) {
      lines.push(`user_${i}@example.com,User ${i}`);
    }
    const csv = lines.join('\n');
    const result = parseAndValidateCsv(csv);

    expect(result.totalRows).toBe(MAX_CSV_RECIPIENTS);
    expect(result.validCount).toBe(MAX_CSV_RECIPIENTS);
  });

  it('Test 9: should handle empty CSV content safely', () => {
    const result = parseAndValidateCsv('');
    expect(result.totalRows).toBe(0);
    expect(result.validCount).toBe(0);
    expect(result.rows).toEqual([]);
    expect(result.validRecipients).toEqual([]);
  });

  it('Test 10: should parse raw CSV without headers if first line is valid email', () => {
    const csv = `direct@domain.com,Direct User\nanother@domain.com,Another User`;
    const result = parseAndValidateCsv(csv);

    expect(result.totalRows).toBe(2);
    expect(result.validCount).toBe(2);
    expect(result.validRecipients[0]?.email).toBe('direct@domain.com');
  });
});
