export enum EP {
  Name = 'ep2e',
  Path = `systems/ep2e`,
  LocalizationNamespace = 'EP2E',
  Socket = `system.ep2e`,
}

export interface SystemSchema {
  name: EP.Name;
  title: string;
  description: string;
  version: number;
  author: string;
  scripts?: string[];
  esmodules?: string[];
  styles?: string[];
  languages: Record<'lang' | EP.Name | 'path', string>[];
  initiative?: string;
  gridDistance: number;
  gridUnits: string;
  minimumCoreVersion: string;
  socket?: boolean;
  packs?: (Record<'name' | 'label' | EP.Name | 'path', string> & {
    entity: 'Actor' | 'Item' | 'JournalEntry' | 'RollTable';
  })[];
  primaryTokenAttribute?: string;
  secondaryTokenAttribute?: string | null;
  url?: string;
  manifest?: string;
  download?: string;
  compatibleCoreVersion?: string;
}
