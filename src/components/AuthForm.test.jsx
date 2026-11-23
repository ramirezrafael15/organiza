// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthForm from './AuthForm.jsx';
import Gate from './Gate.jsx';

describe('acceso con aprobación', () => {
  it('"Pedir acceso" avisa de no repetir contraseña y de que Rafa tiene que aceptar', () => {
    render(<AuthForm />);
    expect(screen.queryByText(/No uses la contraseña/i)).toBeNull();
    expect(screen.getByText('¿Has olvidado la contraseña?')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Pedir acceso' }));
    expect(screen.getByText(/No uses la contraseña que usas en otros sitios/i)).toBeTruthy();
    expect(screen.getByText(/Rafa tiene que aceptar tu cuenta/i)).toBeTruthy();
    expect(screen.getByPlaceholderText('Repite la contraseña')).toBeTruthy();
    expect(screen.queryByText('¿Has olvidado la contraseña?')).toBeNull();
  });
  it('la pantalla de espera existe', () => {
    render(<Gate />);
    expect(screen.getByText('Comprobando tu cuenta…')).toBeTruthy();
  });
});
