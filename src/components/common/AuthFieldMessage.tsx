import type { AuthFieldErrors } from '../../utils/authValidation';

export default function AuthFieldMessage({ id, errors }: { id: string; errors: AuthFieldErrors }) {
  return errors[id] ? <p className="auth-field-message" id={`${id}-error`}>{errors[id]}</p> : null;
}
