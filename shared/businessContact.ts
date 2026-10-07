/** Contact details shared by customer invoices and admin dispatch documents. */
export const businessContact = {
  email: 'support@thevestigia.com',
  phone: '+39 329 728 5468 (Italy)',
  phoneHref: 'tel:+393297285468',
  weekdayHours: 'Mon – Fri: 9:00 – 19:00 CET',
  saturdayHours: 'Sat: 10:00 – 16:00 CET',
  street: 'Via Giacomo Puccini 8/1',
  locality: 'Camposampiero, Padua, Italy',
  website: 'thevestigia.com',
} as const;

export function documentContactHtml() {
  return `<strong>Email Concierge</strong><br/><a href="mailto:${businessContact.email}">${businessContact.email}</a><br/>
<strong>Direct Advisory Line</strong><br/><a href="${businessContact.phoneHref}">${businessContact.phone}</a><br/>
<strong>Support Hours</strong><br/>${businessContact.weekdayHours}<br/>${businessContact.saturdayHours}<br/>
<strong>Head Office</strong><br/>${businessContact.street}<br/>${businessContact.locality}`;
}
