import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProgressBar from './ProgressBar';

describe('ProgressBar', () => {
  it('renders elapsed and total durations in formatted style', () => {
    render(<ProgressBar currentTime={65} duration={3661} onSeek={vi.fn()} />);

    // Elapsed 65s -> mm:ss, total 3661s (>= 1h) -> hh:mm:ss.
    expect(screen.getByText('01:05')).toBeInTheDocument();
    expect(screen.getByText('01:01:01')).toBeInTheDocument();
  });

  it('exposes an accessible range control bounded by the duration', () => {
    render(<ProgressBar currentTime={30} duration={200} onSeek={vi.fn()} />);

    const range = screen.getByRole('slider') as HTMLInputElement;
    expect(range.min).toBe('0');
    expect(range.max).toBe('200');
    expect(range.value).toBe('30');
    expect(range).not.toBeDisabled();
  });

  it('calls onSeek with the selected time when the user seeks', () => {
    const onSeek = vi.fn();
    render(<ProgressBar currentTime={0} duration={200} onSeek={onSeek} />);

    const range = screen.getByRole('slider');
    fireEvent.change(range, { target: { value: '120' } });

    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenCalledWith(120);
  });

  it('clamps the seek target to the duration', () => {
    const onSeek = vi.fn();
    render(<ProgressBar currentTime={0} duration={100} onSeek={onSeek} />);

    const range = screen.getByRole('slider');
    fireEvent.change(range, { target: { value: '150' } });

    expect(onSeek).toHaveBeenCalledWith(100);
  });

  it('renders a disabled control when explicitly disabled', () => {
    const onSeek = vi.fn();
    render(<ProgressBar currentTime={0} duration={200} onSeek={onSeek} disabled />);

    const range = screen.getByRole('slider');
    expect(range).toBeDisabled();
  });

  it('is disabled and shows zeroed times when there is no duration', () => {
    render(<ProgressBar currentTime={0} duration={0} onSeek={vi.fn()} />);

    const range = screen.getByRole('slider');
    expect(range).toBeDisabled();
    // Both current and total should read 00:00.
    expect(screen.getAllByText('00:00')).toHaveLength(2);
  });
});
