// import removido: Location não é utilizado

export type FlowStep = { label: string; path: string };

export const FLOW_STEPS: FlowStep[] = [
  { label: 'Início', path: '/journey' },
  { label: 'Criar Herói', path: '/create' },
  { label: 'Ver Galeria', path: '/gallery' },
  { label: 'Missões', path: '/quests' },
  { label: 'Evolução', path: '/evolution' },
];

export const getStepIndex = (pathname: string): number => {
  const idx = FLOW_STEPS.findIndex((s) => pathname.startsWith(s.path));
  return idx >= 0 ? idx : 0;
};

export const getPrevPath = (pathname: string): string | null => {
  const idx = getStepIndex(pathname);
  if (idx <= 0) return null;
  return FLOW_STEPS[idx - 1].path;
};

export const getNextPath = (pathname: string): string | null => {
  const idx = getStepIndex(pathname);
  if (idx >= FLOW_STEPS.length - 1) return null;
  return FLOW_STEPS[idx + 1].path;
};
