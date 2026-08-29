import { CsvParseSummary, RecipientRow, RecipientInput, RecipientStatus } from '../types/campaign.types.js';

export const MAX_CSV_RECIPIENTS = 5000;
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Splits CSV lines considering quotes and commas
 */
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim().replace(/^"(.*)"$/, '$1'));
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim().replace(/^"(.*)"$/, '$1'));
  return values;
}

/**
 * Parses and validates raw CSV text into a structured, deduplicated recipient summary
 */
export function parseAndValidateCsv(csvContent: string): CsvParseSummary {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      totalRows: 0,
      validCount: 0,
      invalidCount: 0,
      duplicateCount: 0,
      rows: [],
      validRecipients: []
    };
  }

  // 1. Identify Headers
  const headerLine = lines[0]!;
  const rawHeaders = parseCsvLine(headerLine).map((h) => h.toLowerCase().trim().replace(/['"]+/g, ''));

  let emailColIdx = -1;
  let nameColIdx = -1;

  const emailAliases = ['email', 'recipient_email', 'recipient', 'to', 'mail', 'email_address', 'e-mail'];
  const nameAliases = ['name', 'first_name', 'fullname', 'recipient_name', 'full_name', 'contact_name'];

  for (let i = 0; i < rawHeaders.length; i++) {
    const header = rawHeaders[i]!;
    if (emailColIdx === -1 && emailAliases.includes(header)) {
      emailColIdx = i;
    }
    if (nameColIdx === -1 && nameAliases.includes(header)) {
      nameColIdx = i;
    }
  }

  // Fallback: If no recognized header found, assume col 0 is email, col 1 is name
  let dataStartIndex = 1;
  if (emailColIdx === -1) {
    // Check if first row is already data
    if (EMAIL_REGEX.test(rawHeaders[0] || '')) {
      emailColIdx = 0;
      nameColIdx = rawHeaders.length > 1 ? 1 : -1;
      dataStartIndex = 0;
    } else {
      emailColIdx = 0;
      nameColIdx = rawHeaders.length > 1 ? 1 : -1;
    }
  }

  const rows: RecipientRow[] = [];
  const validRecipients: RecipientInput[] = [];
  const seenEmails = new Set<string>();

  let validCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  const dataLines = lines.slice(dataStartIndex, dataStartIndex + MAX_CSV_RECIPIENTS);

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i]!;
    const cols = parseCsvLine(line);
    const rawEmail = (cols[emailColIdx] || '').trim();
    const rawName = nameColIdx !== -1 && cols[nameColIdx] ? cols[nameColIdx]!.trim() : '';

    let status: RecipientStatus = 'VALID';
    let errorReason: string | undefined;

    if (!rawEmail) {
      status = 'MISSING_EMAIL';
      errorReason = 'Email address is missing';
      invalidCount++;
    } else if (!EMAIL_REGEX.test(rawEmail)) {
      status = 'INVALID_EMAIL';
      errorReason = 'Invalid email syntax';
      invalidCount++;
    } else {
      const normalizedEmail = rawEmail.toLowerCase();
      if (seenEmails.has(normalizedEmail)) {
        status = 'DUPLICATE';
        errorReason = 'Duplicate email in file';
        duplicateCount++;
      } else {
        seenEmails.add(normalizedEmail);
        validCount++;
        validRecipients.push({
          email: normalizedEmail,
          name: rawName || null
        });
      }
    }

    rows.push({
      rowNumber: i + 1,
      email: rawEmail,
      name: rawName,
      status,
      errorReason
    });
  }

  return {
    totalRows: dataLines.length,
    validCount,
    invalidCount,
    duplicateCount,
    rows,
    validRecipients
  };
}
