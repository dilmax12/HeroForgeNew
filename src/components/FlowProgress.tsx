import React from 'react';
import { useLocation } from 'react-router-dom';
import { FLOW_STEPS, getStepIndex } from '../utils/flow';

const StepDot: React.FC<{ active: boolean; done: boolean }> = ({ active, done }) => {
  const base = 'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold';
  const cls = done
    ? 'bg-amber-500 text-black'
    : active
    ? 'bg-amber-300 text-black'
    : 'bg-gray-600 text-gray-200';
  return <div className={`${base} ${cls}`}>{done ? '✓' : active ? '•' : ''}</div>;
};

export const FlowProgress: React.FC = () => {
  const { pathname } = useLocation();
  const currentIdx = getStepIndex(pathname);

  return (
    <div className="w-full py-2">
      <div className="flex items-center space-x-4">
        {FLOW_STEPS.map((step, idx) => {
          const active = idx === currentIdx;
          const done = idx < currentIdx;
          return (
            <div key={step.path} className="flex items-center">
              <div className="flex flex-col items-center">
                <StepDot active={active} done={done} />
                <span className={`mt-1 text-xs ${active ? 'text-amber-300' : 'text-gray-300'}`}>{step.label}</span>
              </div>
              {idx < FLOW_STEPS.length - 1 && (
                <div className={`w-10 h-0.5 mx-2 ${idx < currentIdx ? 'bg-amber-500' : 'bg-gray-600'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FlowProgress;

