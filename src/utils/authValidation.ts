export type AuthForm = 'login' | 'register' | 'forgot';
export type AuthFields = { email: string; password?: string; firstName?: string; lastName?: string; country?: string; phone?: string; confirmPassword?: string };
export type AuthFieldErrors = Record<string, string>;

/** Keep validation aligned with existing API limits; allow legacy login passwords. */
export function validateAuthFields(form: AuthForm, fields: AuthFields): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const emailId = form === 'register' ? 'reg-email' : form === 'forgot' ? 'forgot-email' : 'login-email';
  const email = fields.email.trim();
  if (!email) errors[emailId] = 'Enter your email address.';
  else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors[emailId] = 'Enter a valid email address, such as name@example.com.';
  if (form === 'login') {
    if (!fields.password) errors['login-pass'] = 'Enter your password.';
    else if (fields.password.length > 128) errors['login-pass'] = 'Your password cannot exceed 128 characters.';
  }
  if (form === 'register') {
    for (const [field, id, label] of [['firstName', 'reg-first-name', 'first name'], ['lastName', 'reg-last-name', 'last name']] as const) {
      if (!fields[field]?.trim()) errors[id] = `Enter your ${label}.`;
      else if (fields[field]!.trim().length > 80) errors[id] = `Your ${label} cannot exceed 80 characters.`;
    }
    if (!fields.country) errors['reg-country'] = 'Select your country.';
    if (!fields.password || fields.password.length < 12 || fields.password.length > 128) errors['reg-pass'] = 'Use a password between 12 and 128 characters.';
    if (!fields.confirmPassword) errors['reg-pass-conf'] = 'Confirm your password.';
    else if (fields.password !== fields.confirmPassword) errors['reg-pass-conf'] = 'Passwords do not match.';
    if (fields.phone?.trim()) {
      const digits = fields.phone.replace(/\D/g, '');
      if (!/^[+\d\s().-]+$/.test(fields.phone) || digits.length < 7 || digits.length > 15) errors['reg-phone'] = 'Enter a valid phone number, or leave this optional field empty.';
    }
  }
  return errors;
}
