import type { HomepageConfig } from '../../shared/homepage';
import { NewsletterSection } from './HomepageRenderer';
import FooterNavigation from '../components/layout/FooterNavigation';
export default function CmsFooter({config,showNewsletter=false}: {config:HomepageConfig;showNewsletter?:boolean}) {
 const newsletter=config.sections.find(s=>s.type==='newsletter'&&s.enabled);
 return <>{showNewsletter&&newsletter?.type==='newsletter'&&<NewsletterSection settings={newsletter.settings}/>}<FooterNavigation description={config.footer.description} groups={config.footer.groups} socials={config.footer.socials} copyright={config.footer.copyright}/></>;
}
