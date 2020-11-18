import { renderSelectField } from '@src/components/field/fields';
import { renderAutoForm, renderSubmitForm } from '@src/components/form/forms';
import { enumValues } from '@src/data-enums';
import { createTag, Tag, TagType } from '@src/features/tags';
import { localize } from '@src/foundry/localization';
import { LazyGetter } from 'lazy-get-decorator';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
} from 'lit-element';
import { difference, sort } from 'remeda';
import styles from './tag-editor.scss';
import { tagFields } from './tag-fields';
import { TagUpdatedEvent } from './tag-updated-event';

/**
 * @fires tag-updater
 */
@customElement('tag-editor')
export class TagEditor extends LitElement {
  static get is() {
    return 'tag-editor' as const;
  }

  static styles = [styles];

  @internalProperty() private tagType = TagType.Action;

  @LazyGetter()
  static get settableTagTypes() {
    return sort(difference(enumValues(TagType), [TagType.AllActions]), (a, b) =>
      localize(a).localeCompare(localize(b)),
    );
  }

  private emitTag(tag: Tag) {
    this.dispatchEvent(new TagUpdatedEvent(tag));
  }

  render() {
    const { tagType } = this;
    const tag = createTag[tagType]({});
    return html`
      ${renderAutoForm({
        noDebounce: true,
        props: { tagType },
        update: ({ tagType }) => tagType && (this.tagType = tagType),
        fields: ({ tagType }) =>
          renderSelectField(tagType, TagEditor.settableTagTypes),
      })}
      ${renderSubmitForm({
        classes: 'submit-form',
        props: tag,
        submitEmpty: true,
        update: (changed, orig) => this.emitTag({ ...orig, ...changed } as Tag),
        fields: tagFields,
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tag-editor': TagEditor;
  }
}
