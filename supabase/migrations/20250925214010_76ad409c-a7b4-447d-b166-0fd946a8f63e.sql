-- Create exam assignment for current admin user and fix exam access

-- 1. Create exam assignment for the current admin user (reneycec@gmail.com)
INSERT INTO public.exam_assignments (
    exam_id,
    user_id,
    test_type,
    status,
    assigned_by,
    assigned_at,
    notified_at
) VALUES (
    '766d0bba-fea9-47c5-b6ea-581f4653b156',
    '479283fc-8aa6-4667-be03-be430c91c51c',
    'reliability',
    'notified',
    '479283fc-8aa6-4667-be03-be430c91c51c',
    NOW(),
    NOW()
) ON CONFLICT (user_id, exam_id) DO UPDATE SET
    status = 'notified',
    notified_at = NOW();

-- 2. Create exam session for the admin user
INSERT INTO public.exam_sessions (
    exam_id,
    user_id,
    status,
    test_type,
    max_attempts,
    attempts_taken
) VALUES (
    '766d0bba-fea9-47c5-b6ea-581f4653b156',
    '479283fc-8aa6-4667-be03-be430c91c51c',
    'pending',
    'reliability',
    2,
    0
) ON CONFLICT (exam_id, user_id) DO UPDATE SET
    status = 'pending',
    max_attempts = 2,
    updated_at = NOW();

-- 3. Also create session for the other user who has assignment but no session
INSERT INTO public.exam_sessions (
    exam_id,
    user_id,
    status,
    test_type,
    max_attempts,
    attempts_taken
) VALUES (
    '766d0bba-fea9-47c5-b6ea-581f4653b156',
    '347b0208-2c16-4cc8-b8ed-af58af936ad2',
    'pending',
    'reliability',
    2,
    0
) ON CONFLICT (exam_id, user_id) DO UPDATE SET
    status = 'pending',
    max_attempts = 2,
    updated_at = NOW();

-- 4. Make sure exam is active and has proper dates
UPDATE public.exams 
SET estado = 'activo',
    fecha_apertura = NOW() - INTERVAL '1 day',
    fecha_cierre = NOW() + INTERVAL '30 days',
    updated_at = NOW()
WHERE id = '766d0bba-fea9-47c5-b6ea-581f4653b156';

-- 5. Update assignment status for the other user too
UPDATE public.exam_assignments 
SET status = 'notified', 
    notified_at = NOW()
WHERE user_id = '347b0208-2c16-4cc8-b8ed-af58af936ad2' 
AND exam_id = '766d0bba-fea9-47c5-b6ea-581f4653b156';