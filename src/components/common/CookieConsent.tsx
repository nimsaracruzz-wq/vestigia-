import { RevealModal, RevealOverlay } from "../../animation/Reveal";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCookieConsent } from "../../context/CookieConsentContext";

export default function CookieConsent() {
  const { consent, settingsOpen, openSettings, closeSettings, acceptAll, acceptEssential, savePreferences } = useCookieConsent();
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (settingsOpen) {
      setAnalytics(consent?.analytics ?? false);
      setMarketing(consent?.marketing ?? false);
    }
  }, [consent, settingsOpen]);

  useEffect(() => {
    if (!settingsOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSettings();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeSettings, settingsOpen]);

  const showBanner = !consent && !settingsOpen;

  return (
    <>
      {showBanner && (
        <section className="cookie-consent-banner" aria-labelledby="cookie-consent-title" role="region">
          <div className="cookie-consent-copy">
            <p className="cookie-consent-eyebrow">YOUR PRIVACY MATTERS</p>
            <p id="cookie-consent-title" className="cookie-consent-description">
              We use essential storage to improve your experience, keep your account and cart working, and keep VESTIGIA secure.
            </p>
            <Link to="/privacy-policy" className="cookie-consent-policy">Privacy Policy</Link>
          </div>
          <div className="cookie-consent-actions">
            <button type="button" className="cookie-consent-primary" onClick={acceptAll}>Accept All</button>
            <button type="button" className="cookie-consent-secondary" onClick={acceptEssential}>Essential Only</button>
            <button type="button" className="cookie-consent-secondary" onClick={openSettings}>Settings</button>
          </div>
        </section>
      )}

      {settingsOpen && (
        <RevealOverlay className="cookie-consent-backdrop" role="presentation" onMouseDown={closeSettings}>
          <RevealModal
            className="cookie-preferences-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-preferences-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="cookie-preferences-heading">
              <p className="cookie-consent-eyebrow">PRIVACY</p>
              <h2 id="cookie-preferences-title">Cookie Preferences</h2>
              <p>Choose which optional categories you want to allow. VESTIGIA currently does not load analytics or marketing trackers.</p>
            </div>

            <div className="cookie-preference-row">
              <div><strong>Essential Cookies</strong><span>Always active</span></div>
              <span className="cookie-preference-status">ON</span>
            </div>
            <div className="cookie-preference-row">
              <div><strong>Analytics Cookies</strong><span>Help us understand site usage</span></div>
              <label className="cookie-toggle">
                <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />
                <span aria-hidden="true" />
              </label>
            </div>
            <div className="cookie-preference-row">
              <div><strong>Marketing Cookies</strong><span>Used for relevant advertising</span></div>
              <label className="cookie-toggle">
                <input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} />
                <span aria-hidden="true" />
              </label>
            </div>

            <div className="cookie-preferences-actions">
              <button type="button" className="cookie-consent-secondary" onClick={closeSettings}>Cancel</button>
              <button type="button" className="cookie-consent-primary" onClick={() => savePreferences({ analytics, marketing })}>Save Preferences</button>
            </div>
          </RevealModal>
        </RevealOverlay>
      )}
    </>
  );
}
