// Flag global de "cambios sin guardar" del editor. Lo consulta la navegacion
// (sidebar, marca, cajon movil) para pedir confirmacion antes de salir del
// editor y perder el borrador.
let dirty = false;
export const setDirty = (v) => { dirty = !!v; };
export const isDirty = () => dirty;
export const MSG_SIN_GUARDAR = 'Hay cambios sin guardar. ¿Salir igualmente?';
