import {
  AppliedEffects,
  ReadonlyAppliedEffects,
} from '@src/entities/applied-effects';
import { ActorType, ItemType } from '@src/entities/entity-types';
import type { ItemProxy } from '@src/entities/item/item';
import { localize } from '@src/foundry/localization';
import { ActorProxyBase, ActorProxyInit } from './actor-proxy-base';

export class Infomorph extends ActorProxyBase<ActorType.Infomorph> {
  #localEffects?: AppliedEffects;
  #outsideEffects?: ReadonlyAppliedEffects;
  readonly sleeved;

  constructor({
    activeEffects,
    sleeved,
    ...init
  }: ActorProxyInit<ActorType.Infomorph> & {
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

  get subtype() {
    return this.epData.subtype;
  }

  acceptItemAgent(agent: ItemProxy) {
    if ([ItemType.Psi, ItemType.Sleight].includes(agent.type)) {
      return {
        accept: false,
        override: false,
        rejectReason: `Can only add ${localize(
          agent.type,
        )} to character or ego.`,
      } as const;
    }
    if (agent.type === ItemType.Trait && !agent.isMorphTrait) {
      return {
        accept: false,
        override: false,
        rejectReason: 'Cannot add ego traits.',
      };
    }
    return { accept: true } as const;
  }
}