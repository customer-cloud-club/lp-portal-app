import React from 'react';
import './Layout.css';

/**
 * Container component props
 */
export interface ContainerProps {
  /** Container content */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
  /** Container max width */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Center the container */
  centered?: boolean;
  /** Container padding */
  padding?: 'none' | 'small' | 'medium' | 'large';
}

/**
 * Grid component props
 */
export interface GridProps {
  /** Grid content */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
  /** Number of columns */
  columns?: 1 | 2 | 3 | 4 | 6 | 12;
  /** Gap between grid items */
  gap?: 'none' | 'small' | 'medium' | 'large';
  /** Grid responsive behavior */
  responsive?: boolean;
}

/**
 * Grid item component props
 */
export interface GridItemProps {
  /** Grid item content */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
  /** Column span */
  span?: 1 | 2 | 3 | 4 | 6 | 12;
  /** Column span on mobile */
  spanMobile?: 1 | 2 | 3 | 4 | 6 | 12;
  /** Column span on tablet */
  spanTablet?: 1 | 2 | 3 | 4 | 6 | 12;
}

/**
 * Flex component props
 */
export interface FlexProps {
  /** Flex content */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
  /** Flex direction */
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  /** Justify content */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  /** Align items */
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  /** Flex wrap */
  wrap?: boolean;
  /** Gap between flex items */
  gap?: 'none' | 'small' | 'medium' | 'large';
}

/**
 * Container component for consistent page layouts
 * @param props - Container component props
 * @returns JSX.Element
 */
export const Container: React.FC<ContainerProps> = ({
  children,
  className = '',
  maxWidth = 'lg',
  centered = true,
  padding = 'medium'
}) => {
  const baseClasses = 'container';
  const maxWidthClass = `container--${maxWidth}`;
  const centeredClass = centered ? 'container--centered' : '';
  const paddingClass = `container--padding-${padding}`;

  const classes = [
    baseClasses,
    maxWidthClass,
    centeredClass,
    paddingClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {children}
    </div>
  );
};

/**
 * Grid component for creating responsive layouts
 * @param props - Grid component props
 * @returns JSX.Element
 */
export const Grid: React.FC<GridProps> = ({
  children,
  className = '',
  columns = 12,
  gap = 'medium',
  responsive = true
}) => {
  const baseClasses = 'grid';
  const columnsClass = `grid--columns-${columns}`;
  const gapClass = `grid--gap-${gap}`;
  const responsiveClass = responsive ? 'grid--responsive' : '';

  const classes = [
    baseClasses,
    columnsClass,
    gapClass,
    responsiveClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {children}
    </div>
  );
};

/**
 * Grid item component
 * @param props - GridItem component props
 * @returns JSX.Element
 */
export const GridItem: React.FC<GridItemProps> = ({
  children,
  className = '',
  span = 1,
  spanMobile,
  spanTablet
}) => {
  const baseClasses = 'grid-item';
  const spanClass = `grid-item--span-${span}`;
  const spanMobileClass = spanMobile ? `grid-item--span-mobile-${spanMobile}` : '';
  const spanTabletClass = spanTablet ? `grid-item--span-tablet-${spanTablet}` : '';

  const classes = [
    baseClasses,
    spanClass,
    spanMobileClass,
    spanTabletClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {children}
    </div>
  );
};

/**
 * Flex component for flexible layouts
 * @param props - Flex component props
 * @returns JSX.Element
 */
export const Flex: React.FC<FlexProps> = ({
  children,
  className = '',
  direction = 'row',
  justify = 'start',
  align = 'stretch',
  wrap = false,
  gap = 'none'
}) => {
  const baseClasses = 'flex';
  const directionClass = `flex--${direction}`;
  const justifyClass = `flex--justify-${justify}`;
  const alignClass = `flex--align-${align}`;
  const wrapClass = wrap ? 'flex--wrap' : '';
  const gapClass = gap !== 'none' ? `flex--gap-${gap}` : '';

  const classes = [
    baseClasses,
    directionClass,
    justifyClass,
    alignClass,
    wrapClass,
    gapClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {children}
    </div>
  );
};
