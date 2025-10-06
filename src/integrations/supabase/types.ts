export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_analysis_cache: {
        Row: {
          ai_analysis_result: Json
          analysis_type: string
          created_at: string
          exam_id: string | null
          expires_at: string | null
          generated_at: string
          id: string
          input_data: Json
          input_data_hash: string
          is_active: boolean
          model_used: string | null
          psychometric_test_id: string | null
          requested_by: string
          tokens_used: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis_result: Json
          analysis_type: string
          created_at?: string
          exam_id?: string | null
          expires_at?: string | null
          generated_at?: string
          id?: string
          input_data: Json
          input_data_hash: string
          is_active?: boolean
          model_used?: string | null
          psychometric_test_id?: string | null
          requested_by: string
          tokens_used?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis_result?: Json
          analysis_type?: string
          created_at?: string
          exam_id?: string | null
          expires_at?: string | null
          generated_at?: string
          id?: string
          input_data?: Json
          input_data_hash?: string
          is_active?: boolean
          model_used?: string | null
          psychometric_test_id?: string | null
          requested_by?: string
          tokens_used?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      baremo_cognitivo: {
        Row: {
          activo: boolean
          area_cognitiva: string
          desviacion_estandar: number | null
          fecha_actualizacion: string
          grupo_normativo: string
          id: string
          media: number | null
          n_muestra: number
          nivel_educativo: string | null
          percentil: number
          percentil_10: number | null
          percentil_25: number | null
          percentil_5: number | null
          percentil_50: number | null
          percentil_75: number | null
          percentil_90: number | null
          percentil_95: number | null
          puntuacion_maxima: number
          puntuacion_minima: number
          rango_edad: string | null
        }
        Insert: {
          activo?: boolean
          area_cognitiva: string
          desviacion_estandar?: number | null
          fecha_actualizacion?: string
          grupo_normativo: string
          id?: string
          media?: number | null
          n_muestra: number
          nivel_educativo?: string | null
          percentil: number
          percentil_10?: number | null
          percentil_25?: number | null
          percentil_5?: number | null
          percentil_50?: number | null
          percentil_75?: number | null
          percentil_90?: number | null
          percentil_95?: number | null
          puntuacion_maxima: number
          puntuacion_minima: number
          rango_edad?: string | null
        }
        Update: {
          activo?: boolean
          area_cognitiva?: string
          desviacion_estandar?: number | null
          fecha_actualizacion?: string
          grupo_normativo?: string
          id?: string
          media?: number | null
          n_muestra?: number
          nivel_educativo?: string | null
          percentil?: number
          percentil_10?: number | null
          percentil_25?: number | null
          percentil_5?: number | null
          percentil_50?: number | null
          percentil_75?: number | null
          percentil_90?: number | null
          percentil_95?: number | null
          puntuacion_maxima?: number
          puntuacion_minima?: number
          rango_edad?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          instructor_id: string
          is_active: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          instructor_id: string
          is_active?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          instructor_id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      credential_expiration_config: {
        Row: {
          created_at: string
          expiration_days: number
          id: string
          is_active: boolean
          test_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expiration_days?: number
          id?: string
          is_active?: boolean
          test_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expiration_days?: number
          id?: string
          is_active?: boolean
          test_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      exam_assignments: {
        Row: {
          access_link: string | null
          assigned_at: string | null
          assigned_by: string
          exam_id: string | null
          id: string
          manual_delivery: boolean | null
          notified_at: string | null
          psychometric_test_id: string | null
          status: string | null
          test_type: string
          user_id: string
        }
        Insert: {
          access_link?: string | null
          assigned_at?: string | null
          assigned_by: string
          exam_id?: string | null
          id?: string
          manual_delivery?: boolean | null
          notified_at?: string | null
          psychometric_test_id?: string | null
          status?: string | null
          test_type?: string
          user_id: string
        }
        Update: {
          access_link?: string | null
          assigned_at?: string | null
          assigned_by?: string
          exam_id?: string | null
          id?: string
          manual_delivery?: boolean | null
          notified_at?: string | null
          psychometric_test_id?: string | null
          status?: string | null
          test_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "test_users_audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_assignments_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_assignments_psychometric_test_id_fkey"
            columns: ["psychometric_test_id"]
            isOneToOne: false
            referencedRelation: "psychometric_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "test_users_audit"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          ai_analysis: Json | null
          ai_analysis_generated_at: string | null
          answers: Json | null
          completed_at: string | null
          created_at: string
          exam_id: string
          id: string
          personal_adjustment: number | null
          questions: Json
          risk_analysis: Json | null
          score: number | null
          score_adjusted: number | null
          score_base: number | null
          simulation_alert: boolean | null
          started_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          ai_analysis_generated_at?: string | null
          answers?: Json | null
          completed_at?: string | null
          created_at?: string
          exam_id: string
          id?: string
          personal_adjustment?: number | null
          questions: Json
          risk_analysis?: Json | null
          score?: number | null
          score_adjusted?: number | null
          score_base?: number | null
          simulation_alert?: boolean | null
          started_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          ai_analysis_generated_at?: string | null
          answers?: Json | null
          completed_at?: string | null
          created_at?: string
          exam_id?: string
          id?: string
          personal_adjustment?: number | null
          questions?: Json
          risk_analysis?: Json | null
          score?: number | null
          score_adjusted?: number | null
          score_base?: number | null
          simulation_alert?: boolean | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_category_results: {
        Row: {
          category_id: string
          created_at: string | null
          difference: number
          exam_attempt_id: string
          id: string
          population_average: string | null
          risk_interpretation: string
          simulation_alert: boolean | null
          total_questions: number
          total_score: number
        }
        Insert: {
          category_id: string
          created_at?: string | null
          difference: number
          exam_attempt_id: string
          id?: string
          population_average?: string | null
          risk_interpretation: string
          simulation_alert?: boolean | null
          total_questions: number
          total_score: number
        }
        Update: {
          category_id?: string
          created_at?: string | null
          difference?: number
          exam_attempt_id?: string
          id?: string
          population_average?: string | null
          risk_interpretation?: string
          simulation_alert?: boolean | null
          total_questions?: number
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_category_results_exam_attempt_id_fkey"
            columns: ["exam_attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_credentials: {
        Row: {
          created_at: string | null
          exam_id: string | null
          expires_at: string | null
          full_name: string | null
          id: string
          is_used: boolean | null
          password_hash: string
          psychometric_test_id: string | null
          sent_at: string | null
          test_type: string
          user_email: string
          username: string
        }
        Insert: {
          created_at?: string | null
          exam_id?: string | null
          expires_at?: string | null
          full_name?: string | null
          id?: string
          is_used?: boolean | null
          password_hash: string
          psychometric_test_id?: string | null
          sent_at?: string | null
          test_type?: string
          user_email: string
          username: string
        }
        Update: {
          created_at?: string | null
          exam_id?: string | null
          expires_at?: string | null
          full_name?: string | null
          id?: string
          is_used?: boolean | null
          password_hash?: string
          psychometric_test_id?: string | null
          sent_at?: string | null
          test_type?: string
          user_email?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_credentials_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_credentials_psychometric_test_id_fkey"
            columns: ["psychometric_test_id"]
            isOneToOne: false
            referencedRelation: "psychometric_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_email_notifications: {
        Row: {
          email_type: string | null
          exam_assignment_id: string | null
          exam_title: string
          id: string
          sent_at: string | null
          status: string | null
          user_email: string
          user_name: string
        }
        Insert: {
          email_type?: string | null
          exam_assignment_id?: string | null
          exam_title: string
          id?: string
          sent_at?: string | null
          status?: string | null
          user_email: string
          user_name: string
        }
        Update: {
          email_type?: string | null
          exam_assignment_id?: string | null
          exam_title?: string
          id?: string
          sent_at?: string | null
          status?: string | null
          user_email?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_email_notifications_exam_assignment_id_fkey"
            columns: ["exam_assignment_id"]
            isOneToOne: false
            referencedRelation: "exam_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_sessions: {
        Row: {
          attempts_taken: number
          company_id: string | null
          created_at: string
          end_time: string | null
          exam_id: string | null
          id: string
          max_attempts: number
          psychometric_test_id: string | null
          start_time: string | null
          status: string
          test_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts_taken?: number
          company_id?: string | null
          created_at?: string
          end_time?: string | null
          exam_id?: string | null
          id?: string
          max_attempts?: number
          psychometric_test_id?: string | null
          start_time?: string | null
          status?: string
          test_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts_taken?: number
          company_id?: string | null
          created_at?: string
          end_time?: string | null
          exam_id?: string | null
          id?: string
          max_attempts?: number
          psychometric_test_id?: string | null
          start_time?: string | null
          status?: string
          test_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_sessions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_sessions_psychometric_test_id_fkey"
            columns: ["psychometric_test_id"]
            isOneToOne: false
            referencedRelation: "psychometric_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      examen_configuracion_categoria: {
        Row: {
          categoria_id: string
          created_at: string
          examen_id: string
          id: string
          num_preguntas_a_incluir: number
        }
        Insert: {
          categoria_id: string
          created_at?: string
          examen_id: string
          id?: string
          num_preguntas_a_incluir?: number
        }
        Update: {
          categoria_id?: string
          created_at?: string
          examen_id?: string
          id?: string
          num_preguntas_a_incluir?: number
        }
        Relationships: [
          {
            foreignKeyName: "examen_configuracion_categoria_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "question_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examen_configuracion_categoria_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          description: string | null
          duracion_minutos: number | null
          estado: string | null
          fecha_apertura: string | null
          fecha_cierre: string | null
          id: string
          is_randomized: boolean | null
          psychometric_test_id: string | null
          questions_per_category: Json | null
          simulation_threshold: number | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          duracion_minutos?: number | null
          estado?: string | null
          fecha_apertura?: string | null
          fecha_cierre?: string | null
          id?: string
          is_randomized?: boolean | null
          psychometric_test_id?: string | null
          questions_per_category?: Json | null
          simulation_threshold?: number | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duracion_minutos?: number | null
          estado?: string | null
          fecha_apertura?: string | null
          fecha_cierre?: string | null
          id?: string
          is_randomized?: boolean | null
          psychometric_test_id?: string | null
          questions_per_category?: Json | null
          simulation_threshold?: number | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_exams_psychometric_test"
            columns: ["psychometric_test_id"]
            isOneToOne: false
            referencedRelation: "psychometric_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_reports: {
        Row: {
          created_at: string | null
          exam_id: string | null
          file_path: string
          file_size: number | null
          generation_metadata: Json | null
          id: string
          psychometric_test_id: string | null
          report_type: string
          storage_bucket: string | null
          template_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          exam_id?: string | null
          file_path: string
          file_size?: number | null
          generation_metadata?: Json | null
          id?: string
          psychometric_test_id?: string | null
          report_type: string
          storage_bucket?: string | null
          template_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          exam_id?: string | null
          file_path?: string
          file_size?: number | null
          generation_metadata?: Json | null
          id?: string
          psychometric_test_id?: string | null
          report_type?: string
          storage_bucket?: string | null
          template_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_psychometric_test_id_fkey"
            columns: ["psychometric_test_id"]
            isOneToOne: false
            referencedRelation: "psychometric_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "test_users_audit"
            referencedColumns: ["id"]
          },
        ]
      }
      htp_analysis: {
        Row: {
          analysis_content: Json
          created_at: string
          generated_at: string
          id: string
          openai_model_used: string
          submission_id: string
          tokens_used: number | null
          updated_at: string
          user_id: string
          word_count: number | null
        }
        Insert: {
          analysis_content: Json
          created_at?: string
          generated_at?: string
          id?: string
          openai_model_used: string
          submission_id: string
          tokens_used?: number | null
          updated_at?: string
          user_id: string
          word_count?: number | null
        }
        Update: {
          analysis_content?: Json
          created_at?: string
          generated_at?: string
          id?: string
          openai_model_used?: string
          submission_id?: string
          tokens_used?: number | null
          updated_at?: string
          user_id?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "htp_analysis_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "htp_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      htp_assignments: {
        Row: {
          access_link: string
          assigned_by: string
          created_at: string
          email_sent: boolean
          expires_at: string | null
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_link: string
          assigned_by: string
          created_at?: string
          email_sent?: boolean
          expires_at?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_link?: string
          assigned_by?: string
          created_at?: string
          email_sent?: boolean
          expires_at?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      htp_config: {
        Row: {
          created_at: string
          id: string
          max_words: number
          min_words: number
          openai_model: string
          system_prompt: string
          temperature: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_words?: number
          min_words?: number
          openai_model?: string
          system_prompt?: string
          temperature?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_words?: number
          min_words?: number
          openai_model?: string
          system_prompt?: string
          temperature?: number
          updated_at?: string
        }
        Relationships: []
      }
      htp_submissions: {
        Row: {
          analysis_generated: boolean
          analysis_generated_at: string | null
          assignment_id: string
          consent_timestamp: string | null
          created_at: string
          explanation_text: string | null
          id: string
          image_filename: string
          image_size: number | null
          image_url: string
          legal_consent: boolean
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_generated?: boolean
          analysis_generated_at?: string | null
          assignment_id: string
          consent_timestamp?: string | null
          created_at?: string
          explanation_text?: string | null
          id?: string
          image_filename: string
          image_size?: number | null
          image_url: string
          legal_consent?: boolean
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_generated?: boolean
          analysis_generated_at?: string | null
          assignment_id?: string
          consent_timestamp?: string | null
          created_at?: string
          explanation_text?: string | null
          id?: string
          image_filename?: string
          image_size?: number | null
          image_url?: string
          legal_consent?: boolean
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "htp_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "htp_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_consent_log: {
        Row: {
          accepted_at: string
          consent_type: string
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_email: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string
          consent_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string
          consent_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      legal_notice: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      personal_factors: {
        Row: {
          ajuste_total: number
          created_at: string
          edad: number
          estado_civil: string
          exam_id: string | null
          id: string
          session_id: string | null
          situacion_habitacional: string
          tiene_hijos: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ajuste_total?: number
          created_at?: string
          edad: number
          estado_civil: string
          exam_id?: string | null
          id?: string
          session_id?: string | null
          situacion_habitacional: string
          tiene_hijos: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ajuste_total?: number
          created_at?: string
          edad?: number
          estado_civil?: string
          exam_id?: string | null
          id?: string
          session_id?: string | null
          situacion_habitacional?: string
          tiene_hijos?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_factors_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      personality_questions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          likert_scale: Json
          ocean_factor: string
          order_index: number
          question_text: string
          score_orientation: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          likert_scale?: Json
          ocean_factor: string
          order_index?: number
          question_text: string
          score_orientation?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          likert_scale?: Json
          ocean_factor?: string
          order_index?: number
          question_text?: string
          score_orientation?: string
          updated_at?: string
        }
        Relationships: []
      }
      personality_responses: {
        Row: {
          created_at: string
          id: string
          question_id: string
          response_value: number
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          response_value: number
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          response_value?: number
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personality_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "personality_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      personality_results: {
        Row: {
          afiliacion_score: number | null
          ai_analysis_generated_at: string | null
          ai_interpretation: Json | null
          amabilidad_score: number
          apertura_score: number
          autonomia_score: number | null
          created_at: string
          extraversion_score: number
          id: string
          logro_score: number | null
          neuroticismo_score: number
          personal_adjustment: number | null
          poder_score: number | null
          reconocimiento_score: number | null
          responsabilidad_score: number
          scores_adjusted: Json | null
          scores_base: Json | null
          seguridad_score: number | null
          session_id: string
          user_id: string
        }
        Insert: {
          afiliacion_score?: number | null
          ai_analysis_generated_at?: string | null
          ai_interpretation?: Json | null
          amabilidad_score: number
          apertura_score: number
          autonomia_score?: number | null
          created_at?: string
          extraversion_score: number
          id?: string
          logro_score?: number | null
          neuroticismo_score: number
          personal_adjustment?: number | null
          poder_score?: number | null
          reconocimiento_score?: number | null
          responsabilidad_score: number
          scores_adjusted?: Json | null
          scores_base?: Json | null
          seguridad_score?: number | null
          session_id: string
          user_id: string
        }
        Update: {
          afiliacion_score?: number | null
          ai_analysis_generated_at?: string | null
          ai_interpretation?: Json | null
          amabilidad_score?: number
          apertura_score?: number
          autonomia_score?: number | null
          created_at?: string
          extraversion_score?: number
          id?: string
          logro_score?: number | null
          neuroticismo_score?: number
          personal_adjustment?: number | null
          poder_score?: number | null
          reconocimiento_score?: number | null
          responsabilidad_score?: number
          scores_adjusted?: Json | null
          scores_base?: Json | null
          seguridad_score?: number | null
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      preguntas_cognitivas: {
        Row: {
          aprobado_por_id: string | null
          area_cognitiva: string
          created_at: string
          estado: string
          explicacion_respuesta: string | null
          fecha_aprobacion: string | null
          fecha_creacion: string
          id: string
          nivel_dificultad: string
          opciones_respuestas: Json
          recurso_visual_url: string | null
          respuesta_correcta_id: string
          texto_instruccion: string | null
          texto_pregunta: string | null
          tiempo_limite_segundos: number | null
          tipo_formato_interaccion: string
          updated_at: string
          version: number
        }
        Insert: {
          aprobado_por_id?: string | null
          area_cognitiva: string
          created_at?: string
          estado?: string
          explicacion_respuesta?: string | null
          fecha_aprobacion?: string | null
          fecha_creacion?: string
          id?: string
          nivel_dificultad: string
          opciones_respuestas: Json
          recurso_visual_url?: string | null
          respuesta_correcta_id: string
          texto_instruccion?: string | null
          texto_pregunta?: string | null
          tiempo_limite_segundos?: number | null
          tipo_formato_interaccion: string
          updated_at?: string
          version?: number
        }
        Update: {
          aprobado_por_id?: string | null
          area_cognitiva?: string
          created_at?: string
          estado?: string
          explicacion_respuesta?: string | null
          fecha_aprobacion?: string | null
          fecha_creacion?: string
          id?: string
          nivel_dificultad?: string
          opciones_respuestas?: Json
          recurso_visual_url?: string | null
          respuesta_correcta_id?: string
          texto_instruccion?: string | null
          texto_pregunta?: string | null
          tiempo_limite_segundos?: number | null
          tipo_formato_interaccion?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      preguntas_cognitivas_banco: {
        Row: {
          aprobado_por_id: string | null
          area_cognitiva: string
          created_at: string
          enunciado_pregunta: string | null
          estado_validacion: string
          explicacion_respuesta_interna: string | null
          fecha_creacion: string
          fecha_ultima_modificacion: string
          id_pregunta: string
          nivel_dificultad: string
          opciones_respuesta_json: Json
          recurso_visual_url: string | null
          respuesta_correcta_id: string | null
          sub_area_tipo: string
          texto_instruccion: string | null
          tiempo_limite_segundos: number | null
          tipo_respuesta_interaccion: string
          updated_at: string
          valor_respuesta_correcta_numerica: number | null
        }
        Insert: {
          aprobado_por_id?: string | null
          area_cognitiva: string
          created_at?: string
          enunciado_pregunta?: string | null
          estado_validacion?: string
          explicacion_respuesta_interna?: string | null
          fecha_creacion?: string
          fecha_ultima_modificacion?: string
          id_pregunta?: string
          nivel_dificultad: string
          opciones_respuesta_json: Json
          recurso_visual_url?: string | null
          respuesta_correcta_id?: string | null
          sub_area_tipo: string
          texto_instruccion?: string | null
          tiempo_limite_segundos?: number | null
          tipo_respuesta_interaccion?: string
          updated_at?: string
          valor_respuesta_correcta_numerica?: number | null
        }
        Update: {
          aprobado_por_id?: string | null
          area_cognitiva?: string
          created_at?: string
          enunciado_pregunta?: string | null
          estado_validacion?: string
          explicacion_respuesta_interna?: string | null
          fecha_creacion?: string
          fecha_ultima_modificacion?: string
          id_pregunta?: string
          nivel_dificultad?: string
          opciones_respuesta_json?: Json
          recurso_visual_url?: string | null
          respuesta_correcta_id?: string | null
          sub_area_tipo?: string
          texto_instruccion?: string | null
          tiempo_limite_segundos?: number | null
          tipo_respuesta_interaccion?: string
          updated_at?: string
          valor_respuesta_correcta_numerica?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "preguntas_cognitivas_banco_aprobado_por_id_fkey"
            columns: ["aprobado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preguntas_cognitivas_banco_aprobado_por_id_fkey"
            columns: ["aprobado_por_id"]
            isOneToOne: false
            referencedRelation: "test_users_audit"
            referencedColumns: ["id"]
          },
        ]
      }
      preguntas_cognitivas_propuestas: {
        Row: {
          area_cognitiva: string
          created_at: string
          estado: string
          explicacion_respuesta: string | null
          generado_por: string | null
          id: string
          nivel_dificultad: string
          opciones_respuestas: Json
          recurso_visual_url: string | null
          respuesta_correcta_id: string
          texto_instruccion: string | null
          texto_pregunta: string | null
          tiempo_limite_segundos: number | null
          tipo_formato_interaccion: string
          updated_at: string
          version: number
        }
        Insert: {
          area_cognitiva: string
          created_at?: string
          estado?: string
          explicacion_respuesta?: string | null
          generado_por?: string | null
          id?: string
          nivel_dificultad: string
          opciones_respuestas: Json
          recurso_visual_url?: string | null
          respuesta_correcta_id: string
          texto_instruccion?: string | null
          texto_pregunta?: string | null
          tiempo_limite_segundos?: number | null
          tipo_formato_interaccion: string
          updated_at?: string
          version?: number
        }
        Update: {
          area_cognitiva?: string
          created_at?: string
          estado?: string
          explicacion_respuesta?: string | null
          generado_por?: string | null
          id?: string
          nivel_dificultad?: string
          opciones_respuestas?: Json
          recurso_visual_url?: string | null
          respuesta_correcta_id?: string
          texto_instruccion?: string | null
          texto_pregunta?: string | null
          tiempo_limite_segundos?: number | null
          tipo_formato_interaccion?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_restricted: boolean | null
          area: string
          can_login: boolean | null
          company: string
          company_id: string | null
          created_at: string
          email: string
          exam_completed: boolean | null
          full_name: string
          id: string
          last_exam_completed_at: string | null
          photo_url: string | null
          report_contact: string
          role: string
          section: string
          temp_password: boolean | null
          updated_at: string
        }
        Insert: {
          access_restricted?: boolean | null
          area: string
          can_login?: boolean | null
          company: string
          company_id?: string | null
          created_at?: string
          email: string
          exam_completed?: boolean | null
          full_name: string
          id: string
          last_exam_completed_at?: string | null
          photo_url?: string | null
          report_contact: string
          role?: string
          section: string
          temp_password?: boolean | null
          updated_at?: string
        }
        Update: {
          access_restricted?: boolean | null
          area?: string
          can_login?: boolean | null
          company?: string
          company_id?: string | null
          created_at?: string
          email?: string
          exam_completed?: boolean | null
          full_name?: string
          id?: string
          last_exam_completed_at?: string | null
          photo_url?: string | null
          report_contact?: string
          role?: string
          section?: string
          temp_password?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      psychometric_tests: {
        Row: {
          created_at: string
          description: string
          duration_minutes: number
          id: string
          interpretation_template: string
          is_active: boolean
          max_attempts: number
          name: string
          questions_count: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          duration_minutes?: number
          id?: string
          interpretation_template: string
          is_active?: boolean
          max_attempts?: number
          name: string
          questions_count?: number
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          duration_minutes?: number
          id?: string
          interpretation_template?: string
          is_active?: boolean
          max_attempts?: number
          name?: string
          questions_count?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      question_categories: {
        Row: {
          codigo_categoria: string | null
          created_at: string
          description: string | null
          explicacion: string | null
          id: string
          name: string
          national_average: string | null
          nombre: string
          parent_id: string | null
        }
        Insert: {
          codigo_categoria?: string | null
          created_at?: string
          description?: string | null
          explicacion?: string | null
          id?: string
          name: string
          national_average?: string | null
          nombre: string
          parent_id?: string | null
        }
        Update: {
          codigo_categoria?: string | null
          created_at?: string
          description?: string | null
          explicacion?: string | null
          id?: string
          name?: string
          national_average?: string | null
          nombre?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "question_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          category_id: string
          correct_answer: string | null
          created_at: string
          difficulty_level: number | null
          id: string
          is_control_question: boolean | null
          media_poblacional_pregunta: string | null
          metadata: Json | null
          national_average: number | null
          opciones_respuesta_fijas: Json | null
          options: Json
          question_text: string
          question_type: string
          texto_pregunta: string | null
          weight: number | null
        }
        Insert: {
          category_id: string
          correct_answer?: string | null
          created_at?: string
          difficulty_level?: number | null
          id?: string
          is_control_question?: boolean | null
          media_poblacional_pregunta?: string | null
          metadata?: Json | null
          national_average?: number | null
          opciones_respuesta_fijas?: Json | null
          options: Json
          question_text: string
          question_type?: string
          texto_pregunta?: string | null
          weight?: number | null
        }
        Update: {
          category_id?: string
          correct_answer?: string | null
          created_at?: string
          difficulty_level?: number | null
          id?: string
          is_control_question?: boolean | null
          media_poblacional_pregunta?: string | null
          metadata?: Json | null
          national_average?: number | null
          opciones_respuesta_fijas?: Json | null
          options?: Json
          question_text?: string
          question_type?: string
          texto_pregunta?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "question_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      report_config: {
        Row: {
          company_address: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string | null
          custom_template: string | null
          exam_id: string | null
          font_family: string | null
          font_size: number | null
          footer_logo_url: string | null
          header_logo_url: string | null
          id: string
          include_sections: Json | null
          template_name: string | null
          updated_at: string | null
        }
        Insert: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string | null
          custom_template?: string | null
          exam_id?: string | null
          font_family?: string | null
          font_size?: number | null
          footer_logo_url?: string | null
          header_logo_url?: string | null
          id?: string
          include_sections?: Json | null
          template_name?: string | null
          updated_at?: string | null
        }
        Update: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string | null
          custom_template?: string | null
          exam_id?: string | null
          font_family?: string | null
          font_size?: number | null
          footer_logo_url?: string | null
          header_logo_url?: string | null
          id?: string
          include_sections?: Json | null
          template_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_config_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      respuestas_cognitivas: {
        Row: {
          created_at: string
          es_correcta: boolean
          id: string
          pregunta_id: string
          respuesta_seleccionada: string
          session_id: string
          tiempo_respuesta_ms: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          es_correcta: boolean
          id?: string
          pregunta_id: string
          respuesta_seleccionada: string
          session_id: string
          tiempo_respuesta_ms?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          es_correcta?: boolean
          id?: string
          pregunta_id?: string
          respuesta_seleccionada?: string
          session_id?: string
          tiempo_respuesta_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "respuestas_cognitivas_pregunta_id_fkey"
            columns: ["pregunta_id"]
            isOneToOne: false
            referencedRelation: "preguntas_cognitivas"
            referencedColumns: ["id"]
          },
        ]
      }
      respuestas_preguntas_aspirante: {
        Row: {
          created_at: string
          es_correcta: boolean | null
          fecha_respuesta: string
          id_opcion_seleccionada: string | null
          id_pregunta: string
          id_respuesta_aspirante: string
          id_sesion: string
          metadata_respuesta: Json | null
          puntuacion_obtenida: number | null
          respuesta_texto_numerica: string | null
          tiempo_respuesta_ms: number
          tipo_pregunta_evaluacion: string
        }
        Insert: {
          created_at?: string
          es_correcta?: boolean | null
          fecha_respuesta?: string
          id_opcion_seleccionada?: string | null
          id_pregunta: string
          id_respuesta_aspirante?: string
          id_sesion: string
          metadata_respuesta?: Json | null
          puntuacion_obtenida?: number | null
          respuesta_texto_numerica?: string | null
          tiempo_respuesta_ms: number
          tipo_pregunta_evaluacion?: string
        }
        Update: {
          created_at?: string
          es_correcta?: boolean | null
          fecha_respuesta?: string
          id_opcion_seleccionada?: string | null
          id_pregunta?: string
          id_respuesta_aspirante?: string
          id_sesion?: string
          metadata_respuesta?: Json | null
          puntuacion_obtenida?: number | null
          respuesta_texto_numerica?: string | null
          tiempo_respuesta_ms?: number
          tipo_pregunta_evaluacion?: string
        }
        Relationships: [
          {
            foreignKeyName: "respuestas_preguntas_aspirante_id_pregunta_fkey"
            columns: ["id_pregunta"]
            isOneToOne: false
            referencedRelation: "preguntas_cognitivas_banco"
            referencedColumns: ["id_pregunta"]
          },
          {
            foreignKeyName: "respuestas_preguntas_aspirante_id_sesion_fkey"
            columns: ["id_sesion"]
            isOneToOne: false
            referencedRelation: "sesiones_evaluacion_aspirante"
            referencedColumns: ["id_sesion"]
          },
        ]
      }
      resultados_cognitivos: {
        Row: {
          atencion_sostenida_percentil: number | null
          atencion_sostenida_score: number | null
          created_at: string
          id: string
          interpretacion_ia: Json | null
          memoria_trabajo_percentil: number | null
          memoria_trabajo_score: number | null
          percentil_general: number | null
          puntuacion_general: number | null
          razonamiento_abstracto_percentil: number | null
          razonamiento_abstracto_score: number | null
          razonamiento_numerico_percentil: number | null
          razonamiento_numerico_score: number | null
          razonamiento_verbal_percentil: number | null
          razonamiento_verbal_score: number | null
          resolucion_problemas_percentil: number | null
          resolucion_problemas_score: number | null
          session_id: string
          tiempo_total_segundos: number | null
          user_id: string
          velocidad_procesamiento_percentil: number | null
          velocidad_procesamiento_score: number | null
        }
        Insert: {
          atencion_sostenida_percentil?: number | null
          atencion_sostenida_score?: number | null
          created_at?: string
          id?: string
          interpretacion_ia?: Json | null
          memoria_trabajo_percentil?: number | null
          memoria_trabajo_score?: number | null
          percentil_general?: number | null
          puntuacion_general?: number | null
          razonamiento_abstracto_percentil?: number | null
          razonamiento_abstracto_score?: number | null
          razonamiento_numerico_percentil?: number | null
          razonamiento_numerico_score?: number | null
          razonamiento_verbal_percentil?: number | null
          razonamiento_verbal_score?: number | null
          resolucion_problemas_percentil?: number | null
          resolucion_problemas_score?: number | null
          session_id: string
          tiempo_total_segundos?: number | null
          user_id: string
          velocidad_procesamiento_percentil?: number | null
          velocidad_procesamiento_score?: number | null
        }
        Update: {
          atencion_sostenida_percentil?: number | null
          atencion_sostenida_score?: number | null
          created_at?: string
          id?: string
          interpretacion_ia?: Json | null
          memoria_trabajo_percentil?: number | null
          memoria_trabajo_score?: number | null
          percentil_general?: number | null
          puntuacion_general?: number | null
          razonamiento_abstracto_percentil?: number | null
          razonamiento_abstracto_score?: number | null
          razonamiento_numerico_percentil?: number | null
          razonamiento_numerico_score?: number | null
          razonamiento_verbal_percentil?: number | null
          razonamiento_verbal_score?: number | null
          resolucion_problemas_percentil?: number | null
          resolucion_problemas_score?: number | null
          session_id?: string
          tiempo_total_segundos?: number | null
          user_id?: string
          velocidad_procesamiento_percentil?: number | null
          velocidad_procesamiento_score?: number | null
        }
        Relationships: []
      }
      role_change_audit: {
        Row: {
          changed_at: string | null
          changed_by: string
          id: string
          new_role: string
          old_role: string
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by: string
          id?: string
          new_role: string
          old_role: string
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string
          id?: string
          new_role?: string
          old_role?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sesiones_evaluacion_aspirante: {
        Row: {
          configuracion_evaluacion: Json | null
          created_at: string
          estado_sesion: string
          fecha_fin: string | null
          fecha_inicio: string
          id_aspirante: string
          id_sesion: string
          puntuacion_general_cognitiva: number | null
          tiempo_total_segundos: number | null
          tipo_evaluacion: string
          updated_at: string
          url_reporte_pdf: string | null
        }
        Insert: {
          configuracion_evaluacion?: Json | null
          created_at?: string
          estado_sesion?: string
          fecha_fin?: string | null
          fecha_inicio?: string
          id_aspirante: string
          id_sesion?: string
          puntuacion_general_cognitiva?: number | null
          tiempo_total_segundos?: number | null
          tipo_evaluacion?: string
          updated_at?: string
          url_reporte_pdf?: string | null
        }
        Update: {
          configuracion_evaluacion?: Json | null
          created_at?: string
          estado_sesion?: string
          fecha_fin?: string | null
          fecha_inicio?: string
          id_aspirante?: string
          id_sesion?: string
          puntuacion_general_cognitiva?: number | null
          tiempo_total_segundos?: number | null
          tipo_evaluacion?: string
          updated_at?: string
          url_reporte_pdf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sesiones_evaluacion_aspirante_id_aspirante_fkey"
            columns: ["id_aspirante"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesiones_evaluacion_aspirante_id_aspirante_fkey"
            columns: ["id_aspirante"]
            isOneToOne: false
            referencedRelation: "test_users_audit"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_assignments: {
        Row: {
          assigned_user_id: string | null
          created_at: string | null
          id: string
          supervisor_id: string | null
        }
        Insert: {
          assigned_user_id?: string | null
          created_at?: string | null
          id?: string
          supervisor_id?: string | null
        }
        Update: {
          assigned_user_id?: string | null
          created_at?: string | null
          id?: string
          supervisor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_assignments_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_assignments_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "test_users_audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_assignments_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_assignments_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "test_users_audit"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          confiabilidad_analisis_max_tokens: number | null
          confiabilidad_analisis_modelo: string | null
          confiabilidad_analisis_system_prompt: string | null
          confiabilidad_analisis_temperatura: number | null
          confiabilidad_analisis_user_prompt: string | null
          confiabilidad_conclusiones_max_tokens: number | null
          confiabilidad_conclusiones_modelo: string | null
          confiabilidad_conclusiones_system_prompt: string | null
          confiabilidad_conclusiones_temperatura: number | null
          confiabilidad_conclusiones_user_prompt: string | null
          contact_email: string | null
          created_at: string
          favicon_url: string | null
          footer_text: string | null
          id: string
          logo_url: string | null
          ocean_max_tokens: number | null
          ocean_modelo: string | null
          ocean_system_prompt: string | null
          ocean_temperatura: number | null
          ocean_user_prompt: string | null
          openai_model: string | null
          primary_color: string | null
          resend_from_email: string | null
          resend_from_name: string | null
          secondary_color: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_twitter: string | null
          social_youtube: string | null
          support_email: string | null
          system_name: string
          updated_at: string
        }
        Insert: {
          confiabilidad_analisis_max_tokens?: number | null
          confiabilidad_analisis_modelo?: string | null
          confiabilidad_analisis_system_prompt?: string | null
          confiabilidad_analisis_temperatura?: number | null
          confiabilidad_analisis_user_prompt?: string | null
          confiabilidad_conclusiones_max_tokens?: number | null
          confiabilidad_conclusiones_modelo?: string | null
          confiabilidad_conclusiones_system_prompt?: string | null
          confiabilidad_conclusiones_temperatura?: number | null
          confiabilidad_conclusiones_user_prompt?: string | null
          contact_email?: string | null
          created_at?: string
          favicon_url?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          ocean_max_tokens?: number | null
          ocean_modelo?: string | null
          ocean_system_prompt?: string | null
          ocean_temperatura?: number | null
          ocean_user_prompt?: string | null
          openai_model?: string | null
          primary_color?: string | null
          resend_from_email?: string | null
          resend_from_name?: string | null
          secondary_color?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          support_email?: string | null
          system_name?: string
          updated_at?: string
        }
        Update: {
          confiabilidad_analisis_max_tokens?: number | null
          confiabilidad_analisis_modelo?: string | null
          confiabilidad_analisis_system_prompt?: string | null
          confiabilidad_analisis_temperatura?: number | null
          confiabilidad_analisis_user_prompt?: string | null
          confiabilidad_conclusiones_max_tokens?: number | null
          confiabilidad_conclusiones_modelo?: string | null
          confiabilidad_conclusiones_system_prompt?: string | null
          confiabilidad_conclusiones_temperatura?: number | null
          confiabilidad_conclusiones_user_prompt?: string | null
          contact_email?: string | null
          created_at?: string
          favicon_url?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          ocean_max_tokens?: number | null
          ocean_modelo?: string | null
          ocean_system_prompt?: string | null
          ocean_temperatura?: number | null
          ocean_user_prompt?: string | null
          openai_model?: string | null
          primary_color?: string | null
          resend_from_email?: string | null
          resend_from_name?: string | null
          secondary_color?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          support_email?: string | null
          system_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      turnover_risk_categories: {
        Row: {
          codigo_categoria: string | null
          created_at: string
          descripcion: string | null
          id: string
          is_active: boolean
          nombre: string
          updated_at: string
        }
        Insert: {
          codigo_categoria?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          is_active?: boolean
          nombre: string
          updated_at?: string
        }
        Update: {
          codigo_categoria?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          is_active?: boolean
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      turnover_risk_config: {
        Row: {
          created_at: string
          id: string
          max_tokens: number
          openai_model: string
          system_message: string
          temperature: number
          updated_at: string
          user_prompt: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_tokens?: number
          openai_model?: string
          system_message?: string
          temperature?: number
          updated_at?: string
          user_prompt?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_tokens?: number
          openai_model?: string
          system_message?: string
          temperature?: number
          updated_at?: string
          user_prompt?: string
        }
        Relationships: []
      }
      turnover_risk_questions: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          is_active: boolean
          question_order: number
          question_text: string
          response_options: Json
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          question_order?: number
          question_text: string
          response_options?: Json
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          question_order?: number
          question_text?: string
          response_options?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "turnover_risk_questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "turnover_risk_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_log: {
        Row: {
          activity_description: string
          activity_type: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json | null
          new_value: Json | null
          previous_value: Json | null
          user_id: string
        }
        Insert: {
          activity_description: string
          activity_type: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          previous_value?: Json | null
          user_id: string
        }
        Update: {
          activity_description?: string
          activity_type?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          previous_value?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_consent_log: {
        Row: {
          consent_given: boolean
          consent_timestamp: string
          created_at: string
          exam_id: string | null
          exam_type: string
          id: string
          ip_address: string | null
          legal_notice_version: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          consent_given: boolean
          consent_timestamp?: string
          created_at?: string
          exam_id?: string | null
          exam_type: string
          id?: string
          ip_address?: string | null
          legal_notice_version?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          consent_given?: boolean
          consent_timestamp?: string
          created_at?: string
          exam_id?: string | null
          exam_type?: string
          id?: string
          ip_address?: string | null
          legal_notice_version?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_consent_log_legal_notice_version_fkey"
            columns: ["legal_notice_version"]
            isOneToOne: false
            referencedRelation: "legal_notice"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      test_users_audit: {
        Row: {
          can_login: boolean | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          role: string | null
          user_type: string | null
        }
        Insert: {
          can_login?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          role?: string | null
          user_type?: never
        }
        Update: {
          can_login?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          role?: string | null
          user_type?: never
        }
        Relationships: []
      }
    }
    Functions: {
      calcular_puntaje_respuesta: {
        Args: { respuesta_texto: string }
        Returns: number
      }
      calculate_personal_adjustment: {
        Args: {
          p_edad: number
          p_estado_civil: string
          p_situacion_habitacional: string
          p_tiene_hijos: boolean
        }
        Returns: number
      }
      cleanup_expired_ai_analysis_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      convertir_numero_a_respuesta: {
        Args: { numero: number }
        Returns: string
      }
      convertir_respuesta_a_numero: {
        Args: { respuesta_texto: string }
        Returns: number
      }
      delete_user_cascade: {
        Args: { target_user_id: string }
        Returns: string
      }
      detectar_simulacion: {
        Args: { diferencia: number }
        Returns: boolean
      }
      dev_reset_exam_credentials: {
        Args: { p_username: string }
        Returns: Json
      }
      evaluar_riesgo: {
        Args: { puntaje_total: number; total_preguntas: number }
        Returns: string
      }
      extend_user_exam_attempts: {
        Args: {
          additional_attempts: number
          admin_reason?: string
          exam_id: string
          target_user_id: string
        }
        Returns: Json
      }
      generate_analysis_input_hash: {
        Args: { input_data: Json }
        Returns: string
      }
      generate_random_password: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_role_permissions_audit: {
        Args: Record<PropertyKey, never>
        Returns: {
          description: string
          policy_command: string
          policy_name: string
          policy_role: string
          table_name: string
        }[]
      }
      generate_temp_password: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_unique_username: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_cached_ai_analysis: {
        Args: {
          p_analysis_type: string
          p_input_data: Json
          p_max_age_hours?: number
          p_user_id: string
        }
        Returns: Json
      }
      get_current_user_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_exam_analysis_data: {
        Args: { attempt_id: string }
        Returns: Json
      }
      get_exam_credentials_for_user: {
        Args: {
          p_exam_id?: string
          p_psychometric_test_id?: string
          p_test_type: string
          p_user_email: string
        }
        Returns: {
          expires_at: string
          is_used: boolean
        }[]
      }
      get_exam_session_by_id: {
        Args: { p_session_id: string }
        Returns: {
          attempts_taken: number
          company_id: string
          created_at: string
          end_time: string
          exam_description: string
          exam_duracion_minutos: number
          exam_id: string
          exam_title: string
          id: string
          max_attempts: number
          psychometric_description: string
          psychometric_name: string
          psychometric_test_id: string
          start_time: string
          status: string
          test_type: string
          updated_at: string
          user_email: string
          user_full_name: string
          user_id: string
        }[]
      }
      get_profile_by_email: {
        Args: { p_email: string }
        Returns: {
          company: string
          email: string
          full_name: string
          id: string
          role: string
        }[]
      }
      get_user_exam_assignments: {
        Args: { p_user_id: string }
        Returns: {
          assigned_at: string
          exam_description: string
          exam_duracion_minutos: number
          exam_estado: string
          exam_fecha_apertura: string
          exam_fecha_cierre: string
          exam_id: string
          exam_title: string
          id: string
          psychometric_description: string
          psychometric_name: string
          psychometric_test_id: string
          status: string
          test_type: string
        }[]
      }
      insert_legal_consent_log: {
        Args: {
          p_consent_type: string
          p_ip_address?: string
          p_user_agent?: string
          p_user_email: string
          p_user_id: string
        }
        Returns: string
      }
      insert_personal_factors: {
        Args: {
          p_edad: number
          p_estado_civil: string
          p_exam_id?: string
          p_session_id?: string
          p_situacion_habitacional: string
          p_tiene_hijos: boolean
          p_user_id: string
        }
        Returns: string
      }
      is_exam_valid: {
        Args: { exam_id: string }
        Returns: boolean
      }
      purge_specific_users_data: {
        Args: { user_ids: string[] }
        Returns: string
      }
      purge_test_data: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      reset_exam_credentials: {
        Args: { p_username: string }
        Returns: Json
      }
      reset_system_to_admin_only: {
        Args: { admin_email: string }
        Returns: string
      }
      save_ai_analysis_cache: {
        Args: {
          p_ai_analysis_result: Json
          p_analysis_type: string
          p_exam_id: string
          p_expires_hours?: number
          p_input_data: Json
          p_model_used?: string
          p_psychometric_test_id: string
          p_requested_by?: string
          p_tokens_used?: number
          p_user_id: string
        }
        Returns: string
      }
      start_exam_session: {
        Args: {
          p_assignment_id?: string
          p_exam_id?: string
          p_psychometric_test_id?: string
          p_test_type?: string
          p_user_id: string
        }
        Returns: Json
      }
      user_has_admin_or_teacher_role: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      user_is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      validar_respuesta_fija: {
        Args: { respuesta: string }
        Returns: boolean
      }
      validate_email_format: {
        Args: { email_input: string }
        Returns: boolean
      }
      validate_exam_credentials: {
        Args: {
          p_check_expiration?: boolean
          p_password: string
          p_username: string
        }
        Returns: {
          exam_id: string
          expires_at: string
          full_name: string
          is_expired: boolean
          test_type: string
          user_email: string
          valid: boolean
        }[]
      }
      validate_htp_assignment_access: {
        Args: { p_access_link: string }
        Returns: {
          access_link: string
          assigned_by: string
          created_at: string
          email_sent: boolean
          expires_at: string
          id: string
          status: string
          updated_at: string
          user_company: string
          user_email: string
          user_full_name: string
          user_id: string
        }[]
      }
      validate_user_role_access: {
        Args: { _expected_role: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
