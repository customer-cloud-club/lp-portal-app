import React from 'react';
import './Card.css';

/**
 * Card component props
 */
export interface CardProps {
  /** Card content */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
  /** Card variant */
  variant?: 'default' | 'outlined' | 'elevated';
  /** Padding size */
  padding?: 'none' | 'small' | 'medium' | 'large';
  /** Card is clickable */
  clickable?: boolean;
  /** Click handler */
  onClick?: () => void;
}

/**
 * Card header component props
 */
export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card content component props
 */
export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card footer component props
 */
export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Reusable Card component with header, content, and footer sections
 * @param props - Card component props
 * @returns JSX.Element
 */
export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'medium',
  clickable = false,
  onClick
}) => {
  const baseClasses = 'card';
  const variantClass = `card--${variant}`;
  const paddingClass = `card--padding-${padding}`;
  const clickableClass = clickable ? 'card--clickable' : '';

  const classes = [
    baseClasses,
    variantClass,
    paddingClass,
    clickableClass,
    className
  ].filter(Boolean).join(' ');

  const handleClick = (): void => {
    if (clickable && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (clickable && onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={classes}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      {children}
    </div>
  );
};

/**
 * Card header component
 * @param props - CardHeader component props
 * @returns JSX.Element
 */
export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className = ''
}) => {
  const classes = ['card__header', className].filter(Boolean).join(' ');
  
  return (
    <div className={classes}>
      {children}
    </div>
  );
};

/**
 * Card content component
 * @param props - CardContent component props
 * @returns JSX.Element
 */
export const CardContent: React.FC<CardContentProps> = ({
  children,
  className = ''
}) => {
  const classes = ['card__content', className].filter(Boolean).join(' ');
  
  return (
    <div className={classes}>
      {children}
    </div>
  );
};

/**
 * Card footer component
 * @param props - CardFooter component props
 * @returns JSX.Element
 */
export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = ''
}) => {
  const classes = ['card__footer', className].filter(Boolean).join(' ');
  
  return (
    <div className={classes}>
      {children}
    </div>
  );
};
