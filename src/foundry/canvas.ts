export type MeasuredTemplateData = {
  t: keyof typeof CONFIG['MeasuredTemplate']['types'];
  user?: string;
  x: number;
  y: number;
  direction?: number;
  angle?: number;
  distance: number;
  borderColor?: string;
  fillColor: string;
  texture?: string;
};

export const createMeasuredTemplate = ({user = game.user.id, ...data}: MeasuredTemplateData) =>
  new MeasuredTemplate({...data, user});
