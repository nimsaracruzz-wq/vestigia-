// Shared by the CMS API, editor and storefront. No HTML or arbitrary CSS is stored.
import { defaultShopSettings, type ShopSettings } from './shop.js';
export type Theme = 'warm' | 'ivory' | 'stone' | 'black';
export type LinkContent = { label: string; url: string };
export type Copy = { eyebrow: string; heading: string; body: string; cta: LinkContent; secondaryCta: LinkContent; alignment: 'left' | 'center' | 'right'; background: Theme; textWidth: 'narrow' | 'medium' | 'wide' };
export type Media = { image: string; mobileImage: string; alt: string; desktopPosition: 'left' | 'center' | 'right'; mobilePosition: 'left' | 'center' | 'right' };
export type Banner = Copy & Media & { vertical: 'top' | 'center' | 'bottom'; overlay: 'none' | 'light' | 'medium' | 'dark'; textTheme: 'light' | 'dark'; desktopHeight: 'compact' | 'standard' | 'full'; mobileHeight: 'compact' | 'standard' | 'full' };
export type Hotspot = { productId: number; x: number; y: number; mobileX: number; mobileY: number; tabletX?:number; tabletY?:number; enabled?:boolean; coordinateSpace?:'image'|'frame' };
export type HeroFocalPoints = { desktopFocalX: number; desktopFocalY: number; tabletFocalX: number; tabletFocalY: number; mobileFocalX: number; mobileFocalY: number };
export type CarouselSettings = Copy & { source: 'manual' | 'newest' | 'category' | 'best_selling'; category: string; productIds: number[]; excludedIds: number[]; maxProducts: number; sort: 'newest' | 'oldest' | 'price_asc' | 'price_desc'; layout: 'carousel' | 'grid' | 'lead'; desktopItems: 3 | 4 | 4.5; tabletItems: 2 | 2.5 | 3; mobileItems: 1.1 | 1.2 | 1.25 | 1.3; arrows: boolean; wishlist: boolean; quickAdd: boolean; colors: boolean; badges: boolean; badge: string; autoplay: boolean; loop: boolean };
export type GalleryItem = Media & { id: string; caption: string; url: string; enabled: boolean };
export type NewsletterSettings = Copy & { crest: boolean; placeholder: string; buttonLabel: string; successMessage: string; privacyCopy: string };
export type AnnouncementSettings = { messages: { id: string; text: string; url: string; enabled: boolean }[]; rotation: boolean; interval: number; background: Theme; textTheme: 'light' | 'dark' };
export type SectionSettings = {
  announcement: AnnouncementSettings;
  hero: Banner & HeroFocalPoints & { hotspots: Hotspot[] };
  product_carousel: CarouselSettings;
  manifesto: Copy;
  editorial_banner: Banner;
  editorial_split: Copy & Media & { layout: 'image_left' | 'image_right'; ratio: 'portrait' | 'landscape' | 'editorial' };
  lookbook: Copy & { items: GalleryItem[]; layout: 'grid' | 'carousel' };
  newsletter: NewsletterSettings;
};
export type SectionType = keyof SectionSettings;
export type SectionOf<T extends SectionType> = T extends SectionType ? { id: string; type: T; label: string; enabled: boolean; sortOrder: number; settings: SectionSettings[T] } : never;
export type HomepageSection = { [K in SectionType]: SectionOf<K> }[SectionType];
export type FooterConfig = { description: string; copyright: string; groups: { id: string; title: string; links: (LinkContent & { enabled: boolean })[] }[]; socials: (LinkContent & { enabled: boolean })[] };
export type HomepageConfig = { schemaVersion: 1; sections: HomepageSection[]; shop?: ShopSettings; seo: { title: string; description: string; image: string; canonical: string; index: boolean }; footer: FooterConfig };
export type HomepageRecord = { draft: HomepageConfig; published: HomepageConfig; revision: number; publishedRevision: number; publishedAt: string; updatedAt: string; updatedBy: string; warnings: string[] };

