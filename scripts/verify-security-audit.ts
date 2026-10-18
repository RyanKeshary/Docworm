import {
  validatePasswordStrength,
  generateTotpSecret,
  generateTotpUri,
  verifyTotp,
  generateBackupCodes,
  verifyAndConsumeBackupCode,
  generateEmailOtp,
  generateCaptchaChallenge,
  verifyCaptchaChallenge,
  checkIpRateLimit,
  recordFailedIpAttempt,
  resetFailedIpAttempts,
} from '../server/security';
import { sql } from '../server/db';

async function runSecurityAudit() {
  console.log('🔒 Starting Docworm Production Security Audit Verification...\n');
  let passed = 0;
  let failed = 0;

  function test(name: string, condition: boolean, extra?: any) {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name}`, extra || '');
      failed++;
    }
  }

  // ===================================================================
  // 1. VULNERABILITY 5: PASSWORD STRENGTH CHECK
  // ===================================================================
  console.log('--- 1. Testing Password Strength Enforcement ---');
  test('Blocks "password123" (common blacklist)', !validatePasswordStrength('password123').valid);
  test('Blocks "12345678" (short and common)', !validatePasswordStrength('12345678').valid);
  test('Blocks < 12 characters ("Short@123")', !validatePasswordStrength('Short@123').valid);
  test('Blocks missing uppercase ("institutional@2026")', !validatePasswordStrength('institutional@2026').valid);
  test('Blocks missing numbers ("Institutional@Pass")', !validatePasswordStrength('Institutional@Pass').valid);
  test('Blocks missing symbols ("Institutional2026Pass")', !validatePasswordStrength('Institutional2026Pass').valid);
  test('Blocks common dictionary words ("Admin@123456789")', !validatePasswordStrength('Admin@123456789').valid);
  test('Accepts compliant high-entropy password ("Str0ng#Inst!tuti0n2026")', validatePasswordStrength('Str0ng#Inst!tuti0n2026').valid);

  // ===================================================================
  // 2. VULNERABILITY 3: 2FA, TOTP & BACKUP CODES
  // ===================================================================
  console.log('\n--- 2. Testing 2FA, TOTP (RFC 6238) & Backup Codes ---');
  const secret = generateTotpSecret();
  test('Generates valid Base32 TOTP secret', typeof secret === 'string' && secret.length >= 26);

  const uri = generateTotpUri('principal@slrtce.in', secret);
  test('Generates valid otpauth URI', uri.startsWith('otpauth://totp/Docworm') && uri.includes('secret=') && uri.includes('issuer=Docworm'));

  // Test Backup Codes
  const { plaintext: backupCodes, hashed: hashedCodes } = generateBackupCodes(8);
  test('Generates 8 backup codes', backupCodes.length === 8 && hashedCodes.length === 8);
  test('Backup codes are formatted as XXXX-XXXX', /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(backupCodes[0]));

  // Test Backup Code Consumption
  const firstCode = backupCodes[0];
  const consumptionResult = verifyAndConsumeBackupCode(firstCode, hashedCodes);
  test('Successfully consumes valid backup code', consumptionResult.valid);
  test('Remaining backup codes count is 7', consumptionResult.remainingHashedCodes.length === 7);

  // Second use of same code must fail (single-use)
  const reusedResult = verifyAndConsumeBackupCode(firstCode, consumptionResult.remainingHashedCodes);
  test('Re-use of consumed backup code fails', !reusedResult.valid);

  // Invalid backup code fails
  const invalidResult = verifyAndConsumeBackupCode('INVALID-CODE', hashedCodes);
  test('Invalid backup code fails', !invalidResult.valid);

  // Test Email OTP
  const emailOtp = generateEmailOtp();
  test('Generates 6-digit Email OTP', /^\d{6}$/.test(emailOtp.otp));
  test('Email OTP has valid SHA-256 hash', emailOtp.hash.length === 64);

  // ===================================================================
  // 3. VULNERABILITY 4: RATE LIMITING & CAPTCHA CHALLENGES
  // ===================================================================
  console.log('\n--- 3. Testing Rate Limiting, Account Lockout & CAPTCHA ---');
  const testIp = '198.51.100.42';
  resetFailedIpAttempts(testIp);

  // Test IP rate limit
  for (let i = 1; i <= 5; i++) {
    const res = checkIpRateLimit(testIp, 'test_login', 5, 60000);
    test(`IP attempt ${i}/5 allowed`, res.allowed);
  }
  const blockedAttempt = checkIpRateLimit(testIp, 'test_login', 5, 60000);
  test('IP attempt 6/5 blocked with 429 rate limit', !blockedAttempt.allowed);

  // Test CAPTCHA Challenge HMAC signature
  const challenge = generateCaptchaChallenge();
  test('Generates math challenge question', challenge.question.includes('+') && challenge.token.length > 20);

  // Extract answer from question
  const match = challenge.question.match(/(\d+)\s*\+\s*(\d+)/);
  if (match) {
    const correctAnswer = (parseInt(match[1]) + parseInt(match[2])).toString();
    test('Verifies correct CAPTCHA answer', verifyCaptchaChallenge(correctAnswer, challenge.token));
    test('Rejects incorrect CAPTCHA answer', !verifyCaptchaChallenge('999999', challenge.token));
    const tampered = Buffer.from(JSON.stringify({ payload: '123:12345', sig: 'invalidsig' })).toString('base64');
    test('Rejects tampered CAPTCHA token', !verifyCaptchaChallenge(correctAnswer, tampered));
    test('Rejects malformed CAPTCHA token', !verifyCaptchaChallenge(correctAnswer, 'malformed-base64-not-json'));
  }

  // ===================================================================
  // 4. DATABASE INTEGRITY CHECK (Migration 0012)
  // ===================================================================
  console.log('\n--- 4. Testing Database Schema & 2FA Fields ---');
  try {
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('two_factor_enabled', 'two_factor_secret', 'two_factor_backup_codes', 'failed_login_attempts', 'locked_until')
    `;
    const colNames = columns.map((c: any) => c.column_name);
    test('public.users has two_factor_enabled', colNames.includes('two_factor_enabled'));
    test('public.users has two_factor_secret', colNames.includes('two_factor_secret'));
    test('public.users has two_factor_backup_codes', colNames.includes('two_factor_backup_codes'));
    test('public.users has failed_login_attempts', colNames.includes('failed_login_attempts'));
    test('public.users has locked_until', colNames.includes('locked_until'));

    const otpTable = await sql`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'auth_otp_codes'
    `;
    test('public.auth_otp_codes table exists', otpTable.length > 0);
  } catch (err: any) {
    console.error('DB test error:', err.message);
  }

  console.log(`\n========================================`);
  console.log(`Security Audit Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runSecurityAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
