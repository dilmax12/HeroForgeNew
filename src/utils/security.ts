/**
 * Utilitários de segurança para o Forjador de Heróis
 */

/**
 * Sanitiza uma string para prevenir XSS
 * @param input String a ser sanitizada
 * @returns String sanitizada
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;')
    .replace(/\(/g, '&#40;')
    .replace(/\)/g, '&#41;');
};

/**
 * Valida um ID para garantir que seja alfanumérico e não contenha caracteres especiais
 * @param id ID a ser validado
 * @returns Booleano indicando se o ID é válido
 */
export const validateId = (id: string): boolean => {
  if (!id) return false;
  
  // Permite apenas letras, números, hífens e underscores
  const idRegex = /^[a-zA-Z0-9_-]+$/;
  return idRegex.test(id);
};

/**
 * Sanitiza um caminho de arquivo para prevenir path traversal
 * @param path Caminho a ser sanitizado
 * @returns Caminho sanitizado
 */
export const sanitizePath = (path: string): string => {
  if (!path) return '';
  
  // Remove caracteres que poderiam ser usados para path traversal
  return path
    .replace(/\.\.\//g, '')
    .replace(/\.\.\\/g, '')
    .replace(/[^a-zA-Z0-9_\-./]/g, '');
};

/**
 * Valida um objeto de dados para garantir que não contenha código malicioso
 * @param data Objeto a ser validado
 * @returns Objeto sanitizado
 */
export const validateAndSanitizeObject = <T extends Record<string, any>>(data: T): T => {
  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key];
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value) as any;
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = validateAndSanitizeObject(value);
    }
  });
  
  return sanitized;
};

/**
 * Configura cabeçalhos de segurança para a aplicação
 */
export const setupSecurityHeaders = (): void => {
  // Esta função é chamada no lado do cliente para configurar meta tags de segurança
  const head = document.head;
  
  // Content Security Policy
  if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
    const cspMeta = document.createElement('meta');
    cspMeta.httpEquiv = 'Content-Security-Policy';
    cspMeta.content = "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:;";
    head.appendChild(cspMeta);
  }
  
  // X-Content-Type-Options
  if (!document.querySelector('meta[http-equiv="X-Content-Type-Options"]')) {
    const xctoMeta = document.createElement('meta');
    xctoMeta.httpEquiv = 'X-Content-Type-Options';
    xctoMeta.content = 'nosniff';
    head.appendChild(xctoMeta);
  }
  
  // X-Frame-Options
  if (!document.querySelector('meta[http-equiv="X-Frame-Options"]')) {
    const xfoMeta = document.createElement('meta');
    xfoMeta.httpEquiv = 'X-Frame-Options';
    xfoMeta.content = 'DENY';
    head.appendChild(xfoMeta);
  }
};