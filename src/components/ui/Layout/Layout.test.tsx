import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Container, Grid, Flex, Stack } from './Layout';

describe('Layout Components', () => {
  describe('Container', () => {
    it('renders correctly with default props', () => {
      render(<Container>Container content</Container>);
      const container = screen.getByText('Container content');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('container', 'container--lg', 'container--centered');
    });

    it('renders with different max widths', () => {
      const { rerender } = render(<Container maxWidth="sm">Content</Container>);
      expect(screen.getByText('Content')).toHaveClass('container--sm');

      rerender(<Container maxWidth="xl">Content</Container>);
      expect(screen.getByText('Content')).toHaveClass('container--xl');

      rerender(<Container maxWidth="full">Content</Container>);
      expect(screen.getByText('Content')).toHaveClass('container--full');
    });

    it('handles centered prop', () => {
      const { rerender } = render(<Container centered={false}>Content</Container>);
      expect(screen.getByText('Content')).not.toHaveClass('container--centered');

      rerender(<Container centered>Content</Container>);
      expect(screen.getByText('Content')).toHaveClass('container--centered');
    });

    it('applies custom className', () => {
      render(<Container className="custom-container">Content</Container>);
      expect(screen.getByText('Content')).toHaveClass('custom-container');
    });
  });

  describe('Grid', () => {
    it('renders correctly with default props', () => {
      render(<Grid>Grid content</Grid>);
      const grid = screen.getByText('Grid content');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass('grid', 'grid--cols-1', 'grid--gap-md');
    });

    it('renders with different column counts', () => {
      const { rerender } = render(<Grid cols={2}>Content</Grid>);
      expect(screen.getByText('Content')).toHaveClass('grid--cols-2');

      rerender(<Grid cols={4}>Content</Grid>);
      expect(screen.getByText('Content')).toHaveClass('grid--cols-4');

      rerender(<Grid cols={12}>Content</Grid>);
      expect(screen.getByText('Content')).toHaveClass('grid--cols-12');
    });

    it('renders with different gaps', () => {
      const { rerender } = render(<Grid gap="sm">Content</Grid>);
      expect(screen.getByText('Content')).toHaveClass('grid--gap-sm');

      rerender(<Grid gap="lg">Content</Grid>);
      expect(screen.getByText('Content')).toHaveClass('grid--gap-lg');

      rerender(<Grid gap="xl">Content</Grid>);
      expect(screen.getByText('Content')).toHaveClass('grid--gap-xl');
    });
  });

  describe('Flex', () => {
    it('renders correctly with default props', () => {
      render(<Flex>Flex content</Flex>);
      const flex = screen.getByText('Flex content');
      expect(flex).toBeInTheDocument();
      expect(flex).toHaveClass(
        'flex',
        'flex--row',
        'flex--wrap',
        'flex--justify-start',
        'flex--align-start',
        'flex--gap-md'
      );
    });

    it('renders with different directions', () => {
      const { rerender } = render(<Flex direction="col">Content</Flex>);
      expect(screen.getByText('Content')).toHaveClass('flex--col');

      rerender(<Flex direction="row-reverse">Content</Flex>);
      expect(screen.getByText('Content')).toHaveClass('flex--row-reverse');

      rerender(<Flex direction="col-reverse">Content</Flex>);
      expect(screen.getByText('Content')).toHaveClass('flex--col-reverse');
    });

    it('renders with different wrap options', () => {
      const { rerender } = render(<Flex wrap="nowrap">Content</Flex>);
      expect(screen.getByText('Content')).toHaveClass('flex--nowrap');

      rerender(<Flex wrap="wrap-reverse">Content</Flex>);
      expect(screen.getByText('Content')).toHaveClass('flex--wrap-reverse');
    });

    it('renders with different justify options', () => {
      const { rerender } = render(<Flex justify="center">Content</Flex>);
      expect(screen.getByText('Content')).toHaveClass('flex--justify-center');

      rerender(<Flex justify="between">Content</Flex>);
      expect(screen.getByText('Content')).toHaveClass('flex--justify-between');

      rerender(<Flex justify="evenly">Content</Flex>);
      expect(screen.getByText('Content')).toHaveClass('flex--justify-evenly');
    });

    it('renders with different align options', () => {
      const { rerender } = render(<Flex align="center">Content</Flex>);
      expect(screen.getByText('Content')).toHaveClass('flex--align-center');

      rerender(<Flex align="end">Content</Flex>);
      expect(screen.getByText('Content')).toHaveClass('flex--align-end');

      rerender(<Flex align="stretch">Content</Flex>);
      expect(screen.getByText('Content')).toHaveClass('flex--align-stretch');
    });
  });

  describe('Stack', () => {
    it('renders correctly with default props', () => {
      render(<Stack>Stack content</Stack>);
      const stack = screen.getByText('Stack content');
      expect(stack).toBeInTheDocument();
      expect(stack).toHaveClass(
        'stack',
        'stack--vertical',
        'stack--spacing-md',
        'stack--align-stretch'
      );
    });

    it('renders with different directions', () => {
      const { rerender } = render(<Stack direction="horizontal">Content</Stack>);
      expect(screen.getByText('Content')).toHaveClass('stack--horizontal');

      rerender(<Stack direction="vertical">Content</Stack>);
      expect(screen.getByText('Content')).toHaveClass('stack--vertical');
    });

    it('renders with different spacing', () => {
      const { rerender } = render(<Stack spacing="sm">Content</Stack>);
      expect(screen.getByText('Content')).toHaveClass('stack--spacing-sm');

      rerender(<Stack spacing="lg">Content</Stack>);
      expect(screen.getByText('Content')).toHaveClass('stack--spacing-lg');

      rerender(<Stack spacing="xl">Content</Stack>);
      expect(screen.getByText('Content')).toHaveClass('stack--spacing-xl');
    });

    it('renders with different alignments', () => {
      const { rerender } = render(<Stack align="center">Content</Stack>);
      expect(screen.getByText('Content')).toHaveClass('stack--align-center');

      rerender(<Stack align="start">Content</Stack>);
      expect(screen.getByText('Content')).toHaveClass('stack--align-start');

      rerender(<Stack align="end">Content</Stack>);
      expect(screen.getByText('Content')).toHaveClass('stack--align-end');
    });
  });

  describe('Layout Integration', () => {
    it('renders nested layout components', () => {
      render(
        <Container maxWidth="xl">
          <Stack spacing="lg">
            <Grid cols={2} gap="md">
              <div>Grid Item 1</div>
              <div>Grid Item 2</div>
            </Grid>
            <Flex justify="between" align="center">
              <span>Left</span>
              <span>Right</span>
            </Flex>
          </Stack>
        </Container>
      );
      
      expect(screen.getByText('Grid Item 1')).toBeInTheDocument();
      expect(screen.getByText('Grid Item 2')).toBeInTheDocument();
      expect(screen.getByText('Left')).toBeInTheDocument();
      expect(screen.getByText('Right')).toBeInTheDocument();
    });
  });
});