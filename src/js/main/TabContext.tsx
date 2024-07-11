// TabContext.js
import React, { createContext, useState } from 'react';

export const TabContext = createContext({});

export const TabProvider = ({ children }: { children: React.ReactNode }) => {
  const [tabState, setTabState] = useState('defaultValue');

  return (
    <TabContext.Provider value={{ tabState, setTabState }}>
      {children}
    </TabContext.Provider>
  );
};
