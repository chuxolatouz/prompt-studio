import type * as React from 'react';
import type {ButtonProps} from '@/components/ui/button';

export type BuilderCounter = {
  label: string;
  value: string;
};

export type BuilderExportAction = {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
};

export type BuilderAction = {
  id: string;
  label: string;
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
  title?: string;
  icon?: React.ReactNode;
  variant?: ButtonProps['variant'];
  exportItems?: BuilderExportAction[];
};

export type BuilderStep = {
  id: string;
  title: string;
  complete: boolean;
  hint?: string;
};

export type PreviewTab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

export type BuilderMobileSection = 'sidebar' | 'editor' | 'preview';
