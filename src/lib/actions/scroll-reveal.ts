/** Content stays visible in SSR, without JavaScript, and when motion is reduced. */
export function scrollReveal(node: HTMLElement, enabled = true) {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let targets: HTMLElement[] = [];
  let frame = 0;
  let active = false;

  function render() {
    frame = 0;
    const height = window.innerHeight;
    // Tie the fade to scrolling, rather than a timer that can finish off screen.
    for (const target of targets) {
      const top = target.getBoundingClientRect().top;
      const progress = target.contains(document.activeElement)
        ? 1 : Math.max(0, Math.min(1, (height * .95 - top) / (height * .3)));
      target.style.setProperty('--reveal-opacity', String(progress));
      target.classList.add('reveal-active');
    }
  }

  function schedule() {
    if (active && !frame) frame = requestAnimationFrame(render);
  }

  function stop() {
    active = false;
    cancelAnimationFrame(frame);
    frame = 0;
    for (const target of targets) {
      target.classList.remove('reveal-active');
      target.style.removeProperty('--reveal-opacity');
    }
  }

  function configure() {
    stop();
    targets = Array.from(node.querySelectorAll<HTMLElement>('[data-reveal]'));
    active = enabled && !preference.matches;
    // Measure after Svelte has finished mounting the complete page.
    schedule();
  }

  configure();
  const resize = new ResizeObserver(schedule);
  resize.observe(node);
  preference.addEventListener('change', configure);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  node.addEventListener('focusin', schedule);
  node.addEventListener('focusout', schedule);
  window.addEventListener('beforeprint', stop);
  window.addEventListener('afterprint', configure);
  window.addEventListener('pageshow', configure);
  return {
    update(value: boolean) { enabled = value; configure(); },
    destroy() {
      stop();
      resize.disconnect();
      preference.removeEventListener('change', configure);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      node.removeEventListener('focusin', schedule);
      node.removeEventListener('focusout', schedule);
      window.removeEventListener('beforeprint', stop);
      window.removeEventListener('afterprint', configure);
      window.removeEventListener('pageshow', configure);
    }
  };
}
