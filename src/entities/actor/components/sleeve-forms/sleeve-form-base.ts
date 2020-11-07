import type { MaybeToken } from '@src/entities/actor/actor';
import { LitElement, property } from 'lit-element';
import { FormDrawer } from '../../../components/form-layout/entity-form-drawer-mixin';

export class SleeveFormBase extends FormDrawer(LitElement) {
  @property({ attribute: false }) token?: MaybeToken;
}
