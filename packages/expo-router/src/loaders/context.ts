import { createContext } from 'react';

export const LoaderDataContext = createContext<Record<string, any> | null>(null);

export const LoaderDataProvider = LoaderDataContext.Provider;
