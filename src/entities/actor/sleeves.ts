import type { Biological } from "./proxies/biological";
import type { Infomorph } from "./proxies/infomorph";
import type { SyntheticShell } from "./proxies/synthetic-shell";

export type Sleeve = Biological | SyntheticShell | Infomorph;