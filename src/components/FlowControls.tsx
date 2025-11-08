import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getPrevPath, getNextPath } from '../utils/flow';
import { medievalTheme } from '../styles/medievalTheme';

export const FlowControls: React.FC = () => {
  const { pathname } = useLocation();
  const prev = getPrevPath(pathname);
  const next = getNextPath(pathname);

  return (
    <div className="w-full flex justify-between items-center py-2">
      <div>
        {prev ? (
          <Link
            to={prev}
            className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 inline-flex items-center"
          >
            <span className="mr-2">{medievalTheme.icons.ui.arrowLeft}</span> Anterior
          </Link>
        ) : (
          <span className="px-3 py-1 rounded bg-gray-800 text-gray-500 inline-flex items-center cursor-not-allowed">
            <span className="mr-2">{medievalTheme.icons.ui.arrowLeft}</span> Anterior
          </span>
        )}
      </div>
      <div>
        {next ? (
          <Link
            to={next}
            className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black inline-flex items-center"
          >
            Próximo <span className="ml-2">{medievalTheme.icons.ui.arrowRight}</span>
          </Link>
        ) : (
          <span className="px-3 py-1 rounded bg-gray-800 text-gray-500 inline-flex items-center cursor-not-allowed">
            Próximo <span className="ml-2">{medievalTheme.icons.ui.arrowRight}</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default FlowControls;

