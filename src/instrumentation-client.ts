import { z } from "zod";

/**
 * Executado no navegador antes da hidratação (antes de qualquer schema ser criado).
 *
 * O Zod 4 testa `new Function` ao criar cada `z.object()` para compilar validadores
 * (JIT). Como a CSP não permite `eval` em produção, o teste era bloqueado e gerava uma
 * violação no console. Sem o JIT, a validação continua idêntica, só sem compilação.
 */
z.config({ jitless: true });
