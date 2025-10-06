# Documentación Completa del Sistema Plentum Verify

## Índice
1. [Arquitectura General](#arquitectura-general)
2. [Estructura de Base de Datos](#estructura-de-base-de-datos)
3. [Módulos del Sistema](#módulos-del-sistema)
4. [Estructura de Archivos](#estructura-de-archivos)
5. [Flujos de Trabajo](#flujos-de-trabajo)
6. [APIs y Funciones Edge](#apis-y-funciones-edge)
7. [Seguridad y Permisos](#seguridad-y-permisos)

---

## Arquitectura General

### Stack Tecnológico
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Estado**: React Query (TanStack Query)
- **Routing**: React Router DOM
- **Notificaciones**: Sonner + React Hot Toast

### Arquitectura del Sistema
```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Auth     │  │   Exams     │  │ Analytics   │         │
│  │   Module    │  │   Module    │  │   Module    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Users     │  │  Questions  │  │   Reports   │         │
│  │   Module    │  │   Module    │  │   Module    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                   SUPABASE BACKEND                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ PostgreSQL  │  │    Auth     │  │   Storage   │         │
│  │  Database   │  │   Service   │  │   Service   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Edge     │  │     RLS     │  │   Triggers  │         │
│  │ Functions   │  │  Policies   │  │ Functions   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## Estructura de Base de Datos

### Diagrama de Relaciones de Entidad (ERD)

```mermaid
erDiagram
    profiles ||--o{ exam_assignments : "assigned_to"
    profiles ||--o{ exam_attempts : "takes"
    profiles ||--o{ courses : "instructs"
    profiles ||--o{ course_enrollments : "enrolls_in"
    profiles ||--o{ role_change_audit : "changes_made_by"
    
    exams ||--o{ exam_assignments : "contains"
    exams ||--o{ exam_attempts : "attempted_on"
    exams ||--o{ exam_sessions : "session_for"
    exams ||--o{ exam_credentials : "credentials_for"
    exams ||--o{ examen_configuracion_categoria : "configured_with"
    
    question_categories ||--o{ questions : "categorizes"
    question_categories ||--o{ examen_configuracion_categoria : "included_in"
    
    questions ||--o{ respuesta_aplicante : "answered"
    
    exam_attempts ||--o{ resultado_categoria : "results_in"
    
    personality_questions ||--o{ personality_responses : "answered"
    personality_responses ||--o{ personality_results : "contributes_to"
    
    preguntas_cognitivas ||--o{ respuestas_cognitivas : "answered"
    respuestas_cognitivas ||--o{ resultados_cognitivos : "contributes_to"
    
    exam_assignments ||--o{ exam_email_notifications : "triggers"
    
    profiles {
        uuid id PK
        text full_name
        text email
        text company
        text area
        text section
        text role
        boolean can_login
        boolean access_restricted
        text photo_url
    }
    
    exams {
        uuid id PK
        uuid created_by FK
        text title
        text description
        text estado
        timestamp fecha_apertura
        timestamp fecha_cierre
        integer duracion_minutos
        boolean is_randomized
        jsonb questions_per_category
    }
    
    question_categories {
        uuid id PK
        uuid parent_id FK
        text name
        text description
        text codigo_categoria
        text national_average
    }
    
    questions {
        uuid id PK
        uuid category_id FK
        text question_text
        jsonb options
        text correct_answer
        numeric weight
        boolean is_control_question
    }
    
    exam_attempts {
        uuid id PK
        uuid exam_id FK
        uuid user_id FK
        jsonb questions
        jsonb answers
        numeric score
        jsonb risk_analysis
        boolean simulation_alert
        timestamp started_at
        timestamp completed_at
    }
    
    personality_questions {
        uuid id PK
        text question_text
        text ocean_factor
        text score_orientation
        jsonb likert_scale
        boolean is_active
    }
    
    preguntas_cognitivas {
        uuid id PK
        text area_cognitiva
        text texto_pregunta
        jsonb opciones_respuestas
        text respuesta_correcta_id
        text nivel_dificultad
        text estado
    }
```

### Tablas Principales

#### 1. **Gestión de Usuarios**
- `profiles`: Perfiles de usuario con información personal y roles
- `role_change_audit`: Auditoría de cambios de roles
- `test_users_audit`: Auditoría de usuarios de prueba

#### 2. **Sistema de Exámenes**
- `exams`: Definición de exámenes
- `exam_assignments`: Asignaciones de exámenes a usuarios
- `exam_attempts`: Intentos de exámenes realizados
- `exam_sessions`: Sesiones activas de exámenes
- `exam_credentials`: Credenciales para acceso a exámenes
- `exam_email_notifications`: Notificaciones enviadas

#### 3. **Preguntas y Categorías**
- `question_categories`: Categorías de preguntas
- `questions`: Preguntas psicométricas generales
- `preguntas_cognitivas`: Preguntas cognitivas específicas
- `preguntas_cognitivas_banco`: Banco de preguntas cognitivas
- `preguntas_cognitivas_propuestas`: Preguntas propuestas por IA
- `personality_questions`: Preguntas de personalidad OCEAN

#### 4. **Respuestas y Resultados**
- `respuesta_aplicante`: Respuestas de aplicantes
- `respuestas_cognitivas`: Respuestas a evaluaciones cognitivas
- `personality_responses`: Respuestas a tests de personalidad
- `resultado_categoria`: Resultados por categoría
- `resultados_cognitivos`: Resultados de evaluaciones cognitivas
- `personality_results`: Resultados de tests de personalidad

#### 5. **Configuración y Administración**
- `system_config`: Configuración global del sistema
- `report_config`: Configuración de reportes
- `baremo_cognitivo`: Baremos normativos cognitivos
- `psychometric_tests`: Tests psicométricos disponibles

#### 6. **Cursos y Educación**
- `courses`: Cursos disponibles
- `course_enrollments`: Inscripciones a cursos

---

## Módulos del Sistema

### 1. **Módulo de Autenticación** (`src/components/auth/`)
```
auth/
├── AuthProvider.tsx          # Context de autenticación
├── LoginForm.tsx            # Formulario de login
├── RegisterForm.tsx         # Formulario de registro
├── ForgotPasswordForm.tsx   # Recuperación de contraseña
└── RoleBasedRedirect.tsx    # Redirección basada en roles
```

**Funcionalidades:**
- Login/logout de usuarios
- Registro de nuevos usuarios
- Recuperación de contraseñas
- Gestión de sesiones
- Redirección basada en roles

**Relaciones:**
- Conecta con `profiles` table
- Utiliza Supabase Auth
- Integra con sistema de roles

### 2. **Módulo de Gestión de Usuarios** (`src/components/user-management/`)
```
user-management/
├── UserManagement.tsx       # Componente principal
├── UserList.tsx            # Lista de usuarios
├── CreateUserDialog.tsx    # Crear usuario
├── EditUserDialog.tsx      # Editar usuario
├── BulkImportDialog.tsx    # Importación masiva
├── UserFilters.tsx         # Filtros de usuario
└── UserStatsCards.tsx      # Estadísticas
```

**Funcionalidades:**
- CRUD de usuarios
- Gestión de roles y permisos
- Importación masiva vía CSV
- Filtrado y búsqueda
- Estadísticas de usuarios

**Relaciones:**
- Tabla `profiles`
- Tabla `role_change_audit`
- Sistema de autenticación

### 3. **Módulo de Exámenes** (`src/components/exam/`, `src/components/instructor-exam/`)
```
exam/
├── ExamSystem.tsx           # Sistema principal
├── ExamCreationForm.tsx     # Crear exámenes
├── ExamTaking.tsx          # Tomar exámenes
├── ExamResults.tsx         # Resultados
├── ExamTimer.tsx           # Temporizador
├── ExamNavigation.tsx      # Navegación
├── ExamQuestion.tsx        # Renderizado preguntas
└── ExamStatusBadge.tsx     # Estado del examen

instructor-exam/
├── InstructorExamManagement.tsx
├── ExamCreationTab.tsx
├── ExamAssignmentTab.tsx
└── ExamSelectionGrid.tsx
```

**Funcionalidades:**
- Creación y configuración de exámenes
- Asignación a usuarios/grupos
- Toma de exámenes con temporizador
- Análisis de resultados
- Detección de simulación
- Generación de reportes

**Relaciones:**
- Tablas: `exams`, `exam_attempts`, `exam_assignments`
- Módulo de preguntas
- Módulo de resultados
- Sistema de notificaciones

### 4. **Módulo de Preguntas** (`src/components/`)
```
preguntas/
├── QuestionManagement.tsx           # Gestión general
├── ConfiabilityQuestionManagement.tsx # Preguntas de confiabilidad
├── CategoryManagement.tsx          # Gestión de categorías
├── QuestionEditor.tsx             # Editor de preguntas
└── CategoryEditor.tsx             # Editor de categorías
```

**Funcionalidades:**
- CRUD de preguntas cognitivas y psicométricas
- Gestión de categorías
- Validación de preguntas
- Configuración de opciones de respuesta
- Gestión de baremos normativos

**Relaciones:**
- Tablas: `questions`, `question_categories`, `preguntas_cognitivas`
- Módulo de exámenes
- Sistema de evaluación

### 5. **Módulo de Evaluaciones Psicométricas**
```
psychometric/
├── PsychometricTests.tsx
├── PsychometricTestTaking.tsx
├── OceanPersonalityTest.tsx
├── EvaluacionCognitivaIntegral.tsx
└── PersonalityResultsViewer.tsx
```

**Funcionalidades:**
- Tests de personalidad OCEAN
- Evaluaciones cognitivas integrales
- Análisis psicométrico
- Interpretación de resultados
- Generación de perfiles

**Relaciones:**
- Tablas: `personality_questions`, `personality_results`, `resultados_cognitivos`
- Sistema de IA para interpretación
- Módulo de reportes

### 6. **Módulo de Reportes** (`src/components/report/`)
```
report/
├── ReportConfiguration.tsx
├── ReportPreview.tsx
├── ReportConfigurationContent.tsx
├── ReportConfigurationHeader.tsx
└── ReportPreviewContent.tsx
```

**Funcionalidades:**
- Configuración de reportes personalizados
- Previsualización de reportes
- Generación PDF
- Plantillas configurables
- Datos de empresa

**Relaciones:**
- Tabla `report_config`
- Edge function `generate-pdf-report`
- Módulo de resultados
- Sistema de archivos

### 7. **Módulo de Análisis** (`src/components/analytics/`)
```
analytics/
├── Analytics.tsx
├── SupervisorAnalyticsDashboard.tsx
└── RoleBasedAnalytics.tsx
```

**Funcionalidades:**
- Dashboards de análisis
- Métricas de rendimiento
- Análisis por roles
- Reportes estadísticos
- Visualización de datos

**Relaciones:**
- Todas las tablas de resultados
- Edge function `generate-statistical-report`
- Sistema de roles

### 8. **Módulo de Asignación de Exámenes** (`src/components/exam-assignment/`)
```
exam-assignment/
├── ExamAssignmentManager.tsx
├── CsvUpload.tsx
├── EmailService.tsx
├── FallbackEmailService.tsx
├── ManualDeliveryDialog.tsx
└── UserSelectionCard.tsx
```

**Funcionalidades:**
- Asignación individual y masiva
- Carga de usuarios vía CSV
- Envío de invitaciones por email
- Gestión de credenciales
- Seguimiento de notificaciones

**Relaciones:**
- Tablas: `exam_assignments`, `exam_email_notifications`, `exam_credentials`
- Edge function `send-exam-invitations`
- Sistema de email (Resend)

### 9. **Módulo de Supervisión** (`src/components/supervisor-assignment/`)
```
supervisor-assignment/
├── SupervisorAssignmentInterface.tsx
├── MassExamAssignment.tsx
└── ImprovedMassExamAssignment.tsx
```

**Funcionalidades:**
- Asignación masiva de supervisores
- Gestión de permisos de supervisión
- Interface de administración
- Control de acceso por áreas

**Relaciones:**
- Sistema de roles
- Módulo de usuarios
- Módulo de exámenes

### 10. **Módulo de Cursos** (`src/components/courses/`)
```
courses/
├── CourseManagement.tsx
├── CreateCourseDialog.tsx
├── EditCourseDialog.tsx
├── ViewCourseDialog.tsx
├── DeleteCourseDialog.tsx
├── CourseDetailsDialog.tsx
├── CourseContentManager.tsx
└── CourseActivityManager.tsx
```

**Funcionalidades:**
- CRUD de cursos
- Gestión de contenido
- Inscripción de estudiantes
- Seguimiento de actividades
- Gestión de instructores

**Relaciones:**
- Tablas: `courses`, `course_enrollments`
- Sistema de usuarios
- Módulo de exámenes

---

## Estructura de Archivos

### Arquitectura de Carpetas
```
src/
├── components/                  # Componentes reutilizables
│   ├── auth/                   # Autenticación
│   ├── ui/                     # Componentes UI base (shadcn)
│   ├── layout/                 # Componentes de layout
│   ├── exam/                   # Sistema de exámenes
│   ├── user-management/        # Gestión de usuarios
│   ├── report/                 # Sistema de reportes
│   ├── analytics/              # Análisis y métricas
│   ├── courses/                # Gestión de cursos
│   ├── exam-assignment/        # Asignación de exámenes
│   └── supervisor-assignment/  # Asignación de supervisores
├── hooks/                      # Custom hooks
│   ├── exam-assignment/        # Hooks de asignación
│   ├── useAuth.ts             # Hook de autenticación
│   ├── useExamData.ts         # Hook de datos de exámenes
│   └── useUserRole.ts         # Hook de roles
├── pages/                      # Páginas principales
│   ├── Index.tsx              # Dashboard principal
│   ├── Auth.tsx               # Página de autenticación
│   ├── ExamAccess.tsx         # Acceso a exámenes
│   ├── ExamSession.tsx        # Sesión de examen
│   ├── Profile.tsx            # Perfil de usuario
│   └── Security.tsx           # Configuración de seguridad
├── utils/                      # Utilidades
│   ├── examUtils.ts           # Utilidades de exámenes
│   ├── reportHtmlGenerator.ts # Generador de HTML
│   └── pageUtils.ts           # Utilidades de páginas
├── integrations/              # Integraciones externas
│   └── supabase/              # Configuración Supabase
├── types/                     # Definiciones de tipos
└── lib/                       # Librerías y configuraciones
```

### Hooks Personalizados

#### Hooks de Datos
- `useExamData`: Gestión de datos de exámenes
- `useExamAttempts`: Intentos de exámenes
- `useStudentExams`: Exámenes de estudiantes
- `useUserManagement`: Gestión de usuarios
- `useCourses`: Gestión de cursos

#### Hooks de Estado
- `useUserRole`: Gestión de roles de usuario
- `useExamSession`: Sesiones de examen
- `useExamTimer`: Temporizador de exámenes
- `useSessionTimer`: Temporizador de sesión

#### Hooks de UI
- `useKioskMode`: Modo kiosco para exámenes
- `useMobile`: Detección de dispositivos móviles
- `useToast`: Sistema de notificaciones

---

## Flujos de Trabajo

### 1. Flujo de Autenticación
```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend
    participant S as Supabase Auth
    participant D as Database
    
    U->>F: Ingresa credenciales
    F->>S: Autentica usuario
    S->>D: Verifica perfil
    D->>S: Retorna datos de perfil
    S->>F: Retorna sesión + usuario
    F->>U: Redirige según rol
```

### 2. Flujo de Creación de Examen
```mermaid
sequenceDiagram
    participant I as Instructor
    participant F as Frontend
    participant D as Database
    participant E as Edge Function
    
    I->>F: Crea examen
    F->>D: Guarda configuración
    I->>F: Selecciona preguntas
    F->>D: Configura categorías
    I->>F: Asigna usuarios
    F->>E: Envía invitaciones
    E->>I: Confirma envío
```

### 3. Flujo de Toma de Examen
```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend
    participant D as Database
    participant A as Análisis
    
    U->>F: Accede con credenciales
    F->>D: Valida acceso
    D->>F: Carga preguntas
    U->>F: Responde preguntas
    F->>D: Guarda respuestas
    U->>F: Finaliza examen
    F->>A: Procesa resultados
    A->>D: Guarda análisis
    D->>F: Retorna resultados
```

### 4. Flujo de Generación de Reportes
```mermaid
sequenceDiagram
    participant A as Admin
    participant F as Frontend
    participant D as Database
    participant E as Edge Function
    participant P as PDF Service
    
    A->>F: Configura reporte
    F->>D: Guarda configuración
    A->>F: Solicita generación
    F->>E: Llama función PDF
    E->>D: Obtiene datos
    E->>P: Genera PDF
    P->>E: Retorna archivo
    E->>F: Entrega URL
    F->>A: Muestra reporte
```

---

## APIs y Funciones Edge

### Edge Functions Disponibles

#### 1. `send-exam-invitations`
- **Propósito**: Envío masivo de invitaciones de examen
- **Input**: Lista de usuarios, configuración de examen
- **Output**: Confirmación de envío, credenciales generadas
- **Integración**: Resend API para emails

#### 2. `generate-pdf-report`
- **Propósito**: Generación de reportes PDF personalizados
- **Input**: Datos de examen, configuración de reporte
- **Output**: URL del PDF generado
- **Tecnología**: Puppeteer para renderizado

#### 3. `generate-statistical-report`
- **Propósito**: Análisis estadístico avanzado
- **Input**: Parámetros de análisis, rango de fechas
- **Output**: Datos estadísticos, gráficos
- **Funcionalidad**: Análisis de tendencias, comparativas

#### 4. `generar-preguntas-cognitivas`
- **Propósito**: Generación automática de preguntas vía IA
- **Input**: Parámetros de dificultad, área cognitiva
- **Output**: Preguntas generadas, opciones de respuesta
- **Integración**: OpenAI API

#### 5. `admin-user-management`
- **Propósito**: Gestión avanzada de usuarios
- **Input**: Operaciones CRUD, datos de usuario
- **Output**: Confirmación de operaciones
- **Seguridad**: Validación de permisos admin

### Integraciones Externas

#### Resend (Email Service)
- Envío de invitaciones
- Notificaciones del sistema
- Reportes por email
- Recuperación de contraseñas

#### OpenAI API
- Generación de preguntas cognitivas
- Análisis de respuestas
- Interpretación de resultados
- Recomendaciones personalizadas

---

## Seguridad y Permisos

### Sistema de Roles

#### Roles Definidos
1. **Admin**: Acceso completo al sistema
2. **Teacher/Instructor**: Gestión de exámenes y estudiantes
3. **Supervisor**: Supervisión de áreas específicas
4. **Student**: Acceso limitado a exámenes asignados

#### Matriz de Permisos

| Funcionalidad | Admin | Teacher | Supervisor | Student |
|---------------|-------|---------|------------|---------|
| Gestión de usuarios | ✅ | ❌ | ❌ | ❌ |
| Crear exámenes | ✅ | ✅ | ❌ | ❌ |
| Asignar exámenes | ✅ | ✅ | ✅ | ❌ |
| Ver todos los resultados | ✅ | ✅ | ✅ | ❌ |
| Tomar exámenes | ✅ | ✅ | ✅ | ✅ |
| Configurar sistema | ✅ | ❌ | ❌ | ❌ |
| Gestionar cursos | ✅ | ✅ | ❌ | ❌ |
| Ver análisis globales | ✅ | ✅ | ✅ | ❌ |

### Políticas RLS (Row Level Security)

#### Patrones de Seguridad Implementados

1. **Aislamiento por Usuario**
   ```sql
   -- Usuarios solo ven sus propios datos
   USING (auth.uid() = user_id)
   ```

2. **Acceso Basado en Roles**
   ```sql
   -- Admins y teachers tienen acceso ampliado
   USING (user_has_admin_or_teacher_role())
   ```

3. **Validación de Propiedad**
   ```sql
   -- Solo el creador puede modificar
   USING (auth.uid() = created_by)
   ```

4. **Restricciones de Dominio**
   ```sql
   -- Validación de estados y tipos permitidos
   WITH CHECK (estado IN ('activo', 'borrador', 'finalizado'))
   ```

### Funciones de Seguridad

#### Funciones de Validación
- `user_is_admin()`: Verifica rol de administrador
- `user_has_admin_or_teacher_role()`: Verifica roles educativos
- `validate_email_format()`: Validación de formato de email
- `is_exam_valid()`: Validación de estado de examen

#### Funciones de Auditoría
- `generate_role_permissions_audit()`: Auditoría de permisos
- Triggers automáticos para cambios de roles
- Logging de accesos y modificaciones

### Configuración de Seguridad

#### Autenticación
- **OTP Expiry**: 10 minutos para códigos de verificación
- **Password Policy**: Validación contra bases de contraseñas filtradas
- **Session Management**: Renovación automática de tokens
- **Multi-factor**: Preparado para implementación 2FA

#### Protección de Datos
- **Encriptación**: Datos sensibles encriptados en tránsito y reposo
- **Backup**: Respaldos automáticos de base de datos
- **Monitoring**: Monitoreo de accesos sospechosos
- **Rate Limiting**: Limitación de requests por IP

---

## Configuración de Despliegue

### Variables de Entorno Requeridas
```bash
# Supabase Configuration
SUPABASE_URL=https://popufimnleaubvlwyusb.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# External Services
RESEND_API_KEY=re_...
OPENAI_API_KEY=sk-...

# Database
SUPABASE_DB_URL=postgresql://postgres:[password]@...
```

### Checklist de Configuración

#### Supabase
- [ ] Configuración de autenticación
- [ ] Políticas RLS aplicadas
- [ ] Edge Functions desplegadas
- [ ] Storage buckets configurados
- [ ] Secrets configurados

#### DNS y Dominio
- [ ] Dominio apuntando a Lovable
- [ ] Certificados SSL configurados
- [ ] Redirects configurados

#### Seguridad
- [ ] OTP expiry configurado (10 min)
- [ ] Leaked password protection habilitado
- [ ] Rate limiting configurado
- [ ] Monitoring activado

---

## Mantenimiento y Monitoreo

### Métricas Clave
- Número de usuarios activos
- Exámenes completados por día
- Tiempo promedio de examen
- Tasa de finalización de exámenes
- Errores de sistema
- Rendimiento de Edge Functions

### Tareas de Mantenimiento
- Limpieza de sesiones expiradas
- Backup de resultados de exámenes
- Actualización de baremos normativos
- Revisión de logs de seguridad
- Optimización de consultas de base de datos

### Escalabilidad
- Optimización de consultas complejas
- Implementación de caché para datos frecuentes
- Balanceador de carga para Edge Functions
- Particionamiento de tablas grandes
- Implementación de CDN para recursos estáticos

---

Esta documentación proporciona una visión completa del sistema Plentum Verify, incluyendo su arquitectura, módulos, relaciones y configuraciones de seguridad. Es un sistema robusto diseñado para evaluaciones psicométricas y cognitivas a gran escala con alta seguridad y escalabilidad.