import createEmotion from '@emotion/css/create-instance';
import { unsafeCSS } from 'lit-element';

export const createContainedStyles = (key: string) => {
  const styleContainer = document.createElement('template');
  const e = createEmotion({
    container: styleContainer,
    key,
    speedy: false
  });

  return {
    ...e,
    getCSSResult: () => {
      const result = unsafeCSS(styleContainer.textContent)
      e.flush()
      return result;
    }
  }
  
}

export const { css: containedCSS, getCSSResult: getContainedCSSResult } = createContainedStyles("overlay");
