import { passwordStrength } from '../../../shared/passwordStrength';
import './password-strength.css';

export default function PasswordStrengthMeter({ password, personalValues = [] }: { password: string; personalValues?: string[] }) {
  const strength = passwordStrength(password, personalValues);
  return <div className="password-strength" id="reg-pass-help" data-strength={strength.score}>
    <div className="password-strength-heading"><span>STRENGTH</span><span aria-live="polite" aria-atomic="true">{strength.label}</span></div>
    <div className="password-strength-track" role="meter" aria-label="Estimated password strength" aria-valuemin={0} aria-valuemax={4} aria-valuenow={strength.score} aria-valuetext={strength.label}>
      {[1, 2, 3, 4].map(segment => <span key={segment} className={segment <= strength.score ? 'is-filled' : ''} />)}
    </div>
    <p>{strength.hint}</p>
  </div>;
}
