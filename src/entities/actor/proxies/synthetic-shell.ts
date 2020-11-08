import {
  AppliedEffects,
  ReadonlyAppliedEffects,
} from '@src/entities/applied-effects';
import type { ActorType } from '@src/entities/entity-types';
import { ActorProxyBase, ActorProxyInit } from './actor-proxy-base';

export class SyntheticShell extends ActorProxyBase<ActorType.SyntheticShell> {
  #localEffects?: AppliedEffects;
  #outsideEffects?: ReadonlyAppliedEffects;
  readonly sleeved;

  constructor({
    activeEffects,
    sleeved,
    ...init
  }: ActorProxyInit<ActorType.SyntheticShell> & {
    activeEffects?: ReadonlyAppliedEffects;
    sleeved?: boolean;
  }) {
    super(init);
    if (!activeEffects) {
      this.#localEffects = new AppliedEffects();
      // TODO: Setup local effects;
    } else this.#outsideEffects = activeEffects;
    this.sleeved = sleeved;
  }

  get pools() {
    return this.epData.pools;
  }

  get subtype() {
    return this.epData.subtype;
  }
}