export const sectionLabels: Record<SectionType, string> = { announcement: 'Announcement bar', hero: 'Hero', product_carousel: 'Product carousel', manifesto: 'Manifesto', editorial_banner: 'Campaign banner', editorial_split: 'Editorial split', lookbook: 'Lookbook', newsletter: 'Newsletter' };
const link = (label = '', url = ''): LinkContent => ({ label, url });
export const baseCopy: Copy = { eyebrow: '', heading: '', body: '', cta: link(), secondaryCta: link(), alignment: 'left', background: 'warm', textWidth: 'medium' };
const media: Media = { image: '/images/products/vestigia-hero-1254.jpg', mobileImage: '', alt: 'VESTIGIA campaign', desktopPosition: 'center', mobilePosition: 'center' };
export function newSection<T extends SectionType>(type: T, id: string, heading = sectionLabels[type]): SectionOf<T> {
  const copy = { ...structuredClone(baseCopy), heading };
  const banner: Banner = { ...copy, ...media, vertical: 'center', overlay: 'medium', textTheme: 'light', desktopHeight: 'standard', mobileHeight: 'standard' };
  const settings: SectionSettings = {
    announcement: { messages: [{ id: 'message-1', text: 'THE FIRST RELEASE — AVAILABLE NOW', url: '/shop', enabled: true }], rotation: false, interval: 6, background: 'black', textTheme: 'light' },
    hero: { ...banner, image: '/images/products/vestigia_hero_desktop.webp', mobileImage: '/images/products/vestigia_hero_mobile.webp', desktopHeight: 'full', mobileHeight: 'full', hotspots: [], desktopFocalX: 50, desktopFocalY: 0, tabletFocalX: 50, tabletFocalY: 0, mobileFocalX: 50, mobileFocalY: 50 },
    product_carousel: { ...copy, source: 'manual', category: '', productIds: [], excludedIds: [], maxProducts: 8, sort: 'newest', layout: 'carousel', desktopItems: 4, tabletItems: 2.5, mobileItems: 1.2, arrows: true, wishlist: true, quickAdd: true, colors: true, badges: true, badge: '', autoplay: false, loop: false },
    manifesto: { ...copy, alignment: 'center', background: 'ivory' },
    editorial_banner: banner,
    editorial_split: { ...copy, ...media, layout: 'image_left', ratio: 'portrait' },
    lookbook: { ...copy, items: [], layout: 'grid' },
    newsletter: { ...copy, alignment: 'center', background: 'black', crest: true, placeholder: 'Enter your email', buttonLabel: 'Join the inner circle', successMessage: 'Please check your email to confirm your subscription.', privacyCopy: 'By subscribing, you agree to receive Vestigia emails. You can unsubscribe at any time.' },
  };
  return { id, type, label: heading, enabled: true, sortOrder: 0, settings: settings[type] } as SectionOf<T>;
}

