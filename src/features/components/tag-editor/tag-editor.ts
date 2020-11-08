import { renderSelectField } from '@src/components/field/fields';
import { renderAutoForm, renderSubmitForm } from '@src/components/form/forms';
import { enumValues } from '@src/data-enums';
import { createTag, Tag, TagType } from '@src/features/tags';
import { localize } from '@src/foundry/localization';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
} from 'lit-element';
import { sort } from 'remeda';
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

  @internalProperty() private tagType = TagType.AllActions;

  private emitTag(tag: Tag) {
    this.dispatchEvent(new TagUpdatedEvent(tag));
  }

  render() {
    const { tagType } = this;
    const tag = createTag[tagType]({});
    return html`
      ${renderAutoForm({
        props: { tagType },
        update: ({ tagType }) => tagType && (this.tagType = tagType),
        fields: ({ tagType }) =>
          renderSelectField(
            tagType,
            sort(enumValues(TagType), (a, b) =>
              localize(a).localeCompare(localize(b)),
            ),
          ),
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
