import type { ItemType } from '@src/entities/entity-types';
import mix from 'mix-with/lib';
import { Equippable, Gear, Purchasable } from '../item-mixins';
import { ItemProxyBase } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.Railgun> { };
export class Railgun extends mix(Base).with(Purchasable, Gear, Equippable) {}
