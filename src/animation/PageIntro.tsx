import type { HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLElement> & { as?: 'div' | 'header'; commerce?: boolean };

/** Animate a few logical heading groups, never each input, word or utility control. */
export function PageIntro({ as: Tag = 'header', commerce = false, ...props }: Props) {
  return <Tag {...props} data-page-intro={commerce ? 'commerce' : 'editorial'} />;
}
