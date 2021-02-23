import { enableMapSet } from 'immer';
import 'web-animations-js';
import { overridePrototypes } from './foundry/prototype-overrides';
import './import-custom-elements';
import './init';

enableMapSet();
overridePrototypes();
