/**
 * Card component types and interfaces
 */

export type CardVariant = 'default' | 'elevated' | 'outlined';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card variant style */
  variant?: CardVariant;
  /** Whether the card is hoverable */
  hoverable?: boolean;
  /** Whether the card is clickable */
  clickable?: boolean;
  /** Card children */
  children?: React.ReactNode;
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Header title */
  title?: string;
  /** Header subtitle */
  subtitle?: string;
  /** Header action element */
  action?: React.ReactNode;
  /** Header children */
  children?: React.ReactNode;
}

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Body children */
  children?: React.ReactNode;
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Footer children */
  children?: React.ReactNode;
}