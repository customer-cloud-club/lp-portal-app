import React from 'react';
import { ButtonHTMLAttributes } from 'react';
import './Button.css';

/**
 * Button component props
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  /** Button size */
  size?: 'small' | 'medium' | 'large';
  /** Loading state */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Icon element */
  icon?: React.ReactNode;
  /** Icon position */
  iconPosition?: 'left' | 'right';
}

/**
 * Reusable Button component with multiple variants and sizes
 * @param props - Button component props
 * @returns JSX.Element
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  disabled,
  className = '',
  ...rest
}) => {
  const baseClasses = 'btn';
  const variantClass = `btn--${variant}`;
  const sizeClass = `btn--${size}`;
  const loadingClass = loading ? 'btn--loading' : '';
  const fullWidthClass = fullWidth ? 'btn--full-width' : '';
  const disabledClass = (disabled || loading) ? 'btn--disabled' : '';

  const classes = [
    baseClasses,
    variantClass,
    sizeClass,
    loadingClass,
    fullWidthClass,
    disabledClass,
    className
  ].filter(Boolean).join(' ');

  const renderContent = (): React.ReactNode => {
    if (loading) {
      return (
        <>
          <span className="btn__spinner" />
          Loading...
        </>
      );
    }

    if (icon && iconPosition === 'left') {
      return (
        <>
          <span className="btn__icon btn__icon--left">{icon}</span>
          {children}
        </>
      );
    }

    if (icon && iconPosition === 'right') {
      return (
        <>
          {children}
          <span className="btn__icon btn__icon--right">{icon}</span>
        </>
      );
    }

    return children;
  };

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      {...rest}
    >
      {renderContent()}
    </button>
  );
};
