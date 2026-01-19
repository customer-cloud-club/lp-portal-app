/**
 * Layout component types and interfaces
 */

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Container max width */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Whether to center the container */
  centered?: boolean;
  /** Container children */
  children?: React.ReactNode;
}

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns */
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
  /** Gap between grid items */
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  /** Grid children */
  children?: React.ReactNode;
}

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Flex direction */
  direction?: 'row' | 'row-reverse' | 'col' | 'col-reverse';
  /** Flex wrap */
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
  /** Justify content */
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  /** Align items */
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
  /** Gap between flex items */
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  /** Flex children */
  children?: React.ReactNode;
}

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Stack spacing */
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
  /** Stack direction */
  direction?: 'vertical' | 'horizontal';
  /** Stack alignment */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** Stack children */
  children?: React.ReactNode;
}