import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SearchBar from './SearchBar';

afterEach(cleanup);

describe('SearchBar', () => {
  it('renders a search field with the controlled value (7.1)', () => {
    render(<SearchBar value="rock" onChange={() => {}} />);

    const input = screen.getByRole('searchbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('rock');
  });

  it('reports each keystroke through onChange in real time (7.2)', () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);

    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'j' } });
    fireEvent.change(input, { target: { value: 'ja' } });
    fireEvent.change(input, { target: { value: 'jaz' } });

    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenNthCalledWith(1, 'j');
    expect(onChange).toHaveBeenNthCalledWith(2, 'ja');
    expect(onChange).toHaveBeenNthCalledWith(3, 'jaz');
  });

  it('reports an empty string when the field is cleared (7.3)', () => {
    const onChange = vi.fn();
    render(<SearchBar value="rock" onChange={onChange} />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('is accessible via its label', () => {
    render(<SearchBar value="" onChange={() => {}} />);

    expect(screen.getByLabelText('Buscar pistas')).toBeInTheDocument();
  });
});
