import { customElement, LitElement, property, html } from 'lit-element';
import { unsafeHTML } from 'lit-html/directives/unsafe-html';
import styles from './enriched-html.scss';

const findMatch = (ev: Event) => {
  for (const eventTarget of ev.composedPath()) {
    if (!(eventTarget instanceof HTMLAnchorElement)) return;
    ev.stopPropagation();

    if (eventTarget.matches('.entity-link') && ev.type !== 'mouseover') {
      return entityLinkHandler($(eventTarget), ev.type);
    } else if (eventTarget.matches('.inline-roll') && ev.type !== 'mousedown') {
      return inlineRollHandler($(eventTarget), ev.type);
    }
  }
};

const entityLinkHandler = (anchor: JQuery, eventType: string) => {
  if (eventType === 'click')
    anchor.one('click', TextEditor._onClickEntityLink).trigger('click');
  else if (eventType === 'mousedown') {
    anchor
      .one('dragstart', TextEditor._onDragEntityLink)
      .one('mouseup', () =>
        anchor.off('dragstart', TextEditor._onDragEntityLink),
      );
  }
};

const inlineRollHandler = async (anchor: JQuery, eventType: string) => {
  if (anchor.hasClass('inline-result')) {
    const roll = Roll.fromJSON(unescape(anchor[0].dataset.roll!)) as Roll;
    const tooltip = (await roll.getTooltip()) as string;
    // TODO Re add this
    // overlay.tooltip.attach(
    //   { el: anchor[0], content: html`${unsafeHTML(tooltip)}`, position: "left-start" }    );
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

  connectedCallback() {
    this.addEventListener('click', findMatch);
    this.addEventListener('mousedown', findMatch);
    this.addEventListener('mouseover', findMatch);
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.removeEventListener('click', findMatch);
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
      ${unsafeHTML(TextEditor.enrichHTML(this.content))}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'enriched-html': EnrichedHTML;
  }
}
