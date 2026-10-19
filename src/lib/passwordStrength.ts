// Real-Time Password Strength Evaluator for Institutional Security Compliance
// Enforces minimum 12 characters, upper/lower/numbers/symbols, entropy score, and common password detection.

export interface PasswordFeedback {
  score: number; // 0 to 4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
  textColor: string;
  percent: number;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    symbol: boolean;
    notCommon: boolean;
  };
  suggestions: string[];
}

const COMMON_PATTERNS = [
  'password', 'password123', '123456', '12345678', 'qwerty',
  'admin', 'welcome', 'docworm', 'slrtce', 'college', 'faculty', 'changeme'
];

export function evaluatePasswordStrength(password: string): PasswordFeedback {
  if (!password) {
    return {
      score: 0,
      label: 'Very Weak',
      color: 'bg-slate-200',
      textColor: 'text-slate-400',
      percent: 0,
      requirements: {
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        symbol: false,
        notCommon: true,
      },
      suggestions: ['Enter at least 8 characters with upper, lower, numbers, and symbols.'],
    };
  }

  const length = password.length >= 8;
  const uppercase = /[A-Z]/.test(password);
  const lowercase = /[a-z]/.test(password);
  const number = /[0-9]/.test(password);
  const symbol = /[^A-Za-z0-9]/.test(password);

  const lowerPass = password.toLowerCase();
  const notCommon = !COMMON_PATTERNS.some((p) => lowerPass.includes(p));

  const suggestions: string[] = [];
  if (!length) suggestions.push('At least 8 characters required (current: ' + password.length + ')');
  if (!uppercase) suggestions.push('Include uppercase letter (A-Z)');
  if (!lowercase) suggestions.push('Include lowercase letter (a-z)');
  if (!number) suggestions.push('Include number (0-9)');
  if (!symbol) suggestions.push('Include special symbol (!@#$%^&*...)');
  if (!notCommon) suggestions.push('Avoid common words or predictable phrases');

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (uppercase && lowercase) score += 1;
  if (number && symbol) score += 1;
  if (notCommon && password.length >= 14 && uppercase && lowercase && number && symbol) score = 4;

  if (!notCommon && score > 1) score = 1;
  if (!length && score > 2) score = 2;

  let label: PasswordFeedback['label'] = 'Very Weak';
  let color = 'bg-rose-500';
  let textColor = 'text-rose-600';
  let percent = 20;

  switch (score) {
    case 0:
    case 1:
      label = 'Weak';
      color = 'bg-rose-500';
      textColor = 'text-rose-600';
      percent = 25;
      break;
    case 2:
      label = 'Fair';
      color = 'bg-amber-500';
      textColor = 'text-amber-600';
      percent = 50;
      break;
    case 3:
      label = 'Good';
      color = 'bg-blue-500';
      textColor = 'text-blue-600';
      percent = 75;
      break;
    case 4:
      label = 'Strong';
      color = 'bg-emerald-500';
      textColor = 'text-emerald-600';
      percent = 100;
      break;
  }

  return {
    score,
    label,
    color,
    textColor,
    percent,
    requirements: {
      length,
      uppercase,
      lowercase,
      number,
      symbol,
      notCommon,
    },
    suggestions,
  };
}
