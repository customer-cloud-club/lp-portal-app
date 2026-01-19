import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Card, CardHeader, CardBody, CardFooter } from './Card';

describe('Card Components', () => {
  describe('Card', () => {
    it('renders correctly with default props', () => {
      render(<Card>Card content</Card>);
      const card = screen.getByText('Card content');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('card', 'card--default');
    });

    it('renders with different variants', () => {
      const { rerender } = render(<Card variant="elevated">Content</Card>);
      expect(screen.getByText('Content')).toHaveClass('card--elevated');

      rerender(<Card variant="outlined">Content</Card>);
      expect(screen.getByText('Content')).toHaveClass('card--outlined');
    });

    it('handles hoverable state', () => {
      render(<Card hoverable>Hoverable card</Card>);
      expect(screen.getByText('Hoverable card')).toHaveClass('card--hoverable');
    });

    it('handles clickable state', () => {
      const handleClick = vi.fn();
      render(
        <Card clickable onClick={handleClick}>
          Clickable card
        </Card>
      );
      
      const card = screen.getByText('Clickable card');
      expect(card).toHaveClass('card--clickable');
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('tabIndex', '0');
      
      fireEvent.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not handle clicks when not clickable', () => {
      const handleClick = vi.fn();
      render(<Card onClick={handleClick}>Non-clickable card</Card>);
      
      fireEvent.click(screen.getByText('Non-clickable card'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('applies custom className', () => {
      render(<Card className="custom-card">Card</Card>);
      expect(screen.getByText('Card')).toHaveClass('custom-card');
    });
  });

  describe('CardHeader', () => {
    it('renders with title and subtitle', () => {
      render(
        <CardHeader title="Card Title" subtitle="Card Subtitle" />
      );
      
      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card Subtitle')).toBeInTheDocument();
      expect(screen.getByText('Card Title')).toHaveClass('card__title');
      expect(screen.getByText('Card Subtitle')).toHaveClass('card__subtitle');
    });

    it('renders with action element', () => {
      const action = <button>Action</button>;
      render(<CardHeader title="Title" action={action} />);
      
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Action').parentElement).toHaveClass('card__header-action');
    });

    it('renders children content', () => {
      render(
        <CardHeader>
          <div>Custom header content</div>
        </CardHeader>
      );
      
      expect(screen.getByText('Custom header content')).toBeInTheDocument();
    });
  });

  describe('CardBody', () => {
    it('renders body content', () => {
      render(<CardBody>Body content</CardBody>);
      
      const body = screen.getByText('Body content');
      expect(body).toBeInTheDocument();
      expect(body).toHaveClass('card__body');
    });

    it('applies custom className', () => {
      render(<CardBody className="custom-body">Body</CardBody>);
      expect(screen.getByText('Body')).toHaveClass('custom-body');
    });
  });

  describe('CardFooter', () => {
    it('renders footer content', () => {
      render(<CardFooter>Footer content</CardFooter>);
      
      const footer = screen.getByText('Footer content');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('card__footer');
    });

    it('applies custom className', () => {
      render(<CardFooter className="custom-footer">Footer</CardFooter>);
      expect(screen.getByText('Footer')).toHaveClass('custom-footer');
    });
  });

  describe('Complete Card Structure', () => {
    it('renders complete card with all components', () => {
      render(
        <Card variant="elevated" hoverable>
          <CardHeader 
            title="Complete Card" 
            subtitle="With all components"
            action={<button>Edit</button>}
          />
          <CardBody>
            This is the card body content with some text.
          </CardBody>
          <CardFooter>
            <button>Cancel</button>
            <button>Save</button>
          </CardFooter>
        </Card>
      );
      
      expect(screen.getByText('Complete Card')).toBeInTheDocument();
      expect(screen.getByText('With all components')).toBeInTheDocument();
      expect(screen.getByText('This is the card body content with some text.')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });
});