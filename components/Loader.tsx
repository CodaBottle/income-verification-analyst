import React from 'react';

export const Loader: React.FC = () => (
  <div className="loader">
    <div className="loader-spinner" />
    <p className="text-small">Analyzing documents...</p>
  </div>
);
