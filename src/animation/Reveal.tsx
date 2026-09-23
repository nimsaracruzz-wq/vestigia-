import { Children, createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { animationConfig, revealPreset, staggerDelay, type RevealOptions, type RevealTone } from "./config";
import "./reveal.css";

function mediaStore(query: string) {
  const listeners = new Set<() => void>();
  let media: MediaQueryList | undefined;
  const notify = () => listeners.forEach(listener => listener());
  const get = () => typeof window !== "undefined" && window.matchMedia(query).matches;
  const subscribe = (callback: () => void) => {
    if (!media) {
      media = window.matchMedia(query);
      media.addEventListener("change", notify);
    }
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
      if (!listeners.size) { media?.removeEventListener("change", notify); media = undefined; }
    };
  };
  return { get, subscribe };
}
const mobileStore = mediaStore("(max-width: 767px)");
const reducedStore = mediaStore("(prefers-reduced-motion: reduce)");
const serverSnapshot = () => true;
const ToneContext = createContext<RevealTone>("storefront");
const OrderContext = createContext(0);
const StaggerContext = createContext(animationConfig.stagger);
const BoundaryContext = createContext(false);

export function RevealProvider({ tone, children }: { tone: RevealTone; children: ReactNode }) {
  return <ToneContext.Provider value={tone}>{children}</ToneContext.Provider>;
}

type Options = Omit<RevealOptions, "mobile" | "reduced"> & {
  once?: boolean;
  trigger?: "viewport" | "mount";
  disabled?: boolean;
  /** Opt into a meaningful child reveal inside another reveal boundary. */
  allowNested?: boolean;
};

export function useReveal({ once = true, trigger = "viewport", disabled = false, allowNested = false, ...options }: Options = {}) {
  const mobile = useSyncExternalStore(mobileStore.subscribe, mobileStore.get, serverSnapshot);
  const reduced = useSyncExternalStore(reducedStore.subscribe, reducedStore.get, serverSnapshot);
  const tone = useContext(ToneContext);
  const nested = useContext(BoundaryContext);
  const index = useContext(OrderContext);
  const stagger = useContext(StaggerContext);
  const [focused, setFocused] = useState(false);
  const unsupported = typeof window !== "undefined" && typeof window.IntersectionObserver === "undefined";
  const instant = reduced || disabled || (nested && !allowNested) || focused || unsupported;
  const preset = revealPreset({ ...options, tone: options.tone ?? tone, mobile, reduced: instant, delay: options.delay ?? staggerDelay(index, stagger) });
  return {
    "data-reveal": options.variant || "fadeUp",
    initial: instant ? false as const : "hidden",
    animate: instant || trigger === "mount" ? "visible" : undefined,
    whileInView: trigger === "viewport" ? "visible" : undefined,
    viewport: { ...animationConfig.viewport, once },
    variants: { hidden: preset.hidden, visible: preset.visible },
    transition: preset.transition,
    // Keyboard focus must never wait for an offscreen entrance animation.
    onFocusCapture: () => setFocused(true),
  };
}

type Tag = "div" | "section" | "article" | "aside" | "header" | "footer" | "nav" | "ul" | "li" | "span" | "p" | "h1" | "h2" | "h3" | "figure" | "blockquote" | "form";
type ElementProps = Omit<HTMLMotionProps<"div">, "children"> & { children?: ReactNode };
type RevealProps = Omit<ElementProps, "initial" | "animate" | "whileInView" | "variants" | "transition"> & Options & { as?: Tag };

export function Reveal({ as = "div", variant, tone, delay, duration, once, trigger, disabled, allowNested, children, onFocusCapture, ...props }: RevealProps) {
  const entrance = useReveal({ variant, tone, delay, duration, once, trigger, disabled, allowNested });
  const Component = motion[as] as typeof motion.div;
  return (
    <Component {...props} {...entrance} onFocusCapture={event => { entrance.onFocusCapture(); onFocusCapture?.(event); }}>
      <BoundaryContext.Provider value={!disabled && !allowNested}>{children}</BoundaryContext.Provider>
    </Component>
  );
}

/** Groups do not animate their container: only items animate, with independent viewport triggers. */
export function RevealGroup({ as = "div", stagger = animationConfig.stagger, children, ...props }: ElementProps & { as?: Tag; stagger?: number }) {
  const Component = motion[as] as typeof motion.div;
  return <Component {...props} data-reveal-group="true">
    <StaggerContext.Provider value={stagger}>
      {Children.map(children, (child, index) => <OrderContext.Provider value={index}>{child}</OrderContext.Provider>)}
    </StaggerContext.Provider>
  </Component>;
}

export function RevealItem(props: RevealProps) { return <Reveal {...props} />; }

/** Optional word reveals keep a single accessible heading, never per-character speech. */
export function RevealText({ as = "h2", split = "block", children, ...props }: RevealProps & { split?: "block" | "words" }) {
  const order = useContext(OrderContext);
  const stagger = useContext(StaggerContext);
  if (split !== "words" || typeof children !== "string") return <Reveal as={as} variant="textReveal" {...props}>{children}</Reveal>;
  const { tone, delay, duration, once, trigger, disabled, variant, ...elementProps } = props;
  const text = children.trim().replace(/\s+/g, " ");
  return <RevealGroup as={as} {...elementProps} aria-label={text}>
    {text.split(" ").map((word, index) => <Reveal as="span" className="reveal-word" aria-hidden="true" key={`${index}-${word}`} variant="textReveal" {...{ tone, duration, once, trigger, disabled }} delay={(delay ?? staggerDelay(order, stagger)) + staggerDelay(index, 0.05)}>{word}{"\u00a0"}</Reveal>)}
  </RevealGroup>;
}

/** Animate an image's existing frame, leaving image hover transforms independent. */
export function RevealImage(props: RevealProps) { return <Reveal variant="imageReveal" {...props} />; }

export function useEntrance(variant: "fade" | "scale" = "scale") {
  const entrance = useReveal({ variant, trigger: "mount", duration: animationConfig.duration.fast, delay: 0 });
  return { ...entrance, exit: entrance.variants.hidden };
}

export function RevealModal({ children, onFocusCapture, ...props }: ElementProps) {
  const entrance = useEntrance("scale");
  return <motion.div {...props} {...entrance} onFocusCapture={event => { entrance.onFocusCapture(); onFocusCapture?.(event); }}><BoundaryContext.Provider value>{children}</BoundaryContext.Provider></motion.div>;
}

export function RevealOverlay({ onFocusCapture, ...props }: HTMLMotionProps<"div">) {
  const entrance = useEntrance("fade");
  return <motion.div {...props} {...entrance} onFocusCapture={event => { entrance.onFocusCapture(); onFocusCapture?.(event); }} />;
}

export function useDrawerEntrance(side: "left" | "right" = "right") {
  const entrance = useEntrance("fade");
  const hidden = { ...entrance.variants.hidden, x: entrance.transition.duration === 0 ? 0 : side === "left" ? "-100%" : "100%" };
  return { ...entrance, variants: { hidden, visible: { opacity: 1, x: 0 } }, exit: hidden };
}
