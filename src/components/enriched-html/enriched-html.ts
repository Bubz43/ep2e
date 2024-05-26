import { tooltip } from '@src/init';
import { customElement, LitElement, property, html } from 'lit-element';
import { unsafeHTML } from 'lit-html/directives/unsafe-html';
import styles from './enriched-html.scss';

const findMatch = (ev: Event) => {
  for (const eventTarget of ev.composedPath()) {
    if (!(eventTarget instanceof HTMLAnchorElement)) return;
    ev.stopPropagation();

    if (eventTarget.matches('.content-link') && ev.type !== 'mouseover') {
      return entityLinkHandler($(eventTarget), ev.type);
    } else if (eventTarget.matches('.inline-roll') && ev.type !== 'mousedown') {
      return inlineRollHandler($(eventTarget), ev.type);
    }
  }
};

const entityLinkHandler = (anchor: JQuery, eventType: string) => {
  if (eventType === 'click')
    anchor.one('click', TextEditor._onClickContentLink).trigger('click');
  else if (eventType === 'mousedown') {
    anchor
      .one('dragstart', TextEditor._onDragContentLink)
      .one('mouseup', () =>
        anchor.off('dragstart', TextEditor._onDragContentLink),
      );
  }
};

const inlineRollHandler = async (anchor: JQuery, eventType: string) => {
  const [el] = anchor;
  if (!el) return;
  if (anchor.hasClass('inline-result')) {
    const roll = Roll.fromJSON(unescape(el.dataset['roll']!)) as Roll;
    const tooltipContent = (await roll.getTooltip()) as string;
    tooltip.attach({
      el,
      content: html`${unsafeHTML(tooltipContent)}`,
      position: 'left-start',
    });
  } else if (eventType !== 'mouseover')
    anchor.one('click', TextEditor._onClickInlineRoll).trigger('click');
};

@customElement('enriched-html')
export class EnrichedHTML extends LitElement {
  static get is() {
    return 'enriched-html' as const;
  }

  static styles = [styles];

  @property({ type: String }) content = '';

  enrichedContent: string = "";

  async performUpdate() {
   this.enrichedContent = await TextEditor.enrichHTML(this.content);
   return super.performUpdate()
  }

  connectedCallback() {
    this.addEventListener('click', findMatch, { capture: true });
    this.addEventListener('mousedown', findMatch);
    this.addEventListener('mouseover', findMatch);
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.removeEventListener('click', findMatch, { capture: true });
    this.removeEventListener('mousedown', findMatch);
    this.removeEventListener('mouseover', findMatch);

    super.disconnectedCallback();
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="fonts/fontawesome/css/all.min.css"
        media="all"
      />
      <link rel="stylesheet" href="css/mce.css" media="all" />
      ${unsafeHTML(
        this.enrichedContent
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'enriched-html': EnrichedHTML;
  }
}
