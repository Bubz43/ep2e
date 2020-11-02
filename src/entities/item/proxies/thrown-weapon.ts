import type { ItemType } from '@src/entities/entity-types';
import mix from 'mix-with/lib';
import { Purchasable } from '../item-mixins';
import { ItemProxyBase } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.ThrownWeapon> {}
export class ThrownWeapon extends mix(Base).with(Purchasable)  {}
