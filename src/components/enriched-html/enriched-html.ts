import { tooltip } from '@src/init';
import { customElement, LitElement, property, html } from 'lit-element';
import { unsafeHTML } from 'lit-html/directives/unsafe-html';
import styles from './enriched-html.scss';

const findMatch = (ev: Event) => {
  for (const eventTarget of ev.composedPath()) {
    if (!(eventTarget instanceof HTMLAnchorElement)) return;
    ev.stopPropagation();

    if (ev.type === "click") {
      const dataLinkElement = eventTarget.closest("a[data-link]");
      if ((dataLinkElement) instanceof HTMLElement) {
        ev.preventDefault();
        fromUuid(dataLinkElement.dataset["uuid"])
          .then((doc) => doc?._onClickDocumentLink(ev));
      } else if (eventTarget.matches("a.inline-roll")) {

        if (eventTarget.classList.contains('inline-result')) {
          showRollTooltip(eventTarget)
        } else {
          eventTarget.addEventListener("click", foundry.applications.ux.TextEditor.implementation._onClickInlineRoll, { once: true })
          eventTarget.dispatchEvent(new Event("click", {
            bubbles: false
          }))
        }

      }
    } else if (ev instanceof DragEvent && ev.type === "dragstart") {
      onDragStart(ev, eventTarget)
    }

  }
};

async function showRollTooltip(anchor: HTMLElement) {
  const roll = Roll.fromJSON(unescape(anchor.dataset['roll']!)) as Roll
  const tooltipContent = (await roll.getTooltip()) as string;
  tooltip.attach({
    el: anchor,
    content: html`${unsafeHTML(tooltipContent)}`,
    position: 'left-start',
  });
}

function onDragStart(event: DragEvent, dataLinkElement: HTMLElement) {
  let dragData: unknown = null;

  const pack = game.packs.get(dataLinkElement.dataset["pack"] ?? "");

  if (pack) {
    let {
      id,
      lookup,
      uuid,
      type = pack.documentName,
    } = dataLinkElement.dataset;

    // If lookup is provided and pack index is available, try to find the entry
    if (lookup && pack.index.size) {
      const entry = pack.index.find(
        (i) => i._id === lookup || i.name === lookup,
      );
      if (entry) {
        id = entry._id;
      }
    }

    uuid ||= id ? (pack.getUuid(id) ?? undefined) : undefined;
    if (!uuid) {
      return;
    }

    dragData = {
      type: type || pack.documentName,
      uuid,
    };
  } else {
    dragData = foundry.utils.fromUuidSync(dataLinkElement.dataset["uuid"])
      ?.toDragData();
  }

  event.dataTransfer?.setData("text/plain", JSON.stringify(dragData));
}


@customElement('enriched-html')
export class EnrichedHTML extends LitElement {
  static get is() {
    return 'enriched-html' as const;
  }

  static styles = [styles];

  @property({ type: String }) content = '';

  enrichedContent: string = "";

  async performUpdate() {
    this.enrichedContent = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.content);
    return super.performUpdate()
  }

  connectedCallback() {
    this.addEventListener('click', findMatch, { capture: true });
    this.addEventListener('dragstart', findMatch);
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.removeEventListener('click', findMatch, { capture: true });
    this.removeEventListener('dragstart', findMatch);

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
