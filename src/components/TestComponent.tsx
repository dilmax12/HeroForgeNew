import React from 'react';

const TestComponent: React.FC = () => {
  return (
    <div className="p-4 bg-blue-100 rounded-md">
      <h2 className="text-xl font-bold text-blue-800">Teste de Componente</h2>
      <p className="text-blue-600">Se você está vendo isso, o React está funcionando!</p>
      <button 
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => alert('Botão funcionando!')}
      >
        Testar Clique
      </button>
    </div>
  );
};

export default TestComponent;