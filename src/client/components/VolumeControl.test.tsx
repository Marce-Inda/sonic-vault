import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import VolumeControl from './VolumeControl';

afterEach(cleanup);

describe('VolumeControl', () => {
  it('renders a slider with 1% increments across 0%–100% (3.7)', () => {
    render(
      <VolumeControl
        volume={0.5}
        isMuted={false}
        onVolumeChange={() => {}}
        onToggleMute={() => {}}
      />
    );

    const slider = screen.getByRole('slider', { name: 'Volumen' });
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '1');
    expect(slider).toHaveAttribute('step', '0.01');
    expect(slider).toHaveValue('0.5');
  });

  it('reports the new volume when the slider changes (3.7)', () => {
    const onVolumeChange = vi.fn();
    render(
      <VolumeControl
        volume={0.5}
        isMuted={false}
        onVolumeChange={onVolumeChange}
        onToggleMute={() => {}}
      />
    );

    fireEvent.change(screen.getByRole('slider', { name: 'Volumen' }), {
      target: { value: '0.73' },
    });

    expect(onVolumeChange).toHaveBeenCalledWith(0.73);
  });

  it('calls onToggleMute when the mute button is pressed (3.8)', () => {
    const onToggleMute = vi.fn();
    render(
      <VolumeControl
        volume={0.5}
        isMuted={false}
        onVolumeChange={() => {}}
        onToggleMute={onToggleMute}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Silenciar' }));

    expect(onToggleMute).toHaveBeenCalledTimes(1);
  });

  it('reflects the muted state: slider at 0 and unmute affordance (3.8, 3.9)', () => {
    render(
      <VolumeControl
        volume={0.8}
        isMuted
        onVolumeChange={() => {}}
        onToggleMute={() => {}}
      />
    );

    // Muted output shows the slider at 0 even though stored volume is 0.8.
    expect(screen.getByRole('slider', { name: 'Volumen' })).toHaveValue('0');

    const button = screen.getByRole('button', { name: 'Activar sonido' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('disables both controls when no track is active (5.6)', () => {
    render(
      <VolumeControl
        volume={0.5}
        isMuted={false}
        onVolumeChange={() => {}}
        onToggleMute={() => {}}
        disabled
      />
    );

    expect(screen.getByRole('slider', { name: 'Volumen' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Silenciar' })).toBeDisabled();
  });
});
