// Animated open/close for <details>. Adds `is-open` immediately so icons can
// transition in step with the height animation.
export function smoothDetails(selector = "details[data-smooth]") {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.querySelectorAll<HTMLDetailsElement>(selector).forEach((d) => {
    const summary = d.querySelector("summary");
    if (!summary) return;
    let anim: Animation | null = null;
    let closing = false;

    summary.addEventListener("click", (e) => {
      if (reduced.matches) {
        d.classList.toggle("is-open", !d.open);
        return;
      }
      e.preventDefault();
      const start = d.offsetHeight;
      const shouldClose = anim ? !closing : d.open;
      anim?.cancel();

      d.classList.toggle("is-open", !shouldClose);
      d.style.overflow = "hidden";
      let end: number;
      if (shouldClose) {
        end = summary.offsetHeight;
      } else {
        d.open = true;
        end = d.scrollHeight;
      }
      closing = shouldClose;

      anim = d.animate({ height: [`${start}px`, `${end}px`] }, { duration: 320, easing: "cubic-bezier(0.4, 0, 0.2, 1)" });
      anim.onfinish = () => {
        if (closing) d.open = false;
        anim = null;
        d.style.overflow = "";
      };
      anim.oncancel = () => {
        anim = null;
      };
    });
  });
}
