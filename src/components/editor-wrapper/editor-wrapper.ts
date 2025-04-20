import type { CircularProgress } from '@material/mwc-circular-progress';
import type { UpdateActions } from '@src/entities/update-store';
import { localize } from '@src/foundry/localization';
import { LazyGetter } from 'lazy-get-decorator';
import {
  customElement,
  LitElement,
  property,
  html,
  PropertyValues,
  query,
} from 'lit-element';
import type { Editor, RawEditorOptions } from 'tinymce';
import type { EnrichedHTML } from '../enriched-html/enriched-html';
import styles from './editor-wrapper.scss';

@customElement('editor-wrapper')
export class EditorWrapper extends LitElement {
  static get is() {
    return 'editor-wrapper' as const;
  }

  static styles = [styles];

  @property({
    attribute: false,
    type: Object,
    hasChanged() {
      return true;
    },
  })
  updateActions!: Pick<UpdateActions<string>, 'commit' | 'originalValue'>;

  @property({ type: Boolean }) disabled = false;

  @property({ type: String }) heading = '';

  @query('.spinner', true) private spinner!: CircularProgress;

  @query('enriched-html') contentArea!: EnrichedHTML;

  private editor: Editor | null = null;

  @LazyGetter()
  static get plugins() {
    const plugins = new Set(CONFIG.TinyMCE.plugins.split(' '));
    plugins.add('autoresize').delete('code');
    return [...plugins];
  }

  disconnectedCallback() {
    if (this.editor) this.editorSave(this.editor);
    super.disconnectedCallback();
  }

  updated(changedProps: PropertyValues<this>) {
    if (changedProps.has('disabled') && this.disabled) this.cleanupEditor();
  }

  private get content() {
    return this.updateActions.originalValue();
  }

  private get editorOptions(): RawEditorOptions {
    const { contentArea } = this;

    return {
      target: contentArea,
      setup: this.editorSetup,
      save_onsavecallback: this.editorSave,
      target_list: [{ title: 'New page', value: '_blank' }],
      toolbar:
        'styleselect bullist numlist image table hr link removeformat code',
      // autoresize_on_init: false,
      autoresize_overflow_padding: 10,
      min_height: 200,
      max_height: 400,
      plugins: EditorWrapper.plugins,
    };
  }

  private editorSetup = (mce: Editor) => {
    this.editor = mce;
  };

  private editorSave = (mce: Editor) => {
    const newContent = mce.getContent();
    // TODO: Trim tailing empty p tags/newlines
    this.cleanupEditor();
    this.save(newContent);
  };

  private cleanupEditor() {
    this.style.overflow = '';
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
  }

  private save(content: string) {
    if (content !== this.content) {
      try {
        this.updateContent(content);
      } catch (error) {
        console.log(error);
      }
    }
    this.requestUpdate();
  }

  private updateContent(content: string) {
    if (this.disabled) return;
    this.contentArea?.animate({ opacity: [0, 1] }, EditorWrapper.animOptions);
    this.updateActions.commit(content);
  }

  private static animOptions = {
    duration: 200,
    easing: 'ease-in-out',
    fill: 'forwards',
  } as const;

  private toggleEditor(ev: Event) {
    const clicked = ev.currentTarget as HTMLElement;
    clicked.style.pointerEvents = 'none';
    setTimeout(() => (clicked.style.pointerEvents = ''), 250);
    if (this.editor) {
      return this.editorSave(this.editor);
    }

    const { contentArea, content, editorOptions, spinner } = this;
    const opacity = [1, 0];
    const { animOptions } = EditorWrapper;
    spinner.closed = false;
    if (!contentArea) return;
    this.style.overflow = 'hidden';
    contentArea.animate({ opacity }, animOptions).onfinish = async () => {
      const editor = await TextEditor.create(editorOptions, content);
      editor.focus();
      contentArea.animate({ opacity: opacity.reverse() }, animOptions);
      this.requestUpdate();
      spinner.closed = true;
      this.style.overflow = '';
    };
  }

  render() {
    return html`
      <header>
        ${this.heading || localize('description')}
        <mwc-icon-button-toggle
          class="toggle"
          slot="actions"
          ?on=${!!this.editor}
          onIcon="save"
          offIcon="wysiwyg"
          ?disabled=${this.disabled}
          @click=${this.toggleEditor}
        ></mwc-icon-button-toggle>
      </header>

      <enriched-html .content=${this.content}></enriched-html>

      <mwc-circular-progress
        closed
        indeterminate
        class="spinner"
      ></mwc-circular-progress>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'editor-wrapper': EditorWrapper;
  }
}
