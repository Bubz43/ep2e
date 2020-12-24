import type { CanvasLayers } from './foundry-cont';
import type { SceneEP } from '../entities/scene';

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

export const createMeasuredTemplate = ({
  user = game.user.id,
  ...data
}: MeasuredTemplateData) => new MeasuredTemplate({ ...data, user });

type CanvasProps = {
  scene: SceneEP;
  stage: PIXI.Application['stage'];
  dimensions: Record<'size' | 'distance', number>;
  hud: HeadsUpDisplay;
  activeLayer: CanvasLayers[keyof CanvasLayers];
  app: PIXI.Application;
};

export const activeCanvas = () => {
  if (canvas instanceof Canvas && canvas.ready)
    return canvas as Omit<Canvas, keyof CanvasProps> &
      CanvasLayers &
      CanvasProps;
  return null;
};
