// Contraseña de una cuenta nueva: mínimo 8 caracteres, con letras y números.
export function passwordProblem(pw) {
  const p = String(pw ?? '');
  if (p.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(p) || !/\d/.test(p)) return 'La contraseña debe llevar letras y números.';
  return '';
}
