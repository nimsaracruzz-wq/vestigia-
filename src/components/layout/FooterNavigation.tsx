import { useId, useState, type CSSProperties } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useCookieConsent } from "../../context/CookieConsentContext";
import { useCurrency, type CurrencyCode } from "../../context/CurrencyContext";
import { Reveal, RevealGroup } from "../../animation/Reveal";

export type FooterLink = {
  label: string;
  url: string;
  enabled?: boolean;
};

export type FooterGroup = {
  id: string;
  title: string;
  links: FooterLink[];
};

type FooterNavigationProps = {
  description: string;
  groups: FooterGroup[];
  socials?: FooterLink[];
  copyright: string;
  adminLink?: boolean;
  className?: string;
};

function FooterLinkItem({ link }: { link: FooterLink }) {
  if (link.url.startsWith("/")) return <Link to={link.url}>{link.label}</Link>;
  return <a href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a>;
}

function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();
  const id = useId();

  return (
    <label className="vst-footer__currency" htmlFor={id}>
      <span>Currency</span>
      <select id={id} value={currency} onChange={(event) => setCurrency(event.target.value as CurrencyCode)} aria-label="Currency">
        <option value="EUR">EUR (€)</option>
        <option value="USD">USD ($)</option>
        <option value="JPY">JPY (¥)</option>
        <option value="GBP">GBP (£)</option>
      </select>
    </label>
  );
}

function FooterGroup({ group }: { group: FooterGroup }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const links = group.links.filter((link) => link.enabled !== false);

  return (
    <div className={`vst-footer__group ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="vst-footer__group-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{group.title}</span>
        <ChevronDown aria-hidden="true" size={16} />
      </button>
      <ul id={id} className="vst-footer__group-links" style={{ "--footer-max-height": open ? "none" : "0px", "--footer-visibility": open ? "visible" : "hidden", "--footer-opacity": open ? 1 : 0 } as CSSProperties}>
        {links.map((link) => (
          <li key={`${group.id}-${link.label}-${link.url}`}><FooterLinkItem link={link} /></li>
        ))}
      </ul>
    </div>
  );
}

export default function FooterNavigation({ description, groups, socials = [], copyright, adminLink = false, className = "" }: FooterNavigationProps) {
  const { openSettings } = useCookieConsent();
  const visibleSocials = socials.filter((link) => link.enabled !== false);

  return (
    <footer className={`vst-footer ${className}`}>
      <div className="vst-footer__inner">
        <RevealGroup className="vst-footer__main">
          <Reveal as="div" className="vst-footer__brand">
            <div className="vst-footer__brand-mark">
              <img src="/images/products/vestigia-logo-192.png" alt="VESTIGIA crest" width={58} height={58} loading="lazy" />
              <span>VESTIGIA</span>
            </div>
            <p>{description}</p>
          </Reveal>

          <RevealGroup as="nav" className="vst-footer__navigation" aria-label="Footer navigation">
            {groups.map((group) => <Reveal as="div" className="vst-footer__group-wrap" key={group.id}><FooterGroup group={group} /></Reveal>)}
          </RevealGroup>
        </RevealGroup>

        <div className="vst-footer__utility">
          <CurrencySelector />
          <div className="vst-footer__utility-links">
            {visibleSocials.map((link) => <FooterLinkItem key={`${link.label}-${link.url}`} link={link} />)}
            {adminLink && <Link to="/admin">Admin Portal</Link>}
            <button type="button" onClick={openSettings}>Cookie Preferences</button>
          </div>
        </div>

        <div className="vst-footer__legal">
          <span>{copyright}</span>
        </div>
      </div>
    </footer>
  );
}
