-- Script para obtener las respuestas de Rene Ruiz Olmedo (reneycec@gmail.com)
-- Tabla de respuestas organizadas con pregunta y respuesta

SELECT 
  pq.order_index,
  pq.question_text as pregunta,
  pq.ocean_factor as factor,
  CASE pr.response_value
    WHEN 1 THEN 'Totalmente en desacuerdo'
    WHEN 2 THEN 'En desacuerdo'
    WHEN 3 THEN 'Neutro'
    WHEN 4 THEN 'De acuerdo'
    WHEN 5 THEN 'Totalmente de acuerdo'
  END as respuesta,
  pr.response_value as valor_numerico
FROM personality_responses pr
JOIN personality_questions pq ON pr.question_id = pq.id
WHERE pr.user_id = '479283fc-8aa6-4667-be03-be430c91c51c'
ORDER BY pq.order_index;

-- Datos del usuario
-- Nombre: RENE RUIZ OLMEDO
-- Email: reneycec@gmail.com
-- ID: 479283fc-8aa6-4667-be03-be430c91c51c
-- Session ID: bd48586a-20d5-4ebc-95f9-86a51a771111

-- Respuestas específicas del usuario:
-- Pregunta | Respuesta Numérica (1-5) | Respuesta Textual
/*
Me siento abrumado por el estrés | 1 | Totalmente en desacuerdo
Me preocupo frecuentemente por las cosas | 5 | Totalmente de acuerdo
Busco experiencias emocionantes | 4 | De acuerdo
Guardo recibos y documentos importantes | 4 | De acuerdo
Suelo ser competitivo antes que colaborativo | 1 | Totalmente en desacuerdo
Me gusta soñar despierto | 4 | De acuerdo
Busco formas de mejorar mi desempeño | 2 | En desacuerdo
Tengo sueños vívidos y los recuerdo | 2 | En desacuerdo
Busco soluciones ganar-ganar | 2 | En desacuerdo
Postergo tareas aburridas | 3 | Neutro
A menudo me siento triste sin razón | 4 | De acuerdo
Tomo la iniciativa en grupos | 2 | En desacuerdo
Tengo un estado de ánimo estable | 4 | De acuerdo
Me gusta explorar diferentes formas de hacer las cosas | 5 | Totalmente de acuerdo
Busco la perfección en todo lo que hago | 5 | Totalmente de acuerdo
(... continúa con las 150 preguntas)
*/