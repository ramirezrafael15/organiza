// La única instancia del repositorio de datos de toda la app.
// FASE 2: aquí se cambiará LocalRepository por FirebaseRepository (misma interfaz).
import { LocalRepository } from './repository.js';

export const repo = new LocalRepository();
