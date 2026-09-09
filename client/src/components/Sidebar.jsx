import React from 'react';
import AppSidebar from './AppSidebar';

/**
 * Re-exporting AppSidebar to maintain backward compatibility with any components
 * referencing the original Sidebar path.
 */
export default function Sidebar(props) {
  return <AppSidebar {...props} />;
}