export function initialHomepage(productIds: number[] = [], announcement?: { enabled: boolean; text: string }): HomepageConfig {
  const hero = newSection('hero', 'hero', 'A LEGACY IN EVERY THREAD');
  Object.assign(hero.settings, { eyebrow: 'THE FIRST RELEASE', body: 'Italian vision. Made in Sri Lanka.', alignment: 'center', cta: link('SHOP THE RELEASE', '/shop'), secondaryCta: link('', '') });
  const arrivals = newSection('product_carousel', 'new-arrivals', 'NEW ARRIVALS');
  Object.assign(arrivals.settings, { eyebrow: 'LATEST FROM VESTIGIA', source: 'newest', badge: 'NEW', cta: link('View all', '/shop'), secondaryCta: link('Discover Our Story', '/story') });
  const manifesto = newSection('manifesto', 'manifesto', 'DESIGNED TO REMAIN.');
  Object.assign(manifesto.settings, { eyebrow: 'THE VESTIGIA PHILOSOPHY', body: 'VESTIGIA creates contemporary clothing inspired by the traces people, places, and moments leave behind. Designed in Italy and made in Sri Lanka, each piece is shaped with restraint, intention, and a focus on lasting identity.', cta: link('Discover our story', '/story') });
  const featured = newSection('product_carousel', 'first-release', 'THE FIRST RELEASE');
  Object.assign(featured.settings, { eyebrow: 'ONE BEGINNING.', source: productIds.length ? 'manual' : 'newest', productIds, layout: 'grid', cta: link('Explore the collection', '/shop') });
  const campaign = newSection('editorial_banner', 'campaign', 'BUILT AROUND IDENTITY.');
  Object.assign(campaign.settings, { image: '/images/products/built_around_vestigia.webp', vertical: 'bottom', cta: link('Explore the collection', '/shop') });
  const wanted = newSection('product_carousel', 'most-wanted', 'MOST WANTED');
  Object.assign(wanted.settings, { productIds, body: 'The pieces defining VESTIGIA.', cta: link('View all', '/shop') });
  wanted.enabled = productIds.length > 0;
  const identity = newSection('editorial_split', 'identity', 'BUILT AROUND IDENTITY.');
  Object.assign(identity.settings, { eyebrow: 'THE VESTIGIA PHILOSOPHY', image: '/images/products/built_around_vestigia.webp', alt: 'VESTIGIA Signature Tee worn by a model', body: 'Heavyweight construction. Relaxed proportions. Understated details. The Signature Tee establishes the foundation of VESTIGIA.', cta: link('Discover the story', '/story') });
  const craft = newSection('editorial_split', 'craft', 'CRAFTED BEYOND TIME.');
  Object.assign(craft.settings, { image: '/images/products/vestigia_gallery_1.webp', layout: 'image_right', background: 'ivory', body: 'Every piece is designed to outlast trends and become part of your story.', cta: link('Our philosophy', '/story') });
  const legacy = newSection('editorial_banner', 'legacy', 'INSPIRED BY ITALIAN LEGACY.');
  Object.assign(legacy.settings, { image: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1600&q=85', alt: 'Architectural details', body: 'Clean silhouettes, refined proportions, and contemporary Italian aesthetics define every collection.' });
  const precision = newSection('editorial_split', 'precision', 'MADE WITH PRECISION.');
  Object.assign(precision.settings, { image: '/images/products/vestigia_detail.webp', alt: 'VESTIGIA fabric and stitching detail', body: 'Each VESTIGIA garment is carefully produced with attention to detail.', background: 'ivory' });
  const lookbook = newSection('lookbook', 'world', 'THE VESTIGIA WORLD');
  lookbook.settings.items = [media.image, identity.settings.image, precision.settings.image, legacy.settings.image].map((image, n) => ({ ...media, image, id: `gallery-${n}`, alt: ['VESTIGIA campaign', identity.settings.alt, precision.settings.alt, legacy.settings.alt][n], caption: '', url: '', enabled: true }));
  const newsletter = newSection('newsletter', 'newsletter', 'JOIN THE INNER CIRCLE.');
  newsletter.settings.body = 'Private access to new releases, restocks and Vestigia stories.';
  const bar = newSection('announcement', 'announcement');
  if (announcement) { bar.enabled = announcement.enabled; bar.settings.messages[0].text = announcement.text || 'THE FIRST RELEASE — AVAILABLE NOW'; }
  return { schemaVersion: 1, sections: [bar, hero, arrivals, manifesto, featured, campaign, wanted, identity, craft, legacy, precision, lookbook, newsletter].map((s, sortOrder) => ({ ...s, sortOrder })),
    seo: { title: 'VESTIGIA | Luxury Clothing & Premium Essentials', description: 'EVERY THREAD LEAVES A LEGACY. Contemporary clothing shaped by Italian vision and made in Sri Lanka. Discover the first VESTIGIA release.', image: '/images/products/vestigia-hero-1254.jpg', canonical: 'https://thevestigia.com/', index: true },
    footer: { description: 'DESIGNED IN ITALY.\nMADE IN SRI LANKA.\nEVERY THREAD LEAVES A LEGACY', copyright: '© 2026 VESTIGIA. ALL RIGHTS RESERVED.', groups: [
      { id: 'shop', title: 'Shop', links: [link('All products', '/shop')] },
      { id: 'about', title: 'About', links: [link('Our story', '/story'), link('About VESTIGIA', '/about'), link('Journal', '/journal')] },
      { id: 'services', title: 'Client services', links: [link('Contact', '/contact'), link('Shipping & delivery', '/shipping-policy'), link('Frequently asked questions', '/faq')] },
      { id: 'legal', title: 'Legal', links: [link('Privacy policy', '/privacy-policy'), link('Terms of service', '/terms-of-service'), link('Returns', '/refund-policy')] },
    ].map(group => ({ ...group, links: group.links.map(l => ({ ...l, enabled: true })) })), socials: [] },
  };
}

export function safeHomepageUrl(value: string, image = false) {
  if (!value) return true;
  if (/^\/(?!\/)/.test(value) && !/[\\\s\u0000-\u001f]/.test(value)) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}

// Validate against explicit section defaults: rejects unknown keys and incorrect
// nested types, then applies section-specific limits and relationship checks.
export function validateHomepage(input: unknown): HomepageConfig {
  const fail = (message: string): never => { throw new Error(message); };
  const obj = (v: unknown): Record<string, any> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : fail('Expected a configuration object');
  const check = (v: unknown, template: unknown, path: string): void => {
    if (Array.isArray(template)) { if (!Array.isArray(v) || v.length > 100) fail(`${path}: invalid list`); return; }
    if (template && typeof template === 'object') {
      const value = obj(v), shape = obj(template);
      if (Object.keys(value).some(k => !(k in shape))) fail(`${path}: unsupported field`);
      for (const key of Object.keys(shape)) check(value[key], shape[key], `${path}.${key}`);
    } else if (typeof v !== typeof template || typeof v === 'number' && !Number.isFinite(v) || typeof v === 'string' && (v.length > 4000 || /[<>]/.test(v))) fail(`${path}: invalid value (plain text only)`);
  };
  const choice = (v: unknown, choices: readonly unknown[], path: string) => { if (!choices.includes(v)) fail(`${path}: select a supported option`); };
  const url = (v: string, path: string) => { if (v.length > 2048 || !safeHomepageUrl(v)) fail(`${path}: use a relative path or HTTPS URL`); };
  const cta = (v: LinkContent, path: string) => { check(v, link(), path); if (!!v.label !== !!v.url) fail(`${path}: label and URL are both required`); url(v.url, path); };
  const ids = (v: number[], path: string) => { if (v.some(id => !Number.isSafeInteger(id) || id < 1) || new Set(v).size !== v.length) fail(`${path}: invalid or duplicate product IDs`); };
  const config = { ...obj(input), shop: obj(input).shop ?? structuredClone(defaultShopSettings) } as Record<string, any>;
  check(config, { schemaVersion: 1, sections: [], shop: defaultShopSettings, seo: initialHomepage().seo, footer: initialHomepage().footer }, 'Homepage');
  choice(config.shop.pageSize, [8,12,24,48], 'Shop page size');
  choice(config.shop.mobileColumns, [2], 'Shop mobile columns');
  choice(config.shop.desktopColumns, [4], 'Shop desktop columns');
  if (!config.shop.heading.trim() || config.shop.heading.length > 160 || !/^[a-zA-Z0-9_-]{0,80}$/.test(config.shop.defaultCollection)) fail('Invalid shop heading or default collection');
  if (config.schemaVersion !== 1 || !config.sections.length || config.sections.length > 40) fail('Homepage requires 1–40 sections');
  const seen = new Set<string>();
  for (const s of config.sections as HomepageSection[]) {
    if (!s || !(s.type in sectionLabels)) fail('Unknown section type');
    check(s, newSection(s.type, ''), s.label || s.type);
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(s.id) || seen.has(s.id)) fail('Section IDs must be unique');
    seen.add(s.id);
    if (!s.label.trim() || !Number.isInteger(s.sortOrder) || s.sortOrder < 0 || s.sortOrder > 1000) fail('Invalid section label or order');
    const t = s.settings;
    choice(t.background, ['warm','ivory','stone','black'], s.label);
    if ('heading' in t) {
      if (s.enabled && (!t.heading.trim() || t.heading.length > 160)) fail(`${s.label}: enter a heading of 1–160 characters`);
      choice(t.alignment, ['left','center','right'], s.label); choice(t.textWidth, ['narrow','medium','wide'], s.label);
      cta(t.cta, s.label); cta(t.secondaryCta, s.label);
    }
    if ('image' in t) {
      url(t.image, s.label); url(t.mobileImage, s.label);
      if (s.enabled && (!t.image || !t.alt.trim())) fail(`${s.label}: image and alt text are required`);
      choice(t.desktopPosition, ['left','center','right'], s.label); choice(t.mobilePosition, ['left','center','right'], s.label);
    }
    if ('overlay' in t) {
      choice(t.overlay, ['none','light','medium','dark'], s.label); choice(t.vertical, ['top','center','bottom'], s.label); choice(t.textTheme, ['light','dark'], s.label);
      for (const height of [t.desktopHeight,t.mobileHeight]) choice(height, ['compact','standard','full'], s.label);
    }
    if (s.type === 'hero') {
      for(const key of ['desktopFocalX','desktopFocalY','tabletFocalX','tabletFocalY','mobileFocalX','mobileFocalY'] as const) if(s.settings[key]<0||s.settings[key]>100)fail('Hero focal points must be percentages from 0–100');
      for (const h of s.settings.hotspots) { const normalized={tabletX:h.x,tabletY:h.y,enabled:true,coordinateSpace:'frame',...h}; check(normalized, {productId: 1,x: 50,y: 50,mobileX: 50,mobileY: 50,tabletX:50,tabletY:50,enabled:true,coordinateSpace:'frame'}, 'Hotspot'); ids([h.productId], 'Hotspot'); choice(normalized.coordinateSpace,['image','frame'],'Hotspot coordinates'); if ([h.x,h.y,h.mobileX,h.mobileY,normalized.tabletX,normalized.tabletY].some(n => n < 0 || n > 100)) fail('Hotspot positions must be 0–100'); }
    }
    if (s.type === 'product_carousel') {
      const p = s.settings; ids(p.productIds, s.label); ids(p.excludedIds, s.label);
      choice(p.source, ['manual','newest','category','best_selling'], s.label); choice(p.sort, ['newest','oldest','price_asc','price_desc'], s.label); choice(p.layout, ['carousel','grid','lead'], s.label);
      choice(p.desktopItems,[3,4,4.5],s.label); choice(p.tabletItems,[2,2.5,3],s.label); choice(p.mobileItems,[1.1,1.2,1.25,1.3],s.label);
      if (!Number.isInteger(p.maxProducts) || p.maxProducts < 1 || p.maxProducts > 24) fail(`${s.label}: choose 1–24 products`);
      if (s.enabled && (p.source === 'manual' && !p.productIds.length || p.source === 'category' && !p.category.trim())) fail(`${s.label}: select products or a category`);
    }
    if (s.type === 'editorial_split') { choice(s.settings.layout,['image_left','image_right'],s.label); choice(s.settings.ratio,['portrait','landscape','editorial'],s.label); }
    if (s.type === 'lookbook') {
      choice(s.settings.layout,['grid','carousel'],s.label);
      if (s.settings.items.length > 12 || s.enabled && !s.settings.items.some(i => i.enabled)) fail('Lookbook requires 1–12 enabled images');
      const galleryIds = new Set<string>();
      for (const item of s.settings.items) { check(item,{...media,id:'',caption:'',url:'',enabled:true},'Gallery'); if (!item.id || galleryIds.has(item.id)) fail('Gallery IDs must be unique'); galleryIds.add(item.id); url(item.image,'Gallery');url(item.mobileImage,'Gallery');url(item.url,'Gallery'); if (item.enabled && (!item.image || !item.alt.trim())) fail('Gallery images require alt text'); choice(item.desktopPosition,['left','center','right'],'Gallery');choice(item.mobilePosition,['left','center','right'],'Gallery'); }
    }
    if (s.type === 'announcement') {
      const p = s.settings; choice(p.textTheme,['light','dark'],s.label);
      if (!Number.isInteger(p.interval) || p.interval < 3 || p.interval > 30 || p.messages.length > 10) fail('Announcement interval must be 3–30 seconds, with up to 10 messages');
      if (s.enabled && !p.messages.some(m => m.enabled)) fail('Enable at least one announcement message');
      for (const m of p.messages) { check(m,{id:'',text:'',url:'',enabled:true},'Message'); url(m.url,'Message'); if (!m.text.trim() || m.text.length > 240) fail('Announcement messages require 1–240 characters'); }
    }
    if (s.type === 'newsletter' && s.enabled && (!s.settings.buttonLabel.trim() || !s.settings.successMessage.trim() || !s.settings.privacyCopy.trim())) fail('Newsletter button, confirmation and privacy copy are required');
  }
  for (const type of ['hero','announcement','newsletter']) if (config.sections.filter((s: HomepageSection) => s.type === type).length !== 1) fail(`Keep exactly one ${type} section; use visibility to hide it`);
  if (!config.seo.title.trim() || config.seo.title.length > 120 || config.seo.description.length > 320) fail('SEO title/description is missing or too long');
  url(config.seo.image,'SEO image');url(config.seo.canonical,'Canonical URL');
  const footer = config.footer as FooterConfig;
  if (footer.groups.length > 6 || footer.socials.length > 8) fail('Too many footer groups or social links');
  for (const g of footer.groups) { check(g,{id:'',title:'',links:[]},'Footer group'); if (g.links.length > 16) fail('Too many footer links'); for (const l of g.links) { check(l,{label:'',url:'',enabled:true},'Footer link'); cta({label:l.label,url:l.url},'Footer link'); } }
  for (const l of footer.socials) { check(l,{label:'',url:'',enabled:true},'Social link'); cta({label:l.label,url:l.url},'Social link'); }
  return structuredClone(config) as HomepageConfig;
}

export function orderedSections(config: HomepageConfig) { return [...config.sections].sort((a,b) => a.sortOrder - b.sortOrder).filter(s => s.enabled); }
