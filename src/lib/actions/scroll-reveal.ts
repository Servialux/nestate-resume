/** Progressive enhancement: content is visible in SSR and without JavaScript. */
export function scrollReveal(node: HTMLElement, enabled = true) {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const seen = new WeakSet<Element>();
  const animations = new Map<Element, Animation>();
  const pending = new Set<Element>();
  let observer: IntersectionObserver | undefined;

  function stop() {
    observer?.disconnect();
    for (const animation of animations.values()) animation.cancel();
    animations.clear();
    for (const target of pending) target.classList.remove('reveal-pending');
    pending.clear();
  }

  function configure() {
    stop();
    if (!enabled || preference.matches || !('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver((entries) => {
      let stagger = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer?.unobserve(entry.target);
        seen.add(entry.target);
        pending.delete(entry.target);
        entry.target.classList.remove('reveal-pending');
        if (entry.target.contains(document.activeElement)) continue;
        const animation = entry.target.animate([
          { opacity: 0, transform: 'translateY(28px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 850, delay: Math.min(stagger++ * 65, 195), easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' });
        animations.set(entry.target, animation);
        animation.onfinish = () => { animations.delete(entry.target); };
      }
    }, { threshold: 0, rootMargin: `0px 0px -${Math.round(window.innerHeight * .1)}px 0px` });
    for (const target of node.querySelectorAll('[data-reveal]')) {
      // Leave the initial viewport, restored scroll position and anchor intact.
      if (seen.has(target) || target.getBoundingClientRect().top < window.innerHeight) {
        seen.add(target);
      } else {
        pending.add(target);
        target.classList.add('reveal-pending');
        observer.observe(target);
      }
    }
  }

  function showFocused(event: FocusEvent) {
    // Keyboard navigation must never land inside a transparent block.
    for (const target of pending) {
      if (event.target instanceof Node && target.contains(event.target)) {
        target.classList.remove('reveal-pending');
        pending.delete(target);
        seen.add(target);
        observer?.unobserve(target);
      }
    }
    for (const [target, animation] of animations) {
      if (event.target instanceof Node && target.contains(event.target)) {
        animation.cancel();
        animations.delete(target);
      }
    }
  }

  configure();
  preference.addEventListener('change', configure);
  node.addEventListener('focusin', showFocused);
  window.addEventListener('beforeprint', stop);
  window.addEventListener('afterprint', configure);
  return {
    update(value: boolean) { enabled = value; configure(); },
    destroy() {
      stop();
      preference.removeEventListener('change', configure);
      node.removeEventListener('focusin', showFocused);
      window.removeEventListener('beforeprint', stop);
      window.removeEventListener('afterprint', configure);
    }
  };
}
