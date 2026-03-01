import footerTemplate from './footer.html?raw';
import './footer.css';

export function mountFooter(targetSelector) {
  const target = document.querySelector(targetSelector);
  if (!target) {
    return;
  }

  target.innerHTML = footerTemplate;
}
