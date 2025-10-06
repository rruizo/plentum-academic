-- Insertar datos de prueba para el sistema HTP
-- Asegurar que existe un aviso legal activo
INSERT INTO legal_notice (id, title, content, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'AVISO LEGAL Y CONSENTIMIENTO INFORMADO - EVALUACIÓN HTP',
  'AVISO LEGAL Y CONSENTIMIENTO INFORMADO

Por medio del presente documento, usted otorga su consentimiento libre, voluntario e informado para participar en la evaluación psicológica mediante la técnica proyectiva House-Tree-Person (HTP).

PROPÓSITO DE LA EVALUACIÓN:
La prueba HTP es una técnica proyectiva que permite evaluar aspectos de la personalidad, estado emocional y características psicológicas a través del análisis de dibujos.

PROCEDIMIENTO:
Se le solicitará realizar un dibujo de una casa, un árbol y una persona, así como proporcionar una breve explicación de los mismos.

CONFIDENCIALIDAD:
Toda la información obtenida será tratada de forma estrictamente confidencial y será utilizada únicamente para los fines de evaluación psicológica establecidos.

DERECHOS DEL EVALUADO:
- Derecho a conocer los resultados de la evaluación
- Derecho a solicitar aclaraciones sobre el proceso
- Derecho a la confidencialidad de los datos

Al continuar con la evaluación, usted confirma que:
1. Ha leído y comprendido la información proporcionada
2. Acepta voluntariamente participar en la evaluación
3. Autoriza el procesamiento de sus datos para fines de evaluación psicológica

Fecha: [Fecha automática]',
  true,
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- Insertar una asignación de ejemplo para demostrar el sistema
INSERT INTO htp_assignments (id, user_id, assigned_by, access_link, status, expires_at, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  p.id as user_id,
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1) as assigned_by,
  '/htp-exam/' || gen_random_uuid() as access_link,
  'pending',
  now() + INTERVAL '7 days',
  now(),
  now()
FROM profiles p 
WHERE p.role = 'student' 
AND p.email = 'reneycec@gmail.com'
LIMIT 1;