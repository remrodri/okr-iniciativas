import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { IceConfigForm } from './IceConfigForm';

function renderForm(overrides: Partial<Parameters<typeof IceConfigForm>[0]> = {}) {
  const onSave = vi.fn();
  const onStart = vi.fn();
  render(
    <IceConfigForm
      initialConfig={null}
      locked={false}
      onSave={onSave}
      onStart={onStart}
      {...overrides}
    />,
  );
  return { onSave, onStart };
}

describe('configuración ICE', () => {
  afterEach(cleanup);

  it('mantiene un único método activo', async () => {
    const user = userEvent.setup();
    renderForm();

    const multiplicative = screen.getByRole('radio', {
      name: /Multiplicativo/,
    }) as HTMLInputElement;
    const weighted = screen.getByRole('radio', {
      name: /Ponderado/,
    }) as HTMLInputElement;

    expect(multiplicative.checked).toBe(true);
    await user.click(weighted);
    expect(weighted.checked).toBe(true);
    expect(multiplicative.checked).toBe(false);
  });

  it('impide guardar pesos que no suman 100 %', async () => {
    const { onSave } = renderForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole('radio', { name: /Ponderado/ }));
    await user.type(screen.getByLabelText('Peso de Impacto'), '50');
    await user.type(screen.getByLabelText('Peso de Confianza'), '20');
    await user.type(screen.getByLabelText('Peso de Facilidad'), '20');
    await user.click(
      screen.getByRole('button', { name: 'Guardar configuración' }),
    );

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/deben sumar exactamente 100/i)).toBeInTheDocument();
  });

  it('guarda pesos válidos y permite iniciar la evaluación', async () => {
    const { onSave, onStart } = renderForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole('radio', { name: /Ponderado/ }));
    const impact = screen.getByLabelText('Peso de Impacto');
    const confidence = screen.getByLabelText('Peso de Confianza');
    const ease = screen.getByLabelText('Peso de Facilidad');
    await user.clear(impact);
    await user.type(impact, '50');
    await user.clear(confidence);
    await user.type(confidence, '30');
    await user.clear(ease);
    await user.type(ease, '20');
    await user.click(
      screen.getByRole('button', { name: 'Guardar configuración' }),
    );

    expect(onSave).toHaveBeenCalledWith('WEIGHTED', {
      impact: 0.5,
      confidence: 0.3,
      ease: 0.2,
    });

    await user.click(
      screen.getByRole('button', { name: 'Iniciar evaluación ICE' }),
    );
    expect(onStart).toHaveBeenCalledWith('WEIGHTED', {
      impact: 0.5,
      confidence: 0.3,
      ease: 0.2,
    });
  });

  it('bloquea método y acciones al iniciar la evaluación', () => {
    renderForm({
      initialConfig: { method: 'MULTIPLICATIVE', weights: null },
      locked: true,
    });

    expect(screen.getByText(/está bloqueado/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Guardar configuración' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Iniciar evaluación ICE' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('radio', { name: /Multiplicativo/ }),
    ).toBeDisabled();
  });
});
