import { createContext, useContext } from 'react';

const BrowseOnlyContext = createContext(false);

export function BrowseOnlyProvider({
  browseOnly,
  children,
}: {
  browseOnly: boolean;
  children: React.ReactNode;
}) {
  return <BrowseOnlyContext.Provider value={browseOnly}>{children}</BrowseOnlyContext.Provider>;
}

export function useBrowseOnly(): boolean {
  return useContext(BrowseOnlyContext);
}
